import React, { useState } from 'react';
import { fmt, yyyyMm, logTransaction } from '../lib/utils';
import { notify } from './Notify';

export default function RetroactiveBillHistory({
  isOpen,
  onClose,
  billData,
  user,
  supabase,
  onComplete
}) {
  const [selectedMonths, setSelectedMonths] = useState(new Set());
  const [years, setYears] = useState(1);

  if (!isOpen) return null;

  // Generate months for the selected number of years
  const generateMonths = () => {
    const months = [];
    const currentDate = new Date();
    const currentMonth = yyyyMm();

    for (let yearOffset = 0; yearOffset < years; yearOffset++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(currentDate.getFullYear() - yearOffset, currentDate.getMonth() - month, 1);
        const monthKey = yyyyMm(date);

        // Don't include future months or current month
        if (monthKey >= currentMonth) continue;

        months.push({
          key: monthKey,
          display: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          date: date
        });
      }
    }

    return months.sort((a, b) => b.date - a.date); // Most recent first
  };

  const months = generateMonths();

  const handleMonthToggle = (monthKey) => {
    const newSelected = new Set(selectedMonths);
    if (newSelected.has(monthKey)) {
      newSelected.delete(monthKey);
    } else {
      newSelected.add(monthKey);
    }
    setSelectedMonths(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMonths.size === months.length) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(new Set(months.map(m => m.key)));
    }
  };

  const handleSubmit = async () => {
    if (selectedMonths.size === 0) {
      notify('Please select at least one month', 'warning');
      return;
    }

    try {
      // First create the bill
      const billId = billData.id || crypto.randomUUID();

      const billTransaction = await logTransaction(
        supabase,
        user.id,
        'bill_created',
        billId,
        {
          ...billData,
          paidMonths: Array.from(selectedMonths) // Include retroactive payments
        },
        `Created bill "${billData.name}" with ${selectedMonths.size} retroactive payments`
      );

      if (!billTransaction) {
        throw new Error('Failed to create bill transaction');
      }

      // Log individual payment transactions for each selected month
      const paymentPromises = Array.from(selectedMonths).map(month =>
        logTransaction(
          supabase,
          user.id,
          'bill_payment',
          billId,
          {
            month,
            is_paid: true,
            accountId: billData.accountId,
            amount: billData.amount,
            retroactive: true,
            retroactiveDate: new Date().toISOString()
          },
          `Retroactive payment for "${billData.name}" - ${month}`
        )
      );

      await Promise.all(paymentPromises);

      notify(`Bill created with ${selectedMonths.size} retroactive payments!`, 'success');
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error creating bill with retroactive history:', error);
      notify('Failed to create bill with retroactive history', 'error');
    }
  };

  const totalRetroactiveAmount = selectedMonths.size * (billData.amount || 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.95) 100%)',
        padding: '2rem',
        borderRadius: '1rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          margin: '-2rem -2rem 1.5rem -2rem',
          padding: '1.5rem 2rem',
          borderRadius: '1rem 1rem 0 0',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
            📅 Add Retroactive Bill History
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
            Select months when "{billData.name}" was previously paid
          </p>
        </div>

        {/* Year Selection */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#6b21a8',
            marginBottom: '0.5rem'
          }}>
            How many years of history to show:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {[1, 2, 3].map(year => (
              <button
                key={year}
                onClick={() => {
                  setYears(year);
                  setSelectedMonths(new Set()); // Clear selections when changing years
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: years === year
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                    : 'rgba(139, 92, 246, 0.2)',
                  color: years === year ? 'white' : '#6b21a8',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {year} Year{year > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '0.5rem',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#1e40af' }}>
              Selected: {selectedMonths.size} months
            </span>
            <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1e40af' }}>
              Total: {fmt(totalRetroactiveAmount)}
            </span>
          </div>
        </div>

        {/* Month Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#6b21a8'
            }}>
              Select Months ({fmt(billData.amount || 0)} each)
            </h3>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '0.25rem 0.75rem',
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#6b21a8',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              {selectedMonths.size === months.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.5rem',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '0.5rem'
          }}>
            {months.map(month => (
              <label
                key={month.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: selectedMonths.has(month.key)
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: selectedMonths.has(month.key)
                    ? 'rgba(139, 92, 246, 0.5)'
                    : 'rgba(139, 92, 246, 0.2)',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedMonths.has(month.key)}
                  onChange={() => handleMonthToggle(month.key)}
                  style={{ accentColor: '#8b5cf6' }}
                />
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: selectedMonths.has(month.key) ? '600' : '400',
                  color: selectedMonths.has(month.key) ? '#6b21a8' : '#374151'
                }}>
                  {month.display}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(107, 114, 128, 0.2)',
              color: '#374151',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedMonths.size === 0}
            style={{
              padding: '0.75rem 1.5rem',
              background: selectedMonths.size > 0
                ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                : 'rgba(139, 92, 246, 0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: selectedMonths.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: selectedMonths.size > 0 ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
            }}
          >
            Create Bill with {selectedMonths.size} Payments
          </button>
        </div>
      </div>
    </div>
  );
}