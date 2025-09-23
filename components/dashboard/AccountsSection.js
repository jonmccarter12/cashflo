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
          // Credit card specific calculations
          const isCredit = account.accountType === 'credit';
          const balance = Number(account.balance) || 0;
          const creditLimit = Number(account.creditLimit) || 0;
          const apr = Number(account.apr) || 0;
          const utilization = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;
          const minPayment = balance * 0.02;
          const monthlyInterest = balance * (apr / 100 / 12);

          // Payoff calculation (minimum payments only)
          let payoffMonths = 0;
          if (balance > 0 && apr > 0 && minPayment > monthlyInterest) {
            const monthlyRate = apr / 100 / 12;
            payoffMonths = Math.ceil(-Math.log(1 - (balance * monthlyRate) / minPayment) / Math.log(1 + monthlyRate));
          }

          return (
            <div key={account.id} style={{
              padding: isCredit ? '0' : '0.75rem',
              background: isCredit ? 'transparent' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
              border: isCredit ? 'none' : '1px solid #e2e8f0',
              boxShadow: isCredit ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease'
            }}>
              {isCredit ? (
                // Enhanced Credit Card Design
                <div style={{
                  background: `linear-gradient(135deg, ${
                    utilization >= 90 ? '#dc2626, #ef4444' :
                    utilization >= 70 ? '#ea580c, #f97316' :
                    utilization >= 50 ? '#d97706, #f59e0b' :
                    '#1e40af, #3b82f6'
                  })`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  color: 'white',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden'
                }}>
                  {/* Card Pattern Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    transform: 'translate(30px, -30px)'
                  }} />

                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
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
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: '2px solid rgba(255, 255, 255, 0.5)',
                            borderRadius: '0.375rem',
                            padding: '0.25rem 0.5rem',
                            color: 'white',
                            width: '140px'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            setEditingAccountName(account.id);
                            setTempAccountName(account.name);
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          {account.name}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem', marginLeft: '0.5rem' }}>
                        {account.type}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>APR</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{apr.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Balance and Limit */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>Current Balance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>$</span>
                      <input
                        type="number"
                        defaultValue={balance}
                        onBlur={(e) => {
                          if (e.target.value !== balance.toString()) {
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
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          background: 'transparent',
                          border: 'none',
                          color: 'white',
                          outline: 'none',
                          width: '120px'
                        }}
                      />
                      <div style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: 'auto' }}>
                        of ${fmt(creditLimit)} limit
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>
                        <span>Utilization</span>
                        <span>{utilization.toFixed(1)}%</span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(utilization, 100)}%`,
                          background: utilization >= 90 ? '#fef2f2' : utilization >= 70 ? '#fffbeb' : '#f0fdf4',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Financial Insights */}
                  {balance > 0 && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                        <div>
                          <div style={{ opacity: 0.8 }}>Min Payment</div>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>${minPayment.toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ opacity: 0.8 }}>Monthly Interest</div>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>${monthlyInterest.toFixed(2)}</div>
                        </div>
                        {payoffMonths > 0 && payoffMonths < 600 && (
                          <>
                            <div>
                              <div style={{ opacity: 0.8 }}>Payoff Time</div>
                              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                                {payoffMonths > 12 ? `${Math.floor(payoffMonths/12)}y ${payoffMonths%12}m` : `${payoffMonths}m`}
                              </div>
                            </div>
                            <div>
                              <div style={{ opacity: 0.8 }}>Total Interest</div>
                              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                                ${((minPayment * payoffMonths) - balance).toFixed(0)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setEditingAccount(account)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        flex: 1,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(239, 68, 68, 0.6)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        flex: 1,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(220, 38, 38, 0.9)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.8)'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                // Regular Debit Account Design (unchanged)
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredAccounts.map(account => {
          // Credit card specific calculations
          const isCredit = account.accountType === 'credit';
          const balance = Number(account.balance) || 0;
          const creditLimit = Number(account.creditLimit) || 0;
          const apr = Number(account.apr) || 0;
          const utilization = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;
          const minPayment = balance * 0.02;
          const monthlyInterest = balance * (apr / 100 / 12);

          // Payoff calculation (minimum payments only)
          let payoffMonths = 0;
          if (balance > 0 && apr > 0 && minPayment > monthlyInterest) {
            const monthlyRate = apr / 100 / 12;
            payoffMonths = Math.ceil(-Math.log(1 - (balance * monthlyRate) / minPayment) / Math.log(1 + monthlyRate));
          }

          return (
            <div key={account.id} style={{
              padding: isCredit ? '0' : '0.75rem',
              background: isCredit ? 'transparent' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: isCredit ? '0' : '0.75rem',
              border: isCredit ? 'none' : '1px solid #e2e8f0',
              boxShadow: isCredit ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.06)',
              transition: 'all 0.2s ease'
            }}>
              {isCredit ? (
                // Enhanced Credit Card Design for Desktop
                <div style={{
                  background: `linear-gradient(135deg, ${
                    utilization >= 90 ? '#dc2626, #ef4444' :
                    utilization >= 70 ? '#ea580c, #f97316' :
                    utilization >= 50 ? '#d97706, #f59e0b' :
                    '#1e40af, #3b82f6'
                  })`,
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  color: 'white',
                  position: 'relative',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                  minHeight: '200px'
                }}>
                  {/* Card Pattern Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '150px',
                    height: '150px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    transform: 'translate(50px, -50px)'
                  }} />

                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
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
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: '2px solid rgba(255, 255, 255, 0.5)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            color: 'white',
                            width: '250px'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            transition: 'all 0.2s ease',
                            display: 'inline-block'
                          }}
                          onClick={() => {
                            setEditingAccountName(account.id);
                            setTempAccountName(account.name);
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          {account.name}
                        </div>
                      )}
                      <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem', marginLeft: '0.75rem' }}>
                        {account.type}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>APR</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{apr.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Balance and Limit */}
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Current Balance</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1rem', opacity: 0.9 }}>$</span>
                        <input
                          type="number"
                          defaultValue={balance}
                          onBlur={(e) => {
                            if (e.target.value !== balance.toString()) {
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
                            fontSize: '1.75rem',
                            fontWeight: '700',
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            outline: 'none',
                            width: '150px'
                          }}
                        />
                        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginLeft: 'auto' }}>
                          of ${fmt(creditLimit)} limit
                        </div>
                      </div>

                      {/* Utilization Bar */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                          <span>Utilization</span>
                          <span>{utilization.toFixed(1)}%</span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(utilization, 100)}%`,
                            background: utilization >= 90 ? '#fef2f2' : utilization >= 70 ? '#fffbeb' : '#f0fdf4',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Financial Insights */}
                    {balance > 0 && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        minWidth: '300px'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                          <div>
                            <div style={{ opacity: 0.8, marginBottom: '0.25rem' }}>Min Payment</div>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>${minPayment.toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ opacity: 0.8, marginBottom: '0.25rem' }}>Monthly Interest</div>
                            <div style={{ fontWeight: '700', fontSize: '1rem' }}>${monthlyInterest.toFixed(2)}</div>
                          </div>
                          {payoffMonths > 0 && payoffMonths < 600 && (
                            <>
                              <div>
                                <div style={{ opacity: 0.8, marginBottom: '0.25rem' }}>Payoff Time</div>
                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                                  {payoffMonths > 12 ? `${Math.floor(payoffMonths/12)}y ${payoffMonths%12}m` : `${payoffMonths}m`}
                                </div>
                              </div>
                              <div>
                                <div style={{ opacity: 0.8, marginBottom: '0.25rem' }}>Total Interest</div>
                                <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                                  ${((minPayment * payoffMonths) - balance).toFixed(0)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                    <button
                      onClick={() => setEditingAccount(account)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                    >
                      Edit Account
                    </button>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: 'white',
                        border: '1px solid rgba(239, 68, 68, 0.6)',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(220, 38, 38, 0.9)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.8)'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                // Regular Debit Account Design
                <>
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
                          padding: '0.5rem 0.75rem',
                          background: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteAccount(account.id)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600'
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
                </>
              )}
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
