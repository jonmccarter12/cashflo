import React from 'react';
import { fmt, yyyyMm, getEffectiveDueDate } from '../../lib/utils';

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
  user,
  bills = [],
  oneTimeCosts = []
}) {
  const selectAllOnFocus = (e) => e.target.select();
  const [editingAccountName, setEditingAccountName] = React.useState(null);
  const [tempAccountName, setTempAccountName] = React.useState('');

  // Calculate upcoming expenses for the next 7 days for a specific account
  const getUpcomingExpenses = (accountId) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    let totalUpcoming = 0;

    // Check bills due in the next 7 days for this account
    bills.forEach(bill => {
      if (bill.accountId === accountId && !bill.ignored) {
        const currentMonth = yyyyMm();
        const isPaid = bill.paidMonths.includes(currentMonth);
        const dueDate = getEffectiveDueDate(bill, today);
        if (!isPaid) {
          // Include overdue bills (dueDate < today) AND bills due in the next 7 days
          if (dueDate <= nextWeek) {
            totalUpcoming += bill.amount || 0;
          }
        }
      }
    });

    // Check one-time costs due in the next 7 days for this account
    oneTimeCosts.forEach(otc => {
      if (otc.accountId === accountId && !otc.paid && !otc.ignored) {
        const dueDate = new Date(otc.dueDate);
        if (dueDate >= today && dueDate <= nextWeek) {
          totalUpcoming += otc.amount || 0;
        }
      }
    });

    return totalUpcoming;
  };

  // Determine account health color based on balance vs upcoming expenses
  const getAccountHealthColor = (balance, upcomingExpenses) => {
    const ratio = balance / (upcomingExpenses || 1); // Avoid division by zero

    if (upcomingExpenses === 0) {
      // No upcoming expenses - base color on balance amount
      return balance >= 100 ? '#22c55e' : balance >= 50 ? '#f59e0b' : '#ef4444';
    }

    if (ratio >= 2) return '#22c55e';      // Green: 2x+ coverage
    if (ratio >= 1.2) return '#f59e0b';    // Yellow: 1.2x+ coverage
    return '#ef4444';                      // Red: insufficient coverage
  };

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
        padding: '0.25rem',
        borderRadius: '0.375rem',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        marginBottom: '0.5rem',
        border: '1px solid #e5e7eb',
        width: '100%',
        minWidth: 0,
        overflowX: 'hidden',
        maxWidth: '100%',
        margin: '0 0 0.5rem 0',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1f2937' }}>Accounts</h3>
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
                borderRadius: '0.75rem',
                padding: isMobile ? '0.5rem' : '0.75rem',
                marginBottom: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', width: '100%', minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
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
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.125rem', fontWeight: '500' }}>
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
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>Current Balance</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: 'white' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={account.balance.toFixed(2)}
                      onBlur={(e) => {
                        const newValue = parseFloat(e.target.value) || 0;
                        if (newValue !== account.balance) {
                          updateAccountBalance(account.id, newValue.toString());
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
                        outline: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield'
                      }}
                    />
                  </div>
                </div>


                {/* Credit utilization bar */}
                {account.creditLimit > 0 && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '500' }}>Utilization</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: utilizationColor }}>
                        {utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '0.375rem',
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
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '0.375rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.375rem', borderRadius: '0.375rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>APR</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fbbf24' }}>{account.apr || 0}%</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.375rem', borderRadius: '0.375rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>Available</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#34d399' }}>{fmt(availableCredit)}</div>
                  </div>
                </div>

                {/* Smart Payment Plan for True Mobile */}
                {account.balance > 0 && account.apr > 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    marginTop: '0.75rem'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'white',
                      marginBottom: '0.75rem',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      💡 Smart Payment Options
                    </div>

                    {/* 3-column grid for all payment options */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '0.375rem',
                      marginBottom: '0.75rem'
                    }}>
                      {/* Minimum Payment */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '0.375rem',
                        borderRadius: '0.375rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '0.5rem',
                          color: '#fbbf24',
                          fontWeight: '600',
                          marginBottom: '0.25rem'
                        }}>
                          Minimum
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'white',
                          fontWeight: '700'
                        }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0';
                            const minPayment = Math.max(account.balance * 0.02, 25);
                            return minPayment.toFixed(0);
                          })()}/mo
                        </div>
                        <div style={{
                          fontSize: '0.5rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginTop: '0.125rem'
                        }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0 mo, $0';

                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const minPayment = Math.max(balance * 0.02, 25);

                            // Simulate month-by-month to calculate actual interest
                            let remainingBalance = balance;
                            let totalInterest = 0;
                            let months = 0;
                            const maxMonths = 360; // 30 years max

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              totalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - minPayment;
                              months++;

                              if (minPayment >= remainingBalance + interestThisMonth) {
                                // Last payment
                                break;
                              }
                            }

                            return `${months} mo, $${totalInterest.toFixed(0)}`;
                          })()} interest
                        </div>
                      </div>

                      {/* Optimized Payment */}
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        padding: '0.375rem',
                        borderRadius: '0.375rem',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '0.5rem',
                          color: '#22c55e',
                          fontWeight: '600',
                          marginBottom: '0.25rem'
                        }}>
                          Optimized
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'white',
                          fontWeight: '700'
                        }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0';
                            const minPayment = Math.max(account.balance * 0.02, 25);
                            const optimizedPayment = Math.max(minPayment * 2, account.balance * 0.05, 50);
                            return optimizedPayment.toFixed(0);
                          })()}/mo
                        </div>
                        <div style={{
                          fontSize: '0.5rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginTop: '0.125rem'
                        }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0 mo, $0';

                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const minPayment = Math.max(balance * 0.02, 25);
                            const optimizedPayment = Math.max(minPayment * 2, balance * 0.05, 50);

                            // Simulate month-by-month to calculate actual interest
                            let remainingBalance = balance;
                            let totalInterest = 0;
                            let months = 0;
                            const maxMonths = 360; // 30 years max

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              totalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - optimizedPayment;
                              months++;

                              if (optimizedPayment >= remainingBalance + interestThisMonth) {
                                // Last payment
                                break;
                              }
                            }

                            return `${months} mo, $${totalInterest.toFixed(0)}`;
                          })()} interest
                        </div>
                      </div>

                      {/* Aggressive Payment */}
                      <div style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        padding: '0.375rem',
                        borderRadius: '0.375rem',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '0.5rem',
                          color: '#8b5cf6',
                          fontWeight: '600',
                          marginBottom: '0.25rem'
                        }}>
                          Aggressive
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'white',
                          fontWeight: '700'
                        }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0';
                            const aggressivePayment = Math.max(account.balance * 0.1, 100);
                            return aggressivePayment.toFixed(0);
                          })()}/mo
                        </div>
                        <div style={{
                          fontSize: '0.5rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginTop: '0.125rem'
                        }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0 mo, $0';

                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const aggressivePayment = Math.max(balance * 0.1, 100);

                            // Simulate month-by-month to calculate actual interest
                            let remainingBalance = balance;
                            let totalInterest = 0;
                            let months = 0;
                            const maxMonths = 360; // 30 years max

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              totalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - aggressivePayment;
                              months++;

                              if (aggressivePayment >= remainingBalance + interestThisMonth) {
                                // Last payment
                                break;
                              }
                            }

                            return `${months} mo, $${totalInterest.toFixed(0)}`;
                          })()} interest
                        </div>
                      </div>
                    </div>

                    {/* Savings Highlight - Full Width */}
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#22c55e',
                        fontWeight: '700'
                      }}>
                        💰 Save ${(() => {
                          // Robust savings calculation with proper simulation
                          if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) {
                            return '0';
                          }

                          try {
                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const minPayment = Math.max(balance * 0.02, 25);
                            const optimizedPayment = Math.max(minPayment * 2, balance * 0.05, 50);

                            // Calculate minimum payment total interest
                            let remainingBalance = balance;
                            let minTotalInterest = 0;
                            let months = 0;
                            const maxMonths = 360;

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              minTotalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - minPayment;
                              months++;

                              if (minPayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            // Calculate optimized payment total interest
                            remainingBalance = balance;
                            let optimizedTotalInterest = 0;
                            months = 0;

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              optimizedTotalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - optimizedPayment;
                              months++;

                              if (optimizedPayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            // Savings is the difference in interest paid
                            const savings = Math.max(0, minTotalInterest - optimizedTotalInterest);
                            return savings.toFixed(0);
                          } catch (error) {
                            console.warn('Savings calculation error:', error);
                            return '0';
                          }
                        })()} in interest
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          }

          // Regular debit account display for mobile
          const upcomingExpenses = getUpcomingExpenses(account.id);
          const healthColor = getAccountHealthColor(account.balance, upcomingExpenses);

          return (
            <div key={account.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
              border: `2px solid ${healthColor}20`,
              boxShadow: `0 1px 3px rgba(0, 0, 0, 0.05), 0 0 0 1px ${healthColor}10`,
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
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'white',
                  padding: '0.375rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${healthColor}`,
                  boxShadow: `0 1px 2px rgba(0, 0, 0, 0.05), 0 0 8px ${healthColor}20`,
                  transition: 'all 0.2s ease'
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: healthColor }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={account.balance.toFixed(2)}
                    onBlur={(e) => {
                      const newValue = parseFloat(e.target.value) || 0;
                      if (newValue !== account.balance) {
                        updateAccountBalance(account.id, newValue.toString());
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
                      fontWeight: '700',
                      background: 'transparent',
                      color: healthColor,
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto', minWidth: 'max-content' }}>
                  {upcomingExpenses > 0 && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      background: `${healthColor}15`,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: `1px solid ${healthColor}30`,
                      textAlign: 'center'
                    }}>
                      {fmt(upcomingExpenses)} due
                    </div>
                  )}
                  {upcomingExpenses > 0 && account.balance < upcomingExpenses && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#dc2626',
                      background: '#fee2e2',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #fecaca',
                      textAlign: 'center'
                    }}>
                      Short {fmt(upcomingExpenses - account.balance)}
                    </div>
                  )}
                  {upcomingExpenses > 0 && account.balance >= upcomingExpenses && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#059669',
                      background: '#d1fae5',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #a7f3d0',
                      textAlign: 'center'
                    }}>
                      +{fmt(account.balance - upcomingExpenses)} after
                    </div>
                  )}
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
                borderRadius: '0.75rem',
                padding: '1rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: '500' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'start' }}>

                  {/* Balance section */}
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: '500' }}>Current Balance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>$</span>
                      <input
                        type="number"
                        value={account.balance}
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
                          outline: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'textfield'
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
                        Available: <span style={{ color: '#34d399', fontWeight: '600' }}>{fmt(availableCredit)}</span>
                      </div>
                    </div>
                  )}

                  {/* Credit info and payment calculations */}
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>APR</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#fbbf24' }}>{account.apr || 0}%</div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.125rem', fontWeight: '500' }}>Credit Limit</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#34d399' }}>{fmt(account.creditLimit || 0)}</div>
                      </div>
                    </div>

                    {/* Smart Payment Analysis */}
                  </div>

                </div>

                {/* Smart Payment Plan - Full Width Below Main Grid */}
                <div style={{
                  marginTop: '1rem',
                  width: '100%'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #374151 100%)',
                    border: '1px solid #475569',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem', textAlign: 'center' }}>
                      💡 Smart Payment Options
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      {/* Minimum Payment Option */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '600', marginBottom: '0.25rem' }}>Minimum Payment</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0';
                            const minPayment = Math.max(account.balance * 0.02, 25);
                            return minPayment.toFixed(0);
                          })()}/month
                        </div>
                        <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0 months, $0';

                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const minPayment = Math.max(balance * 0.02, 25);

                            // Simulate month-by-month to calculate actual interest
                            let remainingBalance = balance;
                            let totalInterest = 0;
                            let months = 0;
                            const maxMonths = 360; // 30 years max

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              totalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - minPayment;
                              months++;

                              if (minPayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            return `${months} months, $${totalInterest.toFixed(0)}`;
                          })()} total interest
                        </div>
                      </div>

                      {/* Optimized Payment Option */}
                      <div style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600', marginBottom: '0.25rem' }}>Optimized Plan</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0';
                            const minPayment = Math.max(account.balance * 0.02, 25);
                            const optimizedPayment = Math.max(minPayment * 2, account.balance * 0.05, 50);
                            return optimizedPayment.toFixed(0);
                          })()}/month
                        </div>
                        <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0 months, $0';

                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const minPayment = Math.max(balance * 0.02, 25);
                            const optimizedPayment = Math.max(minPayment * 2, balance * 0.05, 50);

                            // Simulate month-by-month to calculate actual interest
                            let remainingBalance = balance;
                            let totalInterest = 0;
                            let months = 0;
                            const maxMonths = 360; // 30 years max

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              totalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - optimizedPayment;
                              months++;

                              if (optimizedPayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            return `${months} months, $${totalInterest.toFixed(0)}`;
                          })()} total interest
                        </div>
                      </div>

                      {/* Aggressive Payment Option */}
                      <div style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: '600', marginBottom: '0.25rem' }}>Aggressive Plan</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0';
                            const aggressivePayment = Math.max(account.balance * 0.1, 100);
                            return aggressivePayment.toFixed(0);
                          })()}/month
                        </div>
                        <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>
                          ${(() => {
                            if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) return '0 months, $0';

                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const aggressivePayment = Math.max(balance * 0.1, 100);

                            // Simulate month-by-month to calculate actual interest
                            let remainingBalance = balance;
                            let totalInterest = 0;
                            let months = 0;
                            const maxMonths = 360; // 30 years max

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              totalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - aggressivePayment;
                              months++;

                              if (aggressivePayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            return `${months} months, $${totalInterest.toFixed(0)}`;
                          })()} total interest
                        </div>
                      </div>
                    </div>

                    {/* Savings Highlight */}
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      textAlign: 'center',
                      marginTop: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#22c55e' }}>
                        💰 Save ${(() => {
                          // Robust savings calculation with proper simulation
                          if (!account.apr || account.apr <= 0 || !account.balance || account.balance <= 0) {
                            return '0';
                          }

                          try {
                            const balance = Number(account.balance);
                            const monthlyRate = Number(account.apr) / 100 / 12;
                            const minPayment = Math.max(balance * 0.02, 25);
                            const optimizedPayment = Math.max(minPayment * 2, balance * 0.05, 50);

                            // Calculate minimum payment total interest
                            let remainingBalance = balance;
                            let minTotalInterest = 0;
                            let months = 0;
                            const maxMonths = 360;

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              minTotalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - minPayment;
                              months++;

                              if (minPayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            // Calculate optimized payment total interest
                            remainingBalance = balance;
                            let optimizedTotalInterest = 0;
                            months = 0;

                            while (remainingBalance > 0.01 && months < maxMonths) {
                              const interestThisMonth = remainingBalance * monthlyRate;
                              optimizedTotalInterest += interestThisMonth;
                              remainingBalance = remainingBalance + interestThisMonth - optimizedPayment;
                              months++;

                              if (optimizedPayment >= remainingBalance + interestThisMonth) {
                                break;
                              }
                            }

                            // Savings is the difference in interest paid
                            const savings = Math.max(0, minTotalInterest - optimizedTotalInterest);
                            return savings.toFixed(0);
                          } catch (error) {
                            console.warn('Savings calculation error:', error);
                            return '0';
                          }
                        })()} with optimized payments vs minimum payments
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Regular debit account display for desktop
          const upcomingExpenses = getUpcomingExpenses(account.id);
          const healthColor = getAccountHealthColor(account.balance, upcomingExpenses);

          return (
            <div key={account.id} style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: `2px solid ${healthColor}20`,
              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px ${healthColor}10`,
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginLeft: '0.75rem', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'white',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${healthColor}`,
                  boxShadow: `0 1px 3px rgba(0, 0, 0, 0.05), 0 0 12px ${healthColor}20`,
                  transition: 'all 0.2s ease'
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: healthColor }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={account.balance.toFixed(2)}
                    onBlur={(e) => {
                      const newValue = parseFloat(e.target.value) || 0;
                      if (newValue !== account.balance) {
                        updateAccountBalance(account.id, newValue.toString());
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
                      color: healthColor,
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto', minWidth: 'max-content' }}>
                  {upcomingExpenses > 0 && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#64748b',
                      background: `${healthColor}15`,
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: `1px solid ${healthColor}30`,
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      {fmt(upcomingExpenses)} due
                    </div>
                  )}
                  {upcomingExpenses > 0 && account.balance < upcomingExpenses && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#dc2626',
                      background: '#fee2e2',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #fecaca',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      Short {fmt(upcomingExpenses - account.balance)}
                    </div>
                  )}
                  {upcomingExpenses > 0 && account.balance >= upcomingExpenses && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#059669',
                      background: '#d1fae5',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #a7f3d0',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      +{fmt(account.balance - upcomingExpenses)} remaining
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}
