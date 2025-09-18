import React from 'react';
import { fmt, getNextIncomeOccurrence, logTransaction } from '../../lib/utils';
import { notify } from '../Notify';

export default function IncomeSection({
  isMobile,
  accounts,
  recurringIncome,
  upcomingCredits,
  incomeHistory,
  showIncomeHistory,
  setShowIncomeHistory,
  setShowAddIncome,
  toggleIncomeReceived,
  deleteIncome,
  setShowAddCredit,
  receiveCredit,
  toggleCreditGuaranteed,
  deleteCredit,
  supabase,
  user,
}) {
  if (isMobile) {
    return (
      <>
        {/* Recurring Income Section */}
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{showIncomeHistory ? 'Income History' : 'Recurring Income'}</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => setShowIncomeHistory(!showIncomeHistory)}
                style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                {showIncomeHistory ? 'Show Income' : 'Show History'}
              </button>
              {!showIncomeHistory && (
                <button
                  onClick={() => setShowAddIncome(true)}
                  style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  + Income
                </button>
              )}
            </div>
          </div>

          {showIncomeHistory ? (
            // Income History View
            <>
              {incomeHistory.length > 0 ? (
                incomeHistory.slice(0, 20).map((entry, index) => {
                  const account = accounts.find(a => a.id === entry.accountId);
                  return (
                    <div key={entry.id || index} style={{
                      background: '#f0fdf4',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '2px solid #16a34a',
                      marginBottom: '0.375rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{entry.source}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                          +{fmt(entry.amount)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                        {new Date(entry.date).toLocaleDateString()} • {account?.name || 'Unknown Account'} • {entry.type === 'recurring' ? 'Recurring Income' : 'Credit'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                  No income history yet. Mark income as received to track it here!
                </div>
              )}
            </>
          ) : (
            // Recurring Income View
            <>
              {recurringIncome && recurringIncome
                .filter(inc => !inc.ignored)
                .map(income => {
                  const account = accounts.find(a => a.id === income.accountId);
                  const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
                  const isReceived = income.receivedMonths?.includes(currentMonth);
                  const nextDate = getNextIncomeOccurrence(income);

                  return (
                    <div key={income.id} style={{
                      background: '#f0fdf4',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: `2px solid ${isReceived ? '#16a34a' : '#bbf7d0'}`,
                      marginBottom: '0.375rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{income.name}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                          +{fmt(income.amount)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                        {income.frequency} • Next: {nextDate.toLocaleDateString()} • {account?.name}
                        {isReceived && <span style={{ color: '#16a34a', fontWeight: '600' }}> • RECEIVED THIS MONTH</span>}
                        {income.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{income.notes}</div>}
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => toggleIncomeReceived(income)}
                          style={{ padding: '0.125rem 0.25rem', background: isReceived ? '#f59e0b' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          {isReceived ? 'Mark Not Received' : 'Mark Received'}
                        </button>
                        <button
                          onClick={() => deleteIncome(income.id)}
                          style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

              {(!recurringIncome || recurringIncome.filter(inc => !inc.ignored).length === 0) && (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                  No recurring income. Add your salary or regular income!
                </div>
              )}
            </>
          )}
        </div>

        {/* Upcoming Credits Section */}
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Upcoming Credits</h3>
            <button
              onClick={() => setShowAddCredit(true)}
              style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              + Credit
            </button>
          </div>

          {(() => {
            console.log('IncomeSection - upcomingCredits:', upcomingCredits);
            const filtered = upcomingCredits.filter(c => !c.ignored);
            console.log('IncomeSection - filtered credits:', filtered);
            return filtered;
          })()
            .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
            .map(credit => {
              const account = accounts.find(a => a.id === credit.accountId);
              const isOverdue = new Date(credit.expectedDate) < new Date();

              return (
                <div key={credit.id} style={{
                  background: credit.guaranteed ? '#f0fdf4' : '#f8fafc',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${credit.guaranteed ? '#16a34a' : '#e2e8f0'}`,
                  marginBottom: '0.375rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{credit.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                      +{fmt(credit.amount)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                    {isOverdue ? '⚠️ OVERDUE' : ''} Expected: {new Date(credit.expectedDate).toLocaleDateString()} • {account?.name}
                    {credit.guaranteed && <span style={{ color: '#16a34a', fontWeight: '600' }}> • GUARANTEED</span>}
                    {credit.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{credit.notes}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <select
                      value={credit.accountId}
                      onChange={async (e) => {
                        const transaction = await logTransaction(
                          supabase,
                          user.id,
                          'credit_modification',
                          credit.id,
                          { changes: { accountId: e.target.value } },
                          `Changed account for credit "${credit.name}"`
                        );
                        if (!transaction) notify('Failed to update account for credit.', 'error');
                      }}
                      style={{ fontSize: '0.625rem', padding: '0.125rem 0.25rem', border: '1px solid #d1d5db', borderRadius: '0.125rem' }}
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button
                      onClick={() => receiveCredit(credit.id)}
                      style={{ padding: '0.125rem 0.25rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Receive
                    </button>
                    <button
                      onClick={() => toggleCreditGuaranteed(credit.id)}
                      style={{ padding: '0.125rem 0.25rem', background: credit.guaranteed ? '#f59e0b' : '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      {credit.guaranteed ? 'Unguarantee' : 'Guarantee'}
                    </button>
                    <button
                      onClick={() => deleteCredit(credit.id)}
                      style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

          {upcomingCredits.filter(c => !c.ignored).length === 0 && (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
              No upcoming credits. Add one to track expected income!
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{showIncomeHistory ? 'Income History' : 'Income Sources'}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowIncomeHistory(!showIncomeHistory)}
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
          >
            {showIncomeHistory ? 'Show Income' : 'Show History'}
          </button>
          {!showIncomeHistory && (
            <>
              <button
                onClick={() => setShowAddIncome(true)}
                style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                + Recurring
              </button>
              <button
                onClick={() => setShowAddCredit(true)}
                style={{ padding: '0.5rem 1rem', background: '#0369a1', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                + Credit
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
        {showIncomeHistory ? (
          // Income History View
          incomeHistory.length > 0 ? (
            incomeHistory.slice(0, 20).map((entry, index) => {
              const account = accounts.find(a => a.id === entry.accountId);
              return (
                <div key={entry.id || index} style={{
                  background: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '2px solid #16a34a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '1rem' }}>{entry.source}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(entry.date).toLocaleDateString()} • {account?.name || 'Unknown Account'} • {entry.type === 'recurring' ? 'Recurring Income' : 'Credit'}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                      +{fmt(entry.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
              No income history yet. Mark income as received to track it here!
            </div>
          )
        ) : (
          // Recurring Income and Credits View
          <>
            {/* Recurring Income */}
            {recurringIncome && recurringIncome
              .filter(inc => !inc.ignored)
              .map(income => {
                const account = accounts.find(a => a.id === income.accountId);
                const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
                const isReceived = income.receivedMonths?.includes(currentMonth);
                const nextDate = getNextIncomeOccurrence(income);

                return (
                  <div key={income.id} style={{
                    background: '#f0fdf4',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${isReceived ? '#16a34a' : '#bbf7d0'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>🔄 {income.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {income.frequency} • Next: {nextDate.toLocaleDateString()}
                          {isReceived && <span style={{ color: '#16a34a', fontWeight: '600' }}> • RECEIVED</span>}
                        </div>
                        {income.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{income.notes}</div>}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                        +{fmt(income.amount)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => toggleIncomeReceived(income)}
                        style={{ padding: '0.25rem 0.5rem', background: isReceived ? '#f59e0b' : '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {isReceived ? 'Not Received' : 'Mark Received'}
                      </button>
                      <button
                        onClick={() => deleteIncome(income.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Upcoming Credits */}
            {upcomingCredits
              .filter(c => !c.ignored)
              .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
              .map(credit => {
                const account = accounts.find(a => a.id === credit.accountId);
                const isOverdue = new Date(credit.expectedDate) < new Date();

                return (
                  <div key={credit.id} style={{
                    background: credit.guaranteed ? '#f0fdf4' : '#f8fafc',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${credit.guaranteed ? '#16a34a' : '#e2e8f0'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>💳 {credit.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {new Date(credit.expectedDate).toLocaleDateString()}
                          {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                          {credit.guaranteed && <span style={{ color: '#16a34a', fontWeight: '600' }}> • GUARANTEED</span>}
                        </div>
                        {credit.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{credit.notes}</div>}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                        +{fmt(credit.amount)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <select
                        value={credit.accountId}
                        onChange={async (e) => {
                          const transaction = await logTransaction(
                            supabase,
                            user.id,
                            'credit_modification',
                            credit.id,
                            { changes: { accountId: e.target.value } },
                            `Changed account for credit "${credit.name}"`
                          );
                          if (!transaction) notify('Failed to update account for credit.', 'error');
                        }}
                        style={{ flex: 1, padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                      >
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <button
                        onClick={() => receiveCredit(credit.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Receive
                      </button>
                      <button
                        onClick={() => toggleCreditGuaranteed(credit.id)}
                        style={{ padding: '0.25rem 0.5rem', background: credit.guaranteed ? '#f59e0b' : '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {credit.guaranteed ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        onClick={() => deleteCredit(credit.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

            {(!recurringIncome || recurringIncome.filter(inc => !inc.ignored).length === 0) && upcomingCredits.filter(c => !c.ignored).length === 0 && (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                No income sources. Add recurring income or expected credits!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
