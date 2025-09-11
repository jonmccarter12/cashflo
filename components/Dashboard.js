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

// FIXED: Custom hook for cloud-synced persistent state with enhanced error handling
function useCloudState(key, initial, user, supabase){
  const [state, setState] = React.useState(initial);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);

  // Load from localStorage on mount with enhanced error handling
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
      setState(initial);
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

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data && data.data) {
          setState(data.data);
          const syncDate = new Date(data.updated_at);
          setLastSync(isNaN(syncDate.getTime()) ? null : syncDate);
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
    if(typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }

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
    
    return getNextOccurrence({ ...bill, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
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

  // Categories with cloud sync
  const [categoriesBase, setCategoriesBase, categoriesSync] = useCloudState(
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
  const [accountsBase, setAccountsBase, accountsSync] = useCloudState(
    `${storageKey}:accounts`,
    [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ],
    user,
    supabase
  );
  
  const [billsBase, setBillsBase, billsSync] = useCloudState(`${storageKey}:bills`, [], user, supabase);
  const [oneTimeCostsBase, setOneTimeCostsBase, oneTimeCostsSync] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [upcomingCreditsBase, setUpcomingCreditsBase, upcomingCreditsSync] = useCloudState(`${storageKey}:credits`, [], user, supabase);
  const [nwHistory, setNwHistory, nwHistorySync] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

  // Master state with undo/redo
  const [masterState, setMasterState, undoRedo] = useUndoRedo({
    accounts: accountsBase,
    bills: billsBase,
    oneTimeCosts: oneTimeCostsBase,
    categories: categoriesBase,
    upcomingCredits: upcomingCreditsBase
  });

  // Sync master state with cloud state
  React.useEffect(() => {
    setMasterState({
      accounts: accountsBase,
      bills: billsBase,
      oneTimeCosts: oneTimeCostsBase,
      categories: categoriesBase,
      upcomingCredits: upcomingCreditsBase
    });
  }, [accountsBase, billsBase, oneTimeCostsBase, categoriesBase, upcomingCreditsBase]);

  // Sync changes back to cloud state
  React.useEffect(() => {
    setAccountsBase(masterState.accounts);
    setBillsBase(masterState.bills);
    setOneTimeCostsBase(masterState.oneTimeCosts);
    setCategoriesBase(masterState.categories);
    setUpcomingCreditsBase(masterState.upcomingCredits);
  }, [masterState]);

  // Extract current state
  const { accounts, bills, oneTimeCosts, categories, upcomingCredits } = masterState;
  
  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  // Settings/UI with cloud sync
  const [autoDeductCash, setAutoDeductCash] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);
  const [editingCredit, setEditingCredit] = React.useState(null);

  // One-time cost form state
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = React.useState("");

  // Check if any data is syncing
  const isSyncing = categoriesSync?.syncing || accountsSync?.syncing || billsSync?.syncing || oneTimeCostsSync?.syncing || upcomingCreditsSync?.syncing || nwHistorySync?.syncing;
  
  // FIXED: Get last sync time with proper null/undefined checking
  const lastSyncTime = React.useMemo(() => {
    const times = [
      categoriesSync?.lastSync, 
      accountsSync?.lastSync, 
      billsSync?.lastSync, 
      oneTimeCostsSync?.lastSync, 
      upcomingCreditsSync?.lastSync,
      nwHistorySync?.lastSync
    ]
      .filter(t => t !== null && t !== undefined && t instanceof Date && !isNaN(t.getTime()))
      .map(t => t.getTime());
    
    if (times.length === 0) return null;
    return new Date(Math.max(...times));
  }, [categoriesSync, accountsSync, billsSync, oneTimeCostsSync, upcomingCreditsSync, nwHistorySync]);

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

  const afterWeek = currentLiquidWithGuaranteed - upcoming.weekDueTotal;
  const afterMonth = currentLiquidWithGuaranteed - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquidWithGuaranteed : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquidWithGuaranteed);

  const selectedCats = selectedCat==='All' ? 
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

  // UPCOMING CREDITS FUNCTIONS
  function addUpcomingCredit(name, amount, expectedDate, accountId, guaranteed = false, notes = '') {
    try {
      if (!name || !amount || !expectedDate || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      setMasterState(prev => ({
        ...prev,
        upcomingCredits: [...prev.upcomingCredits, {
          id: crypto.randomUUID(),
          name: name.trim(),
          amount: Number(amount),
          expectedDate,
          accountId,
          guaranteed,
          notes: notes.trim(),
          ignored: false,
          received: false
        }]
      }));
      notify(`Upcoming credit "${name}" added`, 'success');
    } catch (error) {
      console.error('Error adding upcoming credit:', error);
      notify('Failed to add upcoming credit', 'error');
    }
  }

  function receiveCredit(creditId, finalAccountId = null) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;
      
      const targetAccountId = finalAccountId || credit.accountId;
      
      // Add money to account and mark credit as received
      setMasterState(prev => ({
        ...prev,
        accounts: prev.accounts.map(a => 
          a.id === targetAccountId ? 
            { ...a, balance: a.balance + credit.amount } : 
            a
        ),
        upcomingCredits: prev.upcomingCredits.filter(c => c.id !== creditId)
      }));
      
      const account = accounts.find(a => a.id === targetAccountId);
      notify(`${fmt(credit.amount)} received in ${account?.name || 'account'}`, 'success');
    } catch (error) {
      console.error('Error receiving credit:', error);
      notify('Failed to receive credit', 'error');
    }
  }

  function toggleCreditGuaranteed(creditId) {
    try {
      setMasterState(prev => ({
        ...prev,
        upcomingCredits: prev.upcomingCredits.map(c => 
          c.id === creditId ? { ...c, guaranteed: !c.guaranteed } : c
        )
      }));
    } catch (error) {
      console.error('Error toggling credit guaranteed:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  function toggleCreditIgnored(creditId) {
    try {
      setMasterState(prev => ({
        ...prev,
        upcomingCredits: prev.upcomingCredits.map(c => 
          c.id === creditId ? { ...c, ignored: !c.ignored } : c
        )
      }));
    } catch (error) {
      console.error('Error toggling credit ignored:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  function deleteCredit(creditId) {
    if (confirm('Delete this upcoming credit?')) {
      try {
        setMasterState(prev => ({
          ...prev,
          upcomingCredits: prev.upcomingCredits.filter(c => c.id !== creditId)
        }));
        notify('Upcoming credit deleted');
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
          paidMonths: isPaid? x.paidMonths.filter(m=>m!==currentMonth) : [...x.paidMonths, currentMonth] 
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

  function addAccount(name, type, balance = 0) {
    try {
      if (!name || !type) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      setMasterState(prev => ({
        ...prev,
        accounts: [...prev.accounts, {
          id: crypto.randomUUID(),
          name: name.trim(),
          type,
          balance: Number(balance) || 0
        }]
      }));
      notify(`Account "${name}" added`, 'success');
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
    if (confirm('Delete this account? This will affect related bills and costs.')) {
      try {
        setMasterState(prev => ({
          ...prev,
          accounts: prev.accounts.filter(a => a.id !== accountId)
        }));
        notify('Account deleted');
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
              <div style={{ fontWeight: '600', color: '#16a34a' }}>With Guaranteed</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>{fmt(currentLiquidWithGuaranteed)}</div>
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
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <select
                      value={credit.accountId}
                      onChange={(e) => {
                        setMasterState(prev => ({
                          ...prev,
                          upcomingCredits: prev.upcomingCredits.map(c => 
                            c.id === credit.id ? { ...c, accountId: e.target.value } : c
                          )
                        }));
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
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>All Bills</h3>
          
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

        {/* Categories Management */}
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Categories</h3>
          
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
            .map(cat => (
              <div key={cat.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '0.5rem', 
                background: cat.ignored ? '#f3f4f6' : '#f9fafb', 
                borderRadius: '0.25rem',
                marginBottom: '0.25rem',
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
                    style={{ fontSize: '0.875rem', padding: '0.125rem 0.25rem', border: '1px solid #d1d5db', borderRadius: '0.125rem' }}
                  />
                ) : (
                  <span 
                    style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}
                    onClick={() => setEditingCategoryId(cat.id)}
                  >
                    {cat.name}
                  </span>
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
            ))}
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
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Settings</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input 
                type="checkbox" 
                checked={autoDeductCash[0]} 
                onChange={(e) => setAutoDeductCash(e.target.checked)} 
              />
              Auto-deduct from Cash accounts when marking bills as paid
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input 
                type="checkbox" 
                checked={showIgnored[0]} 
                onChange={(e) => setShowIgnored(e.target.checked)} 
              />
              Show ignored items
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={undoRedo.undo}
                disabled={!undoRedo.canUndo}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  background: undoRedo.canUndo ? '#2563eb' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.75rem',
                  cursor: undoRedo.canUndo ? 'pointer' : 'not-allowed'
                }}
              >
                Undo (Ctrl+Z)
              </button>
              <button
                onClick={undoRedo.redo}
                disabled={!undoRedo.canRedo}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  background: undoRedo.canRedo ? '#2563eb' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.75rem',
                  cursor: undoRedo.canRedo ? 'pointer' : 'not-allowed'
                }}
              >
                Redo (Ctrl+Alt+Z)
              </button>
            </div>

            <button
              onClick={() => setShowSnapshots(true)}
              style={{ width: '100%', padding: '0.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
            >
              View Net Worth History
            </button>
          </div>
        </div>

        {/* DIALOGS */}
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

        {showAddAccount && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '1rem' }}>Add Account</h2>
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

        {showAddCredit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <h2 style={{ marginBottom: '1rem' }}>Add Upcoming Credit</h2>
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
                <input name="name" placeholder="Credit name (e.g., Salary, Refund)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
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

        {showSnapshots && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Net Worth History</h2>
                <button onClick={() => setShowSnapshots(false)} style={{ padding: '0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem' }}>✕</button>
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
                        <span>After Week: <span style={{ color: snap.afterWeek >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(snap.afterWeek)}</span></span>
                        <span>After Month: <span style={{ color: snap.afterMonth >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(snap.afterMonth)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
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

        {/* Net Worth Overview */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Financial Overview</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.25rem' }}>Current Balance</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>{fmt(currentLiquid)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>Money Needed This Week</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: weekNeedWithSavings > 0 ? '#dc2626' : '#15803d' }}>{fmt(weekNeedWithSavings)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>After This Week</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: afterWeek < 0 ? '#dc2626' : '#15803d' }}>{fmt(afterWeek)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#be185d', marginBottom: '0.25rem' }}>After This Month</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: afterMonth < 0 ? '#dc2626' : '#15803d' }}>{fmt(afterMonth)}</div>
            </div>
          </div>
        </div>

        {/* Accounts Management */}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
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
        </div>

        {/* Upcoming Credits */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Upcoming Credits</h3>
            <button 
              onClick={() => setShowAddCredit(true)}
              style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
            >
              ➕ Add Credit
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{credit.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Expected: {new Date(credit.expectedDate).toLocaleDateString()}
                          {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Target: {account?.name}
                          {credit.guaranteed && <span style={{ color: '#16a34a', fontWeight: '600' }}> • GUARANTEED</span>}
                        </div>
                        {credit.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            {credit.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                        +{fmt(credit.amount)}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <select
                        value={credit.accountId}
                        onChange={(e) => {
                          setMasterState(prev => ({
                            ...prev,
                            upcomingCredits: prev.upcomingCredits.map(c => 
                              c.id === credit.id ? { ...c, accountId: e.target.value } : c
                            )
                          }));
                        }}
                        style={{ flex: 1, padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                      >
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => receiveCredit(credit.id)}
                        style={{ padding: '0.375rem 0.75rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        💰 Receive
                      </button>
                      <button
                        onClick={() => toggleCreditGuaranteed(credit.id)}
                        style={{ padding: '0.375rem 0.75rem', background: credit.guaranteed ? '#f59e0b' : '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        {credit.guaranteed ? '❌ Unguarantee' : '✅ Guarantee'}
                      </button>
                      <button
                        onClick={() => deleteCredit(credit.id)}
                        style={{ padding: '0.375rem 0.75rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            {upcomingCredits.filter(c => !c.ignored).length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', padding: '2rem', fontSize: '1rem' }}>
                No upcoming credits. Add one to track expected income!
              </div>
            )}
          </div>
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
                    <svg width="300" height="300" view
