import React, { useState, useEffect, useMemo, useRef } from "react";
import { PiggyBank, Link2 as LinkIcon, RefreshCcw, Plus, Trash2, Calendar, Settings, Eye, Edit, Download, Upload, Share2, History, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// ===================== TYPES =====================
interface Account { id: string; name: string; type: "Cash" | "Bank"; balance: number; plaidLinked?: boolean; institution?: string; lastSyncTs?: number }
interface CategoryItem { id: string; name: string; ignored?: boolean }
interface Bill { id: string; name: string; category: string; amount: number; dueDay: number; accountId: string; notes?: string; paidMonths: string[]; skipMonths?: string[] }
interface OneTimeCost { id: string; name: string; category: string; amount: number; dueDate: string; accountId: string; notes?: string; paid?: boolean }
interface NWSnapshot { ts: number; current: number; afterWeek: number; afterMonth: number; reason?: string }
interface UpcomingItem { bill?: Bill; otc?: OneTimeCost; due: Date; overdue: boolean }

// ===================== HELPERS =====================
const storageKey = "bills_balance_dashboard_v2";
const yyyyMm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthKey = yyyyMm();
const clampDue = (d: number) => Math.max(1, Math.min(28, Math.round(d||1)));
const fmt = (n: number) => `$${(n||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;

function usePersistentState<T>(key: string, initial: T){
  const [state, setState] = useState<T>(()=>{
    if (typeof window === 'undefined') return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw? JSON.parse(raw) as T : initial;
    } catch {
      return initial;
    }
  });
  useEffect(()=>{ 
    if(typeof window!=='undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(state)); 
      } catch {}
    }
  },[key,state]);
  return [state, setState] as const;
}

function notify(msg: string){ 
  if(typeof window!=='undefined'){ 
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; background: #10b981; color: white;
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

// ===================== MAIN COMPONENT =====================
export default function Dashboard(){
  // Categories
  const [categories, setCategories] = usePersistentState<CategoryItem[]>(`${storageKey}:categories`, [
    { id: crypto.randomUUID(), name: 'Personal' },
    { id: crypto.randomUUID(), name: 'Studio' },
    { id: crypto.randomUUID(), name: 'Smoke Shop' },
    { id: crypto.randomUUID(), name: 'Botting' },
  ]);
  const activeCats = useMemo(()=> categories.filter(c=>!c.ignored).map(c=>c.name), [categories]);

  // Data
  const [accounts, setAccounts] = usePersistentState<Account[]>(`${storageKey}:accounts`, [
    { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
    { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
    { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
  ]);
  const [bills, setBills] = usePersistentState<Bill[]>(`${storageKey}:bills`, []);
  const [oneTimeCosts, setOneTimeCosts] = usePersistentState<OneTimeCost[]>(`${storageKey}:otc`, []);

  // Settings/UI
  const [activeMonth, setActiveMonth] = useState(monthKey);
  const [autoDeductCash, setAutoDeductCash] = usePersistentState(`${storageKey}:autoDeductCash`, true);
  const [showIgnored, setShowIgnored] = usePersistentState(`${storageKey}:showIgnored`, false);
  const [selectedCat, setSelectedCat] = usePersistentState<string>(`${storageKey}:selectedCat`, 'All');
  const [nwHistory, setNwHistory] = usePersistentState<NWSnapshot[]>(`${storageKey}:nwHistory`, []);
  const [netWorthMode, setNetWorthMode] = useState<'current'|'afterWeek'|'afterMonth'>('current');
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // One-time cost form state
  const [otcName, setOtcName] = useState("");
  const [otcCategory, setOtcCategory] = useState<string>(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = useState<number>(0);
  const [otcDueDate, setOtcDueDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = useState<string>(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = useState<string>("");

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
    const horizon = new Date(now); horizon.setDate(now.getDate()+7);
    const items: UpcomingItem[] = [];

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

    const byAcc: Record<string,{account:Account,total:number,items:UpcomingItem[]}> = {};
    const ensure = (id:string)=> (byAcc[id] ||= { account: accounts.find(a=>a.id===id)!, total:0, items:[] });
    for(const it of items){
      const amt = it.bill? it.bill.amount : it.otc!.amount;
      const accId = it.bill? it.bill.accountId : it.otc!.accountId;
      const g = ensure(accId); g.total += amt; g.items.push(it);
    }
    const byAccount = Object.values(byAcc).map(g=> ({ account: g.account, totalDue: g.total, balance: g.account.balance, deficit: Math.max(0, g.total - g.account.balance), items: g.items }));

    return { 
      items, 
      byAccount, 
      totalDeficit: byAccount.reduce((s,d)=> s+d.deficit, 0), 
      weekDueTotal: items.reduce((s,it)=> s + (it.bill? it.bill.amount : it.otc!.amount), 0) 
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

  // Actions
  function togglePaid(b: Bill){
    const isPaid = b.paidMonths.includes(activeMonth);
    setBills(prev=> prev.map(x=> x.id===b.id ? { 
      ...x, 
      paidMonths: isPaid? x.paidMonths.filter(m=>m!==activeMonth) : [...x.paidMonths, activeMonth] 
    } : x));
    const acc = accounts.find(a=>a.id===b.accountId);
    if(!isPaid && autoDeductCash && acc?.type==='Cash'){ 
      setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - b.amount } : a)); 
    }
  }

  function toggleSkipThisMonth(b: Bill){
    setBills(prev=> prev.map(x=> x.id===b.id ? { 
      ...x, 
      skipMonths: x.skipMonths?.includes(activeMonth) ? 
        x.skipMonths!.filter(m=>m!==activeMonth) : 
        [ ...(x.skipMonths||[]), activeMonth ] 
    } : x));
  }

  function toggleOneTimePaid(o: OneTimeCost){
    setOneTimeCosts(prev=> prev.map(x=> x.id===o.id ? { ...x, paid: !x.paid } : x));
    const acc = accounts.find(a=>a.id===o.accountId);
    if(!o.paid && autoDeductCash && acc?.type==='Cash'){ 
      setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - o.amount } : a)); 
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

  function addCategory(name:string){ 
    const nm=name.trim(); 
    if(!nm) return; 
    if(categories.some(c=>c.name===nm)) { 
      notify('Category exists'); 
      return; 
    } 
    setCategories(prev=> [...prev, { id: crypto.randomUUID(), name: nm }]); 
  }

  function toggleIgnoreCategory(name:string){ 
    setCategories(prev=> prev.map(c=> c.name===name? { ...c, ignored: !c.ignored } : c)); 
  }

  function removeCategory(name:string){ 
    const hasItems = bills.some(b=>b.category===name) || oneTimeCosts.some(o=>o.category===name); 
    if(hasItems && !confirm(`Category "${name}" has items. Move them to Uncategorized?`)) return; 
    const fallback='Uncategorized'; 
    if(!categories.find(c=>c.name===fallback)) setCategories(prev=> [...prev,{id:crypto.randomUUID(), name:fallback}]); 
    setBills(prev=> prev.map(b=> b.category===name? { ...b, category: fallback } : b)); 
    setOneTimeCosts(prev=> prev.map(o=> o.category===name? { ...o, category: fallback } : o)); 
    setCategories(prev=> prev.filter(c=> c.name!==name)); 
  }

  // Plaid functions
  async function ensurePlaidScript(){
    if ((window as any).Plaid?.create) return true;
    const existing = document.querySelector('script[src*="plaid.com/link"]');
    if (!existing){ 
      const s = document.createElement('script'); 
      s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'; 
      s.async = true; 
      document.head.appendChild(s); 
    }
    return await new Promise<boolean>((resolve)=>{ 
      let tries=0; 
      const iv=setInterval(()=>{ 
        tries++; 
        if((window as any).Plaid?.create){ clearInterval(iv); resolve(true);} 
        if(tries>50){ clearInterval(iv); resolve(false);} 
      },100); 
    });
  }

  async function openPlaidLink(accountId: string){
    setLinkingId(accountId);
    try{
      const ok = await ensurePlaidScript();
      // Try to get real link token, fall back to demo
      setTimeout(() => {
        setAccounts(prev=> prev.map(a=> a.id===accountId? { 
          ...a, 
          plaidLinked:true, 
          institution: 'Demo Bank', 
          lastSyncTs: Date.now(),
          balance: Math.round((Math.random() * 5000 + 500) * 100) / 100
        } : a)); 
        notify('Plaid linked (demo)');
        setLinkingId(null);
      }, 2000);
    }catch(e:any){ 
      notify(`Plaid link failed: ${String(e?.message||e)}`);
      setLinkingId(null);
    }
  }

  async function refreshPlaid(accountId:string){ 
    setAccounts(prev=> prev.map(a=> a.id===accountId? { 
      ...a, 
      balance: a.balance+Math.round(Math.random()*200-100), 
      lastSyncTs: Date.now() 
    } : a)); 
    notify('Balance refreshed (demo)'); 
  }

  function unlinkPlaid(accountId:string){ 
    setAccounts(prev=> prev.map(a=> a.id===accountId? { 
      ...a, 
      plaidLinked:false, 
      institution: undefined 
    } : a)); 
  }

  const selectedCats = selectedCat==='All' ? activeCats : activeCats.filter(c=> c===selectedCat);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            <PiggyBank size={40} style={{ color: '#2563eb' }} />
            Bills & Balances Dashboard
          </h1>
          <p style={{ color: '#4b5563' }}>Complete financial management system</p>
        </div>

        {/* Net Worth Card */}
        <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PiggyBank size={20} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Net Worth</h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select 
                value={netWorthMode} 
                onChange={(e) => setNetWorthMode(e.target.value as any)}
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
                <History size={16} style={{ marginRight: '0.5rem' }} />
                Snapshots
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
                <Plus size={16} style={{ marginRight: '0.25rem' }} />
                Add Account
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
                    {account.institution && <span style={{ padding: '0.125rem 0.5rem', background: '#e5e7eb', borderRadius: '9999px', fontSize: '0.75rem' }}>{account.institution}</span>}
                    {account.plaidLinked && <span style={{ padding: '0.125rem 0.5rem', background: '#10b981', color: 'white', borderRadius: '9999px', fontSize: '0.75rem' }}>Linked</span>}
                  </div>
                  {account.lastSyncTs && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>synced {new Date(account.lastSyncTs).toLocaleDateString()}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={account.balance}
                    onChange={(e) => setAccounts(prev => prev.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a))}
                    style={{ width: '100px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  />
                  {account.plaidLinked ? (
                    <>
                      <button onClick={() => refreshPlaid(account.id)} style={{ padding: '0.25rem 0.5rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                        <RefreshCcw size={12} />
                        Refresh
                      </button>
                      <button onClick={() => unlinkPlaid(account.id)} style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                        Unlink
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => openPlaidLink(account.id)} 
                      disabled={linkingId === account.id}
                      style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', opacity: linkingId === account.id ? 0.5 : 1 }}
                    >
                      {linkingId === account.id ? 'Linking…' : 'Link Plaid'}
                    </button>
                  )}
                  <button onClick={() => setEditingAccount(account)} style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                    <Edit size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm(`Delete account "${account.name}"?`)){
                        setAccounts(prev => prev.filter(a => a.id !== account.id));
                      }
                    }}
                    style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Due & Overdue */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Due & Overdue (next 7 days)</h3>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Total: {fmt(upcoming.weekDueTotal)}</div>
            </div>

            {(() => {
              const groups: Record<string,UpcomingItem[]> = {};
              const showCats = selectedCats.length? selectedCats : activeCats;
              upcoming.items
                .filter(it=> showCats.includes(it.bill? it.bill.category : it.otc!.category))
                .forEach(it=>{ const cat = it.bill? it.bill.category : it.otc!.category; (groups[cat] ||= []).push(it); });
              const cats = Object.keys(groups).sort((a,b)=> a.localeCompare(b));
              
              if(cats.length===0) return <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>Nothing due or overdue this week.</div>;
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {cats.map(cat=>{
                    const list = groups[cat].sort((a,b)=> a.due.getTime()-b.due.getTime());
                    const total = list.reduce((s,it)=> s + (it.bill? it.bill.amount : it.otc!.amount), 0);
                    const overdueCount = list.filter(it=>it.overdue).length;
                    
                    return (
                      <details key={cat} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }} open>
                        <summary style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ padding: '0.125rem 0.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '9999px', fontSize: '0.75rem' }}>{cat}</span>
                            {overdueCount > 0 && <span style={{ padding: '0.125rem 0.5rem', background: '#dc2626', color: 'white', borderRadius: '9999px', fontSize: '0.75rem' }}>{overdueCount} overdue</span>}
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Total: {fmt(total)}</div>
                        </summary>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {list.map((it,idx)=>{
                            const name = it.bill? it.bill.name : it.otc!.name;
                            const amt = it.bill? it.bill.amount : it.otc!.amount;
                            const accId = it.bill? it.bill.accountId : it.otc!.accountId;
                            const acc = accounts.find(a=>a.id===accId);
                            const overdue = it.overdue;
                            const soon = !overdue && Math.ceil((it.due.getTime() - new Date().getTime())/86400000) <= 3;
                            
                            return (
                              <div key={name+idx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '0.75rem', 
                                borderRadius: '0.5rem', 
                                border: `1px solid ${overdue ? '#fca5a5' : soon ? '#fbbf24' : '#d1d5db'}`,
                                background: overdue ? '#fef2f2' : soon ? '#fefbeb' : 'white'
                              }}>
                                <div>
                                  <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {name}
                                    {overdue && <span style={{ padding: '0.125rem 0.5rem', background: '#dc2626', color: 'white', borderRadius: '9999px', fontSize: '0.75rem' }}>Overdue</span>}
                                    {soon && <span style={{ padding: '0.125rem 0.5rem', background: '#f59e0b', color: 'white', borderRadius: '9999px', fontSize: '0.75rem' }}>Due soon</span>}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {it.due.toLocaleDateString()} • {fmt(amt)} • {acc?.name}
                                  </div>
                                </div>
                                <button
                                  onClick={() => it.bill ? togglePaid(it.bill) : toggleOneTimePaid(it.otc!)}
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
                                  {it.bill ? (it.bill.paidMonths.includes(activeMonth) ? 'Unmark Paid' : 'Mark Paid') : (it.otc!.paid ? 'Unmark Paid' : 'Mark Paid')}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </details>
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
          
          {/* One-Time Cost Form */}
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

          {/* One-Time Costs by Category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {(selectedCats.length? selectedCats : activeCats).map(cat => (
              <div key={cat} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>{cat}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {oneTimeCosts
                    .filter(o => o.category === cat)
                    .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map(otc => {
                      const acc = accounts.find(a => a.id === otc.accountId);
                      const overdue = new Date(otc.dueDate) < new Date();
                      
                      return (
                        <div key={otc.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '0.5rem', 
                          borderRadius: '0.375rem', 
                          border: `1px solid ${overdue ? '#fca5a5' : '#d1d5db'}`,
                          background: overdue ? '#fef2f2' : 'white'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {otc.name}
                              <span style={{ padding: '0.125rem 0.5rem', background: '#e5e7eb', borderRadius: '9999px', fontSize: '0.75rem' }}>
                                {acc?.name}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Due {otc.dueDate} • {fmt(otc.amount)}
                            </div>
                            {otc.notes && <div style={{ fontSize: '0.75rem' }}>{otc.notes}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <input 
                                type="checkbox" 
                                checked={!!otc.paid} 
                                onChange={() => toggleOneTimePaid(otc)} 
                              />
                              <span style={{ fontSize: '0.875rem' }}>
                                {otc.paid ? 'Paid' : (overdue ? 'Overdue' : 'Unpaid')}
                              </span>
                            </label>
                            <button 
                              onClick={() => setOneTimeCosts(prev => prev.filter(x => x.id !== otc.id))}
                              style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                <Plus size={16} style={{ marginRight: '0.25rem' }} />
                Add Bill
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
                        <div style={{ fontWeight: '500', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {bill.name}
                          <span style={{ padding: '0.125rem 0.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '9999px', fontSize: '0.75rem' }}>
                            {bill.category}
                          </span>
                          <span style={{ padding: '0.125rem 0.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '9999px', fontSize: '0.75rem' }}>
                            {account?.name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Due: {bill.dueDay} • {fmt(bill.amount)}
                        </div>
                        {bill.notes && <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{bill.notes}</div>}
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
                            {isPaid ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <XCircle size={16} style={{ color: '#dc2626' }} />}
                            {isPaid ? 'Paid' : 'Not paid'}
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
                      
                      <div style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '0.25rem', 
                        fontSize: '0.875rem', 
                        fontWeight: '500',
                        color: isPaid ? '#059669' : isSkipped ? '#d97706' : '#dc2626'
                      }}>
                        {isPaid ? 'Cleared' : isSkipped ? 'Skipped' : 'Owes'}
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
                  const el = document.getElementById('newCat') as HTMLInputElement;
                  if(el?.value){ addCategory(el.value); el.value = ''; }
                }}
                style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                <Plus size={16} style={{ marginRight: '0.25rem' }} />
                Add
              </button>
              <button 
                onClick={() => setShowIgnored(v => !v)}
                style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                <Eye size={16} style={{ marginRight: '0.25rem' }} />
                {showIgnored ? 'Hide ignored' : 'Show ignored'}
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
                    <input 
                      defaultValue={cat.name}
                      style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', width: '180px' }}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if(newName && newName !== cat.name) {
                          setCategories(prev => prev.map(c => c.id === cat.id ? {...c, name: newName} : c));
                        }
                      }}
                    />
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
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Dialogs */}
        {showAddAccount && <AddAccountDialog onClose={() => setShowAddAccount(false)} onAdd={(acc) => { setAccounts(prev => [...prev, acc]); setShowAddAccount(false); }} />}
        {showAddBill && <AddBillDialog categories={activeCats} accounts={accounts} onClose={() => setShowAddBill(false)} onAdd={(bill) => { setBills(prev => [...prev, bill]); setShowAddBill(false); }} />}
        {showSnapshots && <SnapshotsDialog snapshots={nwHistory} onClose={() => setShowSnapshots(false)} />}
        {editingAccount && <EditAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={(updates) => { setAccounts(prev => prev.map(a => a.id === editingAccount.id ? {...a, ...updates} : a)); setEditingAccount(null); }} />}
        
      </div>
    </div>
  );
}

// Dialog Components (same as before)
function AddAccountDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (acc: Account) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Cash' | 'Bank'>('Cash');
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
            onChange={(e) => setType(e.target.value as 'Cash' | 'Bank')}
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

function AddBillDialog({ categories, accounts, onClose, onAdd }: { categories: string[]; accounts: Account[]; onClose: () => void; onAdd: (bill: Bill) => void }) {
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
              onChange={(e) => setDueDay(clampDue(Number(e.target.value)))}
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
                  dueDay: clampDue(dueDay),
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

function SnapshotsDialog({ snapshots, onClose }: { snapshots: NWSnapshot[]; onClose: () => void }) {
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

function EditAccountDialog({ account, onClose, onSave }: { account: Account; onClose: () => void; onSave: (updates: Partial<Account>) => void }) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState(account.type);
  const [institution, setInstitution] = useState(account.institution || '');

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
            onChange={(e) => setType(e.target.value as 'Cash' | 'Bank')}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          >
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Institution</label>
          <input 
            type="text" 
            value={institution} 
            onChange={(e) => setInstitution(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button 
            onClick={() => onSave({ name, type, institution: institution || undefined })}
            style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
