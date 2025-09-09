import React, { useState, useEffect } from "react";
import { PiggyBank, Link2 as LinkIcon, RefreshCcw, Plus, Trash2 } from "lucide-react";
import styles from '../styles/dashboard.module.css';

// Types
interface Account {
  id: string;
  name: string;
  type: "Cash" | "Bank";
  balance: number;
  plaidLinked?: boolean;
  institution?: string;
  lastSyncTs?: number;
}

// Helpers
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
  toast.className = styles.toast;
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
        <div className={styles.header}>
          <h1 className={styles.title}>
            <PiggyBank size={36} style={{ color: '#2563eb' }} />
            Financial Dashboard
          </h1>
          <p className={styles.subtitle}>Manage your accounts and track your finances</p>
        </div>

        <div className={styles.totalCard}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem', opacity: 0.9 }}>
            Total Balance
          </h2>
          <div className={styles.totalAmount}>{fmt(totalBalance)}</div>
          <p style={{ opacity: 0.8 }}>
            Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className={styles.grid}>
          {accounts.map(account => (
            <div key={account.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.accountName}>{account.name}</h3>
                  <span className={styles.accountType}>{account.type}</span>
                </div>
                <button
                  className={`${styles.button} ${styles.buttonRed}`}
                  onClick={() => removeAccount(account.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className={styles.balanceSection}>
                <div className={styles.balance}>{fmt(account.balance)}</div>
                {!account.plaidLinked && (
                  <input
                    type="number"
                    step="0.01"
                    value={account.balance}
                    onChange={(e) => updateBalance(account.id, parseFloat(e.target.value) || 0)}
                    className={styles.balanceInput}
                    placeholder="Enter balance"
                  />
                )}
              </div>

              <div>
                {account.plaidLinked ? (
                  <div className={styles.buttonGroup}>
                    <button
                      className={`${styles.button} ${styles.buttonGreen} ${styles.buttonFlex}`}
                      onClick={() => refreshPlaid(account.id)}
                    >
                      <RefreshCcw size={16} style={{ marginRight: '0.25rem' }} />
                      Refresh
                    </button>
                    <button
                      className={`${styles.button} ${styles.buttonRed}`}
                      onClick={() => unlinkPlaid(account.id)}
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <button
                    className={`${styles.button} ${styles.buttonBlue} ${styles.buttonFull}`}
                    disabled={linkingId === account.id}
                    onClick={() => openPlaidLink(account.id)}
                  >
                    {linkingId === account.id ? (
                      <>
                        <div className={styles.spinner}></div>
                        Linking...
                      </>
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
                <div className={styles.institutionInfo}>
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

          <div className={`${styles.card} ${styles.addCard}`}>
            {showAddForm ? (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="Account name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className={styles.addInput}
                  onKeyPress={(e) => e.key === 'Enter' && addAccount()}
                />
                <div className={styles.addButtons}>
                  <button 
                    className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFlex}`}
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
                <Plus className={styles.addIcon} />
                <h3>Add Account</h3>
                <button
                  className={`${styles.button} ${styles.buttonBlue}`}
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus size={16} style={{ marginRight: '0.25rem' }} />
                  Add Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <p>Demo mode - Click "Link Plaid" to simulate connecting your bank</p>
        </div>
      </div>
    </div>
  );
}