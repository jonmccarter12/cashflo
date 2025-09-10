import React, { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from '@supabase/supabase-js';

// ===================== SUPABASE CONFIG =====================
// Using Vercel environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ===================== HELPERS =====================
const storageKey = "bills_balance_dashboard_v2";
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

// Custom hook for cloud-synced persistent state
function useCloudState(key, initial, user, supabase){
  const [state, setState] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Load from local storage initially
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw));
    } catch {}
  }, [key]);

  // Sync with cloud when user is logged in
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

  // Save to cloud when state changes
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

// ===================== MAIN COMPONENT =====================
export default function Dashboard(){
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
      return null; // Will use localStorage only
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);

  // Categories with cloud sync
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

  // Data with cloud sync
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

  // Settings/UI with cloud sync
  const [autoDeductCash, setAutoDeductCash, deductSync] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored, ignoredSync] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat, catSelSync] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  const [activeMonth, setActiveMonth] = useState(monthKey);
  const [netWorthMode, setNetWorthMode] = useState('current');
  const [linkingId, setLinkingId] = useState(null);

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

  // Auth functions - FIXED VERSION
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
        setIsSignUp(false); // Switch to login mode
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
      if(!activeCats.includes(b.category)) continue;
      if(b.skipMonths?.includes(activeMonth)) continue;
      const due = new Date(now.getFullYear(), now.getMonth(), clampDue(b.dueDay));
      const paid = b.paidMonths.includes(activeMonth);
      const overdue = due < now;
      const withinWeek = due <= horizon;
      if(!paid && (overdue || withinWeek)) items.push({ bill:b, due, overdue });
    }
    for(const o of oneTimeCosts){
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
      if(!activeCats.includes(b.category)) continue; 
      if(b.skipMonths?.includes(activeMonth)) continue; 
      if(!b.paidMonths.includes(activeMonth)) sum += b.amount; 
    }
    for(const o of oneTimeCosts){ 
      if(!activeCats.includes(o.category)) continue; 
      if(o.dueDate.slice(0,7)===activeMonth && !o.paid) sum += o.amount; 
    }
    return sum;
  },[bills, oneTimeCosts, activeCats, activeMonth]);

  const afterWeek = currentLiquid - upcoming.weekDueTotal;
  const afterMonth = currentLiquid - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquid : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  // Calculate what needs to be earned
  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquid);

  const selectedCats = selectedCat==='All' ? activeCats : activeCats.filter(c=> c===selectedCat);

  // Actions - FIXED to handle return of money
  function togglePaid(b){
    const isPaid = b.paidMonths.includes(activeMonth);
    setBills(prev=> prev.map(x=> x.id===b.id ? { 
      ...x, 
      paidMonths: isPaid? x.paidMonths.filter(m=>m!==activeMonth) : [...x.paidMonths, activeMonth] 
    } : x));
    const acc = accounts.find(a=>a.id===b.accountId);
    if(autoDeductCash && acc?.type==='Cash'){ 
      if(!isPaid) {
        // Marking as paid - deduct money
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - b.amount } : a)); 
      } else {
        // Unmarking as paid - return money
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
        // Marking as paid - deduct money
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - o.amount } : a)); 
      } else {
        // Unmarking as paid - return money  
        setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance + o.amount } : a)); 
      }
    }
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
      paid: false 
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

          {/* Due & Overdue - FIXED with category filtering */}
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
              .filter(b => selectedCats.includes(b.category))
              .sort((a,b) => a.dueDay - b.dueDay)
              .map(bill => {
                const account = accounts.find(a => a.id === bill.accountId);
                const isPaid = bill.paidMonths.includes(activeMonth);
                const isSkipped = bill.skipMonths?.includes(activeMonth);
                
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
                          Due: {bill.dueDay} • {fmt(bill.amount)} • {account?.name}
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
              .sort((a,b) => a.name.localeCompare(b.name))
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <span>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        {/* Dialogs - Only show when needed */}
        {showAuth && <AuthDialog email={email} setEmail={setEmail} password={password} setPassword={setPassword} isSignUp={isSignUp} setIsSignUp={setIsSignUp} authLoading={authLoading} onClose={() => setShowAuth(false)} onAuth={handleAuth} supabase={supabase} />}
        {showAddAccount && <AddAccountDialog onClose={() => setShowAddAccount(false)} onAdd={(acc) => { setAccounts(prev => [...prev, acc]); setShowAddAccount(false); }} />}
        {showAddBill && <AddBillDialog categories={activeCats} accounts={accounts} onClose={() => setShowAddBill(false)} onAdd={(bill) => { setBills(prev => [...prev, bill]); setShowAddBill(false); }} />}
        {editingBill && <EditBillDialog bill={editingBill} categories={activeCats} accounts={accounts} onClose={() => setEditingBill(null)} onSave={(updates) => { setBills(prev => prev.map(b => b.id === editingBill.id ? {...b, ...updates} : b)); setEditingBill(null); }} />}
        {editingOTC && <EditOTCDialog otc={editingOTC} categories={activeCats} accounts={accounts} onClose={() => setEditingOTC(null)} onSave={(updates) => { setOneTimeCosts(prev => prev.map(o => o.id === editingOTC.id ? {...o, ...updates} : o)); setEditingOTC(null); }} />}
        {editingAccount && <EditAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(updates) => { setAccounts(prev => prev.map(a => a.id === editingAccount.id ? {...a, ...updates} : a)); setEditingAccount(null); }} />}
        {showSnapshots && <SnapshotsDialog snapshots={nwHistory} onClose={() => setShowSnapshots(false)} fmt={fmt} />}
      </div>
    </div>
  );
}

// Dialog Components - Complete versions
function AddAccountDialog({ onClose, onAdd }) {
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
                onAdd({ id: crypto.randomUUID(), name, type, balance, plaidLinked: false });
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

function AddBillDialog({ categories, accounts, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [amount, setAmount] = useState(0);
  const [dueDay, setDueDay] = useState(1);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [notes, setNotes] = useState('');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '500px', maxWidth: '90vw' }}>
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
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Day</label>
            <input 
              type="number" 
              min="1" 
              max="28"
              value={dueDay} 
              onChange={(e) => setDueDay(Math.max(1, Math.min(28, Number(e.target.value))))}
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
            onClick={() => {
              if (name && amount && category) {
                onAdd({
                  id: crypto.randomUUID(),
                  name,
                  category,
                  amount,
                  dueDay,
                  accountId,
                  notes,
                  paidMonths: [],
                  skipMonths: []
                });
              }
            }}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Add Bill
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBillDialog({ bill, categories, accounts, onClose, onSave }) {
  const [name, setName] = useState(bill.name);
  const [category, setCategory] = useState(bill.category);
  const [amount, setAmount] = useState(bill.amount);
  const [dueDay, setDueDay] = useState(bill.dueDay);
  const [accountId, setAccountId] = useState(bill.accountId);
  const [notes, setNotes] = useState(bill.notes || '');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '500px', maxWidth: '90vw' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Edit Bill</h3>
        
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
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Due Day</label>
            <input 
              type="number" 
              min="1" 
              max="28"
              value={dueDay} 
              onChange={(e) => setDueDay(Math.max(1, Math.min(28, Number(e.target.value))))}
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
            onClick={() => onSave({ name, category, amount, dueDay, accountId, notes })}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function EditOTCDialog({ otc, categories, accounts, onClose, onSave }) {
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

function EditAccountDialog({ account, onClose, onSave }) {
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