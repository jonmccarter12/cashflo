import React from 'react';
import { fmt, logTransaction } from '../../lib/utils';
import { notify } from '../Notify';

export default function OneTimeCostsSection({
  isMobile,
  user,
  supabase,
  accounts,
  activeCats,
  oneTimeCosts,
  otcName,
  setOtcName,
  otcCategory,
  setOtcCategory,
  otcAmount,
  setOtcAmount,
  otcDueDate,
  setOtcDueDate,
  otcAccountId,
  setOtcAccountId,
  otcNotes,
  setOtcNotes,
  selectedCats,
  showIgnored,
  editingOTC,
  setEditingOTC,
  toggleOneTimePaid, // This function is passed from Dashboard.js
  selectAllOnFocus,
}) {

  async function addOneTimeCost() {
    try {
      if (!otcName || !otcAmount || !otcDueDate) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      const newOtcId = crypto.randomUUID();
      const payload = {
        name: otcName,
        category: otcCategory,
        amount: Number(otcAmount),
        dueDate: otcDueDate,
        accountId: otcAccountId,
        notes: otcNotes
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_created',
        newOtcId,
        payload,
        `Created one-time cost "${otcName}" for ${fmt(Number(otcAmount))}`
      );

      if (transaction) {
        setOtcName("");
        setOtcAmount(0);
        setOtcNotes("");
        notify('One-time cost added');
      }
    } catch (error) {
      console.error('Error adding one-time cost:', error);
      notify('Failed to add one-time cost', 'error');
    }
  }

  async function updateOTC(otcId, formData) {
    try {
      const changes = {
        name: formData.get('name'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        dueDate: formData.get('dueDate'),
        accountId: formData.get('accountId'),
        notes: formData.get('notes')
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_modification',
        otcId,
        { changes: changes },
        `Updated one-time cost "${changes.name}"`
      );

      if (transaction) {
        setEditingOTC(null);
        notify('One-time cost updated successfully!');
      }
    } catch (error) {
      console.error('Error updating one-time cost:', error);
      notify('Failed to update one-time cost', 'error');
    }
  }

  async function toggleOTCIgnored(o) {
    try {
      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_ignored_toggled',
        o.id,
        { ignored: !o.ignored },
        `One-time cost "${o.name}" ignored status set to ${!o.ignored}`
      );
      if (transaction) {
        notify(`One-time cost "${o.name}" is now ${o.ignored ? 'shown' : 'hidden'}.`);
      }
    } catch (error) {
      console.error('Error toggling OTC ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  async function deleteOneTimeCost(otcId) {
    const otc = oneTimeCosts.find(o => o.id === otcId);
    if (!otc) return;
    if (confirm('Delete this one-time cost?')) {
      try {
        const transaction = await logTransaction(
          supabase,
          user.id,
          'one_time_cost_deleted',
          otcId,
          {},
          `Deleted one-time cost "${otc.name}"`
        );
        if (transaction) {
          notify('One-time cost deleted');
        }
      } catch (error) {
        console.error('Error deleting one-time cost:', error);
        notify('Failed to delete one-time cost', 'error');
      }
    }
  }

  return (
    <>
      {/* Mobile One-Time Costs Section */}
      {isMobile && (
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>One-Time Costs</h3>

          <div style={{ marginBottom: '0.75rem' }}>
            <input
              placeholder="Cost name"
              value={otcName}
              onChange={(e) => setOtcName(e.target.value)}
              style={{ width: '100%', padding: '0.375rem', marginBottom: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <input
                type="number"
                placeholder="Amount"
                value={otcAmount}
                onChange={(e) => setOtcAmount(Number(e.target.value))}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              />
              <input
                type="date"
                value={otcDueDate}
                onChange={(e) => setOtcDueDate(e.target.value)}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.25rem' }}>
              <select
                value={otcCategory}
                onChange={(e) => setOtcCategory(e.target.value)}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={otcAccountId}
                onChange={(e) => setOtcAccountId(e.target.value)}
                style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={otcNotes}
              onChange={(e) => setOtcNotes(e.target.value)}
              style={{ width: '100%', padding: '0.375rem', marginBottom: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem', resize: 'vertical', minHeight: '60px' }}
            />
            <button
              onClick={addOneTimeCost}
              style={{ width: '100%', padding: '0.375rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
            >
              Add One-Time Cost
            </button>
          </div>

          {oneTimeCosts
            .filter(o => selectedCats.includes(o.category) && (!showIgnored ? !o.ignored : true))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map(otc => {
              const account = accounts.find(a => a.id === otc.accountId);
              const isOverdue = new Date(otc.dueDate) < new Date() && !otc.paid;

              return (
                <div key={otc.id} style={{
                  background: otc.paid ? '#f0fdf4' : (isOverdue ? '#fef2f2' : '#f9fafb'),
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: `2px solid ${otc.paid ? '#16a34a' : (isOverdue ? '#fca5a5' : '#e5e7eb')}`,
                  marginBottom: '0.375rem',
                  opacity: otc.ignored ? 0.5 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{otc.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(otc.amount)}</span>
                  </div>

                  <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                    Due: {new Date(otc.dueDate).toLocaleDateString()} • {account?.name} • {otc.category}
                    {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                    {otc.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{otc.notes}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                      <input
                        type="checkbox"
                        checked={otc.paid}
                        onChange={() => toggleOneTimePaid(otc)}
                      />
                      {otc.paid ? '✅ Paid' : 'Not paid'}
                    </label>
                    <button
                      onClick={() => toggleOTCIgnored(otc)}
                      style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      {otc.ignored ? 'Show' : 'Hide'}
                    </button>
                    <button
                      onClick={() => deleteOneTimeCost(otc.id)}
                      style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Desktop One-Time Costs Section */}
      {!isMobile && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>One-Time Costs</h3>

          {/* Add One-Time Cost Form */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <input
                placeholder="Cost name"
                value={otcName}
                onChange={(e) => setOtcName(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
              <input
                type="number"
                placeholder="Amount"
                value={otcAmount}
                onChange={(e) => setOtcAmount(Number(e.target.value))}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
              <input
                type="date"
                value={otcDueDate}
                onChange={(e) => setOtcDueDate(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
              <select
                value={otcCategory}
                onChange={(e) => setOtcCategory(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={otcAccountId}
                onChange={(e) => setOtcAccountId(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <textarea
                placeholder="Notes (optional)"
                value={otcNotes}
                onChange={(e) => setOtcNotes(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }}
              />
              <button
                onClick={addOneTimeCost}
                style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', alignSelf: 'flex-start' }}
              >
                Add Cost
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
            {oneTimeCosts
              .filter(o => selectedCats.includes(o.category) && (!showIgnored ? !o.ignored : true))
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map(otc => {
                const account = accounts.find(a => a.id === otc.accountId);
                const isOverdue = new Date(otc.dueDate) < new Date() && !otc.paid;

                return (
                  <div key={otc.id} style={{
                    background: otc.paid ? '#f0fdf4' : (isOverdue ? '#fef2f2' : '#f9fafb'),
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${otc.paid ? '#16a34a' : (isOverdue ? '#fca5a5' : '#e5e7eb')}`,
                    opacity: otc.ignored ? 0.6 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{otc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Due: {new Date(otc.dueDate).toLocaleDateString()} • {account?.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {otc.category}
                          {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                        </div>
                        {otc.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{otc.notes}</div>}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{fmt(otc.amount)}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={otc.paid}
                          onChange={() => toggleOneTimePaid(otc)}
                        />
                        {otc.paid ? 'Paid' : 'Not paid'}
                      </label>
                      <button
                        onClick={() => setEditingOTC(otc)}
                        style={{ padding: '0.25rem 0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleOTCIgnored(otc)}
                        style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {otc.ignored ? 'Show' : 'Hide'}
                      </button>
                      <button
                        onClick={() => deleteOneTimeCost(otc.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {oneTimeCosts.filter(o => selectedCats.includes(o.category) && (!showIgnored ? !o.ignored : true)).length === 0 && (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
              No one-time costs found. Add costs above to track them!
            </div>
          )}
        </div>
      )}

      {/* Common Dialog for Edit One-Time Cost */}
      {editingOTC && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit One-Time Cost</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateOTC(editingOTC.id, new FormData(e.target));
            }}>
              <input name="name" placeholder="Cost name" defaultValue={editingOTC.name} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="category" defaultValue={editingOTC.category} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingOTC.amount} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <input name="dueDate" type="date" defaultValue={editingOTC.dueDate} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="accountId" defaultValue={editingOTC.accountId} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingOTC.notes} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Cost</button>
                <button type="button" onClick={() => setEditingOTC(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
