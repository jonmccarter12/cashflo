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

// ===================== SINGLETON SUPABASE CLIENT (FIXES MULTIPLE INSTANCES) =====================
let supabaseInstance = null;

function getSupabaseClient() {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }
  return supabaseInstance;
}

// ===================== HELPERS =====================
const currentAppVersion = "3.1"; // Current application data version
const yyyyMm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthKey = yyyyMm();
const clampDue = (d) => Math.max(1, Math.min(28, Math.round(d||1)));
const fmt = (n) => `$${(Math.round((n||0) * 100) / 100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;

const TRANSACTION_LOG_KEY = 'transaction_log'; // Key for the new transaction log

// Data Protection - Create backup of data
function backupData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        version: currentAppVersion
      };
      localStorage.setItem(`${key}_backup`, JSON.stringify(backup));
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }
}

// Data Protection - Save data with versioning and backup
function saveData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      const dataToSave = {
        data: data,
        timestamp: new Date().toISOString(), // Timestamp for this specific local save
        version: currentAppVersion
      };

      // First create a backup of existing data if it exists
      const existingRawData = localStorage.getItem(key);
      if (existingRawData) {
        try {
          const parsedExisting = JSON.parse(existingRawData);
          // Pass the actual content to backupData, whether it was a wrapped object or raw data
          backupData(key, parsedExisting.data !== undefined ? parsedExisting.data : parsedExisting);
        } catch (backupError) {
          console.error('Error parsing existing data for backup:', backupError);
          notify(`Warning: Existing data for '${key}' was corrupted and could not be backed up.`, 'warning');
        }
      }
      
      // Now save the new data wrapper
      localStorage.setItem(key, JSON.stringify(dataToSave));
      return dataToSave; // Return the full wrapped data object
    } catch (error) {
      console.error('Error saving data:', error);
      return null; // Indicate failure by returning null
    }
  }
  return null; // Indicate failure by returning null
}

// Data Protection - Load data with fallback recovery
// Data Protection - Load data with fallback recovery
// Returns { data: T, timestamp: string | null, version: string | null }
function loadData(key, defaultValue) {
  if (typeof window === 'undefined') return { data: defaultValue, timestamp: null, version: null };
  
  try {
    // 1. Try current localStorage
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure it's the new format {data, timestamp, version}, if not, treat as raw data
      if (parsed && parsed.data !== undefined && parsed.timestamp !== undefined) {
        return parsed; // Returns { data, timestamp, version }
      } else {
        // Raw data format: return data only and null timestamp
        console.warn(`Migrating raw local storage data for key: ${key}`);
        return { data: parsed, timestamp: null, version: null };
      }
    }
    
    // 2. Try backup localStorage
    const backup = localStorage.getItem(`${key}_backup`);
    if (backup) {
      const parsedBackup = JSON.parse(backup);
      // Warn if backup version is missing or different from current
      if (!parsedBackup.version || parsedBackup.version !== currentAppVersion) {
        const backupVersion = parsedBackup.version || 'unknown/legacy';
        console.warn(`Recovered backup from an older/unknown version (${backupVersion}) for key: ${key}. Current version is ${currentAppVersion}.`);
        notify(`Recovered data for '${key}' from an older backup version (${backupVersion}). Please review.`, 'warning');
      }
      console.log('Recovered from backup data:', parsedBackup);
      return parsedBackup; // backupData now stores data in a {data, timestamp, version} object
    }
    
    // For transaction_log, we don't handle other legacy keys here.
    // If it's a new key, fall back to default.
    return { data: defaultValue, timestamp: null, version: null };
  } catch (error) {
    console.error('Error loading data:', error);
    return { data: defaultValue, timestamp: null, version: null };
  }
}

async function logTransaction(supabase, userId, type, itemId, payload, description) {
  if (!supabase || !userId) {
    console.error('Supabase client or user ID missing for transaction logging.');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('transaction_log')
      .insert({
        user_id: userId,
        type: type,
        item_id: itemId,
        payload: payload,
        description: description,
        timestamp: new Date().toISOString() // Ensure timestamp is set correctly
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging transaction:', error);
    notify(`Failed to log transaction: ${error.message}`, 'error');
    return null;
  }
}



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
    
    return getNextOccurrence({ ...bill, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
    return new Date();
  }
}

// Calculate next occurrence for recurring income
function getNextIncomeOccurrence(income, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    
    if (income.frequency === 'monthly') {
      date.setDate(clampDue(income.payDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    
    if (income.frequency === 'weekly') {
      const dayOfWeek = income.weeklyDay || 5; // Default to Friday
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      return date;
    }
    
    if (income.frequency === 'biweekly') {
      const baseDate = new Date(income.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    
    if (income.frequency === 'yearly') {
      const payMonth = income.yearlyMonth || 0;
      const payDay = clampDue(income.payDay || 1);
      
      date.setMonth(payMonth);
      date.setDate(payDay);
      
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    
    return getNextIncomeOccurrence({ ...income, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next income occurrence:', error);
    return new Date();
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
  
  // Navigation state
  const [currentView, setCurrentView] = React.useState('dashboard');
  
  // FIXED: Supabase client using singleton pattern
  const supabase = React.useMemo(() => {
    return getSupabaseClient();
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

  // NEW: Transaction log state management
  const [transactions, setTransactions, { syncing: transactionsSyncing, lastSync: transactionsLastSync, syncError: transactionsSyncError }] = useCloudTransactions(user?.id, supabase);
  const [nwHistory, setNwHistory] = useCloudState('nwHistory', [], user?.id, supabase);

  // Derived state from transactions
  const masterState = React.useMemo(() => {
    // This function will process the immutable transaction log
    // and derive the current, mutable state of the application.
    // This is where the core logic of your event-sourced system lives.

    const accounts = new Map();
    const bills = new Map();
    const oneTimeCosts = new Map();
    const categories = new Map();
    const upcomingCredits = new Map();
    const recurringIncome = new Map();
    const incomeHistory = []; // Income history is also derived or logged as separate transactions
    
    // Default categories (initial state if no category transactions exist)
    const initialCategories = [
      { id: crypto.randomUUID(), name: 'Personal', order: 0, budget: 500, ignored: false },
      { id: crypto.randomUUID(), name: 'Studio', order: 1, budget: 1200, ignored: false },
      { id: crypto.randomUUID(), name: 'Smoke Shop', order: 2, budget: 800, ignored: false },
      { id: crypto.randomUUID(), name: 'Botting', order: 3, budget: 300, ignored: false },
    ];
    initialCategories.forEach(cat => categories.set(cat.id, cat));

    // Default accounts
    const initialAccounts = [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ];
    initialAccounts.forEach(acc => accounts.set(acc.id, acc));


    // Process transactions in chronological order
    transactions.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const tx of transactions) {
      switch (tx.type) {
        case 'account_created':
          accounts.set(tx.item_id, { 
            id: tx.item_id, 
            name: tx.payload.name, 
            type: tx.payload.type, 
            balance: tx.payload.initial_balance || 0,
            updatedAt: tx.timestamp // Track for potential individual item merge if needed, though collection is primary
          });
          break;
        case 'account_balance_adjustment':
          if (accounts.has(tx.item_id)) {
            const currentAccount = accounts.get(tx.item_id);
            accounts.set(tx.item_id, {
              ...currentAccount,
              balance: tx.payload.new_balance,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'account_deleted':
            accounts.delete(tx.item_id);
            // Also need to remove associated bills, otc, income, credits
            bills.forEach((bill, id) => { if (bill.accountId === tx.item_id) bills.delete(id); });
            oneTimeCosts.forEach((otc, id) => { if (otc.accountId === tx.item_id) oneTimeCosts.delete(id); });
            recurringIncome.forEach((inc, id) => { if (inc.accountId === tx.item_id) recurringIncome.delete(id); });
            upcomingCredits.forEach((cred, id) => { if (cred.accountId === tx.item_id) upcomingCredits.delete(id); });
            break;
        case 'bill_created':
          bills.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            category: tx.payload.category,
            amount: tx.payload.amount,
            frequency: tx.payload.frequency,
            dueDay: tx.payload.dueDay,
            accountId: tx.payload.accountId,
            notes: tx.payload.notes || '',
            paidMonths: tx.payload.paidMonths || [], // For retroactive history
            skipMonths: [],
            ignored: false,
            updatedAt: tx.timestamp
          });
          break;
        case 'bill_payment':
          if (bills.has(tx.item_id)) {
            const currentBill = bills.get(tx.item_id);
            const month = tx.payload.month;
            const newPaidMonths = tx.payload.is_paid
                ? [...(currentBill.paidMonths || []), month]
                : (currentBill.paidMonths || []).filter(m => m !== month);
            bills.set(tx.item_id, {
                ...currentBill,
                paidMonths: [...new Set(newPaidMonths)], // Ensure unique
                updatedAt: tx.timestamp
            });
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + (tx.payload.is_paid ? -tx.payload.amount : tx.payload.amount)
              });
            }
          }
          break;
        case 'bill_modification':
          if (bills.has(tx.item_id)) {
            const currentBill = bills.get(tx.item_id);
            bills.set(tx.item_id, {
              ...currentBill,
              ...tx.payload.changes, // Apply specific changes
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'bill_ignored_toggled':
          if (bills.has(tx.item_id)) {
            const currentBill = bills.get(tx.item_id);
            bills.set(tx.item_id, {
                ...currentBill,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'bill_deleted':
          bills.delete(tx.item_id);
          break;
        case 'one_time_cost_created':
          oneTimeCosts.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            category: tx.payload.category,
            amount: tx.payload.amount,
            dueDate: tx.payload.dueDate,
            accountId: tx.payload.accountId,
            notes: tx.payload.notes || '',
            paid: false,
            ignored: false,
            updatedAt: tx.timestamp
          });
          break;
        case 'one_time_cost_payment':
          if (oneTimeCosts.has(tx.item_id)) {
            const currentOTC = oneTimeCosts.get(tx.item_id);
            oneTimeCosts.set(tx.item_id, {
                ...currentOTC,
                paid: tx.payload.is_paid,
                updatedAt: tx.timestamp
            });
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + (tx.payload.is_paid ? -tx.payload.amount : tx.payload.amount)
              });
            }
          }
          break;
        case 'one_time_cost_modification':
          if (oneTimeCosts.has(tx.item_id)) {
            const currentOTC = oneTimeCosts.get(tx.item_id);
            oneTimeCosts.set(tx.item_id, {
              ...currentOTC,
              ...tx.payload.changes,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'one_time_cost_ignored_toggled':
          if (oneTimeCosts.has(tx.item_id)) {
            const currentOTC = oneTimeCosts.get(tx.item_id);
            oneTimeCosts.set(tx.item_id, {
                ...currentOTC,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'one_time_cost_deleted':
          oneTimeCosts.delete(tx.item_id);
          break;
        case 'recurring_income_created':
          recurringIncome.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            amount: tx.payload.amount,
            frequency: tx.payload.frequency,
            payDay: tx.payload.payDay,
            weeklyDay: tx.payload.weeklyDay,
            biweeklyStart: tx.payload.biweeklyStart,
            yearlyMonth: tx.payload.yearlyMonth,
            accountId: tx.payload.accountId,
            notes: tx.payload.notes || '',
            ignored: false,
            receivedMonths: [],
            updatedAt: tx.timestamp
          });
          break;
        case 'recurring_income_received':
          if (recurringIncome.has(tx.item_id)) {
            const currentIncome = recurringIncome.get(tx.item_id);
            const month = tx.payload.month;
            const newReceivedMonths = tx.payload.is_received
              ? [...(currentIncome.receivedMonths || []), month]
              : (currentIncome.receivedMonths || []).filter(m => m !== month);
            recurringIncome.set(tx.item_id, {
              ...currentIncome,
              receivedMonths: [...new Set(newReceivedMonths)],
              updatedAt: tx.timestamp
            });
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + (tx.payload.is_received ? tx.payload.amount : -tx.payload.amount)
              });
            }
            if (tx.payload.is_received) {
              incomeHistory.push({
                id: tx.id, // Use transaction ID for history
                date: tx.timestamp,
                source: tx.payload.name,
                amount: tx.payload.amount,
                accountId: tx.payload.accountId,
                type: 'recurring'
              });
            }
          }
          break;
        case 'recurring_income_modification':
          if (recurringIncome.has(tx.item_id)) {
            const currentIncome = recurringIncome.get(tx.item_id);
            recurringIncome.set(tx.item_id, {
              ...currentIncome,
              ...tx.payload.changes,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'recurring_income_ignored_toggled':
          if (recurringIncome.has(tx.item_id)) {
            const currentIncome = recurringIncome.get(tx.item_id);
            recurringIncome.set(tx.item_id, {
                ...currentIncome,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'recurring_income_deleted':
          recurringIncome.delete(tx.item_id);
          break;
        case 'credit_created':
          upcomingCredits.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            amount: tx.payload.amount,
            expectedDate: tx.payload.expectedDate,
            accountId: tx.payload.accountId,
            guaranteed: tx.payload.guaranteed,
            notes: tx.payload.notes || '',
            ignored: false,
            received: false, // This will be set to true when 'credit_received' transaction comes
            updatedAt: tx.timestamp
          });
          break;
        case 'credit_received':
          if (upcomingCredits.has(tx.item_id)) {
            upcomingCredits.delete(tx.item_id); // Credit is consumed
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + tx.payload.amount
              });
            }
            incomeHistory.push({
              id: tx.id,
              date: tx.timestamp,
              source: tx.payload.name,
              amount: tx.payload.amount,
              accountId: tx.payload.accountId,
              type: 'credit'
            });
          }
          break;
        case 'credit_guaranteed_toggled':
          if (upcomingCredits.has(tx.item_id)) {
            const currentCredit = upcomingCredits.get(tx.item_id);
            upcomingCredits.set(tx.item_id, {
                ...currentCredit,
                guaranteed: tx.payload.guaranteed,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'credit_ignored_toggled':
          if (upcomingCredits.has(tx.item_id)) {
            const currentCredit = upcomingCredits.get(tx.item_id);
            upcomingCredits.set(tx.item_id, {
                ...currentCredit,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'credit_deleted':
          upcomingCredits.delete(tx.item_id);
          break;
        case 'credit_modification':
          if (upcomingCredits.has(tx.item_id)) {
            const currentCredit = upcomingCredits.get(tx.item_id);
            upcomingCredits.set(tx.item_id, {
              ...currentCredit,
              ...tx.payload.changes,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'category_created':
          categories.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            order: tx.payload.order,
            budget: tx.payload.budget || 0,
            ignored: false,
            updatedAt: tx.timestamp
          });
          break;
        case 'category_deleted':
            categories.delete(tx.item_id);
            // Move associated items to 'Uncategorized' - this is a bit complex for a derived state
            // For now, if category is deleted, items will effectively become "uncategorized" or filter out if logic handles it.
            // A 'category_assigned' transaction would be needed to explicitly re-categorize items.
            // For now, items will just show their old category or be filtered out.
            // Better: when a category is deleted, a new transaction type like `item_re_categorized` for each affected item could be logged.
            // For initial implementation, just deleting the category is sufficient.
            break;
        case 'category_renamed':
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
                ...currentCategory,
                name: tx.payload.new_name,
                updatedAt: tx.timestamp
            });
            // Also update bills/otc that used the old name
            bills.forEach(bill => {
                if (bill.category === tx.payload.old_name) bill.category = tx.payload.new_name;
            });
            oneTimeCosts.forEach(otc => {
                if (otc.category === tx.payload.old_name) otc.category = tx.payload.new_name;
            });
          }
          break;
        case 'category_budget_updated':
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
                ...currentCategory,
                budget: tx.payload.new_budget,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'category_ignored_toggled':
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
                ...currentCategory,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'category_order_changed': // New transaction type for reordering
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
              ...currentCategory,
              order: tx.payload.new_order,
              updatedAt: tx.timestamp
            });
          }
          break;
        default:
          console.warn(`Unknown transaction type: ${tx.type}`);
      }
    }
    
    // Convert Maps back to sorted arrays
    const sortedCategories = Array.from(categories.values()).sort((a,b) => (a.order || 0) - (b.order || 0));

    // Ensure 'Uncategorized' exists if any items are without a category (due to deletion or initial load)
    // Add it dynamically if not found
    if (!sortedCategories.some(c => c.name === 'Uncategorized')) {
      sortedCategories.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        order: sortedCategories.length,
        budget: 0,
        ignored: false,
        updatedAt: new Date().toISOString()
      });
    }

    return {
      accounts: Array.from(accounts.values()),
      bills: Array.from(bills.values()),
      oneTimeCosts: Array.from(oneTimeCosts.values()),
      categories: sortedCategories,
      upcomingCredits: Array.from(upcomingCredits.values()),
      recurringIncome: Array.from(recurringIncome.values()),
      incomeHistory: incomeHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100) // Keep last 100 entries
    };
  }, [transactions]); // Depend on transactions

  // OLD: Master state -> NOW derived from transactions
  const { accounts, bills, oneTimeCosts, categories, upcomingCredits, recurringIncome, incomeHistory } = masterState;

  // Sync initial dummy data to transactions if no transactions exist and old local storage has data
  // This is a one-time migration for existing users.
  React.useEffect(() => {
    if (!userId || !supabase || transactions.length > 0) return; // Only run if logged in, no transactions yet

    const migrateOldData = async () => {
      let initialTransactions = [];

      // Load data from potential old local storage keys
      const oldAccountData = loadData('bills_balance_dashboard_v3.1:accounts', null);
      const oldBillsData = loadData('bills_balance_dashboard_v3.1:bills', null);
      const oldCategoriesData = loadData('bills_balance_dashboard_v3.1:categories', null);
      const oldCreditsData = loadData('bills_balance_dashboard_v3.1:credits', null);
      const oldIncomeData = loadData('bills_balance_dashboard_v3.1:income', null);
      const oldOtcData = loadData('bills_balance_dashboard_v3.1:otc', null);

      if (oldAccountData.data && oldAccountData.data.length > 0) {
        oldAccountData.data.forEach(acc => {
          initialTransactions.push({
            user_id: userId,
            type: 'account_created',
            item_id: acc.id,
            payload: { name: acc.name, type: acc.type, initial_balance: acc.balance },
            description: `Account "${acc.name}" created with initial balance ${fmt(acc.balance)}`,
            timestamp: new Date().toISOString()
          });
        });
      }
      // Add similar migration logic for bills, categories, etc.
      // This part would be expanded to migrate all existing data types into transactions.
      // For brevity, only accounts are shown as example.

      if (initialTransactions.length > 0) {
        console.log("Migrating old local data to transactions:", initialTransactions);
        const { error } = await supabase.from('transaction_log').insert(initialTransactions);
        if (error) {
          console.error('Error migrating old data:', error);
          notify('Failed to migrate old local data to transactions.', 'error');
        } else {
          notify('Successfully migrated old local data to transactions. Please verify.', 'success');
          // Optionally, clear old local storage keys after successful migration
          // localStorage.removeItem('bills_balance_dashboard_v3.1:accounts'); etc.
        }
      }
    };
    migrateOldData();
  }, [userId, supabase, transactions.length]); // `transactions.length` ensures it only runs if transactions are empty

  // Settings/UI with cloud sync - still use useCloudState for UI settings
  const [autoDeductCash, setAutoDeductCash] = useCloudState('autoDeductCash', true, user?.id, supabase);
  const [showIgnored, setShowIgnored] = useCloudState('showIgnored', false, user?.id, supabase);
  const [selectedCat, setSelectedCat] = useCloudState('selectedCat', 'All', user?.id, supabase);
  
  const [showIncomeHistory, setShowIncomeHistory] = React.useState(false); // Managed locally for UI toggle

  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false); // This will be replaced with transaction history UI
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);
  const [editingCredit, setEditingCredit] = React.useState(null);
  const [editingIncome, setEditingIncome] = React.useState(null);

  // One-time cost form state
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = React.useState("");

  // Check if any data is syncing (now only transaction log)
  const isSyncing = transactionsSyncing;
  const lastSyncTime = transactionsLastSync;

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

  // Calculate monthly recurring income total
  const monthlyRecurringIncomeTotal = React.useMemo(() => {
    try {
      const currentMonth = yyyyMm();
      let total = 0;
      
      for (const income of recurringIncome) {
        if (income.ignored) continue;
        
        if (income.frequency === 'monthly') {
          total += Number(income.amount) || 0;
        } else if (income.frequency === 'biweekly') {
          // Biweekly = 26 payments per year, so ~2.17 per month
          total += (Number(income.amount) || 0) * 2.17;
        } else if (income.frequency === 'weekly') {
          // Weekly = 52 payments per year, so ~4.33 per month
          total += (Number(income.amount) || 0) * 4.33;
        } else if (income.frequency === 'yearly') {
          // Yearly = 1 payment per year, so /12 per month
          total += (Number(income.amount) || 0) / 12;
        }
      }
      
      return total;
    } catch (error) {
      console.error('Error calculating monthly recurring income:', error);
      return 0;
    }
  }, [recurringIncome]);

  // Calculate liquid including guaranteed credits
  const currentLiquidWithGuaranteed = React.useMemo(() => {
    try {
      const baseBalance = accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
      const guaranteedCredits = upcomingCredits
        .filter(c => c.guaranteed && !c.ignored)
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
      return baseBalance + guaranteedCredits;
    } catch (error) {
      console.error('Error calculating liquid with guaranteed:', error);
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    }
  }, [accounts, upcomingCredits]);

  // Calculate liquid with all expected income (including recurring)
  const projectedWithIncome = React.useMemo(() => {
    return currentLiquidWithGuaranteed + monthlyRecurringIncomeTotal;
  }, [currentLiquidWithGuaranteed, monthlyRecurringIncomeTotal]);

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

  const afterWeek = projectedWithIncome - upcoming.weekDueTotal;
  const afterMonth = projectedWithIncome - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquidWithGuaranteed : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquidWithGuaranteed);

  const selectedCats = selectedCat==='All' ? 
    [...activeCats, ...bills.map(b => b.category).filter(cat => !activeCats.includes(cat))] : 
    activeCats.filter(c=> c===selectedCat);

  const totalBillsForSelectedCategory = React.useMemo(() => {
    let total = 0;
    bills
      .filter(b => selectedCats.includes(b.category) && (!showIgnored[0] ? !b.ignored : true))
      .forEach(bill => {
        total += Number(bill.amount) || 0;
      });
    return total;
  }, [bills, selectedCats, showIgnored]);

  // Category spending calculations for budgets
  const categorySpending = React.useMemo(() => {
    const spending = {};
    const currentMonth = yyyyMm();
    
    categories.forEach(cat => {
      spending[cat.name] = 0;
    });
    
    bills.forEach(bill => {
      if (!bill.ignored && bill.paidMonths.includes(currentMonth)) {
        spending[bill.category] = (spending[bill.category] || 0) + Number(bill.amount);
      }
    });
    
    oneTimeCosts.forEach(otc => {
      if (!otc.ignored && otc.paid && otc.dueDate.slice(0, 7) === currentMonth) {
        spending[otc.category] = (spending[otc.category] || 0) + Number(otc.amount);
      }
    });
    
    return spending;
  }, [bills, oneTimeCosts, categories]);

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
    
    bills.forEach(bill => {
      if (!bill.ignored && activeCats.includes(bill.category)) {
        categoryTotals[bill.category] = (categoryTotals[bill.category] || 0) + bill.amount;
      }
    });
    
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
    trend.push({
      ts: Date.now(),
      current: currentLiquid,
      afterWeek,
      afterMonth,
      reason: 'current'
    });
    
    return trend
      .sort((a, b) => a.ts - b.ts)
      .slice(-10)
      .map(snap => ({
        date: new Date(snap.ts).toLocaleDateString(),
        current: snap.current,
        afterWeek: snap.afterWeek,
        afterMonth: snap.afterMonth
      }));
  }, [nwHistory, currentLiquid, afterWeek, afterMonth]);

  // Generate 30-day timeline
  const timeline = React.useMemo(() => {
    try {
      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let runningBalance = currentLiquidWithGuaranteed;
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        const income = [];
        const expenses = [];
        
        // Check recurring income
        recurringIncome.forEach(inc => {
          if (inc.ignored) return;
          const nextDate = getNextIncomeOccurrence(inc, date);
          if (nextDate.toDateString() === date.toDateString()) {
            income.push({ type: 'income', name: inc.name, amount: inc.amount });
            runningBalance += Number(inc.amount);
          }
        });
        
        // Check upcoming credits
        upcomingCredits.forEach(credit => {
          if (credit.ignored) return;
          const creditDate = new Date(credit.expectedDate);
          if (creditDate.toDateString() === date.toDateString()) {
            income.push({ type: 'credit', name: credit.name, amount: credit.amount });
            if (credit.guaranteed) {
              // Already counted in initial balance
            } else {
              runningBalance += Number(credit.amount);
            }
          }
        });
        
        // Check bills
        bills.forEach(bill => {
          if (bill.ignored || !activeCats.includes(bill.category)) return;
          const nextDate = getNextOccurrence(bill, date);
          if (nextDate.toDateString() === date.toDateString()) {
            const currentMonth = yyyyMm(date);
            const isPaid = bill.paidMonths.includes(currentMonth);
            if (!isPaid) {
              expenses.push({ type: 'bill', name: bill.name, amount: bill.amount });
              runningBalance -= Number(bill.amount);
            }
          }
        });
        
        // Check one-time costs
        oneTimeCosts.forEach(otc => {
          if (otc.ignored || otc.paid || !activeCats.includes(otc.category)) return;
          const otcDate = new Date(otc.dueDate);
          if (otcDate.toDateString() === date.toDateString()) {
            expenses.push({ type: 'otc', name: otc.name, amount: otc.amount });
            runningBalance -= Number(otc.amount);
          }
        });
        
        days.push({
          date,
          income,
          expenses,
          balance: runningBalance,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate()
        });
      }
      
      return days;
    } catch (error) {
      console.error('Error generating timeline:', error);
      return [];
    }
  }, [currentLiquidWithGuaranteed, recurringIncome, upcomingCredits, bills, oneTimeCosts, activeCats]);

  // RECURRING INCOME FUNCTIONS
  async function addRecurringIncome(name, amount, frequency, payDay, accountId, notes = '') {
    try {
      if (!name || !amount || !frequency || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }

      const newIncomeId = crypto.randomUUID();
      const payload = {
        name: name.trim(),
        amount: Number(amount),
        frequency,
        payDay: frequency === 'monthly' ? Number(payDay) : undefined,
        weeklyDay: frequency === 'weekly' ? Number(payDay) : undefined,
        biweeklyStart: frequency === 'biweekly' ? new Date().toISOString().slice(0, 10) : undefined,
        yearlyMonth: frequency === 'yearly' ? 0 : undefined,
        accountId,
        notes: notes.trim()
      };
      
      const transaction = await logTransaction(
        supabase,
        user.id,
        'recurring_income_created',
        newIncomeId,
        payload,
        `Created recurring income "${name.trim()}" for ${fmt(Number(amount))}`
      );

      if (transaction) {
        setShowAddIncome(false);
        notify(`Recurring income "${name}" added`, 'success');
      }
    } catch (error) {
      console.error('Error adding recurring income:', error);
      notify('Failed to add recurring income', 'error');
    }
  }

  async function toggleIncomeReceived(income) {
    try {
      const currentMonth = yyyyMm();
      const isReceived = income.receivedMonths?.includes(currentMonth);
      
      const transaction = await logTransaction(
        supabase,
        user.id,
        'recurring_income_received',
        income.id,
        {
          month: currentMonth,
          is_received: !isReceived,
          accountId: income.accountId,
          amount: income.amount,
          name: income.name // For income history
        },
        `Recurring income "${income.name}" marked as ${!isReceived ? 'received' : 'not received'} for ${currentMonth}`
      );

      if(transaction) {
        notify(`${income.name} marked as ${!isReceived ? 'not received' : 'received'}`, 'success');
      }
    } catch (error) {
      console.error('Error toggling income received:', error);
      notify('Failed to update income status', 'error');
    }
  }

  async function deleteIncome(incomeId) {
    const income = recurringIncome.find(inc => inc.id === incomeId);
    if (!income) return;
    if (confirm('Delete this recurring income?')) {
      try {
        const transaction = await logTransaction(
          supabase,
          user.id,
          'recurring_income_deleted',
          incomeId,
          {},
          `Deleted recurring income "${income.name}"`
        );
        if (transaction) {
          notify('Recurring income deleted');
        }
      } catch (error) {
        console.error('Error deleting income:', error);
        notify('Failed to delete income', 'error');
      }
    }
  }

  // UPCOMING CREDITS FUNCTIONS
  async function addUpcomingCredit(name, amount, expectedDate, accountId, guaranteed = false, notes = '') {
    try {
      if (!name || !amount || !expectedDate || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      const newCreditId = crypto.randomUUID();
      const payload = {
        name: name.trim(),
        amount: Number(amount),
        expectedDate,
        accountId,
        guaranteed,
        notes: notes.trim()
      };
      
      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_created',
        newCreditId,
        payload,
        `Created credit "${name.trim()}" for ${fmt(Number(amount))}`
      );

      if (transaction) {
        setShowAddCredit(false);
        notify(`Upcoming credit "${name}" added`, 'success');
      }
    } catch (error) {
      console.error('Error adding upcoming credit:', error);
      notify('Failed to add upcoming credit', 'error');
    }
  }

  async function receiveCredit(creditId, finalAccountId = null) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;
      
      const targetAccountId = finalAccountId || credit.accountId;
      
      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_received',
        creditId,
        {
          accountId: targetAccountId,
          amount: credit.amount,
          name: credit.name // For income history
        },
        `Received credit "${credit.name}" for ${fmt(credit.amount)}`
      );
      
      if (transaction) {
        const account = accounts.find(a => a.id === targetAccountId);
        notify(`${fmt(credit.amount)} received in ${account?.name || 'account'}`, 'success');
      }
    } catch (error) {
      console.error('Error receiving credit:', error);
      notify('Failed to receive credit', 'error');
    }
  }

  async function toggleCreditGuaranteed(creditId) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;

      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_guaranteed_toggled',
        creditId,
        { guaranteed: !credit.guaranteed },
        `Credit "${credit.name}" guaranteed status set to ${!credit.guaranteed}`
      );

      if (transaction) {
        notify(`Credit "${credit.name}" guaranteed status updated.`, 'success');
      }
    } catch (error) {
      console.error('Error toggling credit guaranteed:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  async function toggleCreditIgnored(creditId) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;

      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_ignored_toggled',
        creditId,
        { ignored: !credit.ignored },
        `Credit "${credit.name}" ignored status set to ${!credit.ignored}`
      );

      if (transaction) {
        notify(`Credit "${credit.name}" ignored status updated.`, 'success');
      }
    } catch (error) {
      console.error('Error toggling credit ignored:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  async function deleteCredit(creditId) {
    const credit = upcomingCredits.find(c => c.id === creditId);
    if (!credit) return;
    if (confirm('Delete this upcoming credit?')) {
      try {
        const transaction = await logTransaction(
          supabase,
          user.id,
          'credit_deleted',
          creditId,
          {},
          `Deleted credit "${credit.name}"`
        );
        if (transaction) {
          notify('Upcoming credit deleted');
        }
      } catch (error) {
        console.error('Error deleting credit:', error);
        notify('Failed to delete credit', 'error');
      }
    }
  }

  // Actions with error handling
  function togglePaid(b){
    try {
      const currentMonth = yyyyMm();
      const isPaid = b.paidMonths.includes(currentMonth);
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          paidMonths: isPaid? x.paidMonths.filter(m=>m!==currentMonth) : [...x.paidMonths, currentMonth],
          updatedAt: new Date().toISOString()
        } : x)
      }));
      
      const acc = accounts.find(a=>a.id===b.accountId);
      if(autoDeductCash[0] && acc?.type==='Cash'){ 
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
            [ ...(x.skipMonths||[]), currentMonth ],
          updatedAt: new Date().toISOString()
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
        bills: prev.bills.map(x=> x.id===b.id ? { ...x, ignored: !x.ignored, updatedAt: new Date().toISOString() } : x)
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
        oneTimeCosts: prev.oneTimeCosts.map(x=> x.id===o.id ? { ...x, paid: !x.paid, updatedAt: new Date().toISOString() } : x) // Add updatedAt
      }));
      
      const acc = accounts.find(a=>a.id===o.accountId);
      if(autoDeductCash[0] && acc?.type==='Cash'){ 
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
        oneTimeCosts: prev.oneTimeCosts.map(x=> x.id===o.id ? { ...x, ignored: !x.ignored, updatedAt: new Date().toISOString() } : x) // Add updatedAt
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
          ignored: false,
          updatedAt: new Date().toISOString() // Add updatedAt
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
        categories: [...prev.categories, { id: crypto.randomUUID(), name: nm, order: maxOrder + 1, budget: 0 }]
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
      const category = categories.find(c => c.name === name);
      if (!category) return;

      const billsInCategory = bills.filter(b => b.category === name);
      const otcsInCategory = oneTimeCosts.filter(o => o.category === name);
      const hasItems = billsInCategory.length > 0 || otcsInCategory.length > 0;

      let confirmationMessage = `Are you sure you want to delete the category "${name}"?`;
      if (hasItems) {
        confirmationMessage += ` There are ${billsInCategory.length + otcsInCategory.length} items (bills/one-time costs) currently assigned to this category. They will be moved to "Uncategorized" if you proceed.`;
      } else {
        confirmationMessage += ` This action cannot be undone.`;
      }

      if (!confirm(confirmationMessage)) return; 

      const fallback='Uncategorized'; 
      // Ensure 'Uncategorized' category exists before moving items to it
      if(hasItems && !categories.find(c=>c.name===fallback)) {
        const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
        setMasterState(prev => ({
          ...prev,
          categories: [...prev.categories, {id:crypto.randomUUID(), name:fallback, order: maxOrder + 1, budget: 0, updatedAt: new Date().toISOString()}] // Add updatedAt for new category
        }));
      }
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(b=> b.category===name? { ...b, category: fallback, updatedAt: new Date().toISOString() } : b), // Add updatedAt
        oneTimeCosts: prev.oneTimeCosts.map(o=> o.category===name? { ...o, category: fallback, updatedAt: new Date().toISOString() } : o), // Add updatedAt
        categories: prev.categories.filter(c=> c.name!==name)
      }));
      notify(`Category "${name}" removed. Items moved to "Uncategorized" if applicable.`, 'success');
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
        if (index <= 0) return prev;
        const temp = cats[index];
        cats[index] = cats[index - 1];
        cats[index - 1] = temp;
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
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        cats.sort((a, b) => a.order - b.order);
        const index = cats.findIndex(c => c.id === id);
        if (index < 0 || index >= cats.length - 1) return prev;
        const temp = cats[index];
        cats[index] = cats[index + 1];
        cats[index + 1] = temp;
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

  function updateCategoryBudget(id, newBudget) {
    try {
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c => 
          c.id === id ? { ...c, budget: Number(newBudget) || 0 } : c
        )
      }));
    } catch (error) {
      console.error('Error updating category budget:', error);
      notify('Failed to update budget', 'error');
    }
  }

  async function addAccount(name, type, balance = 0) {
    try {
      if (!name || !type) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      const newAccountId = crypto.randomUUID();
      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_created',
        newAccountId,
        { name: name.trim(), type, initial_balance: Number(balance) || 0 },
        `Created account "${name}" with initial balance ${fmt(Number(balance) || 0)}`
      );
      if (transaction) {
        notify(`Account "${name}" added`, 'success');
        setShowAddAccount(false); // Close dialog on success
      }
    } catch (error) {
      console.error('Error adding account:', error);
      notify('Failed to add account', 'error');
    }
  }

  function updateAccountBalance(accountId, newBalance) {
    try {
      setMasterState(prev => ({
        ...prev,
        accounts: prev.accounts.map(a => 
          a.id === accountId ? { ...a, balance: Number(newBalance) || 0 } : a
        )
      }));
    } catch (error) {
      console.error('Error updating account balance:', error);
      notify('Failed to update account balance', 'error');
    }
  }

  function deleteAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    if (confirm(`Are you sure you want to delete the account "${account.name}"? This action cannot be undone and will delete all associated bills, one-time costs, recurring income, and credits.`)) {
      try {
        // Also remove any bills/otc/income/credits associated with this account
        setMasterState(prev => ({
          ...prev,
          accounts: prev.accounts.filter(a => a.id !== accountId),
          bills: prev.bills.filter(b => b.accountId !== accountId),
          oneTimeCosts: prev.oneTimeCosts.filter(o => o.accountId !== accountId),
          recurringIncome: prev.recurringIncome.filter(inc => inc.accountId !== accountId),
          upcomingCredits: prev.upcomingCredits.filter(cred => cred.accountId !== accountId)
        }));
        notify(`Account "${account.name}" and its associated items deleted`, 'success');
      } catch (error) {
        console.error('Error deleting account:', error);
        notify('Failed to delete account', 'error');
      }
    }
  }

  const selectAllOnFocus = (e) => {
    e.target.select();
  };

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '0.75rem' }}>
        {/* Navigation Tabs */}
        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: currentView === 'dashboard' ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' : 'white',
              color: currentView === 'dashboard' ? 'white' : '#374151',
              border: currentView === 'dashboard' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('timeline')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: currentView === 'timeline' ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' : 'white',
              color: currentView === 'timeline' ? 'white' : '#374151',
              border: currentView === 'timeline' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            Timeline
          </button>
        </div>

        {currentView === 'dashboard' ? (
          <>
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

            {/* Net Worth Card */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Financial Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f0f9ff', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#0369a1' }}>Current Balance</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>{fmt(currentLiquid)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f0fdf4', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#16a34a' }}>With Income</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>{fmt(projectedWithIncome)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fef3c7', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#d97706' }}>After Week</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: afterWeek < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterWeek)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fce7f3', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#be185d' }}>After Month</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: afterMonth < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterMonth)}</div>
                </div>
              </div>
              {monthlyRecurringIncomeTotal > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#e0f2fe', borderRadius: '0.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>Monthly Recurring Income</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0369a1' }}>{fmt(monthlyRecurringIncomeTotal)}</div>
                </div>
              )}
            </div>

            {/* Accounts Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Accounts</h3>
                <button 
                  onClick={() => setShowAddAccount(true)}
                  style={{ padding: '0.25rem 0.5rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  + Account
                </button>
              </div>
              
              {accounts.map(account => (
                <div key={account.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.5rem', 
                  background: '#f9fafb', 
                  borderRadius: '0.25rem',
                  marginBottom: '0.25rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{account.name}</div>
                    <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>{account.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input
                      type="number"
                      value={account.balance}
                      onChange={(e) => updateAccountBalance(account.id, e.target.value)}
                      onFocus={selectAllOnFocus}
                      style={{ 
                        width: '80px', 
                        padding: '0.125rem 0.25rem', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        textAlign: 'right'
                      }}
                    />
                    <button
                      onClick={() => deleteAccount(account.id)}
                      style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recurring Income Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{showIncomeHistory ? 'Income History' : 'Recurring Income'}</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => setShowIncomeHistory(!showIncomeHistory)}
                    style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    {showIncomeHistory ? 'Show Income' : 'Show History'}
                  </button>
                  {!showIncomeHistory && (
                    <button 
                      onClick={() => setShowAddIncome(true)}
                      style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                    >
                      + Income
                    </button>
                  )}
                </div>
              </div>
              
              {showIncomeHistory ? (
                // Income History View
                <>
                  {incomeHistory.length > 0 ? (
                    incomeHistory.slice(0, 20).map((entry, index) => {
                      const account = accounts.find(a => a.id === entry.accountId);
                      return (
                        <div key={entry.id || index} style={{ 
                          background: '#f0fdf4',
                          padding: '0.5rem', 
                          borderRadius: '0.375rem',
                          border: '2px solid #16a34a',
                          marginBottom: '0.375rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{entry.source}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                              +{fmt(entry.amount)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                            {new Date(entry.date).toLocaleDateString()} • {account?.name || 'Unknown Account'} • {entry.type === 'recurring' ? 'Recurring Income' : 'Credit'}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                      No income history yet. Mark income as received to track it here!
                    </div>
                  )}
                </>
              ) : (
                // Recurring Income View
                <>
                  {recurringIncome && recurringIncome
                    .filter(inc => !inc.ignored)
                    .map(income => {
                      const account = accounts.find(a => a.id === income.accountId);
                      const currentMonth = yyyyMm();
                      const isReceived = income.receivedMonths?.includes(currentMonth);
                      const nextDate = getNextIncomeOccurrence(income);
                      
                      return (
                        <div key={income.id} style={{ 
                          background: '#f0fdf4',
                          padding: '0.5rem', 
                          borderRadius: '0.375rem',
                          border: `2px solid ${isReceived ? '#16a34a' : '#bbf7d0'}`,
                          marginBottom: '0.375rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{income.name}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                              +{fmt(income.amount)}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                            {income.frequency} • Next: {nextDate.toLocaleDateString()} • {account?.name}
                            {isReceived && <span style={{ color: '#16a34a', fontWeight: '600' }}> • RECEIVED THIS MONTH</span>}
                            {income.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{income.notes}</div>}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => toggleIncomeReceived(income)}
                              style={{ padding: '0.125rem 0.25rem', background: isReceived ? '#f59e0b' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                            >
                              {isReceived ? 'Mark Not Received' : 'Mark Received'}
                            </button>
                            <button
                              onClick={() => deleteIncome(income.id)}
                              style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  
                  {(!recurringIncome || recurringIncome.filter(inc => !inc.ignored).length === 0) && (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                      No recurring income. Add your salary or regular income!
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Upcoming Credits Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Upcoming Credits</h3>
                <button 
                  onClick={() => setShowAddCredit(true)}
                  style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  + Credit
                </button>
              </div>
              
              {upcomingCredits
                .filter(c => !c.ignored)
                .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
                .map(credit => {
                  const account = accounts.find(a => a.id === credit.accountId);
                  const isOverdue = new Date(credit.expectedDate) < new Date();
                  
                  return (
                    <div key={credit.id} style={{ 
                      background: credit.guaranteed ? '#f0fdf4' : '#f8fafc',
                      padding: '0.5rem', 
                      borderRadius: '0.375rem',
                      border: `2px solid ${credit.guaranteed ? '#16a34a' : '#e2e8f0'}`,
                      marginBottom: '0.375rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{credit.name}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                          +{fmt(credit.amount)}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                        {isOverdue ? '⚠️ OVERDUE' : ''} Expected: {new Date(credit.expectedDate).toLocaleDateString()} • {account?.name}
                        {credit.guaranteed && <span style={{ color: '#16a34a', fontWeight: '600' }}> • GUARANTEED</span>}
                        {credit.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{credit.notes}</div>}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <select
                          value={credit.accountId}
                          onChange={async (e) => {
                            const transaction = await logTransaction(
                              supabase,
                              user.id,
                              'credit_modification',
                              credit.id,
                              { changes: { accountId: e.target.value } },
                              `Changed account for credit "${credit.name}"`
                            );
                            if (!transaction) notify('Failed to update account for credit.', 'error');
                          }}
                          style={{ fontSize: '0.625rem', padding: '0.125rem 0.25rem', border: '1px solid #d1d5db', borderRadius: '0.125rem' }}
                        >
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button
                          onClick={() => receiveCredit(credit.id)}
                          style={{ padding: '0.125rem 0.25rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Receive
                        </button>
                        <button
                          onClick={() => toggleCreditGuaranteed(credit.id)}
                          style={{ padding: '0.125rem 0.25rem', background: credit.guaranteed ? '#f59e0b' : '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          {credit.guaranteed ? 'Unguarantee' : 'Guarantee'}
                        </button>
                        <button
                          onClick={() => deleteCredit(credit.id)}
                          style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              
              {upcomingCredits.filter(c => !c.ignored).length === 0 && (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                  No upcoming credits. Add one to track expected income!
                </div>
              )}
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

            <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.25rem', background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', padding: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              {['All', ...activeCats].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.25rem',
                    border: selectedCat === cat ? '1px solid #d1d5db' : '1px solid rgba(255,255,255,0.5)',
                    background: selectedCat === cat ? 'white' : 'transparent',
                    color: selectedCat === cat ? '#8b5cf6' : 'white',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>All Bills</h3>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#8b5cf6' }}>{fmt(totalBillsForSelectedCategory)}</span>
              </div>
              
              {bills
                .filter(b => selectedCats.includes(b.category) && (!showIgnored[0] ? !b.ignored : true))
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
                        {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th of month' : ''} • {account?.name} • Next: {nextDate.toLocaleDateString()}
                        {bill.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{bill.notes}</div>}
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
                          onClick={() => setEditingBill(bill)}
                          style={{ padding: '0.125rem 0.25rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Edit
                        </button>
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

            {/* One-Time Costs */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>One-Time Costs</h3>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  placeholder="Cost name"
                  value={otcName}
                  onChange={(e) => setOtcName(e.target.value)}
                  style={{ width: '100%', padding: '0.375rem', marginBottom: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={otcAmount}
                    onChange={(e) => setOtcAmount(Number(e.target.value))}
                    style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  />
                  <input
                    type="date"
                    value={otcDueDate}
                    onChange={(e) => setOtcDueDate(e.target.value)}
                    style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <select
                    value={otcCategory}
                    onChange={(e) => setOtcCategory(e.target.value)}
                    style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={otcAccountId}
                    onChange={(e) => setOtcAccountId(e.target.value)}
                    style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <textarea
                  placeholder="Notes (optional)"
                  value={otcNotes}
                  onChange={(e) => setOtcNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.375rem', marginBottom: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', resize: 'vertical', minHeight: '60px' }}
                />
                <button
                  onClick={addOneTimeCost}
                  style={{ width: '100%', padding: '0.375rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  Add One-Time Cost
                </button>
              </div>

              {oneTimeCosts
                .filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true))
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .map(otc => {
                  const account = accounts.find(a => a.id === otc.accountId);
                  const isOverdue = new Date(otc.dueDate) < new Date() && !otc.paid;
                  
                  return (
                    <div key={otc.id} style={{ 
                      background: otc.paid ? '#f0fdf4' : (isOverdue ? '#fef2f2' : '#f9fafb'),
                      padding: '0.5rem', 
                      borderRadius: '0.375rem',
                      border: `2px solid ${otc.paid ? '#16a34a' : (isOverdue ? '#fca5a5' : '#e5e7eb')}`,
                      marginBottom: '0.375rem',
                      opacity: otc.ignored ? 0.5 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{otc.name}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(otc.amount)}</span>
                      </div>
                      
                      <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                        Due: {new Date(otc.dueDate).toLocaleDateString()} • {account?.name} • {otc.category}
                        {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                        {otc.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{otc.notes}</div>}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                          <input 
                            type="checkbox" 
                            checked={otc.paid} 
                            onChange={() => toggleOneTimePaid(otc)} 
                          />
                          {otc.paid ? '✅ Paid' : 'Not paid'}
                        </label>
                        <button
                          onClick={() => toggleOTCIgnored(otc)}
                          style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          {otc.ignored ? 'Show' : 'Hide'}
                        </button>
                        <button
                          onClick={() => deleteOneTimeCost(otc.id)}
                          style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Categories Management with Budgets */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Categories & Budgets</h3>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.categoryName.value.trim();
                  if (name) {
                    addCategory(name);
                    e.target.categoryName.value = '';
                  }
                }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input
                      name="categoryName"
                      placeholder="New category name"
                      style={{ flex: 1, padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '0.375rem 0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>

              {categories
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(cat => {
                  const spent = categorySpending[cat.name] || 0;
                  const budget = cat.budget || 0;
                  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
                  const budgetColor = percentUsed >= 100 ? '#dc2626' : percentUsed >= 80 ? '#f59e0b' : '#16a34a';
                  
                  return (
                    <div key={cat.id} style={{ 
                      padding: '0.5rem', 
                      background: cat.ignored ? '#f3f4f6' : '#f9fafb', 
                      borderRadius: '0.25rem',
                      marginBottom: '0.5rem',
                      opacity: cat.ignored ? 0.6 : 1
                    }}>
                      {editingCategoryId === cat.id ? (
                        <input
                          type="text"
                          defaultValue={cat.name}
                          onBlur={(e) => {
                            renameCategory(cat.id, e.target.value);
                            setEditingCategoryId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameCategory(cat.id, e.target.value);
                              setEditingCategoryId(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingCategoryId(null);
                            }
                          }}
                          autoFocus
                          style={{ fontSize: '0.875rem', padding: '0.125rem 0.25rem', border: '1px solid #d1d5db', borderRadius: '0.125rem', width: '100%', marginBottom: '0.25rem' }}
                        />
                      ) : (
                        <div 
                          style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', marginBottom: '0.25rem' }}
                          onClick={() => setEditingCategoryId(cat.id)}
                        >
                          {cat.name}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>Budget:</span>
                        <input
                          type="number"
                          value={cat.budget || 0}
                          onChange={(e) => updateCategoryBudget(cat.id, e.target.value)}
                          onFocus={selectAllOnFocus}
                          style={{ width: '60px', padding: '0.125rem', border: '1px solid #d1d5db', borderRadius: '0.125rem', fontSize: '0.625rem', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: '0.625rem', color: budgetColor, fontWeight: '600' }}>
                          {fmt(spent)} / {fmt(budget)} ({percentUsed.toFixed(0)}%)
                        </span>
                      </div>
                      
                      {budget > 0 && (
                        <div style={{ background: '#e5e7eb', borderRadius: '0.125rem', height: '6px', marginBottom: '0.25rem', overflow: 'hidden' }}>
                          <div style={{ 
                            background: budgetColor, 
                            height: '100%', 
                            width: `${Math.min(100, percentUsed)}%`,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => moveCategoryUp(cat.id)}
                          style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveCategoryDown(cat.id)}
                          style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => toggleIgnoreCategory(cat.name)}
                          style={{ padding: '0.125rem 0.25rem', background: cat.ignored ? '#16a34a' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          {cat.ignored ? 'Show' : 'Hide'}
                        </button>
                        <button
                          onClick={() => removeCategory(cat.name)}
                          style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
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

            {/* Settings */}
            <div style={{ 
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
              marginBottom: '0.75rem',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Settings & Actions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={autoDeductCash[0]} 
                    onChange={(e) => setAutoDeductCash(e.target.checked)} 
                    style={{ accentColor: 'white' }}
                  />
                  Auto-deduct from Cash accounts when marking bills as paid
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={showIgnored[0]} 
                    onChange={(e) => setShowIgnored(e.target.checked)} 
                    style={{ accentColor: 'white' }}
                  />
                  Show ignored items
                </label>

                <button
                  onClick={() => setShowSnapshots(true)}
                  style={{ 
                    width: '100%', 
                    padding: '0.5rem', 
                    background: 'rgba(255,255,255,0.2)', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem', 
                    marginTop: '0.5rem' 
                  }}
                >
                  View Net Worth History
                </button>
              </div>
            </div>
          </>
        ) : (
          // Timeline View (Mobile)
          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>30-Day Cash Flow Timeline</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {timeline.map((day, idx) => {
                const hasActivity = day.income.length > 0 || day.expenses.length > 0;
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                
                return (
                  <div key={idx} style={{ 
                    padding: '0.5rem', 
                    background: isWeekend ? '#f9fafb' : 'white',
                    border: `1px solid ${day.balance < 0 ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: '0.375rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasActivity ? '0.375rem' : 0 }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                          {day.dayOfWeek}, {day.date.toLocaleDateString()}
                        </div>
                        {idx === 0 && <div style={{ fontSize: '0.625rem', color: '#16a34a', fontWeight: '600' }}>TODAY</div>}
                      </div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '700',
                        color: day.balance < 0 ? '#dc2626' : '#000'
                      }}>
                        {fmt(day.balance)}
                      </div>
                    </div>
                    
                    {hasActivity && (
                      <div style={{ fontSize: '0.625rem' }}>
                        {day.income.map((inc, i) => (
                          <div key={`inc-${i}`} style={{ color: '#16a34a', marginBottom: '0.125rem' }}>
                            + {inc.name}: {fmt(inc.amount)}
                          </div>
                        ))}
                        {day.expenses.map((exp, i) => (
                          <div key={`exp-${i}`} style={{ color: '#dc2626', marginBottom: '0.125rem' }}>
                            - {exp.name}: {fmt(exp.amount)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MOBILE DIALOGS */}
        {showAuth && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
              </div>
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
                <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline'
                                                                      }}>
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddAccount && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Account</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addAccount(formData.get('name'), formData.get('type'), formData.get('balance'));
                setShowAddAccount(false);
              }}>
                <input name="name" placeholder="Account name" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="type" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  <option value="Bank">Bank Account</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit Card</option>
                  <option value="Investment">Investment</option>
                  <option value="Other">Other</option>
                </select>
                <input name="balance" type="number" step="0.01" placeholder="Starting balance" defaultValue="0" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Account</button>
                  <button type="button" onClick={() => setShowAddAccount(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddIncome && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Recurring Income</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addRecurringIncome(
                  formData.get('name'),
                  formData.get('amount'),
                  formData.get('frequency'),
                  formData.get('payDay'),
                  formData.get('accountId'),
                  formData.get('notes')
                );
                setShowAddIncome(false);
              }}>
                <input name="name" placeholder="Income name (e.g., Salary)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="frequency" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <input name="payDay" type="number" min="1" max="28" placeholder="Pay day (1-28)" defaultValue="15" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="accountId" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Income</button>
                  <button type="button" onClick={() => setShowAddIncome(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddCredit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Upcoming Credit</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addUpcomingCredit(
                  formData.get('name'), 
                  formData.get('amount'), 
                  formData.get('expectedDate'), 
                  formData.get('accountId'),
                  formData.get('guaranteed') === 'on',
                  formData.get('notes')
                );
                setShowAddCredit(false);
              }}>
                <input name="name" placeholder="Credit name (e.g., Refund)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="expectedDate" type="date" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="accountId" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <input name="guaranteed" type="checkbox" />
                  Guaranteed (include in calculations)
                </label>
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Credit</button>
                  <button type="button" onClick={() => setShowAddCredit(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Bill</h2>
              </div>
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
                  notes: formData.get('notes') || '',
                  paidMonths: [],
                  skipMonths: [],
                  ignored: false,
                  updatedAt: new Date().toISOString()
                };
                setMasterState(prev => ({...prev, bills: [...prev.bills, newBill]}));
                setShowAddBill(false);
                notify('Bill added successfully!');
              }}>
                <input name="name" placeholder="Bill name (e.g., Electric Bill)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="category" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 125.50)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="frequency" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
                    Due Day of Month (1-28):
                  </label>
                  <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month (e.g., 15)" defaultValue="15" required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Enter the day of the month this bill is due (1-28)
                  </div>
                </div>
                <select name="accountId" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Bill</button>
                  <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit Bill</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedBill = {
                  ...editingBill,
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  frequency: formData.get('frequency'),
                  dueDay: Number(formData.get('dueDay')),
                  accountId: formData.get('accountId'),
                  notes: formData.get('notes') || editingBill.notes || '',
                  updatedAt: new Date().toISOString()
                };
                setMasterState(prev => ({
                  ...prev,
                  bills: prev.bills.map(b => b.id === editingBill.id ? updatedBill : b)
                }));
                setEditingBill(null);
                notify('Bill updated successfully!');
              }}>
                <input name="name" placeholder="Bill name" defaultValue={editingBill.name} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="category" defaultValue={editingBill.category} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingBill.amount} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="frequency" defaultValue={editingBill.frequency} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
                    Due Day of Month (1-28):
                  </label>
                  <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month" defaultValue={editingBill.dueDay} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Enter the day of the month this bill is due (1-28)
                  </div>
                </div>
                <select name="accountId" defaultValue={editingBill.accountId} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingBill.notes} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Bill</button>
                  <button type="button" onClick={() => setEditingBill(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingOTC && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit One-Time Cost</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedOTC = {
                  ...editingOTC,
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  dueDate: formData.get('dueDate'),
                  accountId: formData.get('accountId'),
                  notes: formData.get('notes')
                };
                setMasterState(prev => ({
                  ...prev,
                  oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? updatedOTC : o)
                }));
                setEditingOTC(null);
                notify('One-time cost updated successfully!');
              }}>
                <input name="name" placeholder="Cost name" defaultValue={editingOTC.name} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="category" defaultValue={editingOTC.category} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingOTC.amount} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="dueDate" type="date" defaultValue={editingOTC.dueDate} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <select name="accountId" defaultValue={editingOTC.accountId} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingOTC.notes} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Cost</button>
                  <button type="button" onClick={() => setEditingOTC(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSnapshots && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Net Worth History</h2>
                <button onClick={() => setShowSnapshots(false)} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem' }}>✕</button>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <button 
                  onClick={() => {
                    setNwHistory(prev => [...prev, {
                      ts: Date.now(),
                      current: currentLiquid,
                      afterWeek,
                      afterMonth,
                      reason: 'manual_snapshot'
                    }]);
                    notify('Snapshot saved!');
                  }}
                  style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                >
                  📸 Take Snapshot Now
                </button>
              </div>

              {netWorthTrend.length > 0 ? (
                <div>
                  {netWorthTrend.slice(-20).reverse().map((snap, idx) => (
                    <div key={idx} style={{ 
                      padding: '0.75rem', 
                      background: '#f9fafb', 
                      borderRadius: '0.375rem', 
                      marginBottom: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{snap.date}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#2563eb' }}>{fmt(snap.current)}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <span>After Week: <span style={{ color: snap.afterWeek >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{fmt(snap.afterWeek)}</span></span>
                        <span>After Month: <span style={{ color: snap.afterMonth >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{fmt(snap.afterMonth)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem', fontSize: '1rem' }}>
                  No snapshots yet. Take your first snapshot!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Version - COMPLETE ORIGINAL FUNCTIONALITY
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Navigation Tabs */}
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              padding: '0.75rem 2rem',
              background: currentView === 'dashboard' ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' : 'white',
              color: currentView === 'dashboard' ? 'white' : '#374151',
              border: currentView === 'dashboard' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('timeline')}
            style={{
              padding: '0.75rem 2rem',
              background: currentView === 'timeline' ? 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' : 'white',
              color: currentView === 'timeline' ? 'white' : '#374151',
              border: currentView === 'timeline' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Timeline
          </button>
        </div>

        {currentView === 'dashboard' ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
                💰 Cashfl0.io 💰
              </h1>
              <p style={{ color: '#4b5563' }}>Complete financial management system</p>
              
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {user ? (
                  <div>
                    {isSyncing ? '🔄 Syncing...' : '☁️ Synced'} • {user.email}
                    <button
                      onClick={handleLogout}
                      style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    Login for Cloud Sync
                  </button>
                )}
              </div>
            </div>

            {/* Money Needed This Week Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', 
              padding: '2rem', 
              borderRadius: '1rem', 
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💸</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Financial Overview</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>💸</span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Week Total Due</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700' }}>{fmt(weekNeedWithoutSavings)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Full amount due this week</div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>🏦</span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Current Balance</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700' }}>{fmt(currentLiquidWithGuaranteed)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Including guaranteed credits</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>💰</span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>With All Income</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700' }}>{fmt(projectedWithIncome)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Balance + recurring income</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📊</span>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>After Month</span>
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700',
                    color: afterMonth < 0 ? '#fbbf24' : '#10b981'
                  }}>
                    {fmt(afterMonth)}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    {afterMonth < 0 ? 'Need to earn more' : 'Surplus expected'}
                  </div>
                </div>
              </div>

              {monthlyRecurringIncomeTotal > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Monthly Recurring Income</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{fmt(monthlyRecurringIncomeTotal)}</div>
                </div>
              )}
            </div>

            {/* Three Column Layout: Accounts, Income Sources, Due This Week */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              
              {/* Accounts Column */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Accounts</h3>
                  <button 
                    onClick={() => setShowAddAccount(true)}
                    style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {accounts.map(account => (
                    <div key={account.id} style={{ 
                      background: '#f9fafb', 
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: '500', fontSize: '1rem' }}>{account.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{account.type}</div>
                        </div>
                        <button
                          onClick={() => deleteAccount(account.id)}
                          style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>$</span>
                        <input
                          type="number"
                          value={account.balance}
                          onChange={(e) => updateAccountBalance(account.id, e.target.value)}
                          onFocus={selectAllOnFocus}
                          style={{ 
                            flex: 1, 
                            padding: '0.5rem', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '0.375rem',
                            fontSize: '1rem',
                            textAlign: 'right',
                            fontWeight: '600'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: '500' }}>Total Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0369a1' }}>{fmt(currentLiquidWithGuaranteed)}</div>
                </div>
              </div>

              {/* Income Sources Column (Recurring + Credits) */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{showIncomeHistory ? 'Income History' : 'Income Sources'}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setShowIncomeHistory(!showIncomeHistory)}
                      style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      {showIncomeHistory ? 'Show Income' : 'Show History'}
                    </button>
                    {!showIncomeHistory && (
                      <>
                        <button 
                          onClick={() => setShowAddIncome(true)}
                          style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          + Recurring
                        </button>
                        <button 
                          onClick={() => setShowAddCredit(true)}
                          style={{ padding: '0.5rem 1rem', background: '#0369a1', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          + Credit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                  {showIncomeHistory ? (
                    // Income History View
                    incomeHistory.length > 0 ? (
                      incomeHistory.slice(0, 20).map((entry, index) => {
                        const account = accounts.find(a => a.id === entry.accountId);
                        return (
                          <div key={entry.id || index} style={{ 
                            background: '#f0fdf4', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            border: '2px solid #16a34a'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                              <div>
                                <div style={{ fontWeight: '500', fontSize: '1rem' }}>{entry.source}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {new Date(entry.date).toLocaleDateString()} • {account?.name || 'Unknown Account'} • {entry.type === 'recurring' ? 'Recurring Income' : 'Credit'}
                                </div>
                              </div>
                              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                                +{fmt(entry.amount)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                        No income history yet. Mark income as received to track it here!
                      </div>
                    )
                  ) : (
                    // Recurring Income and Credits View
                    <>
                      {/* Recurring Income */}
                      {recurringIncome && recurringIncome
                        .filter(inc => !inc.ignored)
                        .map(income => {
                          const account = accounts.find(a => a.id === income.accountId);
                          const currentMonth = yyyyMm();
                          const isReceived = income.receivedMonths?.includes(currentMonth);
                          const nextDate = getNextIncomeOccurrence(income);
                          
                          return (
                            <div key={income.id} style={{ 
                              background: '#f0fdf4', 
                              padding: '1rem', 
                              borderRadius: '0.5rem',
                              border: `2px solid ${isReceived ? '#16a34a' : '#bbf7d0'}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div>
                                  <div style={{ fontWeight: '500', fontSize: '1rem' }}>🔄 {income.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {income.frequency} • Next: {nextDate.toLocaleDateString()}
                                    {isReceived && <span style={{ color: '#16a34a', fontWeight: '600' }}> • RECEIVED</span>}
                                  </div>
                                  {income.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{income.notes}</div>}
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                                  +{fmt(income.amount)}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button
                                  onClick={() => toggleIncomeReceived(income)}
                                  style={{ padding: '0.25rem 0.5rem', background: isReceived ? '#f59e0b' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  {isReceived ? 'Not Received' : 'Mark Received'}
                                </button>
                                <button
                                  onClick={() => deleteIncome(income.id)}
                                  style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {/* Upcoming Credits */}
                      {upcomingCredits
                        .filter(c => !c.ignored)
                        .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
                        .map(credit => {
                          const account = accounts.find(a => a.id === credit.accountId);
                          const isOverdue = new Date(credit.expectedDate) < new Date();
                          
                          return (
                            <div key={credit.id} style={{ 
                              background: credit.guaranteed ? '#f0fdf4' : '#f8fafc', 
                              padding: '1rem', 
                              borderRadius: '0.5rem',
                              border: `2px solid ${credit.guaranteed ? '#16a34a' : '#e2e8f0'}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div>
                                  <div style={{ fontWeight: '500', fontSize: '1rem' }}>💳 {credit.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {new Date(credit.expectedDate).toLocaleDateString()}
                                    {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                                    {credit.guaranteed && <span style={{ color: '#16a34a', fontWeight: '600' }}> • GUARANTEED</span>}
                                  </div>
                                  {credit.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{credit.notes}</div>}
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                                  +{fmt(credit.amount)}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <select
                                  value={credit.accountId}
                                  onChange={async (e) => {
                                    const transaction = await logTransaction(
                                      supabase,
                                      user.id,
                                      'credit_modification',
                                      credit.id,
                                      { changes: { accountId: e.target.value } },
                                      `Changed account for credit "${credit.name}"`
                                    );
                                    if (!transaction) notify('Failed to update account for credit.', 'error');
                                  }}
                                  style={{ flex: 1, padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                                >
                                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <button
                                  onClick={() => receiveCredit(credit.id)}
                                  style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  Receive
                                </button>
                                <button
                                  onClick={() => toggleCreditGuaranteed(credit.id)}
                                  style={{ padding: '0.25rem 0.5rem', background: credit.guaranteed ? '#f59e0b' : '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  {credit.guaranteed ? 'Unlock' : 'Lock'}
                                </button>
                                <button
                                  onClick={() => deleteCredit(credit.id)}
                                  style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      
                      {(!recurringIncome || recurringIncome.filter(inc => !inc.ignored).length === 0) && upcomingCredits.filter(c => !c.ignored).length === 0 && (
                        <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                          No income sources. Add recurring income or expected credits!
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Due This Week Column */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Due This Week</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                  {upcoming.items
                    .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category))
                    .map((it, idx) => {
                      const name = it.bill ? it.bill.name : it.otc.name;
                      const amt = it.bill ? it.bill.amount : it.otc.amount;
                      const account = accounts.find(a => a.id === (it.bill ? it.bill.accountId : it.otc.accountId));
                      
                      return (
                        <div key={idx} style={{ 
                          background: it.overdue ? '#fef2f2' : '#f9fafb',
                          padding: '1rem', 
                          borderRadius: '0.5rem',
                          border: `2px solid ${it.overdue ? '#fca5a5' : '#d1d5db'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: '500', fontSize: '1rem' }}>{name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {it.overdue ? '⚠️ OVERDUE' : ''} {it.due.toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {account?.name}
                              </div>
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: it.overdue ? '#dc2626' : '#000' }}>
                              {fmt(amt)}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => it.bill ? togglePaid(it.bill) : toggleOneTimePaid(it.otc)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}
                          >
                            Mark as Paid
                          </button>
                        </div>
                      );
                    })}
                  
                  {upcoming.items.filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category)).length === 0 && (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                      Nothing due this week! Great job!
                    </div>
                  )}
                </div>
                
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#ede9fe', borderRadius: '0.5rem', border: '1px solid #c4b5fd' }}>
                  <div style={{ fontSize: '0.875rem', color: '#7c3aed', fontWeight: '500' }}>Week Total</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed' }}>{fmt(upcoming.weekDueTotal)}</div>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['All', ...activeCats].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCat(cat)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: selectedCat === cat ? '1px solid #d1d5db' : '1px solid rgba(255,255,255,0.5)',
                      background: selectedCat === cat ? 'white' : 'transparent',
                      color: selectedCat === cat ? '#8b5cf6' : 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Bills Management Section */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>All Bills</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#8b5cf6' }}>Total: {fmt(totalBillsForSelectedCategory)}</span>
                  <button 
                    onClick={() => setShowAddBill(true)}
                    style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                  >
                    + Add Bill
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                {bills
                  .filter(b => selectedCats.includes(b.category) && (!showIgnored[0] ? !b.ignored : true))
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
                        border: `2px solid ${isPaid ? '#10b981' : '#e5e7eb'}`,
                        opacity: bill.ignored ? 0.6 : 1
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '1rem' }}>{bill.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th of month' : ''} • {account?.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Next: {nextDate.toLocaleDateString()}
                            </div>
                            {bill.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{bill.notes}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fmt(bill.amount)}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{bill.category}</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <input 
                              type="checkbox" 
                              checked={isPaid} 
                              onChange={() => togglePaid(bill)} 
                            />
                            {isPaid ? 'Paid' : 'Not paid'}
                          </label>
                          <button
                            onClick={() => setEditingBill(bill)}
                            style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleBillIgnored(bill)}
                            style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            {bill.ignored ? 'Show' : 'Hide'}
                          </button>
                          <button
                            onClick={() => deleteBill(bill.id)}
                            style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {bills.filter(b => selectedCats.includes(b.category) && (!showIgnored[0] ? !b.ignored : true)).length === 0 && (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                  No bills found. Add your first bill to get started!
                </div>
              )}
            </div>

            {/* One-Time Costs Section */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>One-Time Costs</h3>
              
              {/* Add One-Time Cost Form */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <input
                    placeholder="Cost name"
                    value={otcName}
                    onChange={(e) => setOtcName(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Amount"
                    value={otcAmount}
                    onChange={(e) => setOtcAmount(Number(e.target.value))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                  <input
                    type="date"
                    value={otcDueDate}
                    onChange={(e) => setOtcDueDate(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                  <select
                    value={otcCategory}
                    onChange={(e) => setOtcCategory(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  >
                    {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={otcAccountId}
                    onChange={(e) => setOtcAccountId(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <textarea
                    placeholder="Notes (optional)"
                    value={otcNotes}
                    onChange={(e) => setOtcNotes(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }}
                  />
                  <button
                    onClick={addOneTimeCost}
                    style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', alignSelf: 'flex-start' }}
                  >
                    Add Cost
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                {oneTimeCosts
                  .filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true))
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                  .map(otc => {
                    const account = accounts.find(a => a.id === otc.accountId);
                    const isOverdue = new Date(otc.dueDate) < new Date() && !otc.paid;
                    
                    return (
                      <div key={otc.id} style={{ 
                        background: otc.paid ? '#f0fdf4' : (isOverdue ? '#fef2f2' : '#f9fafb'),
                        padding: '1rem', 
                        borderRadius: '0.5rem',
                        border: `2px solid ${otc.paid ? '#16a34a' : (isOverdue ? '#fca5a5' : '#e5e7eb')}`,
                        opacity: otc.ignored ? 0.6 : 1
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '1rem' }}>{otc.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Due: {new Date(otc.dueDate).toLocaleDateString()} • {account?.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {otc.category}
                              {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                            </div>
                            {otc.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{otc.notes}</div>}
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fmt(otc.amount)}</div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <input 
                              type="checkbox" 
                              checked={otc.paid} 
                              onChange={() => toggleOneTimePaid(otc)} 
                            />
                            {otc.paid ? 'Paid' : 'Not paid'}
                          </label>
                          <button
                            onClick={() => setEditingOTC(otc)}
                            style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleOTCIgnored(otc)}
                            style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            {otc.ignored ? 'Show' : 'Hide'}
                          </button>
                          <button
                            onClick={() => deleteOneTimeCost(otc.id)}
                            style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {oneTimeCosts.filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true)).length === 0 && (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                  No one-time costs found. Add costs above to track them!
                </div>
              )}
            </div>

            {/* Categories Management with Budgets */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Categories & Budget Management</h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const name = e.target.categoryName.value.trim();
                  if (name) {
                    addCategory(name);
                    e.target.categoryName.value = '';
                  }
                }} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input
                    name="categoryName"
                    placeholder="New category name"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                  >
                    Add Category
                  </button>
                </form>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  <input 
                    type="checkbox" 
                    checked={showIgnored[0]} 
                    onChange={(e) => setShowIgnored(e.target.checked)} 
                  />
                  Show ignored
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                {categories
                  .filter(cat => !cat.ignored || showIgnored[0])
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map(cat => {
                    const spent = categorySpending[cat.name] || 0;
                    const budget = cat.budget || 0;
                    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
                    const budgetColor = percentUsed >= 100 ? '#dc2626' : percentUsed >= 80 ? '#f59e0b' : '#16a34a';
                    
                    return (
                      <div key={cat.id} style={{ 
                        padding: '1rem', 
                        background: cat.ignored ? '#f3f4f6' : '#f9fafb', 
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
                        opacity: cat.ignored ? 0.6 : 1
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          {editingCategoryId === cat.id ? (
                            <input
                              type="text"
                              defaultValue={cat.name}
                              onBlur={(e) => {
                                renameCategory(cat.id, e.target.value);
                                setEditingCategoryId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  renameCategory(cat.id, e.target.value);
                                  setEditingCategoryId(null);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCategoryId(null);
                                }
                              }}
                              autoFocus
                              style={{ fontSize: '1rem', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', flex: 1 }}
                            />
                          ) : (
                            <span 
                              style={{ fontSize: '1rem', fontWeight: '600', cursor: 'pointer', flex: 1 }}
                              onClick={() => setEditingCategoryId(cat.id)}
                            >
                              {cat.name}
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => moveCategoryUp(cat.id)}
                              style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveCategoryDown(cat.id)}
                              style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => toggleIgnoreCategory(cat.name)}
                              style={{ padding: '0.25rem 0.5rem', background: cat.ignored ? '#16a34a' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              {cat.ignored ? 'Show' : 'Hide'}
                            </button>
                            <button
                              onClick={() => removeCategory(cat.name)}
                              style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Budget:</span>
                          <input
                            type="number"
                            value={cat.budget || 0}
                            onChange={(e) => updateCategoryBudget(cat.id, e.target.value)}
                            onFocus={selectAllOnFocus}
                            style={{ width: '100px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem', textAlign: 'right' }}
                          />
                          <span style={{ fontSize: '0.875rem', color: budgetColor, fontWeight: '600' }}>
                            {fmt(spent)} / {fmt(budget)} ({percentUsed.toFixed(0)}%)
                          </span>
                        </div>
                        
                        {budget > 0 && (
                          <div style={{ background: '#e5e7eb', borderRadius: '0.25rem', height: '8px', overflow: 'hidden' }}>
                            <div style={{ 
                              background: budgetColor, 
                              height: '100%', 
                              width: `${Math.min(100, percentUsed)}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        )}
                        
                        {percentUsed >= 100 && budget > 0 && (
                          <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#dc2626' }}>
                            ⚠️ Over budget by {fmt(spent - budget)}!
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Net Worth & Analytics Section */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Net Worth & Financial Analytics</h3>
              
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
                              const x1 = 150 + 120 * Math.cos(startRadians);
                              const y1 = 150 + 120 * Math.sin(startRadians);
                              const x2 = 150 + 120 * Math.cos(endRadians);
                              const y2 = 150 + 120 * Math.sin(endRadians);
                              
                              const pathData = `M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                              
                              return (
                                <path
                                  key={index}
                                  d={pathData}
                                  fill={colors[index % colors.length]}
                                  stroke="white"
                                  strokeWidth="3"
                                />
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.875rem' }}>No account data</div>
                  )}
                  <div style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
                    {accountBalanceData.map((item, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                          <span>{item.name}: {fmt(item.value)} ({item.type})</span>
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
                              const x1 = 150 + 120 * Math.cos(startRadians);
                              const y1 = 150 + 120 * Math.sin(startRadians);
                              const x2 = 150 + 120 * Math.cos(endRadians);
                              const y2 = 150 + 120 * Math.sin(endRadians);
                              
                              const pathData = `M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                              
                              return (
                                <path
                                  key={index}
                                  d={pathData}
                                  fill={colors[index % colors.length]}
                                  stroke="white"
                                  strokeWidth="3"
                                />
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.875rem' }}>No spending data</div>
                  )}
                  <div style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
                    {categorySpendingData.map((item, index) => {
                      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
                      return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                          <span>{item.name}: {fmt(item.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Net Worth Trend</h4>
                  {netWorthTrend.length > 1 ? (
                    <div style={{ width: '100%', height: '250px', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                      <svg width="100%" height="100%" viewBox="0 0 400 200">
                        {(() => {
                          const maxValue = Math.max(...netWorthTrend.map(d => Math.max(d.current, d.afterWeek, d.afterMonth)));
                          const minValue = Math.min(...netWorthTrend.map(d => Math.min(d.current, d.afterWeek, d.afterMonth)));
                          const range = maxValue - minValue || 1;
                          const xStep = 380 / (netWorthTrend.length - 1);
                          
                          const getY = (value) => 180 - ((value - minValue) / range) * 160;
                          
                          const currentPath = netWorthTrend.map((d, i) => 
                            `${i === 0 ? 'M' : 'L'} ${10 + i * xStep} ${getY(d.current)}`
                          ).join(' ');
                          
                          const afterWeekPath = netWorthTrend.map((d, i) => 
                            `${i === 0 ? 'M' : 'L'} ${10 + i * xStep} ${getY(d.afterWeek)}`
                          ).join(' ');
                          
                          const afterMonthPath = netWorthTrend.map((d, i) => 
                            `${i === 0 ? 'M' : 'L'} ${10 + i * xStep} ${getY(d.afterMonth)}`
                          ).join(' ');
                          
                          return (
                            <g>
                              <path d={currentPath} stroke="#3b82f6" strokeWidth="2" fill="none" />
                              <path d={afterWeekPath} stroke="#10b981" strokeWidth="2" fill="none" />
                              <path d={afterMonthPath} stroke="#f59e0b" strokeWidth="2" fill="none" />
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                      Not enough data for trend chart. Add more snapshots!
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '12px', height: '2px', backgroundColor: '#3b82f6' }}></div>
                      <span>Current</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '12px', height: '2px', backgroundColor: '#10b981' }}></div>
                      <span>After Week</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '12px', height: '2px', backgroundColor: '#f59e0b' }}></div>
                      <span>After Month</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>Quick Actions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      onClick={() => setShowSnapshots(true)}
                      style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      📸 View Net Worth History
                    </button>
                    <button
                      onClick={() => {
                        setNwHistory(prev => [...prev, {
                          ts: Date.now(),
                          current: currentLiquid,
                          afterWeek,
                          afterMonth,
                          reason: 'manual_snapshot'
                        }]);
                        notify('Snapshot saved!');
                      }}
                      style={{ padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      📊 Take Financial Snapshot
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <input 
                          type="checkbox" 
                          checked={autoDeductCash[0]} 
                          onChange={(e) => setAutoDeductCash(e.target.checked)} 
                        />
                        Auto-deduct from Cash accounts
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Timeline View (Desktop)
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>30-Day Cash Flow Timeline</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {timeline.map((day, idx) => {
                const hasActivity = day.income.length > 0 || day.expenses.length > 0;
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                
                return (
                  <div key={idx} style={{ 
                    padding: '1rem', 
                    background: isWeekend ? '#f9fafb' : 'white',
                    border: `2px solid ${day.balance < 0 ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasActivity ? '0.5rem' : 0 }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                          {day.dayOfWeek}, {day.date.toLocaleDateString()}
                        </div>
                        {idx === 0 && <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>TODAY</div>}
                      </div>
                      <div style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '700',
                        color: day.balance < 0 ? '#dc2626' : '#000'
                      }}>
                        {fmt(day.balance)}
                      </div>
                    </div>
                    
                    {hasActivity && (
                      <div style={{ fontSize: '0.75rem' }}>
                        {day.income.map((inc, i) => (
                          <div key={`inc-${i}`} style={{ color: '#16a34a', marginBottom: '0.25rem' }}>
                            + {inc.name}: {fmt(inc.amount)}
                          </div>
                        ))}
                        {day.expenses.map((exp, i) => (
                          <div key={`exp-${i}`} style={{ color: '#dc2626', marginBottom: '0.25rem' }}>
                            - {exp.name}: {fmt(exp.amount)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Desktop Dialogs */}
        {showAuth && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={handleAuth} disabled={authLoading} style={{ flex: 1, padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>
                  {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                </button>
                <button onClick={() => setShowAuth(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>
                  {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddAccount && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add New Account</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addAccount(formData.get('name'), formData.get('type'), formData.get('balance'));
                setShowAddAccount(false);
              }}>
                <input name="name" placeholder="Account name" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="type" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  <option value="Bank">Bank Account</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit Card</option>
                  <option value="Investment">Investment</option>
                  <option value="Other">Other</option>
                </select>
                <input name="balance" type="number" step="0.01" placeholder="Starting balance" defaultValue="0" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Account</button>
                  <button type="button" onClick={() => setShowAddAccount(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddIncome && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add Recurring Income</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addRecurringIncome(
                  formData.get('name'),
                  formData.get('amount'),
                  formData.get('frequency'),
                  formData.get('payDay'),
                  formData.get('accountId'),
                  formData.get('notes')
                );
                setShowAddIncome(false);
              }}>
                <input name="name" placeholder="Income name (e.g., Salary, Freelance)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="frequency" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <input name="payDay" type="number" min="1" max="28" placeholder="Pay day (1-28)" defaultValue="15" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="accountId" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Income</button>
                  <button type="button" onClick={() => setShowAddIncome(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddCredit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add Upcoming Credit</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                addUpcomingCredit(
                  formData.get('name'), 
                  formData.get('amount'), 
                  formData.get('expectedDate'), 
                  formData.get('accountId'),
                  formData.get('guaranteed') === 'on',
                  formData.get('notes')
                );
                setShowAddCredit(false);
              }}>
                <input name="name" placeholder="Credit name (e.g., Salary, Refund)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <input name="expectedDate" type="date" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="accountId" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>
                  <input name="guaranteed" type="checkbox" />
                  Guaranteed (include in calculations)
                </label>
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Credit</button>
                  <button type="button" onClick={() => setShowAddCredit(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add New Bill</h2>
              </div>
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
                  notes: formData.get('notes') || '',
                  paidMonths: [],
                  skipMonths: [],
                  ignored: false
                };
                setMasterState(prev => ({...prev, bills: [...prev.bills, newBill]}));
                setShowAddBill(false);
                notify('Bill added successfully!');
              }}>
                <input name="name" placeholder="Bill name (e.g., Electric Bill)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="category" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 125.50)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="frequency" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '1rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                    Due Day of Month (1-28):
                  </label>
                  <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month (e.g., 15)" defaultValue="15" required style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Enter the day of the month this bill is due (1-28)
                  </div>
                </div>
                <select name="accountId" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Bill</button>
                  <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Edit Bill</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedBill = {
                  ...editingBill,
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  frequency: formData.get('frequency'),
                  dueDay: Number(formData.get('dueDay')),
                  accountId: formData.get('accountId'),
                  notes: formData.get('notes') || editingBill.notes || ''
                };
                setMasterState(prev => ({
                  ...prev,
                  bills: prev.bills.map(b => b.id === editingBill.id ? updatedBill : b)
                }));
                setEditingBill(null);
                notify('Bill updated successfully!');
              }}>
                <input name="name" placeholder="Bill name" defaultValue={editingBill.name} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="category" defaultValue={editingBill.category} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingBill.amount} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="frequency" defaultValue={editingBill.frequency} style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '1rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                    Due Day of Month (1-28):
                  </label>
                  <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month" defaultValue={editingBill.dueDay} required style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    Enter the day of the month this bill is due (1-28)
                  </div>
                </div>
                <select name="accountId" defaultValue={editingBill.accountId} style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingBill.notes} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Update Bill</button>
                  <button type="button" onClick={() => setEditingBill(null)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingOTC && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
              <div style={{ background: 'linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)', margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Edit One-Time Cost</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedOTC = {
                  ...editingOTC,
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  dueDate: formData.get('dueDate'),
                  accountId: formData.get('accountId'),
                  notes: formData.get('notes')
                };
                setMasterState(prev => ({
                  ...prev,
                  oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? updatedOTC : o)
                }));
                setEditingOTC(null);
                notify('One-time cost updated successfully!');
              }}>
                <input name="name" placeholder="Cost name" defaultValue={editingOTC.name} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="category" defaultValue={editingOTC.category} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingOTC.amount} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <input name="dueDate" type="date" defaultValue={editingOTC.dueDate} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                <select name="accountId" defaultValue={editingOTC.accountId} style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingOTC.notes} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Update Cost</button>
                  <button type="button" onClick={() => setEditingOTC(null)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSnapshots && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-3rem -3rem 2rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'white' }}>Net Worth History</h2>
                <button onClick={() => setShowSnapshots(false)} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', cursor: 'pointer' }}>Close</button>
              </div>
              
              <div style={{ marginBottom: '2rem' }}>
                <button 
                  onClick={() => {
                    setNwHistory(prev => [...prev, {
                      ts: Date.now(),
                      current: currentLiquid,
                      afterWeek,
                      afterMonth,
                      reason: 'manual_snapshot'
                    }]);
                    notify('Snapshot saved!');
                  }}
                  style={{ width: '100%', padding: '1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}
                >
                  📸 Take Snapshot Now
                </button>
              </div>

              {netWorthTrend.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                  {netWorthTrend.slice(-20).reverse().map((snap, idx) => (
                    <div key={idx} style={{ 
                      padding: '1.5rem', 
                      background: '#f9fafb', 
                      borderRadius: '0.5rem', 
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '600' }}>{snap.date}</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb' }}>{fmt(snap.current)}</span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>After Week: <span style={{ color: snap.afterWeek >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{fmt(snap.afterWeek)}</span></div>
                        <div>After Month: <span style={{ color: snap.afterMonth >= 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{fmt(snap.afterMonth)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '3rem', fontSize: '1rem' }}>
                  No snapshots yet. Take your first snapshot to track your financial progress over time!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
