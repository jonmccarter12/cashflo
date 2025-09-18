import React from 'react';
import { fmt, yyyyMm, getNextOccurrence } from '../../lib/utils';
import { notify } from '../Notify';
// import RetroactiveBillHistory from '../RetroactiveBillHistory';

export default function BillsSection({
  isMobile,
  bills,
  accounts,
  activeCats,
  showIgnored,
  selectedCats,
  totalBillsForSelectedCategory,
  togglePaid,
  toggleBillIgnored,
  deleteBill,
  setEditingBill,
  editingBill,
  updateBill,
  addBill,
  user,
  supabase
}) {
  const selectAllOnFocus = (e) => e.target.select();
  const [showRetroactiveHistory, setShowRetroactiveHistory] = React.useState(false);
  const [pendingBillData, setPendingBillData] = React.useState(null);
  const [showAddBillDialog, setShowAddBillDialog] = React.useState(false);

  const handleAddBillWithHistory = (formData) => {
    const billData = {
      name: formData.get('name'),
      category: formData.get('category'),
      amount: Number(formData.get('amount')),
      frequency: formData.get('frequency'),
      dueDay: Number(formData.get('dueDay')),
      accountId: formData.get('accountId'),
      notes: formData.get('notes') || ''
    };

    setPendingBillData(billData);
    setShowRetroactiveHistory(true);
  };

  return (
    <>
      {/* Mobile Bills Management Section */}
      {isMobile && (
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Recurring Bills</h3>
            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#8b5cf6' }}>{fmt(totalBillsForSelectedCategory)}</span>
          </div>
          
          {bills
            .filter(b => selectedCats.includes(b.category) && (!showIgnored ? !b.ignored : true))
            .sort((a,b) => {
              const aDate = getNextOccurrence(a);
              const bDate = getNextOccurrence(b);
              return aDate - bDate;
            })
            .map(bill => {
              const account = accounts.find(a => a.id === bill.accountId);
              const isPaid = bill.paidMonths.includes(yyyyMm());
              const nextDate = getNextOccurrence(bill);
              
              return (
                <div key={bill.id} style={{ 
                  background: '#f9fafb', 
                  padding: '0.5rem', 
                  borderRadius: '0.375rem',
                  border: `2px solid ${isPaid ? '#10b981' : '#e5e7eb'}`,
                  marginBottom: '0.375rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{bill.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                    {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th of month' : ''} • {account?.name} • Next: {nextDate.toLocaleDateString()}
                    {bill.notes && <div style={{ marginTop: '0.0625rem', fontStyle: 'italic' }}>{bill.notes}</div>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                      <input 
                        type="checkbox" 
                        checked={isPaid} 
                        onChange={() => togglePaid(bill)} 
                      />
                      {isPaid ? '✅ Paid' : 'Mark Paid'}
                    </label>
                    <button
                      onClick={() => setEditingBill(bill)}
                      style={{ padding: '0.125rem 0.25rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBill(bill.id)}
                      style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setShowAddBillDialog(true)}
              style={{ width: '100%', padding: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
            >
              + Add Bill
            </button>
        </div>
      )}

      {/* Desktop Bills Management Section */}
      {!isMobile && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recurring Bills</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#8b5cf6' }}>Total: {fmt(totalBillsForSelectedCategory)}</span>
              <button
                onClick={() => setShowAddBillDialog(true)}
                style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              >
                + Add Bill
              </button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
            {bills
              .filter(b => selectedCats.includes(b.category) && (!showIgnored ? !b.ignored : true))
              .sort((a,b) => {
                const aDate = getNextOccurrence(a);
                const bDate = getNextOccurrence(b);
                return aDate - bDate;
              })
              .map(bill => {
                const account = accounts.find(a => a.id === bill.accountId);
                const isPaid = bill.paidMonths.includes(yyyyMm());
                const nextDate = getNextOccurrence(bill);
                
                return (
                  <div key={bill.id} style={{ 
                    background: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    border: `2px solid ${isPaid ? '#10b981' : '#e5e7eb'}`,
                    opacity: bill.ignored ? 0.6 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{bill.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th of month' : ''} • {account?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Next: {nextDate.toLocaleDateString()}
                        </div>
                        {bill.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{bill.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fmt(bill.amount)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{bill.category}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <input 
                          type="checkbox" 
                          checked={isPaid} 
                          onChange={() => togglePaid(bill)} 
                        />
                        {isPaid ? 'Paid' : 'Mark Paid'}
                      </label>
                      <button
                        onClick={() => setEditingBill(bill)}
                        style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleBillIgnored(bill)}
                        style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {bill.ignored ? 'Show' : 'Hide'}
                      </button>
                      <button
                        onClick={() => deleteBill(bill.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {bills.filter(b => selectedCats.includes(b.category) && (!showIgnored ? !b.ignored : true)).length === 0 && (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
              No bills found. Add your first bill to get started!
            </div>
          )}
        </div>
      )}

      {/* Common Dialog for Add/Edit Bill */}
      {(showAddBillDialog || editingBill) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>{editingBill ? 'Edit Bill' : 'Add Bill'}</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              if (editingBill) {
                updateBill(editingBill.id, formData);
              } else {
                addBill(formData);
              }
              setEditingBill(null);
              setShowAddBillDialog(false);
            }}>
              <input name="name" placeholder="Bill name (e.g., Electric Bill)" defaultValue={editingBill?.name || ''} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="category" defaultValue={editingBill?.category || activeCats[0]} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 125.50)" defaultValue={editingBill?.amount || ''} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="frequency" defaultValue={editingBill?.frequency || 'monthly'} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
                  Due Day of Month (1-28):
                </label>
                <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month (e.g., 15)" defaultValue={editingBill?.dueDay || '15'} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Enter the day of the month this bill is due (1-28)
                </div>
              </div>
              <select name="accountId" defaultValue={editingBill?.accountId || accounts[0]?.id} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingBill?.notes || ''} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  {editingBill ? 'Update Bill' : 'Add Bill'}
                </button>
                <button type="button" onClick={() => { setEditingBill(null); setShowAddBillDialog(false); }} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
