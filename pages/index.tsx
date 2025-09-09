import React, { useState, useEffect } from "react";
import { PiggyBank, Link2 as LinkIcon, RefreshCcw, Plus, Trash2 } from "lucide-react";
import styles from '../styles/dashboard.module.css';

interface Account {
  id: string;
  name: string;
  type: "Cash" | "Bank";
  balance: number;
  plaidLinked?: boolean;
  institution?: string;
  lastSyncTs?: number;
}

const storageKey = "bills_balance_dashboard_v2";
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          setState(JSON.parse(raw));
        }
      } catch (e) {
        console.warn('Failed to load from localStorage:', e);
      }
      setIsLoaded(true);
    }
  }, [key]);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }
  }, [key, state, isLoaded]);

  return [state, setState] as const;
}

function notify(msg: string) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: #10b981;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 50;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

export default function Dashboard() {
  const [accounts, setAccounts] = usePersistentState<Account[]>(`${storageKey}:accounts`, [
    { id: 'cash', name: 'Cash on Hand', type: 'Cash', balance: 0 },
    { id: 'bank', name: 'Checking', type: 'Bank', balance: 0 }
  ]);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const ensurePlaidScript = async (): Promise<boolean> => {
    if ((window as any).Plaid?.create) return true;
    const existing = document.querySelector('script[src*="plaid.com/link"]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      s.async = true;
      document.head.appendChild(s);
    }
    return await new Promise<boolean>((resolve) => {
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if ((window as any).Plaid?.create) {
          clearInterval(iv);
          resolve(true);
        }
        if (tries > 50) {
          clearInterval(iv);
          resolve(false);
        }
      }, 100);
    });
  };

  const fetchLinkToken = async (): Promise<string | null> => {
    try {
      const res1 = await fetch('/api/plaid/create-link-token', { method: 'POST' });
      if (res1.ok) {
        const d = await res1.json();
        return d.link_token;
      }
      const res2 = await fetch('/api/plaid/create_link_token', { method: 'POST' });
      if (res2.ok) {
        const d = await res2.json();
        return d.link_token;
      }
    } catch (e) {
      console.warn('create_link_token failed', e);
    }
    return null;
  };

  async function openPlaidLink(accountId: string) {
    setLinkingId(accountId);
    try {
      const scriptOk = await ensurePlaidScript();
      const linkToken = await fetchLinkToken();

      if (scriptOk && linkToken && (window as any).Plaid?.create) {
        const handler = (window as any).Plaid.create({
          token: linkToken,
          onSuccess: async (public_token: string, metadata: any) => {
            try {
              const payload = { public_token, accountId };
              const ex1 = await fetch('/api/plaid/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (!ex1.ok) {
                const ex2 = await fetch('/api/plaid/exchange_public_token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });
                if (!ex2.ok) throw new Error(await ex2.text());
              }
              setAccounts(prev => prev.map(a => a.id === accountId ? {
                ...a,
                plaidLinked: true,
                institution: metadata?.institution?.name || 'Linked',
                lastSyncTs: Date.now()
              } : a));
              await refreshPlaid(accountId);
              notify('Plaid linked');
            } catch (err: any) {
              notify('Exchange failed: ' + (err?.message || String(err)));
            }
          },
          onExit: (err: any) => {
            if (err) console.warn('Plaid exit', err);
          }
        });
        handler.open();
        return;
      }
      
      // Demo fallback
      setAccounts(prev => prev.map(a => a.id === accountId ? {
        ...a,
        plaidLinked: true,
        institution: 'Demo Bank',
        lastSyncTs: Date.now(),
        balance: Math.round((Math.random() * 5000 + 500) * 100) / 100
      } : a));
      notify('Plaid linked (demo)');
    } catch (e: any) {
      notify('Plaid error: ' + (e?.message || e));
    } finally {
      setLinkingId(null);
    }
  }

  async function refreshPlaid(accountId: string) {
    try {
      const res = await fetch(`/api/plaid/balances?clientAccountId=${encodeURIComponent(accountId)}`);
      if (res.ok) {
        const data = await res.json();
        const rec = (data.accounts || [])[0];
        setAccounts(prev => prev.map(a => a.id === accountId ? {
          ...a,
          balance: rec?.available || rec?.current || a.balance,
          lastSyncTs: Date.now()
        } : a));
        notify('Balance refreshed');
        return;
      }
    } catch { }
    
    // demo fallback
    setAccounts(prev => prev.map(a => a.id === accountId ? {
      ...a,
      balance: a.balance + Math.round(Math.random() * 100 - 50),
      lastSyncTs: Date.now()
    } : a));
    notify('Balance refreshed (demo)');
  }

  function unlinkPlaid(accountId: string) {
    setAccounts(prev => prev.map(a => a.id === accountId ? {
      ...a,
      plaidLinked: false,
      institution: undefined
    } : a));
    notify('Account unlinked');
  }

  function addAccount() {
    if (!newAccountName.trim()) return;
    
    const newAccount: Account = {
      id: Date.now().toString(),
      name: newAccountName,
      type: 'Bank',
      balance: 0
    };
    
    setAccounts(prev => [...prev, newAccount]);
    setNewAccountName('');
    setShowAddForm(false);
    notify('Account added');
  }

  function removeAccount(accountId: string) {
    if (accounts.length <= 1) {
      notify('Cannot remove last account');
      return;
    }
    
    setAccounts(prev => prev.filter(a => a.id !== accountId));
    notify('Account removed');
  }

  function updateBalance(accountId: string, newBalance: number) {
    setAccounts(prev =>
      prev.map(a =>
        a.id === accountId ? { ...a, balance: newBalance } : a
      )
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            <PiggyBank size={36} style={{ color: '#2563eb' }} />
            Financial Dashboard
          </h1>
          <p style={{ color: '#4b5563' }}>Manage your accounts and track your finances</p>
        </div>

        <div className={styles.totalCard}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem', opacity: 0.9 }}>
            Total Balance
          </h2>
          <div style={{ fontSize: '2.25rem', fontWeight: '700', margin: '0.5rem 0' }}>{fmt(totalBalance)}</div>
          <p style={{ opacity: 0.8 }}>
            Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className={styles.grid}>
          {accounts.map(account => (
            <div key={account.id} className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontWeight: '600', color: '#1f2937', fontSize: '1.125rem' }}>{account.name}</h3>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '9999px' }}>{account.type}</span>
                </div>
                <button
                  className={styles.button}
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => removeAccount(account.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ textAlign: 'center', background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>{fmt(account.balance)}</div>
                {!account.plaidLinked && (
                  <input
                    type="number"
                    step="0.01"
                    value={account.balance}
                    onChange={(e) => updateBalance(account.id, parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', textAlign: 'center' }}
                    placeholder="Enter balance"
                  />
                )}
              </div>

              <div>
                {account.plaidLinked ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      className={styles.button}
                      style={{ flex: '1', color: '#059669', borderColor: '#a7f3d0' }}
                      onClick={() => refreshPlaid(account.id)}
                    >
                      <RefreshCcw size={16} style={{ marginRight: '0.25rem' }} />
                      Refresh
                    </button>
                    <button
                      className={styles.button}
                      style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      onClick={() => unlinkPlaid(account.id)}
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.button}
                    style={{ width: '100%', color: '#2563eb', borderColor: '#bfdbfe' }}
                    disabled={linkingId === account.id}
                    onClick={() => openPlaidLink(account.id)}
                  >
                    {linkingId === account.id ? (
                      'Linking...'
                    ) : (
                      <>
                        <LinkIcon size={16} style={{ marginRight: '0.25rem' }} />
                        Link Plaid
                      </>
                    )}
                  </button>
                )}
              </div>

              {account.institution && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', background: '#ecfdf5', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #a7f3d0' }}>
                  <div>{account.institution}</div>
                  {account.lastSyncTs && (
                    <div style={{ marginTop: '0.25rem' }}>
                      {new Date(account.lastSyncTs).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className={styles.card} style={{ border: '2px dashed #d1d5db', textAlign: 'center', padding: '2rem 1rem' }}>
            {showAddForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Account name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  onKeyPress={(e) => e.key === 'Enter' && addAccount()}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className={styles.button}
                    style={{ flex: '1', background: '#2563eb', color: 'white', borderColor: '#2563eb' }}
                    onClick={addAccount}
                  >
                    Add
                  </button>
                  <button 
                    className={styles.button}
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAccountName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <Plus style={{ width: '4rem', height: '4rem', margin: '0 auto 0.75rem', opacity: 0.5, color: '#9ca3af' }} />
                <h3>Add Account</h3>
                <button
                  className={styles.button}
                  style={{ color: '#2563eb', borderColor: '#bfdbfe' }}
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus size={16} style={{ marginRight: '0.25rem' }} />
                  Add Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <p>Demo mode - Click "Link Plaid" to simulate connecting your bank</p>
        </div>
      </div>
    </div>
  );
}
