import React from 'react';
import { createClient } from '@supabase/supabase-js';

// ===================== SUPABASE CONFIG WITH VALIDATION =====================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log environment status (remove in production after debugging)
if (typeof window !== 'undefined') {
  console.log('Supabase Environment Check:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    url: SUPABASE_URL ? 'Set' : 'Missing',
    key: SUPABASE_ANON_KEY ? 'Set' : 'Missing'
  });
}

// ===================== HELPERS =====================
const storageKey = "bills_balance_dashboard_v3";
const yyyyMm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthKey = yyyyMm();
const clampDue = (d) => Math.max(1, Math.min(28, Math.round(d||1)));
const fmt = (n) => `$${(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;

function notify(msg, type = 'success'){ 
  if(typeof window!=='undefined'){ 
    const colors = {
      success: '#10b981',
      error: '#dc2626',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; background: ${colors[type] || colors.info}; color: white;
      padding: 0.75rem 1rem; border-radius: 0.5rem; z-index: 9999;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      transform: translateX(100%); transition: transform 0.3s ease;
      max-width: 400px; word-wrap: break-word;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, 5000);
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fee', borderRadius: '0.5rem', margin: '1rem' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#dc2626' }}>{this.state.error?.message || 'Unknown error occurred'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginTop: '1rem' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

// Custom hook for undo/redo
function useUndoRedo(initialState) {
  const [state, setState] = React.useState(initialState);
  const [history, setHistory] = React.useState([initialState]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  const pushState = React.useCallback((newState) => {
    const updatedHistory = history.slice(0, currentIndex + 1);
    updatedHistory.push(newState);
    setHistory(updatedHistory);
    setCurrentIndex(updatedHistory.length - 1);
    setState(newState);
  }, [history, currentIndex]);
  
  const undo = React.useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setState(history[newIndex]);
    }
  }, [currentIndex, history]);
  
  const redo = React.useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setState(history[newIndex]);
    }
  }, [currentIndex, history]);
  
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  return [state, pushState, { undo, redo, canUndo, canRedo }];
}

// Custom hook for cloud-synced persistent state with error handling
function useCloudState(key, initial, user, supabase){
  const [state, setState] = React.useState(initial);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);

  // Load from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState(parsed);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, [key]);

  // Load from cloud when user is authenticated
  React.useEffect(() => {
    if (!user || !supabase) return;
    
    const loadFromCloud = async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .eq('data_type', key)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        if (data) {
          setState(data.data);
          setLastSync(new Date(data.updated_at));
          localStorage.setItem(key, JSON.stringify(data.data));
        }
      } catch (error) {
        console.error('Failed to load from cloud:', error);
        setSyncError(error.message);
        notify(`Failed to load ${key} from cloud: ${error.message}`, 'warning');
      } finally {
        setSyncing(false);
      }
    };

    loadFromCloud();
  }, [user, supabase, key]);

  // Save to localStorage and cloud
  React.useEffect(() => {
    // Always save to localStorage
    if(typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }

    // Save to cloud if authenticated
    if (!user || !supabase) return;

    const saveToCloud = async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert({
            user_id: user.id,
            data_type: key,
            data: state,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,data_type'
          });

        if (error) throw error;

        setLastSync(new Date());
      } catch (error) {
        console.error('Failed to save to cloud:', error);
        setSyncError(error.message);
        notify(`Failed to sync ${key} to cloud: ${error.message}`, 'error');
      } finally {
        setSyncing(false);
      }
    };

    const debounce = setTimeout(saveToCloud, 1000);
    return () => clearTimeout(debounce);
  }, [state, user, supabase, key]);

  return [state, setState, { syncing, lastSync, syncError }];
}

// Calculate next occurrence for a bill
function getNextOccurrence(bill, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    
    if (bill.frequency === 'monthly') {
      date.setDate(clampDue(bill.dueDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    
    if (bill.frequency === 'yearly') {
      const dueMonth = bill.yearlyMonth || 0;
      const dueDay = clampDue(bill.dueDay || 1);
      
      date.setMonth(dueMonth);
      date.setDate(dueDay);
      
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    
    if (bill.frequency === 'weekly') {
      const dayOfWeek = bill.weeklyDay || 0;
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      
      if (bill.weeklySchedule === 'every') {
        return date;
      } else {
        const targetWeek = bill.weeklySchedule;
        const month = date.getMonth();
        date.setDate(1);
        date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7));
        
        if (targetWeek === 'last') {
          while (date.getMonth() === month) {
            const next = new Date(date);
            next.setDate(next.getDate() + 7);
            if (next.getMonth() !== month) break;
            date.setDate(date.getDate() + 7);
          }
        } else {
          const weekNum = { first: 0, second: 1, third: 2, fourth: 3 }[targetWeek] || 0;
          date.setDate(date.getDate() + (weekNum * 7));
        }
        
        if (date <= fromDate) {
          date.setMonth(date.getMonth() + 1);
          return getNextOccurrence(bill, date);
        }
        return date;
      }
    }
    
    if (bill.frequency === 'biweekly') {
      const baseDate = new Date(bill.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    
    // Fallback to monthly
    return getNextOccurrence({ ...bill, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
    return new Date(); // Return current date as fallback
  }
}

// ===================== DIALOG COMPONENTS =====================

// Auth Dialog
function AuthDialog({ email, setEmail, password, setPassword, isSignUp, setIsSignUp, authLoading, onClose, onAuth, supabase }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
        
        {!supabase && (
          <div style={{ background: '#fee', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem', color: '#dc2626' }}>
            ⚠️ Supabase is not configured. Please add environment variables in Vercel.
          </div>
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onAuth}
            disabled={authLoading || !supabase}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: authLoading || !supabase ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: authLoading || !supabase ? 'not-allowed' : 'pointer'
            }}
          >
            {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Account Dialog
function AddAccountDialog({ onClose, onAdd, selectAllOnFocus }) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('Bank');
  const [balance, setBalance] = React.useState(0);
  
  const handleAdd = () => {
    if (!name.trim()) {
      notify('Please enter an account name', 'error');
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      balance: Number(balance)
    });
    notify('Account added successfully', 'success');
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Add Account</h2>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Investment">Investment</option>
          </select>
        </label>
        
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          Initial Balance
          <input
            type="number"
            step="0.01"
            value={balance}
            onFocus={selectAllOnFocus}
            onChange={(e) => setBalance(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Add Account
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Bill Dialog
function AddBillDialog({ categories, accounts, onClose, onAdd, selectAllOnFocus }) {
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState(categories[0] || '');
  const [amount, setAmount] = React.useState(0);
  const [frequency, setFrequency] = React.useState('monthly');
  const [dueDay, setDueDay] = React.useState(1);
  const [accountId, setAccountId] = React.useState(accounts[0]?.id || '');
  const [yearlyMonth, setYearlyMonth] = React.useState(0);
  const [weeklyDay, setWeeklyDay] = React.useState(0);
  const [weeklySchedule, setWeeklySchedule] = React.useState('every');
  const [biweeklyStart, setBiweeklyStart] = React.useState(new Date().toISOString().slice(0,10));
  
  const handleAdd = () => {
    if (!name.trim()) {
      notify('Please enter a bill name', 'error');
      return;
    }
    if (amount <= 0) {
      notify('Please enter a valid amount', 'error');
      return;
    }
    
    const newBill = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category,
      amount: Number(amount),
      frequency,
      dueDay: Number(dueDay),
      accountId,
      paidMonths: [],
      skipMonths: [],
      ignored: false
    };
    
    if (frequency === 'yearly') {
      newBill.yearlyMonth = yearlyMonth;
    } else if (frequency === 'weekly') {
      newBill.weeklyDay = weeklyDay;
      newBill.weeklySchedule = weeklySchedule;
    } else if (frequency === 'biweekly') {
      newBill.biweeklyStart = biweeklyStart;
    }
    
    onAdd(newBill);
    notify('Bill added successfully', 'success');
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Add Bill</h2>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              value={amount}
              onFocus={selectAllOnFocus}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </label>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label>
            Frequency
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          
          <label>
            Account
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
        
        {frequency === 'monthly' && (
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Due Day of Month
            <input
              type="number"
              min="1"
              max="28"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </label>
        )}
        
        {frequency === 'yearly' && (
          <>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Month
              <select
                value={yearlyMonth}
                onChange={(e) => setYearlyMonth(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => 
                  <option key={i} value={i}>{m}</option>
                )}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Day
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </label>
          </>
        )}
        
        {frequency === 'weekly' && (
          <>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Day of Week
              <select
                value={weeklyDay}
                onChange={(e) => setWeeklyDay(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => 
                  <option key={i} value={i}>{d}</option>
                )}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Schedule
              <select
                value={weeklySchedule}
                onChange={(e) => setWeeklySchedule(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value="every">Every Week</option>
                <option value="first">First Week of Month</option>
                <option value="second">Second Week of Month</option>
                <option value="third">Third Week of Month</option>
                <option value="fourth">Fourth Week of Month</option>
                <option value="last">Last Week of Month</option>
              </select>
            </label>
          </>
        )}
        
        {frequency === 'biweekly' && (
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Start Date
            <input
              type="date"
              value={biweeklyStart}
              onChange={(e) => setBiweeklyStart(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </label>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Add Bill
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Bill Dialog
function EditBillDialog({ bill, categories, accounts, onClose, onSave, selectAllOnFocus }) {
  const [name, setName] = React.useState(bill.name);
  const [category, setCategory] = React.useState(bill.category);
  const [amount, setAmount] = React.useState(bill.amount);
  const [frequency, setFrequency] = React.useState(bill.frequency || 'monthly');
  const [dueDay, setDueDay] = React.useState(bill.dueDay || 1);
  const [accountId, setAccountId] = React.useState(bill.accountId);
  const [yearlyMonth, setYearlyMonth] = React.useState(bill.yearlyMonth || 0);
  const [weeklyDay, setWeeklyDay] = React.useState(bill.weeklyDay || 0);
  const [weeklySchedule, setWeeklySchedule] = React.useState(bill.weeklySchedule || 'every');
  const [biweeklyStart, setBiweeklyStart] = React.useState(bill.biweeklyStart || new Date().toISOString().slice(0,10));
  
  const handleSave = () => {
    if (!name.trim()) {
      notify('Bill name cannot be empty', 'error');
      return;
    }
    if (amount <= 0) {
      notify('Amount must be greater than 0', 'error');
      return;
    }
    
    const updates = {
      name: name.trim(),
      category,
      amount: Number(amount),
      frequency,
      dueDay: Number(dueDay),
      accountId
    };
    
    if (frequency === 'yearly') {
      updates.yearlyMonth = yearlyMonth;
    } else if (frequency === 'weekly') {
      updates.weeklyDay = weeklyDay;
      updates.weeklySchedule = weeklySchedule;
    } else if (frequency === 'biweekly') {
      updates.biweeklyStart = biweeklyStart;
    }
    
    onSave(updates);
    notify('Bill updated successfully', 'success');
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Edit Bill</h2>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              value={amount}
              onFocus={selectAllOnFocus}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </label>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <label>
            Frequency
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          
          <label>
            Account
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        </div>
        
        {frequency === 'monthly' && (
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Due Day of Month
            <input
              type="number"
              min="1"
              max="28"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </label>
        )}
        
        {frequency === 'yearly' && (
          <>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Month
              <select
                value={yearlyMonth}
                onChange={(e) => setYearlyMonth(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => 
                  <option key={i} value={i}>{m}</option>
                )}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Day
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </label>
          </>
        )}
        
        {frequency === 'weekly' && (
          <>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Day of Week
              <select
                value={weeklyDay}
                onChange={(e) => setWeeklyDay(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) => 
                  <option key={i} value={i}>{d}</option>
                )}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Schedule
              <select
                value={weeklySchedule}
                onChange={(e) => setWeeklySchedule(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value="every">Every Week</option>
                <option value="first">First Week of Month</option>
                <option value="second">Second Week of Month</option>
                <option value="third">Third Week of Month</option>
                <option value="fourth">Fourth Week of Month</option>
                <option value="last">Last Week of Month</option>
              </select>
            </label>
          </>
        )}
        
        {frequency === 'biweekly' && (
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Start Date
            <input
              type="date"
              value={biweeklyStart}
              onChange={(e) => setBiweeklyStart(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </label>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit One-Time Cost Dialog
function EditOTCDialog({ otc, categories, accounts, onClose, onSave, selectAllOnFocus }) {
  const [name, setName] = React.useState(otc.name);
  const [category, setCategory] = React.useState(otc.category);
  const [amount, setAmount] = React.useState(otc.amount);
  const [dueDate, setDueDate] = React.useState(otc.dueDate);
  const [accountId, setAccountId] = React.useState(otc.accountId);
  const [notes, setNotes] = React.useState(otc.notes || '');
  
  const handleSave = () => {
    if (!name.trim()) {
      notify('Name cannot be empty', 'error');
      return;
    }
    if (amount <= 0) {
      notify('Amount must be greater than 0', 'error');
      return;
    }
    
    onSave({
      name: name.trim(),
      category,
      amount: Number(amount),
      dueDate,
      accountId,
      notes
    });
    notify('One-time cost updated successfully', 'success');
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Edit One-Time Cost</h2>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Amount
          <input
            type="number"
            step="0.01"
            value={amount}
            onFocus={selectAllOnFocus}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Due Date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Account
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          Notes
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Account Dialog
function EditAccountDialog({ account, onClose, onSave, selectAllOnFocus }) {
  const [name, setName] = React.useState(account.name);
  const [type, setType] = React.useState(account.type);
  const [balance, setBalance] = React.useState(account.balance);
  
  const handleSave = () => {
    if (!name.trim()) {
      notify('Account name cannot be empty', 'error');
      return;
    }
    
    onSave({
      name: name.trim(),
      type,
      balance: Number(balance)
    });
    notify('Account updated successfully', 'success');
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Edit Account</h2>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="Bank">Bank</option>
            <option value="Cash">Cash</option>
            <option value="Credit">Credit</option>
            <option value="Investment">Investment</option>
          </select>
        </label>
        
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          Balance
          <input
            type="number"
            step="0.01"
            value={balance}
            onFocus={selectAllOnFocus}
            onChange={(e) => setBalance(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </label>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Snapshots Dialog
function SnapshotsDialog({ snapshots, onClose, fmt }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Net Worth Snapshots</h2>
        
        {snapshots.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center' }}>No snapshots saved yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {snapshots.map((snap, idx) => (
              <div key={idx} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: '500' }}>{new Date(snap.ts).toLocaleString()}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Current</div>
                    <div style={{ fontWeight: '500' }}>{fmt(snap.current)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>After Week</div>
                    <div style={{ fontWeight: '500' }}>{fmt(snap.afterWeek)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>After Month</div>
                    <div style={{ fontWeight: '500' }}>{fmt(snap.afterMonth)}</div>
                  </div>
                </div>
                {snap.reason && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Reason: {snap.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ===================== MAIN DASHBOARD COMPONENT =====================
function DashboardContent() {
  const isMobile = useIsMobile();
  
  // Auth state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  
  // Supabase client with error handling
  const supabase = React.useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not configured');
      return null;
    }
    try {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }, []);

  // Session persistence with error handling
  React.useEffect(() => {
    if (!supabase) return;
    
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Failed to check session:', error);
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Categories with cloud sync
  const [categoriesBase, setCategoriesBase, catSync] = useCloudState(
    `${storageKey}:categories`, 
    [
      { id: crypto.randomUUID(), name: 'Personal', order: 0 },
      { id: crypto.randomUUID(), name: 'Studio', order: 1 },
      { id: crypto.randomUUID(), name: 'Smoke Shop', order: 2 },
      { id: crypto.randomUUID(), name: 'Botting', order: 3 },
    ],
    user,
    supabase
  );
  
  // Cloud-synced base data
  const [accountsBase, setAccountsBase, accSync] = useCloudState(
    `${storageKey}:accounts`,
    [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ],
    user,
    supabase
  );
  
  const [billsBase, setBillsBase, billSync] = useCloudState(`${storageKey}:bills`, [], user, supabase);
  const [oneTimeCostsBase, setOneTimeCostsBase, otcSync] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [nwHistory, setNwHistory, nwSync] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

  // Master state with undo/redo
  const [masterState, setMasterState, undoRedo] = useUndoRedo({
    accounts: accountsBase,
    bills: billsBase,
    oneTimeCosts: oneTimeCostsBase,
    categories: categoriesBase
  });

  // Sync master state with cloud state
  React.useEffect(() => {
    setMasterState({
      accounts: accountsBase,
      bills: billsBase,
      oneTimeCosts: oneTimeCostsBase,
      categories: categoriesBase
    });
  }, [accountsBase, billsBase, oneTimeCostsBase, categoriesBase]);

  // Sync changes back to cloud state
  React.useEffect(() => {
    setAccountsBase(masterState.accounts);
    setBillsBase(masterState.bills);
    setOneTimeCostsBase(masterState.oneTimeCosts);
    setCategoriesBase(masterState.categories);
  }, [masterState]);

  // Extract current state
  const { accounts, bills, oneTimeCosts, categories } = masterState;
  
  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  // Settings/UI with cloud sync
  const [autoDeductCash, setAutoDeductCash, deductSync] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored, ignoredSync] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat, catSelSync] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  const [activeMonth, setActiveMonth] = React.useState(monthKey);
  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);

  // One-time cost form state
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = React.useState("");

  // Check if any data is syncing
  const isSyncing = catSync.syncing || accSync.syncing || billSync.syncing || otcSync.syncing || nwSync.syncing;
  
  // Get last sync time
  const lastSyncTime = React.useMemo(() => {
    const times = [catSync.lastSync, accSync.lastSync, billSync.lastSync, otcSync.lastSync, nwSync.lastSync]
      .filter(t => t !== null);
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map(t => t.getTime())));
  }, [catSync.lastSync, accSync.lastSync, billSync.lastSync, otcSync.lastSync, nwSync.lastSync]);

  // Keyboard shortcuts for undo/redo
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        undoRedo.undo();
      } else if (e.ctrlKey && e.altKey && e.key === 'z') {
        e.preventDefault();
        undoRedo.redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoRedo]);

  // Auth functions with comprehensive error handling
  async function handleAuth() {
    if (!supabase) {
      console.error('Supabase client not initialized. Check environment variables.');
      notify('Authentication service not configured. Please check Vercel environment variables.', 'error');
      return;
    }
    
    if (!email || !password) {
      notify('Please enter both email and password', 'error');
      return;
    }
    
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        notify('Account created! Check your email for verification.', 'success');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (error) throw error;
        setUser(data.user);
        setShowAuth(false);
        notify('Logged in successfully!', 'success');
      }
    } catch (error) {
      console.error('Auth error:', error);
      notify(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      notify('Logged out', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      notify('Failed to logout', 'error');
    }
  }

  // Update form state when categories/accounts change
  React.useEffect(() => {
    if(activeCats.length && !activeCats.includes(otcCategory)) setOtcCategory(activeCats[0]);
  }, [activeCats, otcCategory]);

  React.useEffect(() => {
    if(accounts.length && !accounts.find(a => a.id === otcAccountId)) setOtcAccountId(accounts[0].id);
  }, [accounts, otcAccountId]);

  // Derived calculations with error handling
  const currentLiquid = React.useMemo(()=> {
    try {
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    } catch (error) {
      console.error('Error calculating current liquid:', error);
      return 0;
    }
  }, [accounts]);
  
  const upcoming = React.useMemo(()=>{
    try {
      const now = new Date();
      const horizon = new Date(now); 
      horizon.setDate(now.getDate()+7);
      const items = [];

      for(const b of bills){
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue;
        if(b.skipMonths?.includes(activeMonth)) continue;
        
        const nextDate = getNextOccurrence(b, now);
        const paid = b.paidMonths.includes(activeMonth) && (b.frequency === 'monthly' || b.frequency === 'yearly');
        const overdue = nextDate < now && !paid;
        const withinWeek = nextDate <= horizon && !paid;
        
        if(overdue || withinWeek) {
          items.push({ bill:b, due: nextDate, overdue });
        }
      }
      
      for(const o of oneTimeCosts){
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue;
        if(o.paid) continue;
        const due = new Date(o.dueDate);
        const overdue = due < new Date();
        const withinWeek = due <= horizon;
        if(overdue || withinWeek) items.push({ otc:o, due, overdue });
      }
      
      items.sort((a,b)=> (a.overdue===b.overdue? a.due.getTime()-b.due.getTime() : a.overdue? -1: 1));

      const byAcc = {};
      const ensure = (id)=> (byAcc[id] ||= { account: accounts.find(a=>a.id===id), total:0, items:[] });
      for(const it of items){
        const amt = it.bill? it.bill.amount : it.otc.amount;
        const accId = it.bill? it.bill.accountId : it.otc.accountId;
        const g = ensure(accId); 
        g.total += amt; 
        g.items.push(it);
      }
      const byAccount = Object.values(byAcc).map(g=> ({ 
        account: g.account, 
        totalDue: g.total, 
        balance: g.account.balance, 
        deficit: Math.max(0, g.total - g.account.balance), 
        items: g.items 
      }));

      return { 
        items, 
        byAccount, 
        totalDeficit: byAccount.reduce((s,d)=> s+d.deficit, 0), 
        weekDueTotal: items.reduce((s,it)=> s + (it.bill? it.bill.amount : it.otc.amount), 0) 
      };
    } catch (error) {
      console.error('Error calculating upcoming:', error);
      return { items: [], byAccount: [], totalDeficit: 0, weekDueTotal: 0 };
    }
  }, [accounts, bills, oneTimeCosts, activeCats, activeMonth]);

  const monthUnpaidTotal = React.useMemo(()=>{
    try {
      let sum = 0;
      for(const b of bills){ 
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue; 
        if(b.skipMonths?.includes(activeMonth)) continue; 
        if(!b.paidMonths.includes(activeMonth)) sum += Number(b.amount) || 0; 
      }
      for(const o of oneTimeCosts){ 
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue; 
        if(o.dueDate.slice(0,7)===activeMonth && !o.paid) sum += Number(o.amount) || 0; 
      }
      return sum;
    } catch (error) {
      console.error('Error calculating month unpaid total:', error);
      return 0;
    }
  },[bills, oneTimeCosts, activeCats, activeMonth]);

  const afterWeek = currentLiquid - upcoming.weekDueTotal;
  const afterMonth = currentLiquid - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquid : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquid);

  const selectedCats = selectedCat==='All' ? activeCats : activeCats.filter(c=> c===selectedCat);

  // Actions with error handling
  function togglePaid(b){
    try {
      const isPaid = b.paidMonths.includes(activeMonth);
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          paidMonths: isPaid? x.paidMonths.filter(m=>m!==activeMonth) : [...x.paidMonths, activeMonth] 
        } : x)
      }));
      
      const acc = accounts.find(a=>a.id===b.accountId);
      if(autoDeductCash && acc?.type==='Cash'){ 
        if(!isPaid) {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance - b.amount } : a)
          }));
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance + b.amount } : a)
          }));
        }
      }
      notify(`${b.name} marked as ${isPaid ? 'unpaid' : 'paid'}`, 'success');
    } catch (error) {
      console.error('Error toggling paid status:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  function toggleSkipThisMonth(b){
    try {
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          skipMonths: x.skipMonths?.includes(activeMonth) ? 
            x.skipMonths.filter(m=>m!==activeMonth) : 
            [ ...(x.skipMonths||[]), activeMonth ] 
        } : x)
      }));
    } catch (error) {
      console.error('Error toggling skip month:', error);
      notify('Failed to update skip status', 'error');
    }
  }

  function toggleBillIgnored(b){
    try {
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { ...x, ignored: !x.ignored } : x)
      }));
    } catch (error) {
      console.error('Error toggling bill ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  function toggleOneTimePaid(o){
    try {
      setMasterState(prev => ({
        ...prev,
        oneTimeCosts: prev.oneTimeCosts.map(x=> x.id===o.id ? { ...x, paid: !x.paid } : x)
      }));
      
      const acc = accounts.find(a=>a.id===o.accountId);
      if(autoDeductCash && acc?.type==='Cash'){ 
        if(!o.paid) {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance - o.amount } : a)
          }));
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance + o.amount } : a)
          }));
        }
      }
      notify(`${o.name} marked as ${o.paid ? 'unpaid' : 'paid'}`, 'success');
    } catch (error) {
      console.error('Error toggling one-time paid:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  function toggleOTCIgnored(o){
    try {
      setMasterState(prev => ({
        ...prev,
        oneTimeCosts: prev.oneTimeCosts.map(x=> x.id===o.id ? { ...x, ignored: !x.ignored } : x)
      }));
    } catch (error) {
      console.error('Error toggling OTC ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  function deleteBill(billId){
    if(confirm('Delete this bill?')){
      try {
        setMasterState(prev => ({
          ...prev,
          bills: prev.bills.filter(b => b.id !== billId)
        }));
        notify('Bill deleted');
      } catch (error) {
        console.error('Error deleting bill:', error);
        notify('Failed to delete bill', 'error');
      }
    }
  }

  function deleteOneTimeCost(otcId){
    if(confirm('Delete this one-time cost?')){
      try {
        setMasterState(prev => ({
          ...prev,
          oneTimeCosts: prev.oneTimeCosts.filter(o => o.id !== otcId)
        }));
        notify('One-time cost deleted');
      } catch (error) {
        console.error('Error deleting one-time cost:', error);
        notify('Failed to delete one-time cost', 'error');
      }
    }
  }

  function addOneTimeCost() {
    try {
      if(!otcName || !otcAmount || !otcDueDate) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      setMasterState(prev => ({
        ...prev,
        oneTimeCosts: [...prev.oneTimeCosts, { 
          id: crypto.randomUUID(), 
          name: otcName, 
          category: otcCategory, 
          amount: Number(otcAmount), 
          dueDate: otcDueDate, 
          accountId: otcAccountId, 
          notes: otcNotes, 
          paid: false,
          ignored: false 
        }]
      }));
      setOtcName("");
      setOtcAmount(0);
      setOtcNotes("");
      notify('One-time cost added');
    } catch (error) {
      console.error('Error adding one-time cost:', error);
      notify('Failed to add one-time cost', 'error');
    }
  }

  function addCategory(name){ 
    try {
      const nm=name.trim(); 
      if(!nm) {
        notify('Category name cannot be empty', 'error');
        return;
      }
      if(categories.some(c=>c.name===nm)) { 
        notify('Category already exists', 'error'); 
        return; 
      } 
      const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
      setMasterState(prev => ({
        ...prev,
        categories: [...prev.categories, { id: crypto.randomUUID(), name: nm, order: maxOrder + 1 }]
      }));
      notify('Category added');
    } catch (error) {
      console.error('Error adding category:', error);
      notify('Failed to add category', 'error');
    }
  }

  function toggleIgnoreCategory(name){ 
    try {
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c=> c.name===name? { ...c, ignored: !c.ignored } : c)
      }));
    } catch (error) {
      console.error('Error toggling category ignore:', error);
      notify('Failed to update category', 'error');
    }
  }

  function removeCategory(name){ 
    try {
      const hasItems = bills.some(b=>b.category===name) || oneTimeCosts.some(o=>o.category===name); 
      if(hasItems && !confirm(`Category "${name}" has items. Move them to Uncategorized?`)) return; 
      const fallback='Uncategorized'; 
      if(!categories.find(c=>c.name===fallback)) {
        const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
        setMasterState(prev => ({
          ...prev,
          categories: [...prev.categories, {id:crypto.randomUUID(), name:fallback, order: maxOrder + 1}]
        }));
      }
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(b=> b.category===name? { ...b, category: fallback } : b),
        oneTimeCosts: prev.oneTimeCosts.map(o=> o.category===name? { ...o, category: fallback } : o),
        categories: prev.categories.filter(c=> c.name!==name)
      }));
      notify('Category removed');
    } catch (error) {
      console.error('Error removing category:', error);
      notify('Failed to remove category', 'error');
    }
  }

  function moveCategoryUp(id) {
    try {
      setMasterState(prev => {
        const cats = [...prev.categories];
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        cats.sort((a, b) => a.order - b.order);
        
        const index = cats.findIndex(c => c.id === id);
        if (index > 0) {
          const temp = cats[index].order;
          cats[index].order = cats[index - 1].order;
          cats[index - 1].order = temp;
        }
        return { ...prev, categories: cats };
      });
    } catch (error) {
      console.error('Error moving category up:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  function moveCategoryDown(id) {
    try {
      setMasterState(prev => {
        const cats = [...prev.categories];
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        cats.sort((a, b) => a.order - b.order);
        
        const index = cats.findIndex(c => c.id === id);
        if (index < cats.length - 1) {
          const temp = cats[index].order;
          cats[index].order = cats[index + 1].order;
          cats[index + 1].order = temp;
        }
        return { ...prev, categories: cats };
      });
    } catch (error) {
      console.error('Error moving category down:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  function renameCategory(id, newName) {
    try {
      const trimmed = newName.trim();
      if (!trimmed) {
        notify('Category name cannot be empty', 'error');
        return;
      }
      if (categories.some(c => c.id !== id && c.name === trimmed)) {
        notify('Category name already exists', 'error');
        return;
      }
      const oldName = categories.find(c => c.id === id)?.name;
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === id ? { ...c, name: trimmed } : c),
        bills: prev.bills.map(b => b.category === oldName ? { ...b, category: trimmed } : b),
        oneTimeCosts: prev.oneTimeCosts.map(o => o.category === oldName ? { ...o, category: trimmed } : o)
      }));
      notify('Category renamed');
    } catch (error) {
      console.error('Error renaming category:', error);
      notify('Failed to rename category', 'error');
    }
  }

  // Styles
  const mobileStyles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: isMobile ? '0.75rem' : '1.5rem' },
    card: { background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: isMobile ? '0.5rem' : '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: isMobile ? '0.75rem' : '0' },
    button: { padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem', fontSize: isMobile ? '0.875rem' : '1rem' },
    input: { padding: isMobile ? '0.375rem' : '0.5rem', fontSize: isMobile ? '0.875rem' : '1rem' },
    title: { fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: '700' },
    sectionTitle: { fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600' },
    smallText: { fontSize: isMobile ? '0.75rem' : '0.875rem' },
    grid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))', gap: isMobile ? '0.75rem' : '1.5rem' }
  };

  const selectAllOnFocus = (e) => {
    e.target.select();
  };

  if (isMobile) {
    return (
      <div style={mobileStyles.container}>
        {/* Mobile Header */}
        <div style={{ ...mobileStyles.card, textAlign: 'center', padding: '0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            💰 Cashfl0.io 💰
          </h1>
          
          {/* Cloud Status */}
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {user ? (
              <div>
                {isSyncing ? '🔄 Syncing...' : '☁️ Synced'} • {user.email}
                <button
                  onClick={handleLogout}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                Login for Cloud
              </button>
            )}
          </div>
          
          {/* Undo/Redo */}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={undoRedo.undo}
              disabled={!undoRedo.canUndo}
              style={{ padding: '0.25rem 0.5rem', marginRight: '0.25rem', background: undoRedo.canUndo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              ↶ Undo
            </button>
            <button
              onClick={undoRedo.redo}
              disabled={!undoRedo.canRedo}
              style={{ padding: '0.25rem 0.5rem', background: undoRedo.canRedo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              ↷ Redo
            </button>
          </div>
        </div>

        {/* Mobile Due This Week */}
        <div style={mobileStyles.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Due This Week</h3>
          
          {upcoming.items
            .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category))
            .map((it, idx) => {
              const name = it.bill ? it.bill.name : it.otc.name;
              const amt = it.bill ? it.bill.amount : it.otc.amount;
              
              return (
                <div key={idx} style={{ 
                  background: it.overdue ? '#fef2f2' : '#f9fafb',
                  padding: '0.5rem', 
                  borderRadius: '0.375rem',
                  border: `1px solid ${it.overdue ? '#fca5a5' : '#d1d5db'}`,
                  marginBottom: '0.375rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: it.overdue ? '#dc2626' : '#000' }}>
                      {fmt(amt)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                    {it.overdue ? '⚠️ OVERDUE' : ''} {it.due.toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => it.bill ? togglePaid(it.bill) : toggleOneTimePaid(it.otc)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.25rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    Mark Paid
                  </button>
                </div>
              );
            })}
          
          {upcoming.items.filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category)).length === 0 && (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
              Nothing due this week!
            </div>
          )}
        </div>

        {/* Mobile Money Needed */}
        <div style={{ ...mobileStyles.card, background: 'linear-gradient(135deg, #4c1d95 0%, #2563eb 100%)', color: 'white' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>🎯 This Week</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.625rem', opacity: 0.9 }}>Total Due</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>{fmt(weekNeedWithoutSavings)}</div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.625rem', opacity: 0.9 }}>Need to Earn</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: weekNeedWithSavings === 0 ? '#10b981' : 'white' }}>
                {fmt(weekNeedWithSavings)}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.9 }}>
            Current Balance: {fmt(currentLiquid)}
          </div>
        </div>

        {/* Mobile Net Worth */}
        <div style={mobileStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '600' }}>Net Worth</h2>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', color: netWorthValue < 0 ? '#dc2626' : '#059669' }}>
              {fmt(netWorthValue)}
            </div>
          </div>
          
          <select 
            value={netWorthMode} 
            onChange={(e) => setNetWorthMode(e.target.value)}
            style={{ width: '100%', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
          >
            <option value="current">Current</option>
            <option value="afterWeek">After This Week</option>
            <option value="afterMonth">After This Month</option>
          </select>
        </div>

        {/* Mobile Category Tabs */}
        <div style={{ ...mobileStyles.card, padding: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {['All', ...activeCats].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #d1d5db',
                  background: selectedCat === cat ? '#1f2937' : 'white',
                  color: selectedCat === cat ? 'white' : '#374151',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Accounts */}
        <div style={mobileStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Accounts</h3>
            <button 
              onClick={() => setShowAddAccount(true)}
              style={{ padding: '0.25rem 0.5rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              + Add
            </button>
          </div>
          
          {accounts.map(account => (
            <div key={account.id} style={{ background: '#f9fafb', padding: '0.5rem', borderRadius: '0.375rem', marginBottom: '0.375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', background: account.type === 'Cash' ? '#f3f4f6' : '#dbeafe', borderRadius: '9999px', marginRight: '0.25rem' }}>
                    {account.type}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{account.name}</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={account.balance}
                  onFocus={selectAllOnFocus}
                  onChange={(e) => setMasterState(prev => ({
                    ...prev,
                    accounts: prev.accounts.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a)
                  }))}
                  style={{ width: '80px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', textAlign: 'right' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Bills */}
        <div style={mobileStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
              Bills ({(() => {
                const [year, month] = activeMonth.split('-');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return `${monthNames[parseInt(month) - 1]} ${year}`;
              })()})
            </h3>
            <button 
              onClick={() => setShowAddBill(true)}
              style={{ padding: '0.25rem 0.5rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              + Add
            </button>
          </div>

          <input 
            type="month" 
            value={activeMonth} 
            onChange={(e) => setActiveMonth(e.target.value)}
            style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}
          />
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            <input 
              type="checkbox" 
              checked={autoDeductCash} 
              onChange={(e) => setAutoDeductCash(e.target.checked)} 
            />
            Auto-deduct Cash when paid
          </label>

          {bills
            .filter(b => selectedCats.includes(b.category))
            .sort((a,b) => {
              if (a.frequency === 'yearly' && b.frequency !== 'yearly') return 1;
              if (a.frequency !== 'yearly' && b.frequency === 'yearly') return -1;
              const aDate = getNextOccurrence(a);
              const bDate = getNextOccurrence(b);
              return aDate - bDate;
            })
            .map(bill => {
              const account = accounts.find(a => a.id === bill.accountId);
              const isPaid = bill.paidMonths.includes(activeMonth);
              const isSkipped = bill.skipMonths?.includes(activeMonth);
              const nextDate = getNextOccurrence(bill);
              
              return (
                <div key={bill.id} style={{ 
                  background: bill.ignored ? '#f3f4f6' : '#f9fafb', 
                  padding: '0.5rem', 
                  borderRadius: '0.375rem',
                  border: `2px solid ${isPaid ? '#10b981' : isSkipped ? '#f59e0b' : '#e5e7eb'}`,
                  marginBottom: '0.375rem',
                  opacity: bill.ignored ? 0.6 : 1,
                  position: 'relative'
                }}>
                  {bill.ignored && (
                    <div style={{
                      position: 'absolute',
                      top: '0.25rem',
                      right: '0.25rem',
                      background: '#6b7280',
                      color: 'white',
                      fontSize: '0.5rem',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.125rem'
                    }}>
                      IGNORED
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{bill.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                    {bill.frequency === 'monthly' ? `Due: ${bill.dueDay}` : 
                     bill.frequency === 'yearly' ? `Yearly: ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][bill.yearlyMonth || 0]} ${bill.dueDay || 1}` :
                     bill.frequency === 'weekly' ? `Weekly: ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][bill.weeklyDay || 0]}` :
                     bill.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'} • {account?.name}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                      <input 
                        type="checkbox" 
                        checked={isPaid} 
                        onChange={() => togglePaid(bill)} 
                      />
                      {isPaid ? '✅ Paid' : 'Not paid'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                      <input 
                        type="checkbox" 
                        checked={!!isSkipped} 
                        onChange={() => toggleSkipThisMonth(bill)} 
                      />
                      Skip
                    </label>
                    <button
                      onClick={() => setEditingBill(bill)}
                      style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleBillIgnored(bill)}
                      style={{ padding: '0.125rem 0.25rem', background: bill.ignored ? '#10b981' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      {bill.ignored ? 'Unignore' : 'Ignore'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Mobile One-Time Costs */}
        <div style={mobileStyles.card}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>One-Time Costs</h3>
          
          {/* Add form */}
          <div style={{ background: '#f9fafb', padding: '0.5rem', borderRadius: '0.375rem', marginBottom: '0.75rem' }}>
            <input 
              type="text"
              placeholder="Name"
              value={otcName} 
              onChange={(e) => setOtcName(e.target.value)}
              style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', marginBottom: '0.25rem' }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <select 
                value={otcCategory} 
                onChange={(e) => setOtcCategory(e.target.value)}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <input 
                type="number" 
                step="0.01"
                placeholder="Amount"
                value={otcAmount}
                onFocus={selectAllOnFocus}
                onChange={(e) => setOtcAmount(Number(e.target.value))}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <input 
                type="date"
                value={otcDueDate} 
                onChange={(e) => setOtcDueDate(e.target.value)}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              />
              
              <select 
                value={otcAccountId} 
                onChange={(e) => setOtcAccountId(e.target.value)}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <button 
              onClick={addOneTimeCost}
              style={{ width: '100%', padding: '0.375rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              Add One-Time Cost
            </button>
          </div>

          {/* List */}
          {oneTimeCosts
            .filter(o => selectedCats.includes(o.category))
            .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(otc => (
              <div key={otc.id} style={{ 
                background: otc.ignored ? '#f3f4f6' : '#f9fafb', 
                padding: '0.5rem', 
                borderRadius: '0.375rem',
                marginBottom: '0.375rem',
                opacity: otc.ignored ? 0.6 : 1,
                position: 'relative'
              }}>
                {otc.ignored && (
                  <div style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    background: '#6b7280',
                    color: 'white',
                    fontSize: '0.5rem',
                    padding: '0.125rem 0.25rem',
                    borderRadius: '0.125rem'
                  }}>
                    IGNORED
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{otc.name}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(otc.amount)}</span>
                </div>
                <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                  Due {otc.dueDate} • {otc.category}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                    <input 
                      type="checkbox" 
                      checked={!!otc.paid} 
                      onChange={() => toggleOneTimePaid(otc)} 
                    />
                    {otc.paid ? 'Paid' : 'Unpaid'}
                  </label>
                  <button 
                    onClick={() => setEditingOTC(otc)}
                    style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleOTCIgnored(otc)}
                    style={{ padding: '0.125rem 0.25rem', background: otc.ignored ? '#10b981' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                  >
                    {otc.ignored ? 'Unignore' : 'Ignore'}
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Mobile Categories */}
        <div style={mobileStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Categories</h3>
            <button 
              onClick={() => setShowIgnored(v => !v)}
              style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              {showIgnored ? 'Hide' : 'Show'} ignored
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
            <input 
              id="newCat"
              placeholder="New category" 
              style={{ flex: 1, padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            />
            <button 
              onClick={() => {
                const el = document.getElementById('newCat');
                if(el?.value){ addCategory(el.value); el.value = ''; }
              }}
              style={{ padding: '0.375rem 0.75rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              Add
            </button>
          </div>
          
          {categories
            .filter(c => showIgnored || !c.ignored)
            .sort((a,b) => (a.order || 0) - (b.order || 0))
            .map(cat => (
              <div key={cat.id} style={{ 
                background: '#f9fafb', 
                padding: '0.5rem', 
                borderRadius: '0.375rem', 
                marginBottom: '0.375rem',
                opacity: cat.ignored ? 0.5 : 1
              }}>
                {editingCategoryId === cat.id ? (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      type="text"
                      defaultValue={cat.name}
                      onFocus={selectAllOnFocus}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameCategory(cat.id, e.target.value);
                          setEditingCategoryId(null);
                        } else if (e.key === 'Escape') {
                          setEditingCategoryId(null);
                        }
                      }}
                      style={{ flex: 1, padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.target.previousSibling;
                        renameCategory(cat.id, input.value);
                        setEditingCategoryId(null);
                      }}
                      style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.625rem' }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{cat.name}</span>
                      <span style={{ 
                        padding: '0.125rem 0.375rem', 
                        background: cat.ignored ? 'white' : '#059669', 
                        color: cat.ignored ? '#6b7280' : 'white',
                        border: cat.ignored ? '1px solid #d1d5db' : 'none',
                        borderRadius: '9999px', 
                        fontSize: '0.625rem' 
                      }}>
                        {cat.ignored ? 'Ignored' : 'Active'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => moveCategoryUp(cat.id)}
                        style={{ padding: '0.125rem 0.25rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveCategoryDown(cat.id)}
                        style={{ padding: '0.125rem 0.25rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(cat.id)}
                        style={{ padding: '0.125rem 0.25rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Rename
                      </button>
                      <button 
                        onClick={() => toggleIgnoreCategory(cat.name)}
                        style={{ padding: '0.125rem 0.25rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        {cat.ignored ? 'Unignore' : 'Ignore'}
                      </button>
                      <button 
                        onClick={() => removeCategory(cat.name)}
                        style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>

        {/* Dialogs */}
        {showAuth && <AuthDialog email={email} setEmail={setEmail} password={password} setPassword={setPassword} isSignUp={isSignUp} setIsSignUp={setIsSignUp} authLoading={authLoading} onClose={() => setShowAuth(false)} onAuth={handleAuth} supabase={supabase} />}
        {showAddAccount && <AddAccountDialog onClose={() => setShowAddAccount(false)} onAdd={(acc) => { setMasterState(prev => ({...prev, accounts: [...prev.accounts, acc]})); setShowAddAccount(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {showAddBill && <AddBillDialog categories={activeCats} accounts={accounts} onClose={() => setShowAddBill(false)} onAdd={(bill) => { setMasterState(prev => ({...prev, bills: [...prev.bills, bill]})); setShowAddBill(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingBill && <EditBillDialog bill={editingBill} categories={activeCats} accounts={accounts} onClose={() => setEditingBill(null)} onSave={(updates) => { setMasterState(prev => ({...prev, bills: prev.bills.map(b => b.id === editingBill.id ? {...b, ...updates} : b)})); setEditingBill(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingOTC && <EditOTCDialog otc={editingOTC} categories={activeCats} accounts={accounts} onClose={() => setEditingOTC(null)} onSave={(updates) => { setMasterState(prev => ({...prev, oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? {...o, ...updates} : o)})); setEditingOTC(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingAccount && <EditAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(updates) => { setMasterState(prev => ({...prev, accounts: prev.accounts.map(a => a.id === editingAccount.id ? {...a, ...updates} : a)})); setEditingAccount(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {showSnapshots && <SnapshotsDialog snapshots={nwHistory} onClose={() => setShowSnapshots(false)} fmt={fmt} />}
      </div>
    );
  }

  // Desktop Version
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header with Cloud Status */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            💰 Cashfl0.io 💰
          </h1>
          <p style={{ color: '#4b5563' }}>Complete financial management system</p>
          
          {/* Cloud Status Bar */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  {isSyncing ? (
                    <>
                      <span>🔄</span>
                      <span style={{ fontSize: '0.875rem' }}>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>☁️</span>
                      <span style={{ fontSize: '0.875rem' }}>Synced to cloud</span>
                      {lastSyncTime && (
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          ({new Date(lastSyncTime).toLocaleTimeString()})
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{user.email}</span>
                  <button
                    onClick={handleLogout}
                    style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <span>💾</span>
                  <span style={{ fontSize: '0.875rem', color: '#92400e' }}>Local storage only</span>
                </div>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                >
                  Login for Cloud Sync
                </button>
              </>
            )}
            
            {/* Undo/Redo Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={undoRedo.undo}
                disabled={!undoRedo.canUndo}
                title="Ctrl+Z"
                style={{ padding: '0.5rem 1rem', background: undoRedo.canUndo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: undoRedo.canUndo ? 'pointer' : 'not-allowed' }}
              >
                ↶ Undo
              </button>
              <button
                onClick={undoRedo.redo}
                disabled={!undoRedo.canRedo}
                title="Ctrl+Alt+Z"
                style={{ padding: '0.5rem 1rem', background: undoRedo.canRedo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: undoRedo.canRedo ? 'pointer' : 'not-allowed' }}
              >
                ↷ Redo
              </button>
            </div>
          </div>
        </div>

        {/* Money Needed This Week Card */}
        <div style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #2563eb 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Money Needed This Week</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>📈</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Need to Earn (after using savings)</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: weekNeedWithSavings === 0 ? '#10b981' : 'white' }}>
                {fmt(weekNeedWithSavings)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                {weekNeedWithSavings === 0 ? 'Fully covered by current balances!' : `After using ${fmt(currentLiquid)} in accounts`}
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>🏦</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Current Total Balance</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                {fmt(currentLiquid)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Across all accounts
              </div>
            </div>
          </div>
        </div>

        {/* Net Worth Card */}
        <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💰</span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Net Worth</h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select 
                value={netWorthMode} 
                onChange={(e) => setNetWorthMode(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
              >
                <option value="current">Current</option>
                <option value="afterWeek">After This Week</option>
                <option value="afterMonth">After This Month</option>
              </select>
              <div style={{ fontSize: '1.5rem', fontWeight: '600', color: netWorthValue < 0 ? '#dc2626' : '#059669' }}>
                {fmt(netWorthValue)}
              </div>
              <button 
                onClick={() => setNwHistory(prev=>[...prev,{ ts:Date.now(), current:currentLiquid, afterWeek: afterWeek, afterMonth: afterMonth, reason:'manual' }])}
                style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                Save snapshot
              </button>
              <button 
                onClick={() => setShowSnapshots(true)}
                style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                📊 Snapshots
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', ...activeCats].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  background: selectedCat === cat ? '#1f2937' : 'white',
                  color: selectedCat === cat ? 'white' : '#374151',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts and Due Items */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* Accounts */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Accounts</h3>
              <button 
                onClick={() => setShowAddAccount(true)}
                style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                ➕ Add Account
              </button>
            </div>
            
            {accounts.map(account => (
              <div key={account.id} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ padding: '0.125rem 0.5rem', background: account.type === 'Cash' ? '#f3f4f6' : '#dbeafe', borderRadius: '9999px', fontSize: '0.75rem' }}>
                      {account.type}
                    </span>
                    <span style={{ fontWeight: '500' }}>{account.name}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={account.balance}
                    onFocus={selectAllOnFocus}
                    onChange={(e) => setMasterState(prev => ({
                      ...prev,
                      accounts: prev.accounts.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a)
                    }))}
                    style={{ width: '100px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  />
                  <button onClick={() => setEditingAccount(account)} style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                    ✏️
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm(`Delete account "${account.name}"?`)){
                        setMasterState(prev => ({
                          ...prev,
                          accounts: prev.accounts.filter(a => a.id !== account.id)
                        }));
                      }
                    }}
                    style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Due & Overdue */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Due & Overdue (next 7 days)</h3>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                Total: {fmt(upcoming.items
                  .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category))
                  .reduce((sum, it) => sum + (it.bill ? it.bill.amount : it.otc.amount), 0)
                )}
              </div>
            </div>

            {(() => {
              const filteredItems = upcoming.items.filter(it => 
                selectedCats.includes(it.bill ? it.bill.category : it.otc.category)
              );
              
              if(filteredItems.length === 0) {
                return <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>Nothing due or overdue this week.</div>;
              }
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredItems.map((it, idx) => {
                    const name = it.bill ? it.bill.name : it.otc.name;
                    const amt = it.bill ? it.bill.amount : it.otc.amount;
                    const category = it.bill ? it.bill.category : it.otc.category;
                    const overdue = it.overdue;
                    
                    return (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.75rem', 
                        borderRadius: '0.5rem', 
                        border: `1px solid ${overdue ? '#fca5a5' : '#d1d5db'}`,
                        background: overdue ? '#fef2f2' : 'white'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {it.due.toLocaleDateString()} • {fmt(amt)} • {category}
                          </div>
                        </div>
                        <button
                          onClick={() => it.bill ? togglePaid(it.bill) : toggleOneTimePaid(it.otc)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          Mark Paid
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Bills Management */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
              Bills ({(() => {
                const [year, month] = activeMonth.split('-');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return `${monthNames[parseInt(month) - 1]} ${year}`;
              })()})
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <input 
                  type="checkbox" 
                  checked={autoDeductCash} 
                  onChange={(e) => setAutoDeductCash(e.target.checked)} 
                />
                Auto-deduct Cash when marking paid
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem' }}>Month</label>
                <input 
                  type="month" 
                  value={activeMonth} 
                  onChange={(e) => setActiveMonth(e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>
              <button 
                onClick={() => setShowAddBill(true)}
                style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                ➕ Add Bill
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {bills
              .filter(b => selectedCats.includes(b.category))
              .sort((a,b) => {
                if (a.frequency === 'yearly' && b.frequency !== 'yearly') return 1;
                if (a.frequency !== 'yearly' && b.frequency === 'yearly') return -1;
                const aDate = getNextOccurrence(a);
                const bDate = getNextOccurrence(b);
                return aDate - bDate;
              })
              .map(bill => {
                const account = accounts.find(a => a.id === bill.accountId);
                const isPaid = bill.paidMonths.includes(activeMonth);
                const isSkipped = bill.skipMonths?.includes(activeMonth);
                const nextDate = getNextOccurrence(bill);
                
                return (
                  <div key={bill.id} style={{ 
                    background: bill.ignored ? '#f3f4f6' : '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    border: `2px solid ${isPaid ? '#10b981' : isSkipped ? '#f59e0b' : '#e5e7eb'}`,
                    opacity: bill.ignored ? 0.6 : 1,
                    position: 'relative'
                  }}>
                    {bill.ignored && (
                      <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#6b7280',
                        color: 'white',
                        fontSize: '0.625rem',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem'
                      }}>
                        IGNORED
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{bill.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {bill.frequency === 'monthly' ? `Due: ${bill.dueDay}` : 
                           bill.frequency === 'yearly' ? `Yearly: ${['January','February','March','April','May','June','July','August','September','October','November','December'][bill.yearlyMonth || 0]} ${bill.dueDay || 1}` :
                           bill.frequency === 'weekly' ? (
                             bill.weeklySchedule === 'every' ? 
                             `Every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][bill.weeklyDay || 0]}` :
                             `${bill.weeklySchedule} ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][bill.weeklyDay || 0]} of month`
                           ) :
                           bill.frequency === 'biweekly' ? `Bi-weekly from ${new Date(bill.biweeklyStart || Date.now()).toLocaleDateString()}` :
                           'Monthly'} • {fmt(bill.amount)} • {account?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Next: {nextDate.toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setEditingBill(bill)}
                          style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleBillIgnored(bill)}
                          style={{ padding: '0.25rem 0.5rem', background: bill.ignored ? '#10b981' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          {bill.ignored ? '👁️' : '👁️'}
                        </button>
                        <button
                          onClick={() => deleteBill(bill.id)}
                          style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isPaid} 
                            onChange={() => togglePaid(bill)} 
                          />
                          <span style={{ fontSize: '0.875rem' }}>
                            {isPaid ? '✅ Paid' : '❌ Not paid'}
                          </span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input 
                            type="checkbox" 
                            checked={!!isSkipped} 
                            onChange={() => toggleSkipThisMonth(bill)} 
                          />
                          <span style={{ fontSize: '0.875rem' }}>Skip this month</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            {bills.filter(b => selectedCats.includes(b.category)).length === 0 && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No bills in this category yet. Use "Add Bill" to create one.</div>
            )}
          </div>
        </div>

        {/* One-Time Costs */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Add One-Time Cost</h3>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Name</label>
              <input 
                type="text"
                value={otcName} 
                onChange={(e) => setOtcName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            
            <div style={{ minWidth: '140px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Category</label>
              <select 
                value={otcCategory} 
                onChange={(e) => setOtcCategory(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {activeCats.sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div style={{ minWidth: '100px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Amount</label>
              <input 
                type="number" 
                step="0.01"
                value={otcAmount}
                onFocus={selectAllOnFocus}
                onChange={(e) => setOtcAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            
            <div style={{ minWidth: '140px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Due Date</label>
              <input 
                type="date"
                value={otcDueDate} 
                onChange={(e) => setOtcDueDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            
            <div style={{ minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Account</label>
              <select 
                value={otcAccountId} 
                onChange={(e) => setOtcAccountId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <div style={{ minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Notes</label>
              <input 
                type="text"
                value={otcNotes} 
                onChange={(e) => setOtcNotes(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            
            <button 
              onClick={addOneTimeCost}
              style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>

          {/* One-Time Costs List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {selectedCats.map(cat => (
              <div key={cat} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>{cat}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {oneTimeCosts
                    .filter(o => o.category === cat)
                    .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map(otc => (
                      <div key={otc.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid #d1d5db',
                        background: otc.ignored ? '#f3f4f6' : 'white',
                        opacity: otc.ignored ? 0.6 : 1,
                        position: 'relative'
                      }}>
                        {otc.ignored && (
                          <div style={{
                            position: 'absolute',
                            top: '0.25rem',
                            right: '0.25rem',
                            background: '#6b7280',
                            color: 'white',
                            fontSize: '0.5rem',
                            padding: '0.125rem 0.25rem',
                            borderRadius: '0.125rem'
                          }}>
                            IGNORED
                          </div>
                        )}
                        
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{otc.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Due {otc.dueDate} • {fmt(otc.amount)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input 
                              type="checkbox" 
                              checked={!!otc.paid} 
                              onChange={() => toggleOneTimePaid(otc)} 
                            />
                            <span style={{ fontSize: '0.875rem' }}>
                              {otc.paid ? 'Paid' : 'Unpaid'}
                            </span>
                          </label>
                          <button 
                            onClick={() => setEditingOTC(otc)}
                            style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => toggleOTCIgnored(otc)}
                            style={{ padding: '0.25rem 0.5rem', background: otc.ignored ? '#10b981' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            {otc.ignored ? 'Unignore' : 'Ignore'}
                          </button>
                          <button 
                            onClick={() => deleteOneTimeCost(otc.id)}
                            style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  {oneTimeCosts.filter(o => o.category === cat).length === 0 && (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No one-time costs.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Management */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Categories</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                id="newCat"
                placeholder="New category" 
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', width: '200px' }}
              />
              <button 
                onClick={() => {
                  const el = document.getElementById('newCat');
                  if(el?.value){ addCategory(el.value); el.value = ''; }
                }}
                style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                ➕ Add
              </button>
              <button 
                onClick={() => setShowIgnored(v => !v)}
                style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                👁️ {showIgnored ? 'Hide ignored' : 'Show ignored'}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {categories
              .filter(c => showIgnored || !c.ignored)
              .sort((a,b) => (a.order || 0) - (b.order || 0))
              .map(cat => (
                <div key={cat.id} style={{ 
                  background: '#f9fafb', 
                  padding: '1rem', 
                  borderRadius: '0.5rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  opacity: cat.ignored ? 0.5 : 1
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span style={{ 
                      padding: '0.125rem 0.5rem', 
                      background: cat.ignored ? 'white' : '#059669', 
                      color: cat.ignored ? '#6b7280' : 'white',
                      border: cat.ignored ? '1px solid #d1d5db' : 'none',
                      borderRadius: '9999px', 
                      fontSize: '0.75rem' 
                    }}>
                      {cat.ignored ? 'Ignored' : 'Active'}
                    </span>
                    {editingCategoryId === cat.id ? (
                      <input
                        type="text"
                        defaultValue={cat.name}
                        onFocus={selectAllOnFocus}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameCategory(cat.id, e.target.value);
                            setEditingCategoryId(null);
                          } else if (e.key === 'Escape') {
                            setEditingCategoryId(null);
                          }
                        }}
                        onBlur={(e) => {
                          renameCategory(cat.id, e.target.value);
                          setEditingCategoryId(null);
                        }}
                        style={{ padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      />
                    ) : (
                      <span onClick={() => setEditingCategoryId(cat.id)} style={{ cursor: 'pointer' }}>
                        {cat.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => moveCategoryUp(cat.id)}
                      style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ↑
                    </button>
                    <button 
                      onClick={() => moveCategoryDown(cat.id)}
                      style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ↓
                    </button>
                    <button 
                      onClick={() => setEditingCategoryId(cat.id)}
                      style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => toggleIgnoreCategory(cat.name)}
                      style={{ padding: '0.25rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      {cat.ignored ? 'Unignore' : 'Ignore'}
                    </button>
                    <button 
                      onClick={() => removeCategory(cat.name)}
                      style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Dialogs */}
        {showAuth && <AuthDialog email={email} setEmail={setEmail} password={password} setPassword={setPassword} isSignUp={isSignUp} setIsSignUp={setIsSignUp} authLoading={authLoading} onClose={() => setShowAuth(false)} onAuth={handleAuth} supabase={supabase} />}
        {showAddAccount && <AddAccountDialog onClose={() => setShowAddAccount(false)} onAdd={(acc) => { setMasterState(prev => ({...prev, accounts: [...prev.accounts, acc]})); setShowAddAccount(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {showAddBill && <AddBillDialog categories={activeCats} accounts={accounts} onClose={() => setShowAddBill(false)} onAdd={(bill) => { setMasterState(prev => ({...prev, bills: [...prev.bills, bill]})); setShowAddBill(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingBill && <EditBillDialog bill={editingBill} categories={activeCats} accounts={accounts} onClose={() => setEditingBill(null)} onSave={(updates) => { setMasterState(prev => ({...prev, bills: prev.bills.map(b => b.id === editingBill.id ? {...b, ...updates} : b)})); setEditingBill(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingOTC && <EditOTCDialog otc={editingOTC} categories={activeCats} accounts={accounts} onClose={() => setEditingOTC(null)} onSave={(updates) => { setMasterState(prev => ({...prev, oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? {...o, ...updates} : o)})); setEditingOTC(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingAccount && <EditAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(updates) => { setMasterState(prev => ({...prev, accounts: prev.accounts.map(a => a.id === editingAccount.id ? {...a, ...updates} : a)})); setEditingAccount(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {showSnapshots && <SnapshotsDialog snapshots={nwHistory} onClose={() => setShowSnapshots(false)} fmt={fmt} />}
      </div>
    </div>
  );
}

// ===================== MAIN EXPORT WITH ERROR BOUNDARY =====================
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>💵</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Due (without using savings)</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                {fmt(weekNeedWithoutSavings)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Full amount due this week
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>💵</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Due (without using savings)</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                {fmt(weekNeedWithoutSavings)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Full amount due this week
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>📈</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Need to Earn (after using savings)</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: weekNeedWithSavings === 0 ? '#10b981' : 'white' }}>
                {fmt(weekNeedWithSavings)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                {weekNeedWithSavings === 0 ? 'Fully covered by current balances!' : `After using ${fmt(currentLiquid)} in accounts`}
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>🏦</span>
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Current Total Balance</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                {fmt(currentLiquid)}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                Across all accounts
              </div>
            </div>
          </div>
        </div>

        {/* Rest of desktop version continues exactly as shown in the original artifact */}
      </div>
    </div>
  );
}

// ===================== MAIN EXPORT WITH ERROR BOUNDARY =====================
export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
