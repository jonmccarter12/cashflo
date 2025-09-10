import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// ===================== SUPABASE CONFIG =====================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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
      info: '#3b82f6'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; background: ${colors[type]}; color: white;
      padding: 0.75rem 1rem; border-radius: 0.5rem; z-index: 50;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      transform: translateX(100%); transition: transform 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, 3000);
  }
}

// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
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
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const pushState = useCallback((newState) => {
    const updatedHistory = history.slice(0, currentIndex + 1);
    updatedHistory.push(newState);
    setHistory(updatedHistory);
    setCurrentIndex(updatedHistory.length - 1);
    setState(newState);
  }, [history, currentIndex]);
  
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setState(history[newIndex]);
    }
  }, [currentIndex, history]);
  
  const redo = useCallback(() => {
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

// Custom hook for cloud-synced persistent state
function useCloudState(key, initial, user, supabase){
  const [state, setState] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, [key]);

  useEffect(() => {
    if (!user || !supabase) return;
    
    const loadFromCloud = async () => {
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .eq('data_type', key)
          .single();

        if (data && !error) {
          setState(data.data);
          setLastSync(new Date(data.updated_at));
          localStorage.setItem(key, JSON.stringify(data.data));
        }
      } catch (e) {
        console.error('Failed to load from cloud:', e);
      } finally {
        setSyncing(false);
      }
    };

    loadFromCloud();
  }, [user, supabase, key]);

  useEffect(() => {
    if (!user || !supabase) {
      if(typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(state));
        } catch {}
      }
      return;
    }

    const saveToCloud = async () => {
      setSyncing(true);
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

        if (!error) {
          setLastSync(new Date());
          localStorage.setItem(key, JSON.stringify(state));
        } else {
          notify('Failed to sync to cloud', 'error');
        }
      } catch (e) {
        console.error('Failed to save to cloud:', e);
      } finally {
        setSyncing(false);
      }
    };

    const debounce = setTimeout(saveToCloud, 1000);
    return () => clearTimeout(debounce);
  }, [state, user, supabase, key]);

  return [state, setState, { syncing, lastSync }];
}

// Calculate next occurrence for a bill
function getNextOccurrence(bill, fromDate = new Date()) {
  const date = new Date(fromDate);
  
  if (bill.frequency === 'monthly') {
    date.setDate(clampDue(bill.dueDay));
    if (date <= fromDate) {
      date.setMonth(date.getMonth() + 1);
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
      // Handle "first", "second", "third", "fourth", "last"
      const targetWeek = bill.weeklySchedule;
      const month = date.getMonth();
      date.setDate(1);
      date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7));
      
      if (targetWeek === 'last') {
        // Find last occurrence in month
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
  
  // Default to monthly
  return getNextOccurrence({ ...bill, frequency: 'monthly' }, fromDate);
}

// ===================== MAIN COMPONENT =====================
export default function Dashboard(){
  const isMobile = useIsMobile();
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Supabase client
  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);

  // Categories with cloud sync
  const [categories, setCategories, catSync] = useCloudState(
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
  
  const activeCats = useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  // Data with cloud sync and undo/redo
  const [accounts, setAccountsBase, accSync] = useCloudState(
    `${storageKey}:accounts`,
    [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ],
    user,
    supabase
  );
  
  const [accountsHistory, setAccounts, accountsUndoRedo] = useUndoRedo(accounts);
  
  useEffect(() => {
    setAccounts(accounts);
  }, [accounts]);
  
  useEffect(() => {
    if (accountsHistory !== accounts) {
      setAccountsBase(accountsHistory);
    }
  }, [accountsHistory]);
  
  const [bills, setBills, billSync] = useCloudState(`${storageKey}:bills`, [], user, supabase);
  const [oneTimeCosts, setOneTimeCosts, otcSync] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [nwHistory, setNwHistory, nwSync] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

  // Settings/UI with cloud sync
  const [autoDeductCash, setAutoDeductCash, deductSync] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored, ignoredSync] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat, catSelSync] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  const [activeMonth, setActiveMonth] = useState(monthKey);
  const [netWorthMode, setNetWorthMode] = useState('current');
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [editingOTC, setEditingOTC] = useState(null);

  // One-time cost form state
  const [otcName, setOtcName] = useState("");
  const [otcCategory, setOtcCategory] = useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = useState(0);
  const [otcDueDate, setOtcDueDate] = useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = useState("");

  // Check if any data is syncing
  const isSyncing = catSync.syncing || accSync.syncing || billSync.syncing || otcSync.syncing || nwSync.syncing;
  
  // Get last sync time
  const lastSyncTime = useMemo(() => {
    const times = [catSync.lastSync, accSync.lastSync, billSync.lastSync, otcSync.lastSync, nwSync.lastSync]
      .filter(t => t !== null);
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map(t => t.getTime())));
  }, [catSync.lastSync, accSync.lastSync, billSync.lastSync, otcSync.lastSync, nwSync.lastSync]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        accountsUndoRedo.undo();
      } else if (e.ctrlKey && e.altKey && e.key === 'z') {
        e.preventDefault();
        accountsUndoRedo.redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accountsUndoRedo]);

  // Auth functions
  async function handleAuth() {
    if (!supabase) {
      notify('Please configure Supabase credentials first', 'error');
      return;
    }
    
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        if (error) throw error;
        notify('Account created! You can now login.', 'success');
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
      notify(error.message || 'Authentication failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    notify('Logged out', 'info');
  }

  // Update form state when categories/accounts change
  useEffect(() => {
    if(activeCats.length && !activeCats.includes(otcCategory)) setOtcCategory(activeCats[0]);
  }, [activeCats, otcCategory]);

  useEffect(() => {
    if(accounts.length && !accounts.find(a => a.id === otcAccountId)) setOtcAccountId(accounts[0].id);
  }, [accounts, otcAccountId]);

  // Derived calculations
  const currentLiquid = useMemo(()=> accounts.reduce((s,a)=> s+a.balance, 0), [accounts]);
  
  const upcoming = useMemo(()=>{
    const now = new Date();
    const horizon = new Date(now); 
    horizon.setDate(now.getDate()+7);
    const items = [];

    for(const b of bills){
      if(b.ignored) continue;
      if(!activeCats.includes(b.category)) continue;
      if(b.skipMonths?.includes(activeMonth)) continue;
      
      const nextDate = getNextOccurrence(b, now);
      const paid = b.paidMonths.includes(activeMonth) && b.frequency === 'monthly';
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
  }, [accounts, bills, oneTimeCosts, activeCats, activeMonth]);

  const monthUnpaidTotal = useMemo(()=>{
    let sum = 0;
    for(const b of bills){ 
      if(b.ignored) continue;
      if(!activeCats.includes(b.category)) continue; 
      if(b.skipMonths?.includes(activeMonth)) continue; 
      if(!b.paidMonths.includes(activeMonth)) sum += b.amount; 
    }
    for(const o of oneTimeCosts){ 
      if(o.ignored) continue;
      if(!activeCats.includes(o.category)) continue; 
      if(o.dueDate.slice(0,7)===activeMonth && !o.paid) sum += o.amount; 
    }
    return sum;
  },[bills, oneTimeCosts, activeCats, activeMonth]);

  const afterWeek = currentLiquid - upcoming.weekDueTotal;
  const afterMonth = currentLiquid - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquid : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquid);

  const selectedCats = selectedCat==='All' ? activeCats : activeCats.filter(c=> c===selectedCat);

  // Actions
  function togglePaid(b){
    const isPaid = b.paidMonths.includes(activeMonth);
    setBills(prev=> prev.map(x=> x.id===b.id ? { 
      ...x, 
      paidMonths: isPaid? x.paidMonths.filter(m=>m!==activeMonth) : [...x.paidMonths, activeMonth] 
    } : x));
    const acc = accounts.find(a=>a.id===b.accountId);
    if(autoDeductCash && acc?.type==='Cash'){ 
      if(!isPaid) {
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - b.amount } : a)); 
      } else {
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance + b.amount } : a)); 
      }
    }
  }

  function toggleSkipThisMonth(b){
    setBills(prev=> prev.map(x=> x.id===b.id ? { 
      ...x, 
      skipMonths: x.skipMonths?.includes(activeMonth) ? 
        x.skipMonths.filter(m=>m!==activeMonth) : 
        [ ...(x.skipMonths||[]), activeMonth ] 
    } : x));
  }

  function toggleBillIgnored(b){
    setBills(prev=> prev.map(x=> x.id===b.id ? { ...x, ignored: !x.ignored } : x));
  }

  function toggleOneTimePaid(o){
    setOneTimeCosts(prev=> prev.map(x=> x.id===o.id ? { ...x, paid: !x.paid } : x));
    const acc = accounts.find(a=>a.id===o.accountId);
    if(autoDeductCash && acc?.type==='Cash'){ 
      if(!o.paid) {
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - o.amount } : a)); 
      } else {
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance + o.amount } : a)); 
      }
    }
  }

  function toggleOTCIgnored(o){
    setOneTimeCosts(prev=> prev.map(x=> x.id===o.id ? { ...x, ignored: !x.ignored } : x));
  }

  function deleteBill(billId){
    if(confirm('Delete this bill?')){
      setBills(prev => prev.filter(b => b.id !== billId));
      notify('Bill deleted');
    }
  }

  function deleteOneTimeCost(otcId){
    if(confirm('Delete this one-time cost?')){
      setOneTimeCosts(prev => prev.filter(o => o.id !== otcId));
      notify('One-time cost deleted');
    }
  }

  function addOneTimeCost() {
    if(!otcName || !otcAmount || !otcDueDate) return;
    setOneTimeCosts(prev => [...prev, { 
      id: crypto.randomUUID(), 
      name: otcName, 
      category: otcCategory, 
      amount: otcAmount, 
      dueDate: otcDueDate, 
      accountId: otcAccountId, 
      notes: otcNotes, 
      paid: false,
      ignored: false 
    }]);
    setOtcName("");
    setOtcAmount(0);
    setOtcNotes("");
    notify('One-time cost added');
  }

  function addCategory(name){ 
    const nm=name.trim(); 
    if(!nm) return; 
    if(categories.some(c=>c.name===nm)) { 
      notify('Category exists', 'error'); 
      return; 
    } 
    const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
    setCategories(prev=> [...prev, { id: crypto.randomUUID(), name: nm, order: maxOrder + 1 }]); 
  }

  function toggleIgnoreCategory(name){ 
    setCategories(prev=> prev.map(c=> c.name===name? { ...c, ignored: !c.ignored } : c)); 
  }

  function removeCategory(name){ 
    const hasItems = bills.some(b=>b.category===name) || oneTimeCosts.some(o=>o.category===name); 
    if(hasItems && !confirm(`Category "${name}" has items. Move them to Uncategorized?`)) return; 
    const fallback='Uncategorized'; 
    if(!categories.find(c=>c.name===fallback)) {
      const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
      setCategories(prev=> [...prev,{id:crypto.randomUUID(), name:fallback, order: maxOrder + 1}]); 
    }
    setBills(prev=> prev.map(b=> b.category===name? { ...b, category: fallback } : b)); 
    setOneTimeCosts(prev=> prev.map(o=> o.category===name? { ...o, category: fallback } : o)); 
    setCategories(prev=> prev.filter(c=> c.name!==name)); 
  }

  function moveCategoryUp(id) {
    setCategories(prev => {
      const sorted = [...prev].sort((a,b) => (a.order || 0) - (b.order || 0));
      const index = sorted.findIndex(c => c.id === id);
      if (index > 0) {
        const temp = sorted[index].order || index;
        sorted[index].order = sorted[index - 1].order || (index - 1);
        sorted[index - 1].order = temp;
      }
      return sorted;
    });
  }

  function moveCategoryDown(id) {
    setCategories(prev => {
      const sorted = [...prev].sort((a,b) => (a.order || 0) - (b.order || 0));
      const index = sorted.findIndex(c => c.id === id);
      if (index < sorted.length - 1) {
        const temp = sorted[index].order || index;
        sorted[index].order = sorted[index + 1].order || (index + 1);
        sorted[index + 1].order = temp;
      }
      return sorted;
    });
  }

  function renameCategory(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.id !== id && c.name === trimmed)) {
      notify('Category name already exists', 'error');
      return;
    }
    const oldName = categories.find(c => c.id === id)?.name;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: trimmed } : c));
    if (oldName) {
      setBills(prev => prev.map(b => b.category === oldName ? { ...b, category: trimmed } : b));
      setOneTimeCosts(prev => prev.map(o => o.category === oldName ? { ...o, category: trimmed } : o));
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
            💰 Bills & Balances
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
              onClick={accountsUndoRedo.undo}
              disabled={!accountsUndoRedo.canUndo}
              style={{ padding: '0.25rem 0.5rem', marginRight: '0.25rem', background: accountsUndoRedo.canUndo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              ↶ Undo
            </button>
            <button
              onClick={accountsUndoRedo.redo}
              disabled={!accountsUndoRedo.canRedo}
              style={{ padding: '0.25rem 0.5rem', background: accountsUndoRedo.canRedo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              ↷ Redo
            </button>
          </div>
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
                  onChange={(e) => setAccounts(prev => prev.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a))}
                  style={{ width: '80px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', textAlign: 'right' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Bills */}
        <div style={mobileStyles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Bills ({activeMonth})</h3>
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
            .filter(b => !b.ignored && selectedCats.includes(b.category))
            .sort((a,b) => {
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
                  background: '#f9fafb', 
                  padding: '0.5rem', 
                  borderRadius: '0.375rem',
                  border: `2px solid ${isPaid ? '#10b981' : isSkipped ? '#f59e0b' : '#e5e7eb'}`,
                  marginBottom: '0.375rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{bill.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                    {bill.frequency === 'monthly' ? `Due: ${bill.dueDay}` : 
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
                      style={{ padding: '0.125rem 0.25rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Ignore
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
            .filter(o => !o.ignored && selectedCats.includes(o.category))
            .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(otc => (
              <div key={otc.id} style={{ 
                background: '#f9fafb', 
                padding: '0.5rem', 
                borderRadius: '0.375rem',
                marginBottom: '0.375rem'
              }}>
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
                    style={{ padding: '0.125rem 0.25rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                  >
                    Ignore
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

        {/* Mobile Due & Overdue */}
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
        </div>

        {/* Dialogs */}
        {showAuth && <AuthDialog email={email} setEmail={setEmail} password={password} setPassword={setPassword} isSignUp={isSignUp} setIsSignUp={setIsSignUp} authLoading={authLoading} onClose={() => setShowAuth(false)} onAuth={handleAuth} supabase={supabase} />}
        {showAddAccount && <AddAccountDialog onClose={() => setShowAddAccount(false)} onAdd={(acc) => { setAccounts(prev => [...prev, acc]); setShowAddAccount(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {showAddBill && <AddBillDialog categories={activeCats} accounts={accounts} onClose={() => setShowAddBill(false)} onAdd={(bill) => { setBills(prev => [...prev, bill]); setShowAddBill(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingBill && <EditBillDialog bill={editingBill} categories={activeCats} accounts={accounts} onClose={() => setEditingBill(null)} onSave={(updates) => { setBills(prev => prev.map(b => b.id === editingBill.id ? {...b, ...updates} : b)); setEditingBill(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingOTC && <EditOTCDialog otc={editingOTC} categories={activeCats} accounts={accounts} onClose={() => setEditingOTC(null)} onSave={(updates) => { setOneTimeCosts(prev => prev.map(o => o.id === editingOTC.id ? {...o, ...updates} : o)); setEditingOTC(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingAccount && <EditAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(updates) => { setAccounts(prev => prev.map(a => a.id === editingAccount.id ? {...a, ...updates} : a)); setEditingAccount(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {showSnapshots && <SnapshotsDialog snapshots={nwHistory} onClose={() => setShowSnapshots(false)} fmt={fmt} />}
      </div>
    );
  }

  // Desktop Version (unchanged layout)
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header with Cloud Status */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>💰</span>
            Bills & Balances Dashboard
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
                onClick={accountsUndoRedo.undo}
                disabled={!accountsUndoRedo.canUndo}
                title="Ctrl+Z"
                style={{ padding: '0.5rem 1rem', background: accountsUndoRedo.canUndo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: accountsUndoRedo.canUndo ? 'pointer' : 'not-allowed' }}
              >
                ↶ Undo
              </button>
              <button
                onClick={accountsUndoRedo.redo}
                disabled={!accountsUndoRedo.canRedo}
                title="Ctrl+Alt+Z"
                style={{ padding: '0.5rem 1rem', background: accountsUndoRedo.canRedo ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: accountsUndoRedo.canRedo ? 'pointer' : 'not-allowed' }}
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
                    onChange={(e) => setAccounts(prev => prev.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a))}
                    style={{ width: '100px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  />
                  <button onClick={() => setEditingAccount(account)} style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                    ✏️
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm(`Delete account "${account.name}"?`)){
                        setAccounts(prev => prev.filter(a => a.id !== account.id));
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
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Bills ({activeMonth})</h3>
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
              .filter(b => !b.ignored && selectedCats.includes(b.category))
              .sort((a,b) => {
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
                    background: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    border: `2px solid ${isPaid ? '#10b981' : isSkipped ? '#f59e0b' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{bill.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {bill.frequency === 'monthly' ? `Due: ${bill.dueDay}` : 
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
                          style={{ padding: '0.25rem 0.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          👁️
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
            {bills.filter(b => !b.ignored && selectedCats.includes(b.category)).length === 0 && (
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
                    .filter(o => !o.ignored && o.category === cat)
                    .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map(otc => (
                      <div key={otc.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid #d1d5db',
                        background: 'white'
                      }}>
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
                            style={{ padding: '0.25rem 0.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Ignore
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
                  {oneTimeCosts.filter(o => !o.ignored && o.category === cat).length === 0 && (
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
        {showAddAccount && <AddAccountDialog onClose={() => setShowAddAccount(false)} onAdd={(acc) => { setAccounts(prev => [...prev, acc]); setShowAddAccount(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {showAddBill && <AddBillDialog categories={activeCats} accounts={accounts} onClose={() => setShowAddBill(false)} onAdd={(bill) => { setBills(prev => [...prev, bill]); setShowAddBill(false); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingBill && <EditBillDialog bill={editingBill} categories={activeCats} accounts={accounts} onClose={() => setEditingBill(null)} onSave={(updates) => { setBills(prev => prev.map(b => b.id === editingBill.id ? {...b, ...updates} : b)); setEditingBill(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingOTC && <EditOTCDialog otc={editingOTC} categories={activeCats} accounts={accounts} onClose={() => setEditingOTC(null)} onSave={(updates) => { setOneTimeCosts(prev => prev.map(o => o.id === editingOTC.id ? {...o, ...updates} : o)); setEditingOTC(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {editingAccount && <EditAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(updates) => { setAccounts(prev => prev.map(a => a.id === editingAccount.id ? {...a, ...updates} : a)); setEditingAccount(null); }} selectAllOnFocus={selectAllOnFocus} />}
        {showSnapshots && <SnapshotsDialog snapshots={nwHistory} onClose={() => setShowSnapshots(false)} fmt={fmt} />}
      </div>
    </div>
  );
}

// Dialog Components
function AddAccountDialog({ onClose, onAdd, selectAllOnFocus }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Cash');
  const [balance, setBalance] = useState(0);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90vw' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Add Account</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Balance</label>
          <input 
            type="number" 
            step="0.01"
            value={balance} 
            onFocus={selectAllOnFocus}
            onChange={(e) => setBalance(Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button 
            onClick={() => {
              if (name) {
                onAdd({ id: crypto.randomUUID(), name, type, balance });
              }
            }}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Add Account
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBillDialog({ categories, accounts, onClose, onAdd, selectAllOnFocus }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState('monthly');
  const [dueDay, setDueDay] = useState(1);
  const [weeklyDay, setWeeklyDay] = useState(0);
  const [weeklySchedule, setWeeklySchedule] = useState('every');
  const [biweeklyStart, setBiweeklyStart] = useState(new Date().toISOString().slice(0,10));
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [notes, setNotes] = useState('');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '500px', maxWidth: '90vw', margin: '2rem auto' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Add Bill</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Amount</label>
            <input 
              type="number" 
              step="0.01"
              value={amount} 
              onFocus={selectAllOnFocus}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Frequency</label>
            <select 
              value={frequency} 
              onChange={(e) => setFrequency(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
            </select>
          </div>
        </div>
        
        {frequency === 'monthly' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Day of Month</label>
            <input 
              type="number" 
              min="1" 
              max="28"
              value={dueDay} 
              onFocus={selectAllOnFocus}
              onChange={(e) => setDueDay(Math.max(1, Math.min(28, Number(e.target.value))))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
        )}
        
        {frequency === 'weekly' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Schedule</label>
              <select 
                value={weeklySchedule} 
                onChange={(e) => setWeeklySchedule(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value="every">Every week</option>
                <option value="first">First week of month</option>
                <option value="second">Second week of month</option>
                <option value="third">Third week of month</option>
                <option value="fourth">Fourth week of month</option>
                <option value="last">Last week of month</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Day of Week</label>
              <select 
                value={weeklyDay} 
                onChange={(e) => setWeeklyDay(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          </>
        )}
        
        {frequency === 'biweekly' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Date</label>
            <input 
              type="date" 
              value={biweeklyStart} 
              onChange={(e) => setBiweeklyStart(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
        )}
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Account</label>
          <select 
            value={accountId} 
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notes</label>
          <input 
            type="text" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button 
              onClick={() => onSave({ name, category, amount, frequency, dueDay, weeklyDay, weeklySchedule, biweeklyStart, accountId, notes })}
              style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  function EditOTCDialog({ otc, categories, accounts, onClose, onSave, selectAllOnFocus }) {
    const [name, setName] = useState(otc.name);
    const [category, setCategory] = useState(otc.category);
    const [amount, setAmount] = useState(otc.amount);
    const [dueDate, setDueDate] = useState(otc.dueDate);
    const [accountId, setAccountId] = useState(otc.accountId);
    const [notes, setNotes] = useState(otc.notes || '');
  
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '500px', maxWidth: '90vw' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Edit One-Time Cost</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Amount</label>
              <input 
                type="number" 
                step="0.01"
                value={amount} 
                onFocus={selectAllOnFocus}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Date</label>
              <input 
                type="date"
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Account</label>
            <select 
              value={accountId} 
              onChange={(e) => setAccountId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notes</label>
            <input 
              type="text" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button 
              onClick={() => onSave({ name, category, amount, dueDate, accountId, notes })}
              style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  function EditAccountDialog({ account, onClose, onSave, selectAllOnFocus }) {
    const [name, setName] = useState(account.name);
    const [type, setType] = useState(account.type);
  
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90vw' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Edit Account</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button 
              onClick={() => onSave({ name, type })}
              style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  function SnapshotsDialog({ snapshots, onClose, fmt }) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Net Worth Snapshots</h3>
          
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No snapshots yet</div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              {snapshots.map((snapshot, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div>{new Date(snapshot.ts).toLocaleString()}</div>
                  <div>{fmt(snapshot.current)}</div>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  function AuthDialog({ email, setEmail, password, setPassword, isSignUp, setIsSignUp, authLoading, onClose, onAuth, supabase }) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90vw' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
            {isSignUp ? 'Create Account' : 'Login'} for Cloud Sync
          </h3>
          
          {!supabase && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              <strong>Setup Required:</strong> To enable cloud sync, add your Supabase credentials to the code or environment variables.
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ marginLeft: '0.5rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isSignUp ? 'Login' : 'Sign Up'}
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button 
              onClick={onAuth}
              disabled={authLoading}
              style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', opacity: authLoading ? 0.5 : 1 }}
            >
              {authLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
            </button>
          </div>
        </div>
      </div>
    );
  }
            </select>
          </div>
        // Continue from EditBillDialog where it was cut off...
        </div>
        
        {frequency === 'monthly' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Day of Month</label>
            <input 
              type="number" 
              min="1" 
              max="28"
              value={dueDay} 
              onFocus={selectAllOnFocus}
              onChange={(e) => setDueDay(Math.max(1, Math.min(28, Number(e.target.value))))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
        )}
        
        {frequency === 'weekly' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Schedule</label>
              <select 
                value={weeklySchedule} 
                onChange={(e) => setWeeklySchedule(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value="every">Every week</option>
                <option value="first">First week of month</option>
                <option value="second">Second week of month</option>
                <option value="third">Third week of month</option>
                <option value="fourth">Fourth week of month</option>
                <option value="last">Last week of month</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Day of Week</label>
              <select 
                value={weeklyDay} 
                onChange={(e) => setWeeklyDay(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          </>
        )}
        
        {frequency === 'biweekly' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Date</label>
            <input 
              type="date" 
              value={biweeklyStart} 
              onChange={(e) => setBiweeklyStart(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
        )}
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Account</label>
          <select 
            value={accountId} 
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Notes</label>
          <input 
            type="text" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button 
            onClick={() => onSave({ name, category, amount, frequency, dueDay, weeklyDay, weeklySchedule, biweeklyStart, accountId, notes })}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
