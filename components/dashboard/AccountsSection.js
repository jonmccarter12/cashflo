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
  setEditingAccount,
  toggleAccountIgnored,
  supabase,
  user
}) {
  const selectAllOnFocus = (e) => e.target.select();
  const [editingAccountName, setEditingAccountName] = React.useState(null);
  const [tempAccountName, setTempAccountName] = React.useState('');

  // Filter accounts based on view
  const filteredAccounts = accounts.filter(account => {
    if (accountsView === 'debit') {
      // Show debit accounts (anything that's not explicitly 'credit')
      return !account.accountType || account.accountType !== 'credit';
    } else {
      // Show only credit accounts
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

        {filteredAccounts.map(account => {
          // Enhanced credit card display for mobile
          if (account.accountType === 'credit') {
            const utilization = account.creditLimit > 0 ? (account.balance / account.creditLimit) * 100 : 0;
            const availableCredit = Math.max(0, (account.creditLimit || 0) - account.balance);
            const utilizationColor = utilization > 80 ? '#ef4444' : utilization > 60 ? '#f59e0b' : '#22c55e';

            return (
              <div key={account.id} style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #374151 100%)',
                border: '1px solid #475569',
                borderRadius: '1rem',
                padding: '1rem',
                marginBottom: '0.75rem',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
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
                          fontSize: '1rem',
                          fontWeight: '700',
                          background: 'white',
                          border: '2px solid #8b5cf6',
                          borderRadius: '0.5rem',
                          padding: '0.5rem',
                          width: '100%',
                          maxWidth: '180px',
                          color: '#1f2937'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s ease',
                          display: 'inline-block'
                        }}
                        onClick={() => {
                          setEditingAccountName(account.id);
                          setTempAccountName(account.name);
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        {account.name}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem', marginLeft: '0.5rem', fontWeight: '500' }}>
                      {account.type}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setEditingAccount(account)}
                      style={{
                        padding: '0.25rem 0.375rem',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.625rem',
                        fontWeight: '600'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleAccountIgnored(account)}
                      style={{
                        padding: '0.25rem 0.375rem',
                        background: account.ignored ? '#22c55e' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.625rem',
                        fontWeight: '600'
                      }}
                    >
                      {account.ignored ? 'Show' : 'Hide'}
                    </button>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      style={{
                        padding: '0.25rem 0.375rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.625rem',
                        fontWeight: '600'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Balance section */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: '500' }}>Current Balance</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: 'white' }}>$</span>
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
                        width: '80px',
                        padding: '0.375rem',
                        border: '1px solid #475569',
                        borderRadius: '0.375rem',
                        fontSize: '1rem',
                        textAlign: 'right',
                        fontWeight: '700',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Credit utilization bar */}
                {account.creditLimit > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>Utilization</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: utilizationColor }}>
                        {utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '0.5rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.25rem',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(utilization, 100)}%`,
                        height: '100%',
                        backgroundColor: utilizationColor,
                        transition: 'all 0.3s ease',
                        borderRadius: '0.25rem'
                      }} />
                    </div>
                  </div>
                )}

                {/* Credit info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>APR</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fbbf24' }}>{account.apr || 0}%</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>Available</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#34d399' }}>${fmt(availableCredit)}</div>
                  </div>
                </div>

                {/* Payment calculations */}
                {account.balance > 0 && account.apr > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                    <div style={{ fontSize: '0.625rem', color: '#fca5a5', marginBottom: '0.25rem', fontWeight: '500' }}>Payment Info</div>
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>
                      Min payment (~2%): ${(account.balance * 0.02).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.125rem' }}>
                      Payoff time (min payments): ~{Math.ceil(Math.log(1 + (account.balance * (account.apr / 100 / 12)) / (account.balance * 0.02)) / Math.log(1 + (account.apr / 100 / 12)))} months
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Regular debit account display for mobile
          return (
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
                  onClick={() => setEditingAccount(account)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleAccountIgnored(account)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: account.ignored ? '#22c55e' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  {account.ignored ? 'Show' : 'Hide'}
                </button>
                <button
                  onClick={() => deleteAccount(account.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
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
        {filteredAccounts.map(account => {
          // Enhanced credit card display for desktop
          if (account.accountType === 'credit') {
            const utilization = account.creditLimit > 0 ? (account.balance / account.creditLimit) * 100 : 0;
            const availableCredit = Math.max(0, (account.creditLimit || 0) - account.balance);
            const utilizationColor = utilization > 80 ? '#ef4444' : utilization > 60 ? '#f59e0b' : '#22c55e';

            return (
              <div key={account.id} style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #374151 100%)',
                border: '1px solid #475569',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
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
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          background: 'white',
                          border: '2px solid #8b5cf6',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          width: '100%',
                          maxWidth: '300px',
                          color: '#1f2937'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s ease',
                          display: 'inline-block'
                        }}
                        onClick={() => {
                          setEditingAccountName(account.id);
                          setTempAccountName(account.name);
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        {account.name}
                      </div>
                    )}
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem', marginLeft: '0.75rem', fontWeight: '500' }}>
                      {account.type}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setEditingAccount(account)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleAccountIgnored(account)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: account.ignored ? '#22c55e' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      {account.ignored ? 'Show' : 'Hide'}
                    </button>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Main content grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

                  {/* Balance section */}
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: '500' }}>Current Balance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>$</span>
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
                          padding: '0.5rem',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          fontSize: '1.25rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Credit utilization section */}
                  {account.creditLimit > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8', fontWeight: '500' }}>Utilization</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '700', color: utilizationColor }}>
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '0.75rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.375rem',
                        overflow: 'hidden',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{
                          width: `${Math.min(utilization, 100)}%`,
                          height: '100%',
                          backgroundColor: utilizationColor,
                          transition: 'all 0.3s ease',
                          borderRadius: '0.375rem'
                        }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Available: <span style={{ color: '#34d399', fontWeight: '600' }}>${fmt(availableCredit)}</span>
                      </div>
                    </div>
                  )}

                  {/* Credit info and payment calculations */}
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: '500' }}>APR</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fbbf24' }}>{account.apr || 0}%</div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: '500' }}>Credit Limit</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#34d399' }}>${fmt(account.creditLimit || 0)}</div>
                      </div>
                    </div>

                    {/* Payment calculations */}
                    {account.balance > 0 && account.apr > 0 && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.5rem', fontWeight: '500' }}>Payment Analysis</div>
                        <div style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: '600', marginBottom: '0.25rem' }}>
                          Min payment (~2%): ${(account.balance * 0.02).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#f87171' }}>
                          Payoff time (min payments): ~{Math.ceil(Math.log(1 + (account.balance * (account.apr / 100 / 12)) / (account.balance * 0.02)) / Math.log(1 + (account.apr / 100 / 12)))} months
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          }

          // Regular debit account display for desktop
          return (
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
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button
                    onClick={() => setEditingAccount(account)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleAccountIgnored(account)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: account.ignored ? '#22c55e' : '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    {account.ignored ? 'Show' : 'Hide'}
                  </button>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Delete
                  </button>
                </div>
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
          );
        })}
      </div>
      
    </div>
  );
}
