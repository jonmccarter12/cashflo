import React, { useState, useMemo } from 'react';
import { fmt } from '../lib/utils';
import { notify } from './Notify';

export default function TransactionHistory({
  transactions = [],
  accounts = [],
  categories = [],
  isMobile = false,
  onExport
}) {
  const [filter, setFilter] = useState({
    search: '',
    type: 'all',
    category: 'all',
    account: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 20 : 50);

  // Advanced filtering logic
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // First, filter to only financial transactions (credits/debits)
    filtered = filtered.filter(tx => {
      // Credits: money coming in
      const isCredit = tx.type === 'credit_received' ||
                      tx.type === 'recurring_income_received' ||
                      tx.type === 'account_balance_adjustment';

      // Debits: money going out
      const isDebit = tx.type === 'bill_payment' ||
                     tx.type === 'one_time_cost_payment';

      return isCredit || isDebit;
    });

    // Text search
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(tx =>
        (tx.description || '').toLowerCase().includes(searchLower) ||
        (tx.type || '').toLowerCase().includes(searchLower) ||
        (tx.item_id || '').toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(tx => tx.type === filter.type);
    }

    // Category filter (for bills and one-time costs)
    if (filter.category !== 'all') {
      filtered = filtered.filter(tx => {
        if (tx.payload?.category) {
          return tx.payload.category === filter.category;
        }
        if (tx.payload?.changes?.category) {
          return tx.payload.changes.category === filter.category;
        }
        return true;
      });
    }

    // Account filter
    if (filter.account !== 'all') {
      filtered = filtered.filter(tx => {
        if (tx.payload?.accountId) {
          return tx.payload.accountId === filter.account;
        }
        if (tx.payload?.changes?.accountId) {
          return tx.payload.changes.accountId === filter.account;
        }
        return true;
      });
    }

    // Date range filter
    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom);
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= fromDate);
    }
    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include full day
      filtered = filtered.filter(tx => new Date(tx.timestamp) <= toDate);
    }

    // Amount range filter
    if (filter.amountMin) {
      const minAmount = parseFloat(filter.amountMin);
      filtered = filtered.filter(tx => {
        const amount = tx.payload?.amount || tx.payload?.new_balance || 0;
        return amount >= minAmount;
      });
    }
    if (filter.amountMax) {
      const maxAmount = parseFloat(filter.amountMax);
      filtered = filtered.filter(tx => {
        const amount = tx.payload?.amount || tx.payload?.new_balance || 0;
        return amount <= maxAmount;
      });
    }

    return filtered;
  }, [transactions, filter]);

  // Sorting logic
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle nested values
      if (sortConfig.key === 'amount') {
        aVal = a.payload?.amount || a.payload?.new_balance || 0;
        bVal = b.payload?.amount || b.payload?.new_balance || 0;
      }

      // Convert to comparable values
      if (sortConfig.key === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTransactions, sortConfig]);

  // Pagination
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTransactions.length / pageSize);

  // Get unique financial transaction types for filter
  const transactionTypes = useMemo(() => {
    const financialTypes = transactions.filter(tx => {
      // Credits: money coming in
      const isCredit = tx.type === 'credit_received' ||
                      tx.type === 'recurring_income_received' ||
                      tx.type === 'account_balance_adjustment';

      // Debits: money going out
      const isDebit = tx.type === 'bill_payment' ||
                     tx.type === 'one_time_cost_payment';

      return isCredit || isDebit;
    });

    const types = new Set(financialTypes.map(tx => tx.type));
    return Array.from(types).sort();
  }, [transactions]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Enhanced CSV export with all details
  const handleExport = () => {
    if (sortedTransactions.length === 0) {
      notify('No transactions to export.', 'warning');
      return;
    }

    const headers = [
      'ID',
      'Timestamp',
      'Date',
      'Type',
      'Description',
      'Amount',
      'Category',
      'Account',
      'Item ID',
      'Payload',
      'User ID'
    ];

    const csvRows = [headers.join(',')];

    for (const tx of sortedTransactions) {
      const account = accounts.find(a => a.id === (tx.payload?.accountId || tx.payload?.changes?.accountId));
      const category = tx.payload?.category || tx.payload?.changes?.category || '';
      const amount = tx.payload?.amount || tx.payload?.new_balance || '';

      const row = [
        tx.id || '',
        tx.timestamp || '',
        new Date(tx.timestamp).toLocaleDateString(),
        tx.type || '',
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        amount,
        category,
        account?.name || '',
        tx.item_id || '',
        `"${JSON.stringify(tx.payload || {}).replace(/"/g, '""')}"`,
        tx.user_id || ''
      ];

      csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    notify(`Exported ${sortedTransactions.length} transactions successfully!`, 'success');
  };

  // Get transaction icon and color
  const getTransactionStyle = (type) => {
    const styles = {
      account_created: { icon: '🏦', color: '#059669' },
      account_balance_adjustment: { icon: '💰', color: '#0369a1' },
      account_deleted: { icon: '🗑️', color: '#dc2626' },
      bill_created: { icon: '📄', color: '#7c3aed' },
      bill_payment: { icon: '💳', color: '#059669' },
      bill_modification: { icon: '✏️', color: '#0369a1' },
      bill_deleted: { icon: '🗑️', color: '#dc2626' },
      one_time_cost_created: { icon: '💸', color: '#ea580c' },
      one_time_cost_payment: { icon: '💰', color: '#059669' },
      one_time_cost_modification: { icon: '✏️', color: '#0369a1' },
      one_time_cost_deleted: { icon: '🗑️', color: '#dc2626' },
      recurring_income_created: { icon: '💼', color: '#059669' },
      recurring_income_received: { icon: '💵', color: '#059669' },
      recurring_income_deleted: { icon: '🗑️', color: '#dc2626' },
      credit_created: { icon: '🎯', color: '#7c3aed' },
      credit_received: { icon: '✅', color: '#059669' },
      credit_deleted: { icon: '🗑️', color: '#dc2626' },
      category_created: { icon: '🏷️', color: '#7c3aed' },
      category_deleted: { icon: '🗑️', color: '#dc2626' }
    };

    return styles[type] || { icon: '📝', color: '#6b7280' };
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.95) 100%)',
      padding: isMobile ? '1rem' : '1.5rem',
      borderRadius: '1rem',
      boxShadow: '0 8px 20px rgba(139, 92, 246, 0.2)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          fontWeight: '700',
          color: '#6b21a8',
          margin: 0
        }}>
          Transaction History ({sortedTransactions.length.toLocaleString()})
        </h2>
        <button
          onClick={handleExport}
          style={{
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '0.5rem',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <input
          type="text"
          placeholder="Search transactions..."
          value={filter.search}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />

        <select
          value={filter.type}
          onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="all">All Types</option>
          {transactionTypes.map(type => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={filter.category}
          onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.name} value={cat.name}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filter.account}
          onChange={(e) => setFilter(prev => ({ ...prev, account: e.target.value }))}
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        >
          <option value="all">All Accounts</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>

        <input
          type="date"
          placeholder="From Date"
          value={filter.dateFrom}
          onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />

        <input
          type="date"
          placeholder="To Date"
          value={filter.dateTo}
          onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
          style={{
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
      </div>

      {/* Results Table */}
      <div style={{
        maxHeight: isMobile ? '60vh' : '70vh',
        overflowY: 'auto',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '0.5rem',
        background: 'white'
      }}>
        {/* Table Header */}
        {!isMobile && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
            gap: '1rem',
            padding: '1rem',
            borderBottom: '2px solid rgba(139, 92, 246, 0.2)',
            background: 'rgba(139, 92, 246, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            <button
              onClick={() => handleSort('timestamp')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b21a8',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              Date {sortConfig.key === 'timestamp' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSort('type')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b21a8',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              Type {sortConfig.key === 'type' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b21a8' }}>Name</div>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b21a8' }}>Category</div>
            <button
              onClick={() => handleSort('amount')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b21a8',
                cursor: 'pointer',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.25rem'
              }}
            >
              Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        )}

        {/* Table Rows */}
        {paginatedTransactions.map((tx, index) => {
          const style = getTransactionStyle(tx.type);
          const account = accounts.find(a => a.id === (tx.payload?.accountId || tx.payload?.changes?.accountId));
          const amount = tx.payload?.amount || tx.payload?.new_balance || '';
          const category = tx.payload?.category || '';
          const name = tx.payload?.name || tx.description || '';

          if (isMobile) {
            return (
              <div
                key={tx.id || index}
                style={{
                  padding: '1rem',
                  borderBottom: index < paginatedTransactions.length - 1 ? '1px solid rgba(139, 92, 246, 0.1)' : 'none',
                  background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'transparent'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{style.icon}</span>
                    <div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: style.color
                      }}>
                        {name || tx.type.replace(/_/g, ' ')}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280'
                      }}>
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {amount && (
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: tx.type.includes('payment') || tx.type.includes('cost') ? '#dc2626' : '#059669'
                    }}>
                      {tx.type.includes('payment') || tx.type.includes('cost') ? '-' : '+'}
                      {fmt(amount)}
                    </div>
                  )}
                </div>

                {category && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.25rem'
                  }}>
                    Category: {category}
                  </div>
                )}

                {account && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    Account: {account.name}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={tx.id || index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                gap: '1rem',
                padding: '1rem',
                borderBottom: index < paginatedTransactions.length - 1 ? '1px solid rgba(139, 92, 246, 0.1)' : 'none',
                background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {new Date(tx.timestamp).toLocaleDateString()}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>{style.icon}</span>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: style.color
                }}>
                  {tx.type.replace(/_/g, ' ')}
                </div>
              </div>

              <div style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                {name}
              </div>

              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {category}
                {account && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
                    {account.name}
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: tx.type.includes('payment') || tx.type.includes('cost') ? '#dc2626' : '#059669',
                textAlign: 'right'
              }}>
                {amount && (
                  <>
                    {tx.type.includes('payment') || tx.type.includes('cost') ? '-' : '+'}
                    {fmt(amount)}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '1rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              background: currentPage === 1 ? '#e5e7eb' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: currentPage === 1 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ← Previous
          </button>

          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              background: currentPage === totalPages ? '#e5e7eb' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: currentPage === totalPages ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}