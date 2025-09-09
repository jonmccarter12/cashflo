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
    { id: crypto.randomUUID(), name: 'Business' },
  ]);
  const activeCats = useMemo(()=> categories.filter(c=>!c.ignored).map(c=>c.name), [categories]);

  // Data
  const [accounts, setAccounts] = usePersistentState<Account[]>(`${storageKey}:accounts`, [
    { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
    { id: 'checking', name:'Checking Account', type:'Bank', balance:0 },
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
    return { 
      items, 
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

  function toggleOneTimePaid(o: OneTimeCost){
    setOneTimeCosts(prev=> prev.map(x=> x.id===o.id ? { ...x, paid: !x.paid } : x));
    const acc = accounts.find(a=>a.id===o.accountId);
    if(!o.paid && autoDeductCash && acc?.type==='Cash'){ 
      setAccounts(prev=> prev.map(a=> a.id===acc.id? { ...a, balance: a.balance - o.amount } : a)); 
    }
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
        notify('Bank linked (Demo Mode)');
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
    notify('Balance refreshed (Demo)'); 
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
            Financial Dashboard
          </h1>
          <p style={{ color: '#4b5563' }}>Complete financial management system</p>
        </div>

        {/* Net Worth Card */}
        <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Net Worth</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <select 
                value={netWorthMode} 
                onChange={(e) => setNetWorthMode(e.target.value as any)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', background: 'white', color: 'black' }}
              >
                <option value="current">Current</option>
                <option value="afterWeek">After This Week</option>
                <option value="afterMonth">After This Month</option>
              </select>
              <button 
                onClick={() => setShowSnapshots(true)}
                style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.375rem', color: 'white', cursor: 'pointer' }}
              >
                <History size={16} style={{ marginRight: '0.5rem' }} />
                History
              </button>
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', textAlign: 'center' }}>
            {fmt(netWorthValue)}
            {netWorthValue < 0 && <AlertTriangle size={24} style={{ marginLeft: '0.5rem', color: '#fca5a5' }} />}
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
                background: selectedCat === cat ? '#2563eb' : 'white',
                color: selectedCat === cat ? 'white' : '#374151',
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accounts and Due Items */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* Accounts */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Accounts</h3>
              <button 
                onClick={() => setShowAddAccount(true)}
                style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                <Plus size={16} style={{ marginRight: '0.25rem' }} />
                Add Account
              </button>
            </div>
            
            {accounts.map(account => (
              <div key={account.id} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{account.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {account.type} • {fmt(account.balance)}
                      {account.institution && ` • ${account.institution}`}
                      {account.plaidLinked && ' • Linked'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={account.balance}
                      onChange={(e) => setAccounts(prev => prev.map(a => a.id === account.id ? {...a, balance: Number(e.target.value)} : a))}
                      style={{ width: '100px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                    />
                    {account.plaidLinked ? (
                      <>
                        <button onClick={() => refreshPlaid(account.id)} style={{ padding: '0.25rem 0.5rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                          <RefreshCcw size={14} />
                        </button>
                        <button onClick={() => unlinkPlaid(account.id)} style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                          Unlink
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => openPlaidLink(account.id)} 
                        disabled={linkingId === account.id}
                        style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', opacity: linkingId === account.id ? 0.5 : 1 }}
                      >
                        {linkingId === account.id ? 'Linking...' : 'Link'}
                      </button>
                    )}
                    <button onClick={() => setEditingAccount(account)} style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Due Items */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Due This Week</h3>
            {upcoming.items.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>Nothing due this week!</div>
            ) : (
              upcoming.items.map((item, idx) => {
                const name = item.bill ? item.bill.name : item.otc!.name;
                const amount = item.bill ? item.bill.amount : item.otc!.amount;
                const isPaid = item.bill ? item.bill.paidMonths.includes(activeMonth) : item.otc!.paid;
                
                return (
                  <div key={idx} style={{ 
                    background: item.overdue ? '#fef2f2' : '#f0f9ff', 
                    border: `1px solid ${item.overdue ? '#fca5a5' : '#bfdbfe'}`,
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    marginBottom: '0.5rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {item.due.toLocaleDateString()} • {fmt(amount)}
                          {item.overdue && <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>OVERDUE</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => item.bill ? togglePaid(item.bill) : toggleOneTimePaid(item.otc!)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isPaid ? '#059669' : '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer'
                        }}
                      >
                        {isPaid ? 'Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bills Management */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Bills ({activeMonth})</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={autoDeductCash} 
                  onChange={(e) => setAutoDeductCash(e.target.checked)} 
                />
                Auto-deduct from Cash
              </label>
              <input 
                type="month" 
                value={activeMonth} 
                onChange={(e) => setActiveMonth(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
              <button 
                onClick={() => setShowAddBill(true)}
                style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
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
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontWeight: '500', fontSize: '1.125rem' }}>{bill.name}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Due: {bill.dueDay} • {fmt(bill.amount)} • {account?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{bill.category}</div>
                      {bill.notes && <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{bill.notes}</div>}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isPaid} 
                            onChange={() => togglePaid(bill)} 
                          />
                          <span style={{ fontSize: '0.875rem' }}>Paid</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input 
                            type="checkbox" 
                            checked={!!isSkipped} 
                            onChange={() => {
                              setBills(prev => prev.map(b => b.id === bill.id ? {
                                ...b,
                                skipMonths: isSkipped 
                                  ? b.skipMonths?.filter(m => m !== activeMonth) 
                                  : [...(b.skipMonths || []), activeMonth]
                              } : b));
                            }} 
                          />
                          <span style={{ fontSize: '0.875rem' }}>Skip</span>
                        </label>
                      </div>
                      
                      <div style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '0.25rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '500',
                        background: isPaid ? '#dcfce7' : isSkipped ? '#fef3c7' : '#fee2e2',
                        color: isPaid ? '#16a34a' : isSkipped ? '#d97706' : '#dc2626'
                      }}>
                        {isPaid ? 'PAID' : isSkipped ? 'SKIPPED' : 'DUE'}
                      </div>
                    </div>
                  </div>
                );
              })}
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

// Dialog Components
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
