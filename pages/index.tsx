import React, { useState, useEffect } from "react";
import { PiggyBank, Link2 as LinkIcon, RefreshCcw, Plus, Trash2 } from "lucide-react";

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

function notify(msg: string) {
  alert(msg);
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: 'cash', name: 'Cash on Hand', type: 'Cash', balance: 250 },
    { id: 'bank', name: 'Checking', type: 'Bank', balance: 1847 }
  ]);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey + ':accounts');
        if (saved) {
          setAccounts(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to load accounts');
      }
    }
  }, []);

  // Save to localStorage when accounts change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey + ':accounts', JSON.stringify(accounts));
      } catch (e) {
        console.warn('Failed to save accounts');
      }
    }
  }, [accounts]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  async function openPlaidLink(accountId: string) {
    setLinkingId(accountId);
    
    // Simulate linking process
    setTimeout(() => {
      setAccounts(prev =>
        prev.map(a =>
          a.id === accountId
            ? {
                ...a,
                plaidLinked: true,
                institution: 'Demo Bank',
                lastSyncTs: Date.now(),
                balance: Math.round((Math.random() * 5000 + 500) * 100) / 100
              }
            : a
        )
      );
      notify('Bank linked successfully!');
      setLinkingId(null);
    }, 2000);
  }

  async function refreshPlaid(accountId: string) {
    setAccounts(prev =>
      prev.map(a =>
        a.id === accountId
          ? {
              ...a,
              balance: Math.round((a.balance + Math.random() * 200 - 100) * 100) / 100,
              lastSyncTs: Date.now()
            }
          : a
      )
    );
    notify('Balance refreshed!');
  }

  function unlinkPlaid(accountId: string) {
    setAccounts(prev =>
      prev.map(a =>
        a.id === accountId
          ? { ...a, plaidLinked: false, institution: undefined, lastSyncTs: undefined }
          : a
      )
    );
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
    notify('Account added!');
  }

  function removeAccount(accountId: string) {
    if (accounts.length <= 1) {
      notify('Cannot remove the last account');
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)', padding: '1rem' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#1f2937', marginBottom: '0.5rem' }}>
            <PiggyBank size={36} style={{ color: '#2563eb' }} />
            Financial Dashboard
          </h1>
          <p style={{ color: '#4b5563' }}>Manage your accounts and track your finances</p>
        </div>

        {/* Total Balance Card */}
        <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: 'white', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem', opacity: 0.9 }}>
            Total Balance
          </h2>
          <div style={{ fontSize: '2.25rem', fontWeight: '700', margin: '0.5rem 0' }}>{fmt(totalBalance)}</div>
          <p style={{ opacity: 0.8 }}>
            Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Accounts Grid */}
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {accounts.map(account => (
            <div key={account.id} style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '1rem', transition: 'all 0.2s' }}>
              
              {/* Account Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontWeight: '600', color: '#1f2937', fontSize: '1.125rem' }}>{account.name}</h3>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '9999px' }}>{account.type}</span>
                </div>
                <button
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer' }}
                  onClick={() => removeAccount(account.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Balance Section */}
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

              {/* Action Buttons */}
              <div>
                {account.plaidLinked ? (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      style={{ flex: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #a7f3d0', background: 'white', color: '#059669', cursor: 'pointer' }}
                      onClick={() => refreshPlaid(account.id)}
                    >
                      <RefreshCcw size={16} style={{ marginRight: '0.25rem' }} />
                      Refresh
                    </button>
                    <button
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer' }}
                      onClick={() => unlinkPlaid(account.id)}
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <button
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #bfdbfe', background: 'white', color: '#2563eb', cursor: 'pointer', opacity: linkingId === account.id ? 0.5 : 1 }}
                    disabled={linkingId === account.id}
                    onClick={() => openPlaidLink(account.id)}
                  >
                    {linkingId === account.id ? (
                      'Linking...'
                    ) : (
                      <>
                        <LinkIcon size={16} style={{ marginRight: '0.25rem' }} />
                        Link Bank Account
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Institution Info */}
              {account.institution && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', background: '#ecfdf5', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #a7f3d0' }}>
                  <div>🏦 {account.institution}</div>
                  {account.lastSyncTs && (
                    <div style={{ marginTop: '0.25rem' }}>
                      Last synced: {new Date(account.lastSyncTs).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Account Card */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '2rem 1rem', border: '2px dashed #d1d5db', textAlign: 'center' }}>
            {showAddForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Enter account name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                  onKeyPress={(e) => e.key === 'Enter' && addAccount()}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    style={{ flex: '1', padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #2563eb', background: '#2563eb', color: 'white', cursor: 'pointer' }}
                    onClick={addAccount}
                  >
                    <Plus size={16} style={{ marginRight: '0.25rem' }} />
                    Add Account
                  </button>
                  <button 
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer' }}
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
                <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.25rem' }}>Add New Account</h3>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Track another bank account or cash</p>
                <button
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', borderRadius: '0.375rem', border: '1px solid #bfdbfe', background: 'white', color: '#2563eb', cursor: 'pointer' }}
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus size={16} style={{ marginRight: '0.25rem' }} />
                  Add Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <p>💡 Demo mode - Click "Link Bank Account" to simulate connecting your bank!</p>
        </div>
      </div>
    </div>
  );
}
