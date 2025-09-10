import React, { useState, useEffect, useMemo } from "react";
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

// Helper functions for different bill frequencies
function getNextDueDate(bill, fromDate = new Date()) {
  const freq = bill.frequency || 'monthly';
  
  if (freq === 'monthly') {
    if (bill.scheduleType === 'specific_date') {
      const nextMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), clampDue(bill.dueDay));
      if (nextMonth <= fromDate) {
        nextMonth.setMonth(nextMonth.getMonth() + 1);
      }
      return nextMonth;
    } else if (bill.scheduleType === 'nth_weekday') {
      return getNthWeekdayOfMonth(fromDate, bill.weekday, bill.weekPosition);
    }
  }
  
  if (freq === 'weekly') {
    const dayOfWeek = bill.dayOfWeek || 1;
    const nextWeek = new Date(fromDate);
    const daysUntilTarget = (dayOfWeek - nextWeek.getDay() + 7) % 7;
    nextWeek.setDate(nextWeek.getDate() + daysUntilTarget);
    if (nextWeek <= fromDate) {
      nextWeek.setDate(nextWeek.getDate() + 7);
    }
    return nextWeek;
  }
  
  if (freq === 'biweekly') {
    const startDate = new Date(bill.startDate || fromDate);
    const dayOfWeek = bill.dayOfWeek || 1;
    const weeksSinceStart = Math.floor((fromDate - startDate) / (7 * 24 * 60 * 60 * 1000));
    const weeksToNext = (2 - (weeksSinceStart % 2)) % 2;
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + (weeksToNext * 7));
    const daysUntilTarget = (dayOfWeek - nextDate.getDay() + 7) % 7;
    nextDate.setDate(nextDate.getDate() + daysUntilTarget);
    if (nextDate <= fromDate) {
      nextDate.setDate(nextDate.getDate() + 14);
    }
    return nextDate;
  }
  
  return fromDate;
}

function getNthWeekdayOfMonth(fromDate, weekday, position) {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  
  if (position === 'last') {
    const lastDay = new Date(year, month + 1, 0);
    const lastWeekday = lastDay.getDay();
    const daysBack = (lastWeekday - weekday + 7) % 7;
    const targetDate = new Date(year, month + 1, 0 - daysBack);
    
    if (targetDate <= fromDate) {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const nextMonthValue = nextMonth > 11 ? 0 : nextMonth;
      return getNthWeekdayOfMonth(new Date(nextYear, nextMonthValue, 1), weekday, position);
    }
    return targetDate;
  } else {
    const nthMap = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4 };
    const nth = nthMap[position] || 1;
    
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysToAdd = (weekday - firstWeekday + 7) % 7;
    const targetDate = new Date(year, month, 1 + daysToAdd + (nth - 1) * 7);
    
    if (targetDate.getMonth() !== month) {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const nextMonthValue = nextMonth > 11 ? 0 : nextMonth;
      return getNthWeekdayOfMonth(new Date(nextYear, nextMonthValue, 1), weekday, 'first');
    }
    
    if (targetDate <= fromDate) {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const nextMonthValue = nextMonth > 11 ? 0 : nextMonth;
      return getNthWeekdayOfMonth(new Date(nextYear, nextMonthValue, 1), weekday, position);
    }
    return targetDate;
  }
}

function getBillKey(bill, date) {
  const freq = bill.frequency || 'monthly';
  if (freq === 'monthly') {
    return yyyyMm(date);
  }
  if (freq === 'weekly') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1);
    return `${yyyyMm(weekStart)}-W${Math.ceil(weekStart.getDate() / 7)}`;
  }
  if (freq === 'biweekly') {
    const startDate = new Date(bill.startDate || date);
    const weeksSinceStart = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
    const period = Math.floor(weeksSinceStart / 2);
    return `${bill.id}-P${period}`;
  }
  return yyyyMm(date);
}

function formatBillSchedule(bill) {
  const freq = bill.frequency || 'monthly';
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  if (freq === 'monthly') {
    if (bill.scheduleType === 'nth_weekday') {
      const position = bill.weekPosition || 'first';
      const dayName = dayNames[bill.weekday] || 'Monday';
      return `${position.charAt(0).toUpperCase() + position.slice(1)} ${dayName}`;
    } else {
      return `Day ${bill.dueDay}`;
    }
  }
  
  if (freq === 'weekly') {
    const dayName = dayNames[bill.dayOfWeek] || 'Monday';
    return `Every ${dayName}`;
  }
  
  if (freq === 'biweekly') {
    const dayName = dayNames[bill.dayOfWeek] || 'Monday';
    return `Every other ${dayName}`;
  }
  
  return 'Monthly';
}

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

export default function Dashboard(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);

  const [categories, setCategories, catSync] = useCloudState(
    `${storageKey}:categories`, 
    [
      { id: crypto.randomUUID(), name: 'Personal' },
      { id: crypto.randomUUID(), name: 'Studio' },
      { id: crypto.randomUUID(), name: 'Smoke Shop' },
      { id: crypto.randomUUID(), name: 'Botting' },
    ],
    user,
    supabase
  );
  
  const activeCats = useMemo(()=> categories.filter(c=>!c.ignored).map(c=>c.name), [categories]);

  const [accounts, setAccounts, accSync] = useCloudState(
    `${storageKey}:accounts`,
    [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ],
    user,
    supabase
  );
  
  const [bills, setBills, billSync] = useCloudState(`${storageKey}:bills`, [], user, supabase);
  const [oneTimeCosts, setOneTimeCosts, otcSync] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [nwHistory, setNwHistory, nwSync] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

  const [autoDeductCash, setAutoDeductCash, deductSync] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored, ignoredSync] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat, catSelSync] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  const [activeMonth, setActiveMonth] = useState(monthKey);
  const [netWorthMode, setNetWorthMode] = useState('current');

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [editingOTC, setEditingOTC] = useState(null);

  const [otcName, setOtcName] = useState("");
  const [otcCategory, setOtcCategory] = useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = useState(0);
  const [otcDueDate, setOtcDueDate] = useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = useState("");

  const isSyncing = catSync.syncing || accSync.syncing || billSync.syncing || otcSync.syncing || nwSync.syncing;
  
  const lastSyncTime = useMemo(() => {
    const times = [catSync.lastSync, accSync.lastSync, billSync.lastSync, otcSync.lastSync, nwSync.lastSync]
      .filter(t => t !== null);
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map(t => t.getTime())));
  }, [catSync.lastSync, accSync.lastSync, billSync.lastSync, otcSync.lastSync, nwSync.lastSync]);

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

  useEffect(() => {
    if(activeCats.length && !activeCats.includes(otcCategory)) setOtcCategory(activeCats[0]);
  }, [activeCats, otcCategory]);

  useEffect(() => {
    if(accounts.length && !accounts.find(a => a.id === otcAccountId)) setOtcAccountId(accounts[0].id);
  }, [accounts, otcAccountId]);

  const currentLiquid = useMemo(()=> accounts.reduce((s,a)=> s+a.balance, 0), [accounts]);
  
  const upcoming = useMemo(()=>{
    const now = new Date();
    const horizon = new Date(now); 
    horizon.setDate(now.getDate()+7);
    const items = [];

    for(const b of bills){
      if(!activeCats.includes(b.category)) continue;
      
      const billKey = getBillKey(b, now);
      if(b.paidPeriods?.includes(billKey)) continue;
      
      const due = getNextDueDate(b, now);
      const overdue = due < now;
      const withinWeek = due <= horizon;
      
      if(overdue || withinWeek) {
        items.push({ bill:b, due, overdue, billKey });
      }
    }
    
    for(const o of oneTimeCosts){
      if(!activeCats.includes(o.category)) continue;
      if(o.paid || o.ignored) continue;
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
  }, [accounts, bills, oneTimeCosts, activeCats]);

  const monthUnpaidTotal = useMemo(()=>{
    let sum = 0;
    const now = new Date();
    
    for(const b of bills){ 
      if(!activeCats.includes(b.category)) continue;
      
      if(b.frequency === 'monthly' || !b.frequency) {
        if(b.skipMonths?.includes(activeMonth)) continue; 
        if(!b.paidMonths?.includes(activeMonth)) sum += b.amount;
      } else {
        const monthStart = new Date(activeMonth + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        
        let checkDate = new Date(monthStart);
        while(checkDate <= monthEnd) {
          const billKey = getBillKey(b, checkDate);
          const due = getNextDueDate(b, checkDate);
          
          if(due >= monthStart && due <= monthEnd && !b.paidPeriods?.includes(billKey)) {
            sum += b.amount;
            break;
          }
          
          if(b.frequency === 'weekly') {
            checkDate.setDate(checkDate.getDate() + 7);
          } else if(b.frequency === 'biweekly') {
            checkDate.setDate(checkDate.getDate() + 14);
          } else {
            break;
          }
        }
      }
    }
    
    for(const o of oneTimeCosts){ 
      if(!activeCats.includes(o.category)) continue; 
      if(o.dueDate.slice(0,7)===activeMonth && !o.paid && !o.ignored) sum += o.amount; 
    }
    return sum;
  },[bills, oneTimeCosts, activeCats, activeMonth]);

  const afterWeek = currentLiquid - upcoming.weekDueTotal;
  const afterMonth = currentLiquid - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquid : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquid);

  const selectedCats = selectedCat==='All' ? activeCats : activeCats.filter(c=> c===selectedCat);

  function togglePaid(b, billKey = null){
    const key = billKey || (b.frequency === 'monthly' || !b.frequency ? activeMonth : getBillKey(b, new Date()));
    const isPaid = (b.frequency === 'monthly' || !b.frequency) ? 
      b.paidMonths?.includes(key) : 
      b.paidPeriods?.includes(key);
    
    setBills(prev=> prev.map(x=> x.id===b.id ? { 
      ...x, 
      paidMonths: (b.frequency === 'monthly' || !b.frequency) ? 
        (isPaid ? (x.paidMonths || []).filter(m=>m!==key) : [...(x.paidMonths || []), key]) :
        x.paidMonths,
      paidPeriods: (b.frequency !== 'monthly' && b.frequency) ?
        (isPaid ? (x.paidPeriods || []).filter(p=>p!==key) : [...(x.paidPeriods || []), key]) :
        x.paidPeriods
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

  function toggleOneTimeIgnored(o){
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
    setCategories(prev=> [...prev, { id: crypto.randomUUID(), name: nm }]); 
  }

  function toggleIgnoreCategory(name){ 
    setCategories(prev=> prev.map(c=> c.name===name? { ...c, ignored: !c.ignored } : c)); 
  }

  function removeCategory(name){ 
    const hasItems = bills.some(b=>b.category===name) || oneTimeCosts.some(o=>o.category===name); 
    if(hasItems && !confirm(`Category "${name}" has items. Move them to Uncategorized?`)) return; 
    const fallback='Uncategorized'; 
    if(!categories.find(c=>c.name===fallback)) setCategories(prev=> [...prev,{id:crypto.randomUUID(), name:fallback}]); 
    setBills(prev=> prev.map(b=> b.category===name? { ...b, category: fallback } : b)); 
    setOneTimeCosts(prev=> prev.map(o=> o.category===name? { ...o, category: fallback } : o)); 
    setCategories(prev=> prev.filter(c=> c.name!==name)); 
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', 
      padding: 'clamp(0.5rem, 2vw, 1rem)',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        maxWidth: '80rem', 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 'clamp(0.75rem, 2vw, 1.5rem)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
          <h1 style={{ 
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', 
            fontWeight: '700', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 'clamp(0.5rem, 2vw, 0.75rem)', 
            color: '#1f2937', 
            marginBottom: '0.5rem',
            flexWrap: 'wrap',
            lineHeight: 1.2
          }}>
            <span style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>💰</span>
            <span style={{ textAlign: 'center' }}>Bills & Balances</span>
          </h1>
          <p style={{ 
            color: '#4b5563', 
            fontSize: 'clamp(0.875rem, 3vw, 1rem)', 
            margin: '0 0 1rem 0',
            lineHeight: 1.4
          }}>
            Financial management with flexible scheduling
          </p>
          
          <div style={{ 
            marginTop: '1rem', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.75rem', 
            justifyContent: 'center', 
            alignItems: 'center'
          }}>
            {user ? (
              <>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1rem', 
                  background: 'white', 
                  borderRadius: '0.75rem', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                  minHeight: '44px'
                }}>
                  {isSyncing ? (
                    <>
                      <span>🔄</span>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>☁️</span>
                      <span>Synced to cloud</span>
                      {lastSyncTime && (
                        <span style={{ color: '#6b7280' }}>
                          ({new Date(lastSyncTime).toLocaleTimeString()})
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)', color: '#374151' }}>{user.email}</span>
                  <button
                    onClick={handleLogout}
                    style={{ 
                      padding: '0.75rem 1.5rem', 
                      background: '#6b7280', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '0.5rem', 
                      cursor: 'pointer', 
                      fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                      minHeight: '44px',
                      minWidth: '120px'
                    }}
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1rem', 
                  background: '#fef3c7', 
                  borderRadius: '0.75rem',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                  minHeight: '44px'
                }}>
                  <span>💾</span>
                  <span style={{ color: '#92400e' }}>Local storage only</span>
                </div>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: '#2563eb', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.5rem', 
                    cursor: 'pointer',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                    minHeight: '44px',
                    minWidth: '160px'
                  }}
                >
                  Login for Cloud Sync
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #4c1d95 0%, #2563eb 100%)', 
          padding: 'clamp(1rem, 3vw, 2rem)', 
          borderRadius: '1rem', 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)', 
          color: 'white',
          margin: '0'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '0.75rem', 
            marginBottom: '1.5rem', 
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>🎯</span>
            <h2 style={{ 
              fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', 
              fontWeight: '600', 
              textAlign: 'center',
              margin: 0
            }}>
              Money Needed This Week
            </h2>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: 'clamp(1rem, 3vw, 2rem)' 
          }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              padding: 'clamp(1rem, 3vw, 1.5rem)', 
              borderRadius: '1rem', 
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.5rem', 
                marginBottom: '1rem', 
                flexWrap: 'wrap' 
              }}>
                <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>💵</span>
                <span style={{ 
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                  opacity: 0.9, 
                  lineHeight: 1.3,
                  fontWeight: '500'
                }}>
                  Total Due
                </span>
              </div>
              <div style={{ 
                fontSize: 'clamp(2rem, 8vw, 3rem)', 
                fontWeight: '700', 
                wordBreak: 'break-word',
                marginBottom: '0.5rem'
              }}>
                {fmt(weekNeedWithoutSavings)}
              </div>
              <div style={{ 
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', 
                opacity: 0.8, 
                lineHeight: 1.3 
              }}>
                Without using savings
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              padding: 'clamp(1rem, 3vw, 1.5rem)', 
              borderRadius: '1rem', 
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.5rem', 
                marginBottom: '1rem', 
                flexWrap: 'wrap' 
              }}>
                <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>📈</span>
                <span style={{ 
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                  opacity: 0.9, 
                  lineHeight: 1.3,
                  fontWeight: '500'
                }}>
                  Need to Earn
                </span>
              </div>
              <div style={{ 
                fontSize: 'clamp(2rem, 8vw, 3rem)', 
                fontWeight: '700', 
                color: weekNeedWithSavings === 0 ? '#10b981' : 'white', 
                wordBreak: 'break-word',
                marginBottom: '0.5rem'
              }}>
                {fmt(weekNeedWithSavings)}
              </div>
              <div style={{ 
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', 
                opacity: 0.8, 
                lineHeight: 1.3 
              }}>
                {weekNeedWithSavings === 0 ? 'Fully covered!' : 'After using savings'}
              </div>
            </div>
            
            <div style={{ 
              background: 'rgba(255,255,255,0.15)', 
              padding: 'clamp(1rem, 3vw, 1.5rem)', 
              borderRadius: '1rem', 
              backdropFilter: 'blur(10px)',
              textAlign: 'center'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.5rem', 
                marginBottom: '1rem', 
                flexWrap: 'wrap' 
              }}>
                <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>🏦</span>
                <span style={{ 
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                  opacity: 0.9, 
                  lineHeight: 1.3,
                  fontWeight: '500'
                }}>
                  Total Balance
                </span>
              </div>
              <div style={{ 
                fontSize: 'clamp(2rem, 8vw, 3rem)', 
                fontWeight: '700', 
                wordBreak: 'break-word',
                marginBottom: '0.5rem'
              }}>
                {fmt(currentLiquid)}
              </div>
              <div style={{ 
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)', 
                opacity: 0.8, 
                lineHeight: 1.3 
              }}>
                Across all accounts
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'white', 
          padding: 'clamp(1rem, 3vw, 1.5rem)', 
          borderRadius: '1rem', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem', 
            marginBottom: '1.5rem',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>💰</span>
              <h2 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', fontWeight: '600', margin: 0 }}>Net Worth</h2>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '1rem', 
              alignItems: 'center',
              width: '100%'
            }}>
              <select 
                value={netWorthMode} 
                onChange={(e) => setNetWorthMode(e.target.value)}
                style={{ 
                  padding: '0.75rem', 
                  borderRadius: '0.5rem', 
                  border: '1px solid #d1d5db',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minWidth: '200px',
                  maxWidth: '100%',
                  minHeight: '44px'
                }}
              >
                <option value="current">Current</option>
                <option value="afterWeek">After This Week</option>
                <option value="afterMonth">After This Month</option>
              </select>
              
              <div style={{ 
                fontSize: 'clamp(2rem, 6vw, 2.5rem)', 
                fontWeight: '700', 
                color: netWorthValue < 0 ? '#dc2626' : '#059669',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}>
                {fmt(netWorthValue)}
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.75rem', 
                alignItems: 'center',
                width: '100%'
              }}>
                <button 
                  onClick={() => setNwHistory(prev=>[...prev,{ ts:Date.now(), current:currentLiquid, afterWeek: afterWeek, afterMonth: afterMonth, reason:'manual' }])}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: '#f3f4f6', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.5rem', 
                    cursor: 'pointer',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                    minHeight: '44px',
                    minWidth: '140px'
                  }}
                >
                  Save snapshot
                </button>
                <button 
                  onClick={() => setShowSnapshots(true)}
                  style={{ 
                    padding: '0.75rem 1.5rem', 
                    background: '#f3f4f6', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '0.5rem', 
                    cursor: 'pointer',
                    fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                    minHeight: '44px',
                    minWidth: '140px'
                  }}
                >
                  📊 Snapshots
                </button>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {['All', ...activeCats].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  background: selectedCat === cat ? '#1f2937' : 'white',
                  color: selectedCat === cat ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 'clamp(1rem, 3vw, 1.5rem)'
        }}>
          
          <div style={{ 
            background: 'white', 
            padding: 'clamp(1rem, 3vw, 1.5rem)', 
            borderRadius: '1rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '1rem', 
              marginBottom: '1.5rem',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.25rem)', fontWeight: '600', margin: 0 }}>Accounts</h3>
              <button 
                onClick={() => setShowAddAccount(true)}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  background: '#1f2937', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  cursor: 'pointer',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  minWidth: '120px'
                }}
              >
                ➕ Add Account
              </button>
            </div>
            
            {accounts.map(account => (
              <div key={account.id} style={{ 
                background: '#f9fafb', 
                padding: 'clamp(1rem, 3vw, 1.5rem)', 
                borderRadius: '0.75rem', 
                marginBottom: '1rem', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ 
                    padding: '0.5rem 1rem', 
                    background: account.type === 'Cash' ? '#f3f4f6' : '#dbeafe', 
                    borderRadius: '9999px', 
                    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                    fontWeight: '500'
                  }}>
                    {account.type}
                  </span>
                  <span style={{ 
                    fontWeight: '600', 
                    fontSize: 'clamp(1rem, 3vw, 1.125rem)', 
                    textAlign: 'center' 
                  }}>
                    {account.name}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  justifyContent: 'center', 
                  flexWrap: 'wrap' 
                }}>
                  <input
                    type="number"
                    step="0.01"
                    value={account.balance}
                    onChange={(e) => setAccounts(prev => prev.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a))}
                    style={{ 
                      width: 'clamp(120px, 30vw, 160px)', 
                      padding: '0.75rem', 
                      border: '2px solid #d1d5db', 
                      borderRadius: '0.5rem', 
                      fontSize: 'clamp(1rem, 3vw, 1.125rem)',
                      textAlign: 'center',
                      minHeight: '44px',
                      fontWeight: '600'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                      onClick={() => setEditingAccount(account)} 
                      style={{ 
                        padding: '0.75rem', 
                        background: '#6b7280', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        cursor: 'pointer',
                        fontSize: 'clamp(1rem, 3vw, 1.125rem)',
                        minHeight: '44px',
                        minWidth: '44px'
                      }}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm(`Delete account "${account.name}"?`)){
                          setAccounts(prev => prev.filter(a => a.id !== account.id));
                        }
                      }}
                      style={{ 
                        padding: '0.75rem', 
                        background: '#dc2626', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '0.5rem', 
                        cursor: 'pointer',
                        fontSize: 'clamp(1rem, 3vw, 1.125rem)',
                        minHeight: '44px',
                        minWidth: '44px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            background: 'white', 
            padding: 'clamp(1rem, 3vw, 1.5rem)', 
            borderRadius: '1rem', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '1rem', 
              marginBottom: '1.5rem',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.25rem)', fontWeight: '600', textAlign: 'center', margin: 0 }}>
                Due & Overdue (7 days)
              </h3>
              <div style={{ 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600',
                textAlign: 'center',
                padding: '0.75rem 1rem',
                background: '#f3f4f6',
                borderRadius: '0.5rem',
                minWidth: '120px'
              }}>
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
                return <div style={{ 
                  color: '#6b7280', 
                  textAlign: 'center', 
                  padding: '2rem', 
                  fontSize: 'clamp(1rem, 3vw, 1.125rem)',
                  lineHeight: 1.5
                }}>
                  Nothing due or overdue this week!
                </div>;
              }
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredItems.map((it, idx) => {
                    const name = it.bill ? it.bill.name : it.otc.name;
                    const amt = it.bill ? it.bill.amount : it.otc.amount;
                    const category = it.bill ? it.bill.category : it.otc.category;
                    const overdue = it.overdue;
                    const frequency = it.bill ? (it.bill.frequency || 'monthly') : 'one-time';
                    
                    return (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '1rem', 
                        borderRadius: '0.75rem', 
                        border: `2px solid ${overdue ? '#fca5a5' : '#d1d5db'}`,
                        background: overdue ? '#fef2f2' : 'white'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: 'clamp(1rem, 3vw, 1.125rem)',
                            marginBottom: '0.5rem'
                          }}>
                            {name}
                          </div>
                          <div style={{ 
                            fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                            color: '#6b7280',
                            lineHeight: 1.4
                          }}>
                            {it.due.toLocaleDateString()} • {fmt(amt)} • {category}
                            {frequency !== 'one-time' && <><br/>{frequency}</>}
                          </div>
                        </div>
                        <button
                          onClick={() => it.bill ? togglePaid(it.bill, it.billKey) : toggleOneTimePaid(it.otc)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                            fontWeight: '600',
                            minHeight: '44px'
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

        <div style={{ 
          background: 'white', 
          padding: 'clamp(1rem, 3vw, 1.5rem)', 
          borderRadius: '1rem', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem', 
            marginBottom: '1.5rem',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.25rem)', fontWeight: '600', margin: 0 }}>
              Add One-Time Cost
            </h3>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem', 
            marginBottom: '2rem' 
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600' 
              }}>
                Name
              </label>
              <input 
                type="text"
                value={otcName} 
                onChange={(e) => setOtcName(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid #d1d5db', 
                  borderRadius: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600' 
              }}>
                Category
              </label>
              <select 
                value={otcCategory} 
                onChange={(e) => setOtcCategory(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid #d1d5db', 
                  borderRadius: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              >
                {activeCats.sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600' 
              }}>
                Amount
              </label>
              <input 
                type="number" 
                step="0.01"
                value={otcAmount} 
                onChange={(e) => setOtcAmount(Number(e.target.value))}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid #d1d5db', 
                  borderRadius: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600' 
              }}>
                Due Date
              </label>
              <input 
                type="date"
                value={otcDueDate} 
                onChange={(e) => setOtcDueDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid #d1d5db', 
                  borderRadius: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600' 
              }}>
                Account
              </label>
              <select 
                value={otcAccountId} 
                onChange={(e) => setOtcAccountId(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: '2px solid #d1d5db', 
                  borderRadius: '0.5rem',
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)', 
                fontWeight: '600' 
              }}>
                Notes
              </label>
              <input 
                type="text"
                value={otcNotes} 
                onChange={(e) => setOtcNotes(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem',
