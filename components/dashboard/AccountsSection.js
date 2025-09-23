import React from 'react';
import { fmt } from '../../lib/utils';

export default function AccountsSection({
  isMobile,
  accounts,
  setShowAddAccount,
  deleteAccount,
  updateAccountBalance,
  currentLiquidWithGuaranteed,
  renameAccount,
  accountsView,
  setAccountsView,
  updateAccount,
  supabase,
  user
}) {
  const selectAllOnFocus = (e) => e.target.select();
  const [editingAccountName, setEditingAccountName] = React.useState(null);
  const [tempAccountName, setTempAccountName] = React.useState('');

  // Filter accounts based on view
  const filteredAccounts = accounts.filter(account => {
    if (accountsView === 'debit') {
      return account.accountType !== 'credit';
    } else {
      return account.accountType === 'credit';
    }
  });

  if (isMobile) {
    return (
      <div style={{
        background: 'white',
        padding: '1rem',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        marginBottom: '0.75rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>Accounts</h3>
          <button
            onClick={() => setShowAddAccount(true)}
            style={{
              padding: '0.25rem 0.5rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
            }}
          >
            + Account
          </button>
        </div>

        {/* Toggle between Debit and Credit views */}
        <div style={{
          display: 'flex',
          marginBottom: '0.75rem',
          background: '#f1f5f9',
          borderRadius: '0.5rem',
          padding: '0.25rem'
        }}>
          <button
            onClick={() => setAccountsView('debit')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: accountsView === 'debit' ? 'white' : 'transparent',
              color: accountsView === 'debit' ? '#1f2937' : '#64748b',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: accountsView === 'debit' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Debit Accounts
          </button>
          <button
            onClick={() => setAccountsView('credit')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: accountsView === 'credit' ? 'white' : 'transparent',
              color: accountsView === 'credit' ? '#1f2937' : '#64748b',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: accountsView === 'credit' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            Credit Cards
          </button>
        </div>
        
        {filteredAccounts.map(account => (
          <div key={account.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '0.5rem',
            marginBottom: '0.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ flex: 1 }}>
              {editingAccountName === account.id ? (
                <input
                  type="text"
                  value={tempAccountName}
                  onChange={(e) => setTempAccountName(e.target.value)}
                  onBlur={() => {
                    if (tempAccountName.trim() && tempAccountName !== account.name) {
                      renameAccount(account.id, tempAccountName.trim());
                    }
                    setEditingAccountName(null);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      if (tempAccountName.trim() && tempAccountName !== account.name) {
                        renameAccount(account.id, tempAccountName.trim());
                      }
                      setEditingAccountName(null);
                    }
                  }}
                  autoFocus
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    background: 'white',
                    border: '2px solid #8b5cf6',
                    borderRadius: '0.375rem',
                    padding: '0.25rem 0.5rem',
                    width: '100%',
                    maxWidth: '140px'
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    transition: 'all 0.2s ease',
                    color: '#1f2937'
                  }}
                  onClick={() => {
                    setEditingAccountName(account.id);
                    setTempAccountName(account.name);
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {account.name}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem', fontWeight: '500', marginLeft: '0.5rem' }}>{account.type}</div>
              {account.accountType === 'credit' && (
                <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '0.125rem', fontWeight: '500', marginLeft: '0.5rem' }}>
                  APR: {account.apr || 0}% | Limit: ${account.creditLimit || 0}
                  {account.balance > 0 && account.apr > 0 && (
                    <div style={{ fontSize: '0.6rem', color: '#dc2626', marginTop: '0.125rem' }}>
                      Min payment (~2%): ${(account.balance * 0.02).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'white', padding: '0.375rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>$</span>
                <input
                  type="number"
                  defaultValue={account.balance}
                  onBlur={(e) => {
                    if (e.target.value !== account.balance.toString()) {
                      updateAccountBalance(account.id, e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  onFocus={selectAllOnFocus}
                  style={{
                    width: '70px',
                    padding: '0',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    fontWeight: '600',
                    background: 'transparent',
                    color: '#1f2937'
                  }}
                />
              </div>
              <button
                onClick={() => deleteAccount(account.id)}
                style={{
                  padding: '0.375rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  minWidth: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Accounts</h3>
        <button
          onClick={() => setShowAddAccount(true)}
          style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          + Add
        </button>
      </div>

      {/* Toggle between Debit and Credit views */}
      <div style={{
        display: 'flex',
        marginBottom: '1rem',
        background: '#f1f5f9',
        borderRadius: '0.5rem',
        padding: '0.25rem'
      }}>
        <button
          onClick={() => setAccountsView('debit')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: accountsView === 'debit' ? 'white' : 'transparent',
            color: accountsView === 'debit' ? '#1f2937' : '#64748b',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: accountsView === 'debit' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          Debit Accounts
        </button>
        <button
          onClick={() => setAccountsView('credit')}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: accountsView === 'credit' ? 'white' : 'transparent',
            color: accountsView === 'credit' ? '#1f2937' : '#64748b',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: accountsView === 'credit' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          Credit Cards
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filteredAccounts.map(account => (
          <div key={account.id} style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                {editingAccountName === account.id ? (
                  <input
                    type="text"
                    value={tempAccountName}
                    onChange={(e) => setTempAccountName(e.target.value)}
                    onBlur={() => {
                      if (tempAccountName.trim() && tempAccountName !== account.name) {
                        renameAccount(account.id, tempAccountName.trim());
                      }
                      setEditingAccountName(null);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (tempAccountName.trim() && tempAccountName !== account.name) {
                          renameAccount(account.id, tempAccountName.trim());
                        }
                        setEditingAccountName(null);
                      }
                    }}
                    autoFocus
                    style={{
                      fontWeight: '700',
                      fontSize: '1.125rem',
                      background: 'white',
                      border: '2px solid #8b5cf6',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      width: '100%',
                      maxWidth: '250px',
                      boxShadow: '0 2px 4px rgba(139, 92, 246, 0.2)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontWeight: '700',
                      fontSize: '1.125rem',
                      cursor: 'pointer',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      transition: 'all 0.2s ease',
                      display: 'inline-block',
                      color: '#1f2937'
                    }}
                    onClick={() => {
                      setEditingAccountName(account.id);
                      setTempAccountName(account.name);
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    {account.name}
                  </div>
                )}
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.375rem', fontWeight: '500', marginLeft: '0.75rem' }}>{account.type}</div>
                {account.accountType === 'credit' && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: '500', marginLeft: '0.75rem' }}>
                    APR: {account.apr || 0}% | Credit Limit: ${account.creditLimit || 0}
                    {account.balance > 0 && account.apr > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.25rem' }}>
                        Min payment (~2%): ${(account.balance * 0.02).toFixed(2)} |
                        Payoff time (min payments): ~{Math.ceil(Math.log(1 + (account.balance * (account.apr / 100 / 12)) / (account.balance * 0.02)) / Math.log(1 + (account.apr / 100 / 12)))} months
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteAccount(account.id)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  flexShrink: 0,
                  marginLeft: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginLeft: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>$</span>
                <input
                  type="number"
                  defaultValue={account.balance}
                  onBlur={(e) => {
                    if (e.target.value !== account.balance.toString()) {
                      updateAccountBalance(account.id, e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  onFocus={selectAllOnFocus}
                  style={{
                    width: '120px',
                    padding: '0',
                    border: 'none',
                    outline: 'none',
                    fontSize: '1.125rem',
                    textAlign: 'right',
                    fontWeight: '700',
                    background: 'transparent',
                    color: '#1f2937'
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
