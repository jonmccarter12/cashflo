import React, { useState } from "react";
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

const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const [accounts, setAccounts] = useState<Account[]>([
    { id: 'cash', name: 'Cash on Hand', type: 'Cash', balance: 250.50 },
    { id: 'bank', name: 'Checking Account', type: 'Bank', balance: 1847.25 }
  ]);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  async function openPlaidLink(accountId: string) {
    setLinkingId(accountId);
    await new Promise(resolve => setTimeout(resolve, 1500));
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
    notify('✅ Bank linked successfully!');
    setLinkingId(null);
  }

  async function refreshPlaid(accountId: string) {
    await new Promise(resolve => setTimeout(resolve, 800));
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
    notify('✅ Balance refreshed!');
  }

  function unlinkPlaid(accountId: string) {
    setAccounts(prev =>
      prev.map(a =>
        a.id === accountId
          ? { ...a, plaidLinked: false, institution: undefined, lastSyncTs: undefined }
          : a
      )
    );
    notify('🔗 Account unlinked');
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
    notify('✅ Account added!');
  }

  function removeAccount(accountId: string) {
    if (accounts.length <= 1) {
      notify('❌ Cannot remove last account');
      return;
    }
    
    setAccounts(prev => prev.filter(a => a.id !== accountId));
    notify('🗑️ Account removed');
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
                        Link Bank Account
                      </>
                    )}
                  </button>
                )}
              </div>

              {account.institution && (
                <div className={styles.institutionInfo}>
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

          <div className={`${styles.card} ${styles.addCard}`}>
            {showAddForm ? (
              <div className={styles.addForm}>
                <input
                  type="text"
                  placeholder="Enter account name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className={styles.addInput}
                  onKeyPress={(e) => e.key === 'Enter' && addAccount()}
                  autoFocus
                />
                <div className={styles.addButtons}>
                  <button 
                    className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFlex}`}
                    onClick={addAccount}
                  >
                    <Plus size={16} style={{ marginRight: '0.25rem' }} />
                    Add Account
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
                <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  Add New Account
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                  Track another bank account or cash
                </p>
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
          <p>💡 <strong>Demo Mode:</strong> Click "Link Bank Account" to simulate connecting to your real bank!</p>
        </div>
      </div>
    </div>
  );
}