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
  const [categoriesBase, setCategoriesBase] = useCloudState(
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
  const [accountsBase, setAccountsBase] = useCloudState(
    `${storageKey}:accounts`,
    [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ],
    user,
    supabase
  );
  
  const [billsBase, setBillsBase] = useCloudState(`${storageKey}:bills`, [], user, supabase);
  const [oneTimeCostsBase, setOneTimeCostsBase] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [nwHistory, setNwHistory] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

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
  const [autoDeductCash, setAutoDeductCash] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states - NO MORE MONTH PICKER
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
  const isSyncing = categoriesBase[2]?.syncing || accountsBase[2]?.syncing || billsBase[2]?.syncing || oneTimeCostsBase[2]?.syncing || nwHistory[2]?.syncing;
  
  // Get last sync time
  const lastSyncTime = React.useMemo(() => {
    const times = [categoriesBase[2]?.lastSync, accountsBase[2]?.lastSync, billsBase[2]?.lastSync, oneTimeCostsBase[2]?.lastSync, nwHistory[2]?.lastSync]
      .filter(t => t !== null);
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map(t => t.getTime())));
  }, [categoriesBase, accountsBase, billsBase, oneTimeCostsBase, nwHistory]);

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
      const currentMonth = yyyyMm();

      for(const b of bills){
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue;
        
        const nextDate = getNextOccurrence(b, now);
        const paid = b.paidMonths.includes(currentMonth) && (b.frequency === 'monthly' || b.frequency === 'yearly');
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
  }, [accounts, bills, oneTimeCosts, activeCats]);

  const monthUnpaidTotal = React.useMemo(()=>{
    try {
      const currentMonth = yyyyMm();
      let sum = 0;
      for(const b of bills){ 
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue; 
        if(!b.paidMonths.includes(currentMonth)) sum += Number(b.amount) || 0; 
      }
      for(const o of oneTimeCosts){ 
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue; 
        if(o.dueDate.slice(0,7)===currentMonth && !o.paid) sum += Number(o.amount) || 0; 
      }
      return sum;
    } catch (error) {
      console.error('Error calculating month unpaid total:', error);
      return 0;
    }
  },[bills, oneTimeCosts, activeCats]);

  const afterWeek = currentLiquid - upcoming.weekDueTotal;
  const afterMonth = currentLiquid - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquid : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquid);

  const selectedCats = selectedCat==='All' ? 
    // When "All" is selected, show bills from ALL categories (even if category is missing/ignored)
    [...activeCats, ...bills.map(b => b.category).filter(cat => !activeCats.includes(cat))] : 
    activeCats.filter(c=> c===selectedCat);

  // Analytics data calculations
  const accountBalanceData = React.useMemo(() => {
    return accounts
      .filter(a => a.balance > 0)
      .map(a => ({
        name: a.name,
        value: a.balance,
        type: a.type
      }));
  }, [accounts]);

  const categorySpendingData = React.useMemo(() => {
    const categoryTotals = {};
    
    // Sum up bills by category
    bills.forEach(bill => {
      if (!bill.ignored && activeCats.includes(bill.category)) {
        categoryTotals[bill.category] = (categoryTotals[bill.category] || 0) + bill.amount;
      }
    });
    
    // Sum up one-time costs by category
    oneTimeCosts.forEach(otc => {
      if (!otc.ignored && !otc.paid && activeCats.includes(otc.category)) {
        categoryTotals[otc.category] = (categoryTotals[otc.category] || 0) + otc.amount;
      }
    });
    
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bills, oneTimeCosts, activeCats]);

  // Net worth trend data
  const netWorthTrend = React.useMemo(() => {
    const trend = [...nwHistory];
    // Add current point
    trend.push({
      ts: Date.now(),
      current: currentLiquid,
      afterWeek,
      afterMonth,
      reason: 'current'
    });
    
    return trend
      .sort((a, b) => a.ts - b.ts)
      .slice(-10) // Last 10 data points
      .map(snap => ({
        date: new Date(snap.ts).toLocaleDateString(),
        current: snap.current,
        afterWeek: snap.afterWeek,
        afterMonth: snap.afterMonth
      }));
  }, [nwHistory, currentLiquid, afterWeek, afterMonth]);

  // Actions with error handling
  function togglePaid(b){
    try {
      const currentMonth = yyyyMm();
      const isPaid = b.paidMonths.includes(currentMonth);
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          paidMonths: isPaid? x.paidMonths.filter(m=>m!==currentMonth) : [...x.paidMonths, currentMonth] 
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
      const currentMonth = yyyyMm();
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          skipMonths: x.skipMonths?.includes(currentMonth) ? 
            x.skipMonths.filter(m=>m!==currentMonth) : 
            [ ...(x.skipMonths||[]), currentMonth ] 
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
        
        // Ensure all categories have order values
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        
        // Sort by current order
        cats.sort((a, b) => a.order - b.order);
        
        // Find the category to move
        const index = cats.findIndex(c => c.id === id);
        
        // Can't move the first item up
        if (index <= 0) return prev;
        
        // Swap positions in the array
        const temp = cats[index];
        cats[index] = cats[index - 1];
        cats[index - 1] = temp;
        
        // Reassign sequential order values
        cats.forEach((c, i) => {
          c.order = i;
        });
        
        return { ...prev, categories: cats };
      });
      notify('Category moved up', 'success');
    } catch (error) {
      console.error('Error moving category up:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  function moveCategoryDown(id) {
    try {
      setMasterState(prev => {
        const cats = [...prev.categories];
        
        // Ensure all categories have order values
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        
        // Sort by current order
        cats.sort((a, b) => a.order - b.order);
        
        // Find the category to move
        const index = cats.findIndex(c => c.id === id);
        
        // Can't move the last item down
        if (index < 0 || index >= cats.length - 1) return prev;
        
        // Swap positions in the array
        const temp = cats[index];
        cats[index] = cats[index + 1];
        cats[index + 1] = temp;
        
        // Reassign sequential order values
        cats.forEach((c, i) => {
          c.order = i;
        });
        
        return { ...prev, categories: cats };
      });
      notify('Category moved down', 'success');
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

  const selectAllOnFocus = (e) => {
    e.target.select();
  };

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '0.75rem' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
            💰 Cashfl0.io 💰
          </h1>
          
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
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
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

        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.25rem', background: 'white', padding: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
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

        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>All Bills - NO MONTH PICKER!</h3>
          
          {bills
            .filter(b => selectedCats.includes(b.category))
            .sort((a,b) => {
              const aDate = getNextOccurrence(a);
              const bDate = getNextOccurrence(b);
              return aDate - bDate;
            })
            .map(bill => {
              const account = accounts.find(a => a.id === bill.accountId);
              const isPaid = bill.paidMonths.includes(yyyyMm());
              const nextDate = getNextOccurrence(bill);
              
              return (
                <div key={bill.id} style={{ 
                  background: '#f9fafb', 
                  padding: '0.5rem', 
                  borderRadius: '0.375rem',
                  border: `2px solid ${isPaid ? '#10b981' : '#e5e7eb'}`,
                  marginBottom: '0.375rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{bill.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                    {bill.frequency} • {account?.name} • Next: {nextDate.toLocaleDateString()}
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
                    <button
                      onClick={() => deleteBill(bill.id)}
                      style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            <button 
              onClick={() => setShowAddBill(true)}
              style={{ width: '100%', padding: '0.5rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
            >
              + Add Bill
            </button>
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Analytics - Pie Charts</h3>
          
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Account Balances</h4>
            {accountBalanceData.length > 0 ? (
              <>
                <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    {(() => {
                      const total = accountBalanceData.reduce((sum, item) => sum + item.value, 0);
                      let currentAngle = 0;
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                      
                      return accountBalanceData.map((item, index) => {
                        const percentage = item.value / total;
                        const angle = percentage * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        currentAngle = endAngle;
                        
                        const startRadians = (startAngle - 90) * Math.PI / 180;
                        const endRadians = (endAngle - 90) * Math.PI / 180;
                        
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        const x1 = 100 + 80 * Math.cos(startRadians);
                        const y1 = 100 + 80 * Math.sin(startRadians);
                        const x2 = 100 + 80 * Math.cos(endRadians);
                        const y2 = 100 + 80 * Math.sin(endRadians);
                        
                        const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        
                        return (
                          <path
                            key={index}
                            d={pathData}
                            fill={colors[index % colors.length]}
                            stroke="white"
                            strokeWidth="2"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {accountBalanceData.map((item, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                        <span>{item.name}: {fmt(item.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No account data</div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Category Spending</h4>
            {categorySpendingData.length > 0 ? (
              <>
                <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    {(() => {
                      const total = categorySpendingData.reduce((sum, item) => sum + item.value, 0);
                      let currentAngle = 0;
                      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
                      
                      return categorySpendingData.map((item, index) => {
                        const percentage = item.value / total;
                        const angle = percentage * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        currentAngle = endAngle;
                        
                        const startRadians = (startAngle - 90) * Math.PI / 180;
                        const endRadians = (endAngle - 90) * Math.PI / 180;
                        
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        const x1 = 100 + 80 * Math.cos(startRadians);
                        const y1 = 100 + 80 * Math.sin(startRadians);
                        const x2 = 100 + 80 * Math.cos(endRadians);
                        const y2 = 100 + 80 * Math.sin(endRadians);
                        
                        const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        
                        return (
                          <path
                            key={index}
                            d={pathData}
                            fill={colors[index % colors.length]}
                            stroke="white"
                            strokeWidth="2"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {categorySpendingData.map((item, index) => {
                    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                        <span>{item.name}: {fmt(item.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No spending data</div>
            )}
          </div>
        </div>

        {showAuth && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '1rem' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
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
                <button onClick={handleAuth} disabled={authLoading} style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                </button>
                <button onClick={() => setShowAuth(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Cancel
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline' }}>
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '1rem' }}>Add Bill</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newBill = {
                  id: crypto.randomUUID(),
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  frequency: formData.get('frequency'),
                  dueDay: Number(formData.get('dueDay')),
                  accountId: formData.get('accountId'),
                  paidMonths: [],
                  skipMonths: [],
                  ignored: false
                };
                setMasterState(prev => ({...prev, bills: [...prev.bills, newBill]}));
                setShowAddBill(false);
                notify('Bill added successfully!');
              }}>
                <input name="name" placeholder="Bill name" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="category" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="frequency" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <input name="dueDay" type="number" min="1" max="28" placeholder="Due day" defaultValue="1" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="accountId" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Bill</button>
                  <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Version - NO MONTH PICKER ANYWHERE
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            💰 Cashfl0.io 💰
          </h1>
          <p style={{ color: '#4b5563' }}>Complete financial management system - NO MONTH PICKER!</p>
        </div>

        <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
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

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Analytics with Pie Charts</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center' }}>Where Your Money Is</h4>
              {accountBalanceData.length > 0 ? (
                <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '300px', height: '300px' }}>
                    <svg width="300" height="300" viewBox="0 0 300 300">
                      {(() => {
                        const total = accountBalanceData.reduce((sum, item) => sum + item.value, 0);
                        let currentAngle = 0;
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                        
                        return accountBalanceData.map((item, index) => {
                          const percentage = item.value / total;
                          const angle = percentage * 360;
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;
                          
                          const startRadians = (startAngle - 90) * Math.PI / 180;
                          const endRadians = (endAngle - 90) * Math.PI / 180;
                          
                          const largeArcFlag = angle > 180 ? 1 : 0;
                          const x1 = 150 + 100 * Math.cos(startRadians);
                          const y1 = 150 + 100 * Math.sin(startRadians);
                          const x2 = 150 + 100 * Math.cos(endRadians);
                          const y2 = 150 + 100 * Math.sin(endRadians);
                          
                          const pathData = `M 150 150 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                          
                          return (
                            <g key={index}>
                              <path
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="2"
                              />
                              <text
                                x={150 + 70 * Math.cos((startAngle + endAngle - 180) / 2 * Math.PI / 180)}
                                y={150 + 70 * Math.sin((startAngle + endAngle - 180) / 2 * Math.PI / 180)}
                                textAnchor="middle"
                                fill="white"
                                fontSize="12"
                                fontWeight="bold"
                              >
                                {percentage > 0.1 ? `${(percentage * 100).toFixed(0)}%` : ''}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                  No account balances to display
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {accountBalanceData.map((item, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '2px' }}></div>
                      <span style={{ fontSize: '0.875rem' }}>{item.name}: {fmt(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center' }}>Spending by Category</h4>
              {categorySpendingData.length > 0 ? (
                <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '300px', height: '300px' }}>
                    <svg width="300" height="300" viewBox="0 0 300 300">
                      {(() => {
                        const total = categorySpendingData.reduce((sum, item) => sum + item.value, 0);
                        let currentAngle = 0;
                        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4'];
                        
                        return categorySpendingData.map((item, index) => {
                          const percentage = item.value / total;
                          const angle = percentage * 360;
                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;
                          
                          const startRadians = (startAngle - 90) * Math.PI / 180;
                          const endRadians = (endAngle - 90) * Math.PI / 180;
                          
                          const largeArcFlag = angle > 180 ? 1 : 0;
                          const x1 = 150 + 100 * Math.cos(startRadians);
                          const y1 = 150 + 100 * Math.sin(startRadians);
                          const x2 = 150 + 100 * Math.cos(endRadians);
                          const y2 = 150 + 100 * Math.Sin(endRadians);
                          
                          const pathData = `M 150 150 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                          
                          return (
                            <g key={index}>
                              <path
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="2"
                              />
                              <text
                                x={150 + 70 * Math.cos((startAngle + endAngle - 180) / 2 * Math.PI / 180)}
                                y={150 + 70 * Math.sin((startAngle + endAngle - 180) / 2 * Math.PI / 180)}
                                textAnchor="middle"
                                fill="white"
                                fontSize="12"
                                fontWeight="bold"
                              >
                                {percentage > 0.1 ? `${(percentage * 100).toFixed(0)}%` : ''}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>
              ) : (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                  No spending data to display
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {categorySpendingData.map((item, index) => {
                  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4'];
                  return (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '2px' }}></div>
                      <span style={{ fontSize: '0.875rem' }}>{item.name}: {fmt(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>All Bills (NO MONTH PICKER!)</h3>
            <button 
              onClick={() => setShowAddBill(true)}
              style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
            >
              ➕ Add Bill
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {bills
              .filter(b => selectedCats.includes(b.category))
              .sort((a,b) => {
                const aDate = getNextOccurrence(a);
                const bDate = getNextOccurrence(b);
                return aDate - bDate;
              })
              .map(bill => {
                const account = accounts.find(a => a.id === bill.accountId);
                const isPaid = bill.paidMonths.includes(yyyyMm());
                const nextDate = getNextOccurrence(bill);
                
                return (
                  <div key={bill.id} style={{ 
                    background: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    border: `2px solid ${isPaid ? '#10b981' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{bill.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {bill.frequency} • {fmt(bill.amount)} • {account?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Next: {nextDate.toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => deleteBill(bill.id)}
                          style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isPaid} 
                          onChange={() => togglePaid(bill)} 
                        />
                        <span style={{ fontSize: '0.875rem' }}>
                          {isPaid ? '✅ Paid this month' : '❌ Not paid this month'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            {bills.filter(b => selectedCats.includes(b.category)).length === 0 && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No bills in this category yet. Use "Add Bill" to create one.</div>
            )}
          </div>
        </div>

        {showAuth && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '1rem' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
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
                <button onClick={handleAuth} disabled={authLoading} style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                </button>
                <button onClick={() => setShowAuth(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Cancel
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline' }}>
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '500px' }}>
              <h2 style={{ marginBottom: '1rem' }}>Add Bill</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newBill = {
                  id: crypto.randomUUID(),
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  frequency: formData.get('frequency'),
                  dueDay: Number(formData.get('dueDay')),
                  accountId: formData.get('accountId'),
                  paidMonths: [],
                  skipMonths: [],
                  ignored: false
                };
                setMasterState(prev => ({...prev, bills: [...prev.bills, newBill]}));
                setShowAddBill(false);
                notify(`Bill "${newBill.name}" added successfully to ${newBill.category}!`, 'success');
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input name="name" placeholder="Bill name" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                  <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select name="category" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                    {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select name="frequency" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input name="dueDay" type="number" min="1" max="28" placeholder="Due day" defaultValue="1" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                  <select name="accountId" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Bill</button>
                  <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
