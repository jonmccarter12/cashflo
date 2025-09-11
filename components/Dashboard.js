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
const storageKey = "bills_balance_dashboard_v5";
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

// Calculate next occurrence for a bill or recurring income
function getNextOccurrence(item, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    
    if (item.frequency === 'monthly') {
      date.setDate(clampDue(item.dueDay || item.payDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    
    if (item.frequency === 'yearly') {
      const dueMonth = item.yearlyMonth || 0;
      const dueDay = clampDue(item.dueDay || item.payDay || 1);
      
      date.setMonth(dueMonth);
      date.setDate(dueDay);
      
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    
    if (item.frequency === 'weekly') {
      const dayOfWeek = item.weeklyDay || 0;
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      
      if (item.weeklySchedule === 'every') {
        return date;
      } else {
        const targetWeek = item.weeklySchedule;
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
          return getNextOccurrence(item, date);
        }
        return date;
      }
    }
    
    if (item.frequency === 'biweekly') {
      const baseDate = new Date(item.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    
    return getNextOccurrence({ ...item, frequency: 'monthly' }, fromDate);
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

  // Categories with cloud sync and budgets
  const [categoriesBase, setCategoriesBase, categoriesSync] = useCloudState(
    `${storageKey}:categories`, 
    [
      { id: crypto.randomUUID(), name: 'Personal', order: 0, budget: 500 },
      { id: crypto.randomUUID(), name: 'Studio', order: 1, budget: 1200 },
      { id: crypto.randomUUID(), name: 'Smoke Shop', order: 2, budget: 800 },
      { id: crypto.randomUUID(), name: 'Botting', order: 3, budget: 600 },
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
  const [recurringIncomeBase, setRecurringIncomeBase, recurringIncomeSync] = useCloudState(`${storageKey}:recurringIncome`, [], user, supabase);
  const [oneTimeCostsBase, setOneTimeCostsBase, oneTimeCostsSync] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [upcomingCreditsBase, setUpcomingCreditsBase, upcomingCreditsSync] = useCloudState(`${storageKey}:credits`, [], user, supabase);
  const [receivedCreditsBase, setReceivedCreditsBase, receivedCreditsSync] = useCloudState(`${storageKey}:receivedCredits`, [], user, supabase);
  const [nwHistory, setNwHistory, nwHistorySync] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

  // Master state 
  const [masterState, setMasterState] = React.useState({
    accounts: accountsBase,
    bills: billsBase,
    recurringIncome: recurringIncomeBase,
    oneTimeCosts: oneTimeCostsBase,
    categories: categoriesBase,
    upcomingCredits: upcomingCreditsBase,
    receivedCredits: receivedCreditsBase
  });

  // Wait for all data to be loaded from localStorage before syncing
  const allDataLoaded = categoriesSync?.isLoaded && accountsSync?.isLoaded && billsSync?.isLoaded && recurringIncomeSync?.isLoaded && oneTimeCostsSync?.isLoaded && upcomingCreditsSync?.isLoaded && receivedCreditsSync?.isLoaded && nwHistorySync?.isLoaded;

  // Sync master state with cloud state (only after all data is loaded)
  React.useEffect(() => {
    if (!allDataLoaded) return;
    setMasterState({
      accounts: accountsBase,
      bills: billsBase,
      recurringIncome: recurringIncomeBase,
      oneTimeCosts: oneTimeCostsBase,
      categories: categoriesBase,
      upcomingCredits: upcomingCreditsBase,
      receivedCredits: receivedCreditsBase
    });
  }, [accountsBase, billsBase, recurringIncomeBase, oneTimeCostsBase, categoriesBase, upcomingCreditsBase, receivedCreditsBase, allDataLoaded]);

  // Sync changes back to cloud state (only after all data is loaded)
  React.useEffect(() => {
    if (!allDataLoaded) return;
    setAccountsBase(masterState.accounts);
    setBillsBase(masterState.bills);
    setRecurringIncomeBase(masterState.recurringIncome);
    setOneTimeCostsBase(masterState.oneTimeCosts);
    setCategoriesBase(masterState.categories);
    setUpcomingCreditsBase(masterState.upcomingCredits);
    setReceivedCreditsBase(masterState.receivedCredits);
  }, [masterState, allDataLoaded]);

  // Extract current state
  const { accounts, bills, recurringIncome, oneTimeCosts, categories, upcomingCredits, receivedCredits } = masterState;
  
  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  // Category color palette
  const categoryColors = {
    'Personal': '#3b82f6',    // Blue
    'Studio': '#10b981',      // Green  
    'Smoke Shop': '#f59e0b',  // Amber
    'Botting': '#8b5cf6',     // Purple
    'Income': '#06b6d4',      // Cyan
    'Uncategorized': '#6b7280' // Gray
  };

  // Get color for category
  const getCategoryColor = (categoryName) => {
    return categoryColors[categoryName] || '#6b7280';
  };

  // Settings/UI with cloud sync
  const [autoDeductCash, setAutoDeductCash] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  const [showPaidCredits, setShowPaidCredits] = React.useState(false);
  const [currentView, setCurrentView] = React.useState('dashboard'); // 'dashboard', 'calendar', 'timeline'
  
  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingIncome, setEditingIncome] = React.useState(null);
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
  const isSyncing = categoriesSync?.syncing || accountsSync?.syncing || billsSync?.syncing || recurringIncomeSync?.syncing || oneTimeCostsSync?.syncing || upcomingCreditsSync?.syncing || receivedCreditsSync?.syncing || nwHistorySync?.syncing;
  
  // FIXED: Get last sync time with proper null/undefined checking
  const lastSyncTime = React.useMemo(() => {
    const times = [
      categoriesSync?.lastSync, 
      accountsSync?.lastSync, 
      billsSync?.lastSync,
      recurringIncomeSync?.lastSync, 
      oneTimeCostsSync?.lastSync, 
      upcomingCreditsSync?.lastSync,
      receivedCreditsSync?.lastSync,
      nwHistorySync?.lastSync
    ]
      .filter(t => t !== null && t !== undefined && t instanceof Date && !isNaN(t.getTime()))
      .map(t => t.getTime());
    
    if (times.length === 0) return null;
    return new Date(Math.max(...times));
  }, [categoriesSync, accountsSync, billsSync, recurringIncomeSync, oneTimeCostsSync, upcomingCreditsSync, receivedCreditsSync, nwHistorySync]);

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

  // Enhanced budget status calculation with spending tracking
  const budgetStatus = React.useMemo(() => {
    const currentMonth = yyyyMm();
    const status = {};
    
    categories.forEach(category => {
      if (category.ignored || !category.budget) return;
      
      // Calculate spending this month for this category
      const billSpending = bills
        .filter(b => b.category === category.name && b.paidMonths?.includes(currentMonth))
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      
      const otcSpending = oneTimeCosts
        .filter(o => o.category === category.name && o.paid && o.dueDate.slice(0,7) === currentMonth)
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      
      const totalSpent = billSpending + otcSpending;
      const remaining = category.budget - totalSpent;
      const percentUsed = category.budget > 0 ? (totalSpent / category.budget) * 100 : 0;
      
      status[category.name] = {
        budget: category.budget,
        spent: totalSpent,
        remaining,
        percentUsed,
        status: percentUsed >= 100 ? 'over' : percentUsed >= 80 ? 'warning' : 'good'
      };
    });
    
    return status;
  }, [categories, bills, oneTimeCosts]);

  // Calculate monthly recurring income total
  const monthlyRecurringIncomeTotal = React.useMemo(() => {
    const currentMonth = yyyyMm();
    return recurringIncome
      .filter(i => !i.ignored && i.frequency === 'monthly')
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [recurringIncome]);

  // Calculate current liquid including recurring income and guaranteed credits
  const currentLiquidWithProjectedIncome = React.useMemo(() => {
    try {
      const baseBalance = accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
      const guaranteedCredits = upcomingCredits
        .filter(c => c.guaranteed && !c.ignored)
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
      
      // Add monthly recurring income for current month if not yet received
      const currentMonth = yyyyMm();
      const pendingMonthlyIncome = recurringIncome
        .filter(i => !i.ignored && i.frequency === 'monthly' && !i.receivedMonths?.includes(currentMonth))
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
      
      return baseBalance + guaranteedCredits + pendingMonthlyIncome;
    } catch (error) {
      console.error('Error calculating liquid with projected income:', error);
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    }
  }, [accounts, upcomingCredits, recurringIncome]);

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
        const paid = b.paidMonths?.includes(currentMonth) && (b.frequency === 'monthly' || b.frequency === 'yearly');
        const overdue = nextDate < now && !paid;
        const withinWeek = nextDate <= horizon && !paid;
        
        if(overdue || withinWeek) {
          items.push({ bill:b, due: nextDate, overdue, type: 'expense' });
        }
      }

      for(const i of recurringIncome){
        if(i.ignored) continue;
        
        const nextDate = getNextOccurrence(i, now);
        const received = i.receivedMonths?.includes(currentMonth) && (i.frequency === 'monthly' || i.frequency === 'yearly');
        const overdue = nextDate < now && !received;
        const withinWeek = nextDate <= horizon && !received;
        
        if(overdue || withinWeek) {
          items.push({ income:i, due: nextDate, overdue, type: 'income' });
        }
      }
      
      for(const o of oneTimeCosts){
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue;
        if(o.paid) continue;
        const due = new Date(o.dueDate);
        const overdue = due < new Date();
        const withinWeek = due <= horizon;
        if(overdue || withinWeek) items.push({ otc:o, due, overdue, type: 'expense' });
      }
      
      items.sort((a,b)=> (a.overdue===b.overdue? a.due.getTime()-b.due.getTime() : a.overdue? -1: 1));

      const byAcc = {};
      const ensure = (id)=> (byAcc[id] ||= { account: accounts.find(a=>a.id===id), total:0, income:0, items:[] });
      for(const it of items){
        const amt = it.bill? it.bill.amount : it.income? it.income.amount : it.otc.amount;
        const accId = it.bill? it.bill.accountId : it.income? it.income.accountId : it.otc.accountId;
        const g = ensure(accId); 
        if (it.type === 'income') {
          g.income += amt;
        } else {
          g.total += amt;
        }
        g.items.push(it);
      }
      const byAccount = Object.values(byAcc).map(g=> ({ 
        account: g.account, 
        totalDue: g.total,
        totalIncome: g.income || 0, 
        balance: g.account?.balance || 0, 
        deficit: Math.max(0, g.total - (g.account?.balance || 0) - (g.income || 0)), 
        items: g.items 
      }));

      return { 
        items, 
        byAccount, 
        totalDeficit: byAccount.reduce((s,d)=> s+d.deficit, 0), 
        weekDueTotal: items.filter(i => i.type === 'expense').reduce((s,it)=> s + (it.bill? it.bill.amount : it.otc.amount), 0),
        weekIncomeTotal: items.filter(i => i.type === 'income').reduce((s,it)=> s + it.income.amount, 0)
      };
    } catch (error) {
      console.error('Error calculating upcoming:', error);
      return { items: [], byAccount: [], totalDeficit: 0, weekDueTotal: 0, weekIncomeTotal: 0 };
    }
  }, [accounts, bills, recurringIncome, oneTimeCosts, activeCats]);

  const monthUnpaidTotal = React.useMemo(()=>{
    try {
      const currentMonth = yyyyMm();
      let sum = 0;
      for(const b of bills){ 
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue; 
        if(!b.paidMonths?.includes(currentMonth)) sum += Number(b.amount) || 0; 
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

  const afterWeek = currentLiquidWithProjectedIncome - upcoming.weekDueTotal + upcoming.weekIncomeTotal;
  const afterMonth = currentLiquidWithProjectedIncome - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquidWithProjectedIncome : netWorthMode==='afterWeek'? afterWeek : afterMonth;

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

  // ENHANCED: Cash flow timeline data for next 30 days
  const cashFlowTimeline = React.useMemo(() => {
    const timeline = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayData = {
        date: date,
        dateStr: date.toLocaleDateString(),
        income: [],
        expenses: [],
        netFlow: 0,
        runningBalance: 0
      };
      
      // Check for bills due this day
      bills.forEach(bill => {
        if (bill.ignored || !activeCats.includes(bill.category)) return;
        const nextDue = getNextOccurrence(bill, today);
        if (nextDue.toDateString() === date.toDateString()) {
          dayData.expenses.push({
            name: bill.name,
            amount: bill.amount,
            category: bill.category,
            type: 'bill'
          });
        }
      });
      
      // Check for recurring income due this day
      recurringIncome.forEach(income => {
        if (income.ignored) return;
        const nextPay = getNextOccurrence(income, today);
        if (nextPay.toDateString() === date.toDateString()) {
          dayData.income.push({
            name: income.name,
            amount: income.amount,
            category: income.category || 'Income',
            type: 'recurring'
          });
        }
      });
      
      // Check for one-time costs due this day
      oneTimeCosts.forEach(otc => {
        if (otc.ignored || otc.paid || !activeCats.includes(otc.category)) return;
        const dueDate = new Date(otc.dueDate);
        if (dueDate.toDateString() === date.toDateString()) {
          dayData.expenses.push({
            name: otc.name,
            amount: otc.amount,
            category: otc.category,
            type: 'one-time'
          });
        }
      });
      
      // Check for upcoming credits due this day
      upcomingCredits.forEach(credit => {
        if (credit.ignored) return;
        const creditDate = new Date(credit.expectedDate);
        if (creditDate.toDateString() === date.toDateString()) {
          dayData.income.push({
            name: credit.name,
            amount: credit.amount,
            category: 'Credit',
            type: 'credit',
            guaranteed: credit.guaranteed
          });
        }
      });
      
      // Calculate net flow for this day
      const totalIncome = dayData.income.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = dayData.expenses.reduce((sum, item) => sum + item.amount, 0);
      dayData.netFlow = totalIncome - totalExpenses;
      
      timeline.push(dayData);
    }
    
    // Calculate running balances
    let runningBalance = currentLiquid;
    timeline.forEach(day => {
      runningBalance += day.netFlow;
      day.runningBalance = runningBalance;
    });
    
    return timeline;
  }, [bills, recurringIncome, oneTimeCosts, upcomingCredits, activeCats, currentLiquid]);

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
      
      // Add money to account, mark credit as received, and add to history
      setMasterState(prev => ({
        ...prev,
        accounts: prev.accounts.map(a => 
          a.id === targetAccountId ? 
            { ...a, balance: a.balance + credit.amount } : 
            a
        ),
        upcomingCredits: prev.upcomingCredits.filter(c => c.id !== creditId),
        receivedCredits: [...prev.receivedCredits, {
          ...credit,
          receivedDate: new Date().toISOString(),
          actualAccountId: targetAccountId
        }]
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

  // ENHANCED: Recurring income functions
  function addRecurringIncome(name, amount, frequency, payDay, accountId, category) {
    try {
      if (!name || !amount || !frequency || !payDay || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      
      const newIncome = {
        id: crypto.randomUUID(),
        name: name.trim(),
        amount: Number(amount),
        frequency,
        payDay: Number(payDay),
        accountId,
        category: category || 'Income',
        receivedMonths: [],
        ignored: false
      };
      
      // Add additional fields based on frequency
      if (frequency === 'biweekly') {
        newIncome.biweeklyStart = new Date().toISOString().slice(0, 10);
      } else if (frequency === 'weekly') {
        newIncome.weeklyDay = 1; // Monday
        newIncome.weeklySchedule = 'every';
      } else if (frequency === 'yearly') {
        newIncome.yearlyMonth = new Date().getMonth();
      }
      
      setMasterState(prev => ({
        ...prev,
        recurringIncome: [...prev.recurringIncome, newIncome]
      }));
      notify(`Recurring income "${name}" added`, 'success');
    } catch (error) {
      console.error('Error adding recurring income:', error);
      notify('Failed to add recurring income', 'error');
    }
  }

  function toggleIncomeReceived(income) {
    try {
      const currentMonth = yyyyMm();
      const isReceived = income.receivedMonths?.includes(currentMonth);
      setMasterState(prev => ({
        ...prev,
        recurringIncome: prev.recurringIncome.map(i => i.id === income.id ? {
          ...i,
          receivedMonths: isReceived ? 
            (i.receivedMonths || []).filter(m => m !== currentMonth) :
            [...(i.receivedMonths || []), currentMonth]
        } : i)
      }));

      const acc = accounts.find(a => a.id === income.accountId);
      if (autoDeductCash[0] && acc?.type === 'Cash') {
        if (!isReceived) {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => a.id === acc.id ? { ...a, balance: a.balance + income.amount } : a)
          }));
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => a.id === acc.id ? { ...a, balance: a.balance - income.amount } : a)
          }));
        }
      }
      notify(`${income.name} marked as ${isReceived ? 'not received' : 'received'}`, 'success');
    } catch (error) {
      console.error('Error toggling income received:', error);
      notify('Failed to update income status', 'error');
    }
  }

  function deleteRecurringIncome(incomeId) {
    if (confirm('Delete this recurring income?')) {
      try {
        setMasterState(prev => ({
          ...prev,
          recurringIncome: prev.recurringIncome.filter(i => i.id !== incomeId)
        }));
        notify('Recurring income deleted');
      } catch (error) {
        console.error('Error deleting recurring income:', error);
        notify('Failed to delete recurring income', 'error');
      }
    }
  }

  // Actions with error handling
  function togglePaid(b){
    try {
      const currentMonth = yyyyMm();
      const isPaid = b.paidMonths?.includes(currentMonth);
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          paidMonths: isPaid? (x.paidMonths || []).filter(m=>m!==currentMonth) : [...(x.paidMonths || []), currentMonth] 
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

  function addCategory(name, budget = 0){ 
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
        categories: [...prev.categories, { id: crypto.randomUUID(), name: nm, order: maxOrder + 1, budget: Number(budget) || 0 }]
      }));
      notify('Category added');
    } catch (error) {
      console.error('Error adding category:', error);
      notify('Failed to add category', 'error');
    }
  }

  function updateCategoryBudget(categoryId, newBudget) {
    try {
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c => 
          c.id === categoryId ? { ...c, budget: Number(newBudget) || 0 } : c
        )
      }));
      
      // Check if budget warning should be shown
      const category = categories.find(c => c.id === categoryId);
      const status = budgetStatus[category?.name];
      if (status && status.percentUsed >= 80) {
        notify(`Warning: ${category.name} budget is ${Math.round(status.percentUsed)}% used`, 'warning');
      }
    } catch (error) {
      console.error('Error updating category budget:', error);
      notify('Failed to update budget', 'error');
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
          categories: [...prev.categories, {id:crypto.randomUUID(), name:fallback, order: maxOrder + 1, budget: 0}]
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

  // ENHANCED: Cash Flow Calendar Component with better income/expense tracking
  function CashFlowCalendar() {
    const today = new Date();
    const [currentDate, setCurrentDate] = React.useState(today);
    
    // Get first day of month and number of days
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Generate calendar data
    const calendarData = React.useMemo(() => {
      const days = [];
      const monthStr = yyyyMm(currentDate);
      
      // Add empty cells for days before month starts
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push({ isEmpty: true });
      }
      
      // Add days of the month with financial data
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayData = { day, date, income: [], expenses: [], isEmpty: false };
        
        // Check bills due this day
        bills.forEach(bill => {
          if (bill.ignored || !activeCats.includes(bill.category)) return;
          if ((bill.dueDay || 1) === day) {
            const isPaid = bill.paidMonths?.includes(monthStr);
            dayData.expenses.push({
              type: 'bill',
              item: bill,
              amount: bill.amount,
              paid: isPaid,
              overdue: !isPaid && date < today
            });
          }
        });
        
        // Check recurring income due this day
        recurringIncome.forEach(income => {
          if (income.ignored) return;
          if ((income.payDay || 1) === day) {
            const received = income.receivedMonths?.includes(monthStr);
            dayData.income.push({
              type: 'income',
              item: income,
              amount: income.amount,
              received,
              overdue: !received && date < today
            });
          }
        });
        
        // Check one-time costs due this day
        oneTimeCosts.forEach(otc => {
          if (otc.ignored || !activeCats.includes(otc.category)) return;
          const otcDate = new Date(otc.dueDate);
          if (otcDate.getDate() === day && 
              otcDate.getMonth() === currentDate.getMonth() && 
              otcDate.getFullYear() === currentDate.getFullYear()) {
            dayData.expenses.push({
              type: 'otc',
              item: otc,
              amount: otc.amount,
              paid: otc.paid,
              overdue: !otc.paid && date < today
            });
          }
        });
        
        // Check upcoming credits due this day  
        upcomingCredits.forEach(credit => {
          if (credit.ignored) return;
          const creditDate = new Date(credit.expectedDate);
          if (creditDate.getDate() === day && 
              creditDate.getMonth() === currentDate.getMonth() && 
              creditDate.getFullYear() === currentDate.getFullYear()) {
            dayData.income.push({
              type: 'credit',
              item: credit,
              amount: credit.amount,
              received: false,
              overdue: creditDate < today,
              guaranteed: credit.guaranteed
            });
          }
        });
        
        days.push(dayData);
      }
      
      return days;
    }, [currentDate, bills, recurringIncome, oneTimeCosts, upcomingCredits, activeCats]);
    
    const navigateMonth = (direction) => {
      setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    };
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    if (isMobile) {
      return (
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem' }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem' }}
            >
              →
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', padding: '0.25rem' }}>
                {day}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {calendarData.map((dayData, index) => {
              if (dayData.isEmpty) {
                return <div key={index} style={{ minHeight: '60px' }}></div>;
              }
              
              const totalIncome = dayData.income.reduce((sum, item) => sum + item.amount, 0);
              const totalExpenses = dayData.expenses.reduce((sum, item) => sum + item.amount, 0);
              const netFlow = totalIncome - totalExpenses;
              const isToday = dayData.date.toDateString() === today.toDateString();
              
              return (
                <div key={index} style={{
                  background: isToday ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  border: isToday ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '0.25rem',
                  padding: '0.25rem',
                  minHeight: '60px',
                  fontSize: '0.625rem'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.125rem' }}>{dayData.day}</div>
                  {dayData.income.length > 0 && (
                    <div style={{ color: '#10b981', marginBottom: '0.125rem' }}>
                      +{fmt(totalIncome)}
                    </div>
                  )}
                  {dayData.expenses.length > 0 && (
                    <div style={{ color: '#ef4444', marginBottom: '0.125rem' }}>
                      -{fmt(totalExpenses)}
                    </div>
                  )}
                  {(totalIncome > 0 || totalExpenses > 0) && (
                    <div style={{ color: netFlow >= 0 ? '#10b981' : '#ef4444', fontSize: '0.5rem', fontWeight: '600' }}>
                      Net: {fmt(netFlow)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Desktop calendar
    return (
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigateMonth(-1)}
            style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            ← Previous
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Next →
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '1rem' }}>
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', padding: '0.5rem' }}>
              {day}
            </div>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {calendarData.map((dayData, index) => {
            if (dayData.isEmpty) {
              return <div key={index} style={{ minHeight: '120px' }}></div>;
            }
            
            const totalIncome = dayData.income.reduce((sum, item) => sum + item.amount, 0);
            const totalExpenses = dayData.expenses.reduce((sum, item) => sum + item.amount, 0);
            const netFlow = totalIncome - totalExpenses;
            const isToday = dayData.date.toDateString() === today.toDateString();
            
            return (
              <div key={index} style={{
                background: isToday ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                border: isToday ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0.375rem',
                padding: '0.5rem',
                minHeight: '120px',
                fontSize: '0.75rem'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '0.5rem', fontSize: '1rem' }}>{dayData.day}</div>
                
                {dayData.income.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Income: +{fmt(totalIncome)}
                    </div>
                    {dayData.income.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ fontSize: '0.625rem', opacity: 0.9 }}>
                        {item.item.name}: +{fmt(item.amount)}
                        {item.guaranteed && <span style={{ color: '#fbbf24' }}> ⭐</span>}
                      </div>
                    ))}
                  </div>
                )}
                
                {dayData.expenses.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '0.25rem' }}>
                      Expenses: -{fmt(totalExpenses)}
                    </div>
                    {dayData.expenses.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ fontSize: '0.625rem', opacity: 0.9 }}>
                        {item.item.name}: -{fmt(item.amount)}
                      </div>
                    ))}
                  </div>
                )}
                
                {(totalIncome > 0 || totalExpenses > 0) && (
                  <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.2)', 
                    paddingTop: '0.25rem', 
                    color: netFlow >= 0 ? '#10b981' : '#ef4444', 
                    fontSize: '0.75rem', 
                    fontWeight: '700' 
                  }}>
                    Net: {fmt(netFlow)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // NEW: Timeline View Component
  function TimelineView() {
    return (
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
        <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>
          30-Day Cash Flow Timeline
        </h2>
        
        <div style={{ 
          maxHeight: isMobile ? '400px' : '500px', 
          overflowY: 'auto',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '0.5rem',
          padding: '1rem'
        }}>
          {cashFlowTimeline.map((day, index) => {
            const isToday = day.date.toDateString() === new Date().toDateString();
            const hasActivity = day.income.length > 0 || day.expenses.length > 0;
            const totalIncome = day.income.reduce((sum, item) => sum + item.amount, 0);
            const totalExpenses = day.expenses.reduce((sum, item) => sum + item.amount, 0);
            
            if (!hasActivity && !isToday) return null;
            
            return (
              <div key={index} style={{
                background: isToday ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                border: isToday ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0.5rem',
                padding: isMobile ? '0.75rem' : '1rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: isMobile ? '0.875rem' : '1rem', fontWeight: '700' }}>
                      {day.dateStr} {isToday && '(Today)'}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      Balance: {fmt(day.runningBalance)}
                      {day.runningBalance < 0 && <span style={{ color: '#fbbf24', marginLeft: '0.5rem' }}>⚠️ Negative</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: day.netFlow >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      Net: {fmt(day.netFlow)}
                    </div>
                  </div>
                </div>
                
                {day.income.length > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981', marginBottom: '0.25rem' }}>
                      Income (+{fmt(totalIncome)}):
                    </div>
                    {day.income.map((item, i) => (
                      <div key={i} style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.9, 
                        marginLeft: '1rem',
                        marginBottom: '0.125rem'
                      }}>
                        • {item.name}: +{fmt(item.amount)}
                        {item.guaranteed && <span style={{ color: '#fbbf24' }}> ⭐ Guaranteed</span>}
                        <span style={{ opacity: 0.7 }}> ({item.type})</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {day.expenses.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444', marginBottom: '0.25rem' }}>
                      Expenses (-{fmt(totalExpenses)}):
                    </div>
                    {day.expenses.map((item, i) => (
                      <div key={i} style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.9, 
                        marginLeft: '1rem',
                        marginBottom: '0.125rem'
                      }}>
                        • {item.name}: -{fmt(item.amount)}
                        <span style={{ opacity: 0.7 }}> ({item.category}, {item.type})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Auth Dialog
  if (showAuth) {
    return (
      <div style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem'
      }}>
        <div style={{ 
          background: 'white', padding: '2rem', borderRadius: '1rem', 
          maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', padding: '0.75rem', marginBottom: '1rem', 
                border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem'
              }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', padding: '0.75rem', marginBottom: '1.5rem', 
                border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem'
              }}
              required
            />
            
            <button
              type="submit"
              disabled={authLoading}
              style={{ 
                width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', 
                border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: '600',
                cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.5 : 1
              }}
            >
              {authLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ 
                background: 'none', border: 'none', color: '#2563eb', 
                cursor: 'pointer', textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'Already have an account?' : 'Need an account?'}
            </button>
            <button
              onClick={() => setShowAuth(false)}
              style={{ 
                background: 'none', border: 'none', color: '#6b7280', 
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

  // View routing
  if (currentView === 'calendar') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: isMobile ? '0.75rem' : '1.5rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
              Cash Flow Calendar
            </h1>
            <p style={{ color: '#4b5563' }}>Visual timeline of income and expenses</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('timeline')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#8b5cf6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}
              >
                Timeline View
              </button>
            </div>
          </div>

          <CashFlowCalendar />
        </div>
      </div>
    );
  }

  if (currentView === 'timeline') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: isMobile ? '0.75rem' : '1.5rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: isMobile ? '1.25rem' : '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
              Cash Flow Timeline
            </h1>
            <p style={{ color: '#4b5563' }}>30-day projection with running balances</p>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('calendar')}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#8b5cf6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}
              >
                Calendar View
              </button>
            </div>
          </div>

          <TimelineView />
        </div>
      </div>
    );
  }

  // Dialog components for adding/editing
  const AddAccountDialog = () => showAddAccount && (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{ 
        background: 'white', padding: '2rem', borderRadius: '1rem', 
        maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Account</h2>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          addAccount(formData.get('name'), formData.get('type'), formData.get('balance'));
          setShowAddAccount(false);
          e.target.reset();
        }}>
          <input
            name="name"
            placeholder="Account name"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <select
            name="type"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select type</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Credit">Credit</option>
            <option value="Investment">Investment</option>
          </select>
          <input
            name="balance"
            type="number"
            step="0.01"
            placeholder="Initial balance"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{ 
                flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Add Account
            </button>
            <button
              type="button"
              onClick={() => setShowAddAccount(false)}
              style={{ 
                flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const AddIncomeDialog = () => showAddIncome && (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{ 
        background: 'white', padding: '2rem', borderRadius: '1rem', 
        maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Recurring Income</h2>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          addRecurringIncome(
            formData.get('name'),
            formData.get('amount'),
            formData.get('frequency'),
            formData.get('payDay'),
            formData.get('accountId'),
            formData.get('category')
          );
          setShowAddIncome(false);
          e.target.reset();
        }}>
          <input
            name="name"
            placeholder="Income name (e.g., Salary, Rental Income)"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="Amount"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <select
            name="frequency"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select frequency</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input
            name="payDay"
            type="number"
            min="1"
            max="28"
            placeholder="Pay day of month (1-28)"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <select
            name="accountId"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <input
            name="category"
            placeholder="Category (optional, defaults to Income)"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{ 
                flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Add Income
            </button>
            <button
              type="button"
              onClick={() => setShowAddIncome(false)}
              style={{ 
                flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const AddCreditDialog = () => showAddCredit && (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{ 
        background: 'white', padding: '2rem', borderRadius: '1rem', 
        maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Upcoming Credit</h2>
        
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
          e.target.reset();
        }}>
          <input
            name="name"
            placeholder="Credit name"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="Amount"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <input
            name="expectedDate"
            type="date"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <select
            name="accountId"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <input
              name="guaranteed"
              type="checkbox"
              style={{ marginRight: '0.5rem' }}
            />
            Guaranteed (include in projections)
          </label>
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', minHeight: '80px', resize: 'vertical' }}
          />
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{ 
                flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Add Credit
            </button>
            <button
              type="button"
              onClick={() => setShowAddCredit(false)}
              style={{ 
                flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const AddBillDialog = () => showAddBill && (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div style={{ 
        background: 'white', padding: '2rem', borderRadius: '1rem', 
        maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Add Bill</h2>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const newBill = {
            id: crypto.randomUUID(),
            name: formData.get('name'),
            amount: Number(formData.get('amount')),
            frequency: formData.get('frequency'),
            dueDay: Number(formData.get('dueDay')),
            accountId: formData.get('accountId'),
            category: formData.get('category'),
            paidMonths: [],
            ignored: false
          };
          setMasterState(prev => ({
            ...prev,
            bills: [...prev.bills, newBill]
          }));
          setShowAddBill(false);
          e.target.reset();
          notify(`Bill "${newBill.name}" added`, 'success');
        }}>
          <input
            name="name"
            placeholder="Bill name"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="Amount"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <select
            name="frequency"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select frequency</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input
            name="dueDay"
            type="number"
            min="1"
            max="28"
            placeholder="Due day of month (1-28)"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          />
          <select
            name="accountId"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select
            name="category"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}
            required
          >
            <option value="">Select category</option>
            {activeCats.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              style={{ 
                flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Add Bill
            </button>
            <button
              type="button"
              onClick={() => setShowAddBill(false)}
              style={{ 
                flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', 
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Main Dashboard View (Mobile)
  if (isMobile) {
    return (
      <ErrorBoundary>
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '0.75rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem' }}>
              Cashfl0w.io
            </h1>
            
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              {user ? (
                <div>
                  {isSyncing ? 'Syncing...' : 'Synced'} • {user.email}
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
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  background: currentView === 'dashboard' ? '#2563eb' : '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.75rem' 
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('calendar')}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  background: currentView === 'calendar' ? '#2563eb' : '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.75rem' 
                }}
              >
                Calendar
              </button>
              <button
                onClick={() => setCurrentView('timeline')}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  background: currentView === 'timeline' ? '#2563eb' : '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.75rem' 
                }}
              >
                Timeline
              </button>
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
                <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>{fmt(currentLiquidWithProjectedIncome)}</div>
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
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', textAlign: 'center' }}>
              <div style={{ color: '#6b7280' }}>Monthly Income: {fmt(monthlyRecurringIncomeTotal)}</div>
            </div>
          </div>

          {/* Enhanced Budget Status */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Budget Status</h3>
            {Object.entries(budgetStatus).map(([categoryName, status]) => {
              const categoryColor = getCategoryColor(categoryName);
              return (
                <div key={categoryName} style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '0.5rem', 
                  borderRadius: '0.25rem',
                  borderLeft: `4px solid ${categoryColor}`,
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{categoryName}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                      {fmt(status.spent)} / {fmt(status.budget)}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '0.125rem', height: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, status.percentUsed)}%`, 
                      height: '100%', 
                      background: status.status === 'over' ? '#ef4444' : status.status === 'warning' ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ fontSize: '0.625rem', opacity: 0.9, marginTop: '0.25rem' }}>
                    {status.remaining >= 0 ? `${fmt(status.remaining)} remaining` : `${fmt(Math.abs(status.remaining))} over budget`}
                    {status.status === 'warning' && <span style={{ color: '#fbbf24', marginLeft: '0.5rem' }}>⚠️ Close to limit</span>}
                    {status.status === 'over' && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>🚨 Over budget!</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accounts Section */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Accounts</h3>
              <button 
                onClick={() => setShowAddAccount(true)}
                style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '0.25rem',
                marginBottom: '0.25rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{account.name}</div>
                  <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>{account.type}</div>
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
                      border: '1px solid rgba(255,255,255,0.3)', 
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      textAlign: 'right',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white'
                    }}
                  />
                  <button
                    onClick={() => deleteAccount(account.id)}
                    style={{ padding: '0.125rem 0.25rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Recurring Income Section */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Recurring Income</h3>
              <button 
                onClick={() => setShowAddIncome(true)}
                style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                + Income
              </button>
            </div>
            
            <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: '600' }}>Monthly Total: {fmt(monthlyRecurringIncomeTotal)}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {recurringIncome.filter(i => !i.ignored && i.frequency === 'monthly').length} income source(s)
                </div>
              </div>
            </div>
            
            {recurringIncome
              .filter(i => !i.ignored)
              .sort((a, b) => (a.payDay || 1) - (b.payDay || 1))
              .map(income => {
                const account = accounts.find(a => a.id === income.accountId);
                const isReceived = income.receivedMonths?.includes(yyyyMm());
                const nextDate = getNextOccurrence(income);
                
                return (
                  <div key={income.id} style={{ 
                    background: isReceived ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                    padding: '0.5rem', 
                    borderRadius: '0.375rem',
                    border: `2px solid ${isReceived ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.2)'}`,
                    marginBottom: '0.375rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{income.name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                        +{fmt(income.amount)}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, marginBottom: '0.375rem' }}>
                      {income.frequency} • Pay Day: {income.payDay} • {account?.name} • Next: {nextDate.toLocaleDateString()}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isReceived} 
                          onChange={() => toggleIncomeReceived(income)} 
                        />
                        {isReceived ? 'Received' : 'Not received'}
                      </label>
                      <button
                        onClick={() => setEditingIncome(income)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRecurringIncome(income.id)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            
            {recurringIncome.filter(i => !i.ignored).length === 0 && (
              <div style={{ opacity: 0.8, textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                No recurring income. Add salary or other regular income!
              </div>
            )}
          </div>

          {/* Upcoming Credits Section */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
                {showPaidCredits ? 'Paid Credits History' : 'Upcoming Credits'}
              </h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  onClick={() => setShowPaidCredits(!showPaidCredits)}
                  style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  {showPaidCredits ? 'Show Upcoming' : 'Show Paid'}
                </button>
                {!showPaidCredits && (
                  <button 
                    onClick={() => setShowAddCredit(true)}
                    style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    + Credit
                  </button>
                )}
              </div>
            </div>
            
            {!showPaidCredits ? (
              // Upcoming Credits View
              upcomingCredits
                .filter(c => !c.ignored)
                .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
                .map(credit => {
                  const account = accounts.find(a => a.id === credit.accountId);
                  const isOverdue = new Date(credit.expectedDate) < new Date();
                  
                  return (
                    <div key={credit.id} style={{ 
                      background: credit.guaranteed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                      padding: '0.5rem', 
                      borderRadius: '0.375rem',
                      border: `2px solid ${credit.guaranteed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
                      marginBottom: '0.375rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{credit.name}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                          +{fmt(credit.amount)}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.625rem', opacity: 0.9, marginBottom: '0.375rem' }}>
                        {isOverdue ? 'OVERDUE' : ''} Expected: {new Date(credit.expectedDate).toLocaleDateString()} • {account?.name}
                        {credit.guaranteed && <span style={{ fontWeight: '600' }}> • GUARANTEED</span>}
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
                          style={{ fontSize: '0.625rem', padding: '0.125rem 0.25rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        >
                          {accounts.map(a => <option key={a.id} value={a.id} style={{ color: 'black' }}>{a.name}</option>)}
                        </select>
                        <button
                          onClick={() => receiveCredit(credit.id)}
                          style={{ padding: '0.125rem 0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Receive
                        </button>
                        <button
                          onClick={() => toggleCreditGuaranteed(credit.id)}
                          style={{ padding: '0.125rem 0.25rem', background: credit.guaranteed ? 'rgba(245,158,11,0.8)' : 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          {credit.guaranteed ? 'Unguarantee' : 'Guarantee'}
                        </button>
                        <button
                          onClick={() => deleteCredit(credit.id)}
                          style={{ padding: '0.125rem 0.25rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
            ) : (
              // Paid Credits History View
              (() => {
                const creditsByCategory = receivedCredits.reduce((acc, credit) => {
                  const category = credit.category || 'Uncategorized';
                  if (!acc[category]) acc[category] = [];
                  acc[category].push(credit);
                  return acc;
                }, {});

                return Object.entries(creditsByCategory)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([category, credits]) => {
                    const categoryColor = getCategoryColor(category);
                    const categoryTotal = credits.reduce((sum, c) => sum + c.amount, 0);
                    
                    return (
                      <div key={category} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ 
                          background: 'rgba(255,255,255,0.15)',
                          padding: '0.5rem',
                          borderRadius: '0.25rem',
                          marginBottom: '0.25rem',
                          borderLeft: `4px solid ${categoryColor}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{category}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>+{fmt(categoryTotal)}</span>
                          </div>
                          <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>{credits.length} credit{credits.length !== 1 ? 's' : ''}</div>
                        </div>
                        
                        {credits
                          .sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate))
                          .slice(0, 3)
                          .map(credit => {
                            const account = accounts.find(a => a.id === credit.actualAccountId);
                            return (
                              <div key={credit.id} style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '0.375rem',
                                borderRadius: '0.25rem',
                                marginBottom: '0.25rem',
                                fontSize: '0.75rem'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{credit.name}</span>
                                  <span>+{fmt(credit.amount)}</span>
                                </div>
                                <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>
                                  {new Date(credit.receivedDate).toLocaleDateString()} • {account?.name}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })
              })()
            )}
            
            {!showPaidCredits && upcomingCredits.filter(c => !c.ignored).length === 0 && (
              <div style={{ opacity: 0.8, textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                No upcoming credits. Add one to track expected income!
              </div>
            )}
            
            {showPaidCredits && receivedCredits.length === 0 && (
              <div style={{ opacity: 0.8, textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                No received credits yet. Credits will appear here after you mark them as received.
              </div>
            )}
          </div>

          {/* Due This Week */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Due This Week</h3>
            
            {upcoming.items
              .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.income ? 'Income' : it.otc.category))
              .map((it, idx) => {
                const name = it.bill ? it.bill.name : it.income ? it.income.name : it.otc.name;
                const amt = it.bill ? it.bill.amount : it.income ? it.income.amount : it.otc.amount;
                const isIncome = it.type === 'income';
                
                return (
                  <div key={idx} style={{ 
                    background: it.overdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                    padding: '0.5rem', 
                    borderRadius: '0.375rem',
                    border: `1px solid ${it.overdue ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)'}`,
                    marginBottom: '0.375rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: isIncome ? '#10b981' : '#ef4444' }}>
                        {isIncome ? '+' : ''}{fmt(amt)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.625rem', opacity: 0.9 }}>
                      {it.overdue ? 'OVERDUE' : ''} {it.due.toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => it.bill ? togglePaid(it.bill) : it.income ? toggleIncomeReceived(it.income) : toggleOneTimePaid(it.otc)}
                      style={{
                        width: '100%',
                        marginTop: '0.25rem',
                        padding: '0.25rem',
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      Mark {isIncome ? 'Received' : 'Paid'}
                    </button>
                  </div>
                );
              })}
            
            {upcoming.items.filter(it => selectedCats.includes(it.bill ? it.bill.category : it.income ? 'Income' : it.otc.category)).length === 0 && (
              <div style={{ opacity: 0.8, textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                Nothing due this week!
              </div>
            )}
          </div>

          {/* Category Filter */}
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

          {/* All Bills */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
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
                const isPaid = bill.paidMonths?.includes(yyyyMm());
                const nextDate = getNextOccurrence(bill);
                const categoryColor = getCategoryColor(bill.category);
                
                return (
                  <div key={bill.id} style={{ 
                    background: isPaid ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)', 
                    padding: '0.5rem', 
                    borderRadius: '0.375rem',
                    border: `2px solid ${isPaid ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.2)'}`,
                    borderLeft: `4px solid ${categoryColor}`,
                    marginBottom: '0.375rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{bill.name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, marginBottom: '0.375rem' }}>
                      {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th of month' : ''} • {account?.name} • Next: {nextDate.toLocaleDateString()}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isPaid} 
                          onChange={() => togglePaid(bill)} 
                        />
                        {isPaid ? 'Paid' : 'Not paid'}
                      </label>
                      <button
                        onClick={() => setEditingBill(bill)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBill(bill.id)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              <button 
                onClick={() => setShowAddBill(true)}
                style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
              >
                + Add Bill
              </button>
          </div>

          {/* One-Time Costs */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>One-Time Costs</h3>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                placeholder="Cost name"
                value={otcName}
                onChange={(e) => setOtcName(e.target.value)}
                style={{ width: '100%', padding: '0.375rem', marginBottom: '0.25rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <input
                  type="number"
                  placeholder="Amount"
                  value={otcAmount}
                  onChange={(e) => setOtcAmount(Number(e.target.value))}
                  style={{ padding: '0.375rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                />
                <input
                  type="date"
                  value={otcDueDate}
                  onChange={(e) => setOtcDueDate(e.target.value)}
                  style={{ padding: '0.375rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <select
                  value={otcCategory}
                  onChange={(e) => setOtcCategory(e.target.value)}
                  style={{ padding: '0.375rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  {activeCats.map(c => <option key={c} value={c} style={{ color: 'black' }}>{c}</option>)}
                </select>
                <select
                  value={otcAccountId}
                  onChange={(e) => setOtcAccountId(e.target.value)}
                  style={{ padding: '0.375rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  {accounts.map(a => <option key={a.id} value={a.id} style={{ color: 'black' }}>{a.name}</option>)}
                </select>
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={otcNotes}
                onChange={(e) => setOtcNotes(e.target.value)}
                style={{ width: '100%', padding: '0.375rem', marginBottom: '0.25rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', resize: 'vertical', minHeight: '60px', background: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
              <button
                onClick={addOneTimeCost}
                style={{ width: '100%', padding: '0.375rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                const categoryColor = getCategoryColor(otc.category);
                
                return (
                  <div key={otc.id} style={{ 
                    background: otc.paid ? 'rgba(16,185,129,0.2)' : (isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'),
                    padding: '0.5rem', 
                    borderRadius: '0.375rem',
                    border: `2px solid ${otc.paid ? 'rgba(16,185,129,0.4)' : (isOverdue ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)')}`,
                    borderLeft: `4px solid ${categoryColor}`,
                    marginBottom: '0.375rem',
                    opacity: otc.ignored ? 0.5 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{otc.name}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(otc.amount)}</span>
                    </div>
                    
                    <div style={{ fontSize: '0.625rem', opacity: 0.9, marginBottom: '0.375rem' }}>
                      Due: {new Date(otc.dueDate).toLocaleDateString()} • {account?.name} • {otc.category}
                      {isOverdue && <span style={{ color: '#fbbf24', fontWeight: '600' }}> • OVERDUE</span>}
                      {otc.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{otc.notes}</div>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                        <input 
                          type="checkbox" 
                          checked={otc.paid} 
                          onChange={() => toggleOneTimePaid(otc)} 
                        />
                        {otc.paid ? 'Paid' : 'Not paid'}
                      </label>
                      <button
                        onClick={() => toggleOTCIgnored(otc)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(107,114,128,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        {otc.ignored ? 'Show' : 'Hide'}
                      </button>
                      <button
                        onClick={() => deleteOneTimeCost(otc.id)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Categories Management */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', color: 'white' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Categories</h3>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                const name = e.target.categoryName.value.trim();
                const budget = e.target.categoryBudget.value;
                if (name) {
                  addCategory(name, budget);
                  e.target.categoryName.value = '';
                  e.target.categoryBudget.value = '';
                }
              }}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                  <input
                    name="categoryName"
                    placeholder="New category name"
                    style={{ flex: 1, padding: '0.375rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                  <input
                    name="categoryBudget"
                    type="number"
                    placeholder="Budget"
                    style={{ width: '80px', padding: '0.375rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{ width: '100%', padding: '0.375rem 0.75rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  Add Category
                </button>
              </form>
            </div>

            {categories
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(cat => {
                const categoryColor = getCategoryColor(cat.name);
                return (
                  <div key={cat.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.5rem', 
                    background: cat.ignored ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)', 
                    borderRadius: '0.25rem',
                    marginBottom: '0.25rem',
                    opacity: cat.ignored ? 0.6 : 1,
                    borderLeft: `4px solid ${categoryColor}`
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
                        style={{ fontSize: '0.875rem', padding: '0.125rem 0.25rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <span 
                          style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}
                          onClick={() => setEditingCategoryId(cat.id)}
                        >
                          {cat.name}
                        </span>
                        <input
                          type="number"
                          value={cat.budget || 0}
                          onChange={(e) => updateCategoryBudget(cat.id, e.target.value)}
                          placeholder="Budget"
                          style={{ width: '60px', padding: '0.125rem 0.25rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => moveCategoryUp(cat.id)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveCategoryDown(cat.id)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggleIgnoreCategory(cat.name)}
                        style={{ padding: '0.125rem 0.25rem', background: cat.ignored ? 'rgba(16,185,129,0.8)' : 'rgba(245,158,11,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        {cat.ignored ? 'Show' : 'Hide'}
                      </button>
                      <button
                        onClick={() => removeCategory(cat.name)}
                        style={{ padding: '0.125rem 0.25rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Settings */}
          <div style={{ 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', 
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
            </div>
          </div>

          {/* Dialogs */}
          <AddAccountDialog />
          <AddIncomeDialog />
          <AddCreditDialog />
          <AddBillDialog />

        </div>
      </ErrorBoundary>
    );
  }

  // Desktop View
  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1.5rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cashfl0w.io
            </h1>
            <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>Complete Financial Management Dashboard</p>
            
            <div style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
              {user ? (
                <div>
                  {isSyncing ? 'Syncing...' : 'Synced'} • {user.email}
                  <button
                    onClick={handleLogout}
                    style={{ marginLeft: '1rem', padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem' }}
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
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: currentView === 'dashboard' ? '#2563eb' : '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('calendar')}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: currentView === 'calendar' ? '#2563eb' : '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Calendar
              </button>
              <button
                onClick={() => setCurrentView('timeline')}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: currentView === 'timeline' ? '#2563eb' : '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                Timeline
              </button>
            </div>
          </div>

          {/* Net Worth & Budget Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Financial Overview */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Financial Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>Current Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{fmt(currentLiquid)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a', marginBottom: '0.5rem' }}>With Projected Income</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{fmt(currentLiquidWithProjectedIncome)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#d97706', marginBottom: '0.5rem' }}>After This Week</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: afterWeek < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterWeek)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '1rem', background: '#fce7f3', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#be185d', marginBottom: '0.5rem' }}>After This Month</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: afterMonth < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterMonth)}</div>
                </div>
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', color: '#6b7280' }}>Monthly Recurring Income: <span style={{ fontWeight: '600', color: '#16a34a' }}>{fmt(monthlyRecurringIncomeTotal)}</span></div>
              </div>
            </div>

            {/* Enhanced Budget Status */}
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Budget Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(budgetStatus).map(([categoryName, status]) => {
                  const categoryColor = getCategoryColor(categoryName);
                  return (
                    <div key={categoryName} style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      padding: '0.75rem', 
                      borderRadius: '0.5rem',
                      borderLeft: `4px solid ${categoryColor}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '500' }}>{categoryName}</span>
                        <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                          {fmt(status.spent)} / {fmt(status.budget)}
                        </span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '0.25rem', height: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ 
                          width: `${Math.min(100, status.percentUsed)}%`, 
                          height: '100%', 
                          background: status.status === 'over' ? '#ef4444' : status.status === 'warning' ? '#f59e0b' : '#10b981',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          {status.remaining >= 0 ? `${fmt(status.remaining)} remaining` : `${fmt(Math.abs(status.remaining))} over budget`}
                        </span>
                        {status.status === 'warning' && <span style={{ color: '#fbbf24' }}>⚠️ Close to limit</span>}
                        {status.status === 'over' && <span style={{ color: '#ef4444' }}>🚨 Over budget!</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Main Dashboard Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Accounts */}
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Accounts</h3>
                  <button 
                    onClick={() => setShowAddAccount(true)}
                    style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', cursor: 'pointer' }}
                  >
                    + Add Account
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {accounts.map(account => (
                    <div key={account.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.75rem', 
                      background: 'rgba(255,255,255,0.1)', 
                      borderRadius: '0.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '500' }}>{account.name}</div>
                        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{account.type}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          value={account.balance}
                          onChange={(e) => updateAccountBalance(account.id, e.target.value)}
                          onFocus={selectAllOnFocus}
                          style={{ 
                            width: '120px', 
                            padding: '0.375rem', 
                            border: '1px solid rgba(255,255,255,0.3)', 
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            textAlign: 'right',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white'
                          }}
                        />
                        <button
                          onClick={() => deleteAccount(account.id)}
                          style={{ padding: '0.375rem 0.75rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enhanced Recurring Income */}
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Recurring Income</h3>
                  <button 
                    onClick={() => setShowAddIncome(true)}
                    style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', cursor: 'pointer' }}
                  >
                    + Add Income
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>Monthly Total: {fmt(monthlyRecurringIncomeTotal)}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                      {recurringIncome.filter(i => !i.ignored && i.frequency === 'monthly').length} income source(s)
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recurringIncome
                    .filter(i => !i.ignored)
                    .sort((a, b) => (a.payDay || 1) - (b.payDay || 1))
                    .map(income => {
                      const account = accounts.find(a => a.id === income.accountId);
                      const isReceived = income.receivedMonths?.includes(yyyyMm());
                      const nextDate = getNextOccurrence(income);
                      
                      return (
                        <div key={income.id} style={{ 
                          background: isReceived ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                          padding: '0.75rem', 
                          borderRadius: '0.5rem',
                          border: `2px solid ${isReceived ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.2)'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: '500' }}>{income.name}</span>
                            <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                              +{fmt(income.amount)}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.75rem' }}>
                            {income.frequency} • Pay Day: {income.payDay} • {account?.name} • Next: {nextDate.toLocaleDateString()}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                              <input 
                                type="checkbox" 
                                checked={isReceived} 
                                onChange={() => toggleIncomeReceived(income)} 
                              />
                              {isReceived ? 'Received this month' : 'Not received yet'}
                            </label>
                            <button
                              onClick={() => setEditingIncome(income)}
                              style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteRecurringIncome(income.id)}
                              style={{ padding: '0.25rem 0.5rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  
                  {recurringIncome.filter(i => !i.ignored).length === 0 && (
                    <div style={{ opacity: 0.8, textAlign: 'center', padding: '2rem', fontSize: '1rem' }}>
                      No recurring income. Add salary or other regular income to track your expected money flow!
                    </div>
                  )}
                </div>
              </div>

            </div>
            
            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Upcoming Credits */}
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                    {showPaidCredits ? 'Paid Credits History' : 'Upcoming Credits'}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setShowPaidCredits(!showPaidCredits)}
                      style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', cursor: 'pointer' }}
                    >
                      {showPaidCredits ? 'Show Upcoming' : 'Show History'}
                    </button>
                    {!showPaidCredits && (
                      <button 
                        onClick={() => setShowAddCredit(true)}
                        style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', cursor: 'pointer' }}
                      >
                        + Add Credit
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {!showPaidCredits ? (
                    // Upcoming Credits View
                    upcomingCredits
                      .filter(c => !c.ignored)
                      .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
                      .map(credit => {
                        const account = accounts.find(a => a.id === credit.accountId);
                        const isOverdue = new Date(credit.expectedDate) < new Date();
                        
                        return (
                          <div key={credit.id} style={{ 
                            background: credit.guaranteed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                            padding: '0.75rem', 
                            borderRadius: '0.5rem',
                            border: `2px solid ${credit.guaranteed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1rem', fontWeight: '500' }}>{credit.name}</span>
                              <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                                +{fmt(credit.amount)}
                              </span>
                            </div>
                            
                            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.75rem' }}>
                              {isOverdue ? <span style={{ color: '#fbbf24', fontWeight: '600' }}>OVERDUE • </span> : ''}
                              Expected: {new Date(credit.expectedDate).toLocaleDateString()} • {account?.name}
                              {credit.guaranteed && <span style={{ fontWeight: '600', color: '#fbbf24' }}> • GUARANTEED ⭐</span>}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                                style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                              >
                                {accounts.map(a => <option key={a.id} value={a.id} style={{ color: 'black' }}>{a.name}</option>)}
                              </select>
                              <button
                                onClick={() => receiveCredit(credit.id)}
                                style={{ padding: '0.25rem 0.75rem', background: 'rgba(16,185,129,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                              >
                                Mark Received
                              </button>
                              <button
                                onClick={() => toggleCreditGuaranteed(credit.id)}
                                style={{ padding: '0.25rem 0.75rem', background: credit.guaranteed ? 'rgba(245,158,11,0.8)' : 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                              >
                                {credit.guaranteed ? 'Unguarantee' : 'Guarantee'}
                              </button>
                              <button
                                onClick={() => deleteCredit(credit.id)}
                                style={{ padding: '0.25rem 0.75rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    // Paid Credits History View
                    (() => {
                      const creditsByCategory = receivedCredits.reduce((acc, credit) => {
                        const category = credit.category || 'Uncategorized';
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(credit);
                        return acc;
                      }, {});

                      return Object.entries(creditsByCategory)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([category, credits]) => {
                          const categoryColor = getCategoryColor(category);
                          const categoryTotal = credits.reduce((sum, c) => sum + c.amount, 0);
                          
                          return (
                            <div key={category} style={{ marginBottom: '1rem' }}>
                              <div style={{ 
                                background: 'rgba(255,255,255,0.15)',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                marginBottom: '0.5rem',
                                borderLeft: `4px solid ${categoryColor}`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: '600' }}>{category}</span>
                                  <span style={{ fontSize: '1rem', fontWeight: '600' }}>+{fmt(categoryTotal)}</span>
                                </div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>{credits.length} credit{credits.length !== 1 ? 's' : ''}</div>
                              </div>
                              
                              {credits
                                .sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate))
                                .slice(0, 5)
                                .map(credit => {
                                  const account = accounts.find(a => a.id === credit.actualAccountId);
                                  return (
                                    <div key={credit.id} style={{
                                      background: 'rgba(255,255,255,0.1)',
                                      padding: '0.5rem',
                                      borderRadius: '0.375rem',
                                      marginBottom: '0.25rem',
                                      fontSize: '0.875rem'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{credit.name}</span>
                                        <span>+{fmt(credit.amount)}</span>
                                      </div>
                                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                        {new Date(credit.receivedDate).toLocaleDateString()} • {account?.name}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })
                    })()
                  )}
                  
                  {!showPaidCredits && upcomingCredits.filter(c => !c.ignored).length === 0 && (
                    <div style={{ opacity: 0.8, textAlign: 'center', padding: '2rem', fontSize: '1rem' }}>
                      No upcoming credits. Add expected income like freelance payments or refunds!
                    </div>
                  )}
                  
                  {showPaidCredits && receivedCredits.length === 0 && (
                    <div style={{ opacity: 0.8, textAlign: 'center', padding: '2rem', fontSize: '1rem' }}>
                      No received credits yet. Credits will appear here after you mark them as received.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Due This Week */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Due This Week</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {upcoming.items
                .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.income ? 'Income' : it.otc.category))
                .map((it, idx) => {
                  const name = it.bill ? it.bill.name : it.income ? it.income.name : it.otc.name;
                  const amt = it.bill ? it.bill.amount : it.income ? it.income.amount : it.otc.amount;
                  const isIncome = it.type === 'income';
                  
                  return (
                    <div key={idx} style={{ 
                      background: it.overdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      border: `2px solid ${it.overdue ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '500' }}>{name}</span>
                        <span style={{ fontSize: '1rem', fontWeight: '600', color: isIncome ? '#10b981' : '#ef4444' }}>
                          {isIncome ? '+' : ''}{fmt(amt)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.75rem' }}>
                        {it.overdue && <span style={{ color: '#fbbf24', fontWeight: '600' }}>OVERDUE • </span>}
                        Due: {it.due.toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => it.bill ? togglePaid(it.bill) : it.income ? toggleIncomeReceived(it.income) : toggleOneTimePaid(it.otc)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: isIncome ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        Mark as {isIncome ? 'Received' : 'Paid'}
                      </button>
                    </div>
                  );
                })}
              
              {upcoming.items.filter(it => selectedCats.includes(it.bill ? it.bill.category : it.income ? 'Income' : it.otc.category)).length === 0 && (
                <div style={{ opacity: 0.8, textAlign: 'center', padding: '2rem', fontSize: '1rem', gridColumn: '1 / -1' }}>
                  Nothing due this week! You're all caught up.
                </div>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            {['All', ...activeCats].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: '2px solid #d1d5db',
                  background: selectedCat === cat ? '#1f2937' : 'white',
                  color: selectedCat === cat ? 'white' : '#374151',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Bills and One-Time Costs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* All Bills */}
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Bills</h3>
                <button 
                  onClick={() => setShowAddBill(true)}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  + Add Bill
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                {bills
                  .filter(b => selectedCats.includes(b.category))
                  .sort((a,b) => {
                    const aDate = getNextOccurrence(a);
                    const bDate = getNextOccurrence(b);
                    return aDate - bDate;
                  })
                  .map(bill => {
                    const account = accounts.find(a => a.id === bill.accountId);
                    const isPaid = bill.paidMonths?.includes(yyyyMm());
                    const nextDate = getNextOccurrence(bill);
                    const categoryColor = getCategoryColor(bill.category);
                    
                    return (
                      <div key={bill.id} style={{ 
                        background: isPaid ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)', 
                        padding: '0.75rem', 
                        borderRadius: '0.5rem',
                        border: `2px solid ${isPaid ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.2)'}`,
                        borderLeft: `4px solid ${categoryColor}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '500', fontSize: '1rem' }}>{bill.name}</span>
                          <span style={{ fontSize: '1rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                        </div>
                        
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.75rem' }}>
                          {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th' : ''} • {account?.name}<br />
                          Next due: {nextDate.toLocaleDateString()}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <input 
                              type="checkbox" 
                              checked={isPaid} 
                              onChange={() => togglePaid(bill)} 
                            />
                            {isPaid ? 'Paid this month' : 'Not paid yet'}
                          </label>
                          <button
                            onClick={() => setEditingBill(bill)}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteBill(bill.id)}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* One-Time Costs */}
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>One-Time Costs</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <input
                  placeholder="Cost name"
                  value={otcName}
                  onChange={(e) => setOtcName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={otcAmount}
                    onChange={(e) => setOtcAmount(Number(e.target.value))}
                    style={{ padding: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                  <input
                    type="date"
                    value={otcDueDate}
                    onChange={(e) => setOtcDueDate(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select
                    value={otcCategory}
                    onChange={(e) => setOtcCategory(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    {activeCats.map(c => <option key={c} value={c} style={{ color: 'black' }}>{c}</option>)}
                  </select>
                  <select
                    value={otcAccountId}
                    onChange={(e) => setOtcAccountId(e.target.value)}
                    style={{ padding: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    {accounts.map(a => <option key={a.id} value={a.id} style={{ color: 'black' }}>{a.name}</option>)}
                  </select>
                </div>
                <textarea
                  placeholder="Notes (optional)"
                  value={otcNotes}
                  onChange={(e) => setOtcNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', resize: 'vertical', minHeight: '80px', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                />
                <button
                  onClick={addOneTimeCost}
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  Add One-Time Cost
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {oneTimeCosts
                  .filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true))
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                  .map(otc => {
                    const account = accounts.find(a => a.id === otc.accountId);
                    const isOverdue = new Date(otc.dueDate) < new Date() && !otc.paid;
                    const categoryColor = getCategoryColor(otc.category);
                    
                    return (
                      <div key={otc.id} style={{ 
                        background: otc.paid ? 'rgba(16,185,129,0.2)' : (isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'),
                        padding: '0.75rem', 
                        borderRadius: '0.5rem',
                        border: `2px solid ${otc.paid ? 'rgba(16,185,129,0.4)' : (isOverdue ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.2)')}`,
                        borderLeft: `4px solid ${categoryColor}`,
                        opacity: otc.ignored ? 0.5 : 1
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: '500', fontSize: '1rem' }}>{otc.name}</span>
                          <span style={{ fontSize: '1rem', fontWeight: '600' }}>{fmt(otc.amount)}</span>
                        </div>
                        
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.75rem' }}>
                          Due: {new Date(otc.dueDate).toLocaleDateString()} • {account?.name} • {otc.category}
                          {isOverdue && <span style={{ color: '#fbbf24', fontWeight: '600' }}> • OVERDUE</span>}
                          {otc.notes && <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>{otc.notes}</div>}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <input 
                              type="checkbox" 
                              checked={otc.paid} 
                              onChange={() => toggleOneTimePaid(otc)} 
                            />
                            {otc.paid ? 'Paid' : 'Not paid'}
                          </label>
                          <button
                            onClick={() => toggleOTCIgnored(otc)}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(107,114,128,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                          >
                            {otc.ignored ? 'Show' : 'Hide'}
                          </button>
                          <button
                            onClick={() => deleteOneTimeCost(otc.id)}
                            style={{ padding: '0.25rem 0.5rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>

          {/* Categories Management */}
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', color: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Categories Management</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                const name = e.target.categoryName.value.trim();
                const budget = e.target.categoryBudget.value;
                if (name) {
                  addCategory(name, budget);
                  e.target.categoryName.value = '';
                  e.target.categoryBudget.value = '';
                }
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    name="categoryName"
                    placeholder="New category name"
                    style={{ padding: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                  <input
                    name="categoryBudget"
                    type="number"
                    placeholder="Monthly Budget"
                    style={{ width: '150px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {categories
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(cat => {
                  const categoryColor = getCategoryColor(cat.name);
                  return (
                    <div key={cat.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.75rem', 
                      background: cat.ignored ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)', 
                      borderRadius: '0.5rem',
                      opacity: cat.ignored ? 0.6 : 1,
                      borderLeft: `4px solid ${categoryColor}`
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
                          style={{ fontSize: '1rem', padding: '0.25rem 0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                          <span 
                            style={{ fontSize: '1rem', fontWeight: '500', cursor: 'pointer' }}
                            onClick={() => setEditingCategoryId(cat.id)}
                          >
                            {cat.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>Budget:</span>
                            <input
                              type="number"
                              value={cat.budget || 0}
                              onChange={(e) => updateCategoryBudget(cat.id, e.target.value)}
                              placeholder="Budget"
                              style={{ width: '100px', padding: '0.25rem 0.5rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => moveCategoryUp(cat.id)}
                          style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveCategoryDown(cat.id)}
                          style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => toggleIgnoreCategory(cat.name)}
                          style={{ padding: '0.25rem 0.5rem', background: cat.ignored ? 'rgba(16,185,129,0.8)' : 'rgba(245,158,11,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          {cat.ignored ? 'Show' : 'Hide'}
                        </button>
                        <button
                          onClick={() => removeCategory(cat.name)}
                          style={{ padding: '0.25rem 0.5rem', background: 'rgba(220,38,38,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Settings */}
          <div style={{ 
            background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', 
            padding: '1.5rem', 
            borderRadius: '1rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
            color: 'white'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Settings & Preferences</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <input 
                  type="checkbox" 
                  checked={autoDeductCash[0]} 
                  onChange={(e) => setAutoDeductCash(e.target.checked)} 
                  style={{ accentColor: 'white', transform: 'scale(1.2)' }}
                />
                Auto-deduct from Cash accounts when marking items as paid
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <input 
                  type="checkbox" 
                  checked={showIgnored[0]} 
                  onChange={(e) => setShowIgnored(e.target.checked)} 
                  style={{ accentColor: 'white', transform: 'scale(1.2)' }}
                />
                Show ignored/hidden items in lists
              </label>
            </div>
          </div>

          {/* Dialogs */}
          <AddAccountDialog />
          <AddIncomeDialog />
          <AddCreditDialog />
          <AddBillDialog />

        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return <DashboardContent />;
}
