import React from 'react';
import { fmt } from '../../lib/utils';

export default function AccountsSection({
  isMobile,
  accounts,
  setShowAddAccount,
  deleteAccount,
  updateAccountBalance,
  currentLiquidWithGuaranteed
}) {
  const selectAllOnFocus = (e) => e.target.select();

  if (isMobile) {
    return (
      <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Accounts</h3>
          <button 
            onClick={() => setShowAddAccount(true)}
            style={{ padding: '0.25rem 0.5rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
          >
            + Account
          </button>
        </div>
        
        {accounts.map(account => (
          <div key={account.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '0.5rem', 
            background: '#f9fafb', 
            borderRadius: '0.25rem',
            marginBottom: '0.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{account.name}</div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>{account.type}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                value={account.balance}
                onChange={(e) => updateAccountBalance(account.id, e.target.value)}
                onFocus={selectAllOnFocus}
                style={{ 
                  width: '80px', 
                  padding: '0.125rem 0.25rem', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  textAlign: 'right'
                }}
              />
              <button
                onClick={() => deleteAccount(account.id)}
                style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Accounts</h3>
        <button 
          onClick={() => setShowAddAccount(true)}
          style={{ padding: '0.5rem 1rem', background: '#1f2937', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          + Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {accounts.map(account => (
          <div key={account.id} style={{ 
            background: '#f9fafb', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '1rem' }}>{account.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{account.type}</div>
              </div>
              <button
                onClick={() => deleteAccount(account.id)}
                style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                🗑️
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>$</span>
              <input
                type="number"
                value={account.balance}
                onChange={(e) => updateAccountBalance(account.id, e.target.value)}
                onFocus={selectAllOnFocus}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  textAlign: 'right',
                  fontWeight: '600'
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
        <div style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: '500' }}>Total Balance</div>
        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0369a1' }}>{fmt(currentLiquidWithGuaranteed)}</div>
      </div>
    </div>
  );
}
