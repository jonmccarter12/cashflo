setRetroactiveBill(billData);
                        setShowRetroactiveBillHistory(true);
                        setShowAddBill(false);
                      } else {
                        // Add the bill without history
                        const success = addBill(billData);
                        if (success) {
                          setShowAddBill(false);
                        }
                      }
                    }}>
                      <input name="name" placeholder="Bill name (e.g., Electric Bill)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="category" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 125.50)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="frequency" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '1rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                          Due Day of Month (1-28):
                        </label>
                        <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month (e.g., 15)" defaultValue="15" required style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          Enter the day of the month this bill is due (1-28)
                        </div>
                      </div>
                      <select name="accountId" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                      
                      <div style={{ marginBottom: '1.5rem', background: purpleLightest, padding: '1rem', borderRadius: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', marginBottom: '0.5rem' }}>
                          <input name="addHistory" type="checkbox" />
                          Add retroactive payment history
                        </label>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          This will let you add past payments for existing bills
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Bill</button>
                        <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              
              {showRetroactiveBillHistory && retroactiveBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add Payment History</h2>
                    </div>
                    
                    <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                      Select past months when you paid <strong>{retroactiveBill.name}</strong>
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '1rem', fontWeight: '500' }}>
                        Years of history:
                      </label>
                      <select 
                        value={retroactiveYears} 
                        onChange={(e) => setRetroactiveYears(Number(e.target.value))}
                        style={{ width: '150px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      >
                        <option value={1}>1 year</option>
                        <option value={2}>2 years</option>
                        <option value={3}>3 years</option>
                      </select>
                    </div>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '1rem' }}>
                      {retroactiveDates.map((date, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', borderBottom: index < retroactiveDates.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <input 
                            type="checkbox" 
                            id={`date-${index}`}
                            checked={date.paid}
                            onChange={() => {
                              setRetroactiveDates(prev => 
                                prev.map((d, i) => i === index ? { ...d, paid: !d.paid } : d)
                              );
                            }}
                            style={{ marginRight: '1rem' }}
                          />
                          <label htmlFor={`date-${index}`} style={{ fontSize: '1rem', flex: 1 }}>
                            {date.date.toLocaleDateString()} ({date.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })})
                          </label>
                        </div>
                      ))}
                      
                      {retroactiveDates.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '1rem' }}>
                          No dates available for the selected frequency
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => {
                          // Create bill with retroactive payment history
                          const paidMonths = retroactiveDates
                            .filter(date => date.paid)
                            .map(date => date.month);
                          
                          const billWithHistory = {
                            ...retroactiveBill,
                            retroactivePaidMonths: paidMonths
                          };
                          
                          const success = addBill(billWithHistory);
                          if (success) {
                            setShowRetroactiveBillHistory(false);
                            setRetroactiveBill(null);
                          }
                        }}
                        style={{ flex: 1, padding: '1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}
                      >
                        Save Payment History
                      </button>
                      <button 
                        onClick={() => {
                          setShowRetroactiveBillHistory(false);
                          setRetroactiveBill(null);
                        }}
                        style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
  
              {editingBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Edit Bill</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const updatedData = {
                        name: formData.get('name'),
                        category: formData.get('category'),
                        amount: Number(formData.get('amount')),
                        frequency: formData.get('frequency'),
                        dueDay: Number(formData.get('dueDay')),
                        accountId: formData.get('accountId'),
                        notes: formData.get('notes') || editingBill.notes || ''
                      };
                      
                      // Add frequency-specific fields
                      if (updatedData.frequency === 'weekly') {
                        updatedData.weeklyDay = Number(formData.get('weeklyDay') || 0);
                        updatedData.weeklySchedule = formData.get('weeklySchedule') || 'every';
                      } else if (updatedData.frequency === 'biweekly') {
                        updatedData.biweeklyStart = formData.get('biweeklyStart') || editingBill.biweeklyStart || new Date().toISOString().slice(0, 10);
                      } else if (updatedData.frequency === 'yearly') {
                        updatedData.yearlyMonth = Number(formData.get('yearlyMonth') || 0);
                      }
                      
                      updateBill(editingBill.id, updatedData);
                      setEditingBill(null);
                    }}>
                      <input name="name" placeholder="Bill name" defaultValue={editingBill.name} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="category" defaultValue={editingBill.category} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingBill.amount} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="frequency" defaultValue={editingBill.frequency} style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '1rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                          Due Day of Month (1-28):
                        </label>
                        <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month" defaultValue={editingBill.dueDay} required style={{ width: '100%', padding: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          Enter the day of the month this bill is due (1-28)
                        </div>
                      </div>
                      <select name="accountId" defaultValue={editingBill.accountId} style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingBill.notes} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Update Bill</button>
                        <button type="button" onClick={() => setEditingBill(null)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {editingOTC && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Edit One-Time Cost</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const updatedOTC = {
                        ...editingOTC,
                        name: formData.get('name'),
                        category: formData.get('category'),
                        amount: Number(formData.get('amount')),
                        dueDate: formData.get('dueDate'),
                        accountId: formData.get('accountId'),
                        notes: formData.get('notes')
                      };
                      setMasterState(prev => ({
                        ...prev,
                        oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? updatedOTC : o)
                      }));
                      
                      // Record transaction
                      const transactionRecord = createTransactionRecord('onetime_updated', {
                        name: updatedOTC.name,
                        amount: updatedOTC.amount,
                        accountId: updatedOTC.accountId,
                        category: updatedOTC.category,
                        description: `Updated one-time cost: ${updatedOTC.name}`
                      });
                      
                      setTransactionHistory(prev => [transactionRecord, ...prev]);
                      
                      setEditingOTC(null);
                      notify('One-time cost updated successfully!');
                    }}>
                      <input name="name" placeholder="Cost name" defaultValue={editingOTC.name} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="category" defaultValue={editingOTC.category} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingOTC.amount} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <input name="dueDate" type="date" defaultValue={editingOTC.dueDate} required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="accountId" defaultValue={editingOTC.accountId} style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingOTC.notes} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Update Cost</button>
                        <button type="button" onClick={() => setEditingOTC(null)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>

export default function App() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}                                  style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {bills.filter(b => selectedCats.includes(b.category) && (!showIgnored[0] ? !b.ignored : true)).length === 0 && (
                      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                        No bills found. Add your first bill to get started!
                      </div>
                    )}
                  </div>
  
                  {/* One-Time Costs Section */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid, marginBottom: '1rem' }}>One-Time Costs</h3>
                    
                    {/* Add One-Time Cost Form */}
                    <div style={{ background: purpleLightest, padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #e9d5ff' }}>
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
                          style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', alignSelf: 'flex-start' }}
                        >
                          Add Cost
                        </button>
                      </div>
                    </div>
  
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                      {oneTimeCosts
                        .filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true))
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
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
                                  style={{ padding: '0.25rem 0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                    
                    {oneTimeCosts.filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true)).length === 0 && (
                      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                        No one-time costs found. Add costs above to track them!
                      </div>
                    )}
                  </div>
  
                  {/* Categories Management with Budgets */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid, marginBottom: '1rem' }}>Categories & Budget Management</h3>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const name = e.target.categoryName.value.trim();
                        if (name) {
                          addCategory(name);
                          e.target.categoryName.value = '';
                        }
                      }} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                        <input
                          name="categoryName"
                          placeholder="New category name"
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                        />
                        <button
                          type="submit"
                          style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          Add Category
                        </button>
                      </form>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        <input 
                          type="checkbox" 
                          checked={showIgnored[0]} 
                          onChange={(e) => setShowIgnored(e.target.checked)} 
                        />
                        Show ignored
                      </label>
                    </div>
  
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                      {categories
                        .filter(cat => !cat.ignored || showIgnored[0])
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(cat => {
                          const spent = categorySpending[cat.name] || 0;
                          const budget = cat.budget || 0;
                          const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
                          const budgetColor = percentUsed >= 100 ? '#dc2626' : percentUsed >= 80 ? '#f59e0b' : '#16a34a';
                          
                          return (
                            <div key={cat.id} style={{ 
                              padding: '1rem', 
                              background: cat.ignored ? '#f3f4f6' : purpleLightest, 
                              borderRadius: '0.5rem',
                              border: '1px solid #e9d5ff',
                              opacity: cat.ignored ? 0.6 : 1
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                {editingCategoryId === cat.id ? (
                                  <input
                                    type="text"
                                    defaultValue={cat.name}
                                    onBlur={(e) => {
                                      renameCategory(cat.id, e.target.value);
                                      setEditingCategoryId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        renameCategory(cat.id, e.target.value);
                                        setEditingCategoryId(null);
                                      }
                                      if (e.key === 'Escape') {
                                        setEditingCategoryId(null);
                                      }
                                    }}
                                    autoFocus
                                    style={{ fontSize: '1rem', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', flex: 1 }}
                                  />
                                ) : (
                                  <span 
                                    style={{ fontSize: '1rem', fontWeight: '600', cursor: 'pointer', flex: 1, color: purpleSolid }}
                                    onClick={() => setEditingCategoryId(cat.id)}
                                  >
                                    {cat.name}
                                  </span>
                                )}
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => moveCategoryUp(cat.id)}
                                    style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveCategoryDown(cat.id)}
                                    style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => toggleIgnoreCategory(cat.name)}
                                    style={{ padding: '0.25rem 0.5rem', background: cat.ignored ? '#16a34a' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    {cat.ignored ? 'Show' : 'Hide'}
                                  </button>
                                  <button
                                    onClick={() => removeCategory(cat.name)}
                                    style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Budget:</span>
                                <input
                                  type="number"
                                  value={cat.budget || 0}
                                  onChange={(e) => updateCategoryBudget(cat.id, e.target.value)}
                                  onFocus={selectAllOnFocus}
                                  style={{ width: '100px', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem', textAlign: 'right' }}
                                />
                                <span style={{ fontSize: '0.875rem', color: budgetColor, fontWeight: '600' }}>
                                  {fmt(spent)} / {fmt(budget)} ({percentUsed.toFixed(0)}%)
                                </span>
                              </div>
                              
                              {budget > 0 && (
                                <div style={{ background: '#e5e7eb', borderRadius: '0.25rem', height: '8px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    background: budgetColor, 
                                    height: '100%', 
                                    width: `${Math.min(100, percentUsed)}%`,
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                              )}
                              
                              {percentUsed >= 100 && budget > 0 && (
                                <div style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#dc2626' }}>
                                  ⚠️ Over budget by {fmt(spent - budget)}!
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
  
                  {/* Net Worth & Analytics Section */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid, marginBottom: '1rem' }}>Financial Analytics</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center', color: purpleSolid }}>Where Your Money Is</h4>
                        {accountBalanceData.length > 0 ? (
                          <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '300px', height: '300px' }}>
                              <svg width="300" height="300" viewBox="0 0 300 300">
                                {(() => {
                                  const total = accountBalanceData.reduce((sum, item) => sum + item.value, 0);
                                  let currentAngle = 0;
                                  const colors = [purpleSolid, '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'];
                                  
                                  return accountBalanceData.map((item, index) => {
                                    const percentage = item.value / total;
                                    const angle = percentage * 360;
                                    const startAngle = currentAngle;
                                    const endAngle = currentAngle + angle;
                                    currentAngle = endAngle;
                                    
                                    const startRadians = (startAngle - 90) * Math.PI / 180;
                                    const endRadians = (endAngle - 90) * Math.PI / 180;
                                    
                                    const largeArcFlag = angle > 180 ? 1 : 0;
                                    const x1 = 150 + 120 * Math.cos(startRadians);
                                    const y1 = 150 + 120 * Math.sin(startRadians);
                                    const x2 = 150 + 120 * Math.cos(endRadians);
                                    const y2 = 150 + 120 * Math.sin(endRadians);
                                    
                                    const pathData = `M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                                    
                                    return (
                                      <path
                                        key={index}
                                        d={pathData}
                                        fill={colors[index % colors.length]}
                                        stroke="white"
                                        strokeWidth="3"
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.875rem' }}>No account data</div>
                        )}
                        <div style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
                          {accountBalanceData.map((item, index) => {
                            const colors = [purpleSolid, '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'];
                            return (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                                <span>{item.name}: {fmt(item.value)} ({item.type})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
  
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center', color: purpleSolid }}>Spending by Category</h4>
                        {categorySpendingData.length > 0 ? (
                          <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '300px', height: '300px' }}>
                              <svg width="300" height="300" viewBox="0 0 300 300">
                                {(() => {
                                  const total = categorySpendingData.reduce((sum, item) => sum + item.value, 0);
                                  let currentAngle = 0;
                                  const colors = [purpleSolid, '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'];
                                  
                                  return categorySpendingData.map((item, index) => {
                                    const percentage = item.value / total;
                                    const angle = percentage * 360;
                                    const startAngle = currentAngle;
                                    const endAngle = currentAngle + angle;
                                    currentAngle = endAngle;
                                    
                                    const startRadians = (startAngle - 90) * Math.PI / 180;
                                    const endRadians = (endAngle - 90) * Math.PI / 180;
                                    
                                    const largeArcFlag = angle > 180 ? 1 : 0;
                                    const x1 = 150 + 120 * Math.cos(startRadians);
                                    const y1 = 150 + 120 * Math.sin(startRadians);
                                    const x2 = 150 + 120 * Math.cos(endRadians);
                                    const y2 = 150 + 120 * Math.sin(endRadians);
                                    
                                    const pathData = `M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                                    
                                    return (
                                      <path
                                        key={index}
                                        d={pathData}
                                        fill={colors[index % colors.length]}
                                        stroke="white"
                                        strokeWidth="3"
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.875rem' }}>No spending data</div>
                        )}
                        <div style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
                          {categorySpendingData.map((item, index) => {
                            const colors = [purpleSolid, '#9333ea', '#a855f7', '#c084fc', '#d8b4fe'];
                            return (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '12px', height: '12px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                                <span>{item.name}: {fmt(item.value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
  
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: purpleSolid }}>Net Worth Trend</h4>
                        {netWorthTrend.length > 1 ? (
                          <div style={{ width: '100%', height: '250px', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                            <svg width="100%" height="100%" viewBox="0 0 400 200">
                              {(() => {
                                const maxValue = Math.max(...netWorthTrend.map(d => Math.max(d.current, d.afterWeek, d.afterMonth)));
                                const minValue = Math.min(...netWorthTrend.map(d => Math.min(d.current, d.afterWeek, d.afterMonth)));
                                const range = maxValue - minValue || 1;
                                const xStep = 380 / (netWorthTrend.length - 1);
                                
                                const getY = (value) => 180 - ((value - minValue) / range) * 160;
                                
                                const currentPath = netWorthTrend.map((d, i) => 
                                  `${i === 0 ? 'M' : 'L'} ${10 + i * xStep} ${getY(d.current)}`
                                ).join(' ');
                                
                                const afterWeekPath = netWorthTrend.map((d, i) => 
                                  `${i === 0 ? 'M' : 'L'} ${10 + i * xStep} ${getY(d.afterWeek)}`
                                ).join(' ');
                                
                                const afterMonthPath = netWorthTrend.map((d, i) => 
                                  `${i === 0 ? 'M' : 'L'} ${10 + i * xStep} ${getY(d.afterMonth)}`
                                ).join(' ');
                                
                                return (
                                  <g>
                                    <path d={currentPath} stroke={purpleSolid} strokeWidth="2" fill="none" />
                                    <path d={afterWeekPath} stroke="#10b981" strokeWidth="2" fill="none" />
                                    <path d={afterMonthPath} stroke="#f59e0b" strokeWidth="2" fill="none" />
                                  </g>
                                );
                              })()}
                            </svg>
                          </div>
                        ) : (
                          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                            Not enough data for trend chart. Add more snapshots!
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '2px', backgroundColor: purpleSolid }}></div>
                            <span>Current</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '2px', backgroundColor: '#10b981' }}></div>
                            <span>After Week</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '2px', backgroundColor: '#f59e0b' }}></div>
                            <span>After Month</span>
                          </div>
                        </div>
                      </div>
  
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: purpleSolid }}>Quick Actions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <button
                            onClick={() => setCurrentView('transactions')}
                            style={{ padding: '0.75rem', background: purpleGradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                          >
                            📊 View Transaction History
                          </button>
                          <button
                            onClick={() => {
                              setNwHistory(prev => [...prev, {
                                ts: Date.now(),
                                current: currentLiquid,
                                afterWeek,
                                afterMonth,
                                reason: 'manual_snapshot'
                              }]);
                              
                              // Also record in transaction history
                              const transactionRecord = createTransactionRecord('snapshot_created', {
                                current: currentLiquid,
                                afterWeek,
                                afterMonth,
                                description: 'Created financial snapshot'
                              });
                              
                              setTransactionHistory(prev => [transactionRecord, ...prev]);
                              
                              notify('Snapshot saved!');
                            }}
                            style={{ padding: '0.75rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                          >
                            📸 Take Financial Snapshot
                          </button>
                          <button
                            onClick={() => exportTransactionsToCSV(transactionHistory)}
                            style={{ padding: '0.75rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                          >
                            📤 Export Transaction History
                          </button>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                              <input 
                                type="checkbox" 
                                checked={autoDeductCash[0]} 
                                onChange={(e) => setAutoDeductCash(e.target.checked)} 
                              />
                              Auto-deduct from Cash accounts
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : currentView === 'timeline' ? (
                // Timeline View (Desktop)
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: purpleSolid, marginBottom: '1rem' }}>30-Day Cash Flow Timeline</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {timeline.map((day, idx) => {
                      const hasActivity = day.income.length > 0 || day.expenses.length > 0;
                      const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                      
                      return (
                        <div key={idx} style={{ 
                          padding: '1rem', 
                          background: isWeekend ? '#f9fafb' : 'white',
                          border: `2px solid ${day.balance < 0 ? '#fca5a5' : '#e5e7eb'}`,
                          borderRadius: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasActivity ? '0.5rem' : 0 }}>
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                {day.dayOfWeek}, {day.date.toLocaleDateString()}
                              </div>
                              {idx === 0 && <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>TODAY</div>}
                            </div>
                            <div style={{ 
                              fontSize: '1.125rem', 
                              fontWeight: '700',
                              color: day.balance < 0 ? '#dc2626' : '#000'
                            }}>
                              {fmt(day.balance)}
                            </div>
                          </div>
                          
                          {hasActivity && (
                            <div style={{ fontSize: '0.75rem' }}>
                              {day.income.map((inc, i) => (
                                <div key={`inc-${i}`} style={{ color: '#16a34a', marginBottom: '0.25rem' }}>
                                  + {inc.name}: {fmt(inc.amount)}
                                </div>
                              ))}
                              {day.expenses.map((exp, i) => (
                                <div key={`exp-${i}`} style={{ color: '#dc2626', marginBottom: '0.25rem' }}>
                                  - {exp.name}: {fmt(exp.amount)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Transaction History View (Desktop)
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: purpleSolid }}>Transaction History</h3>
                    <button
                      onClick={() => exportTransactionsToCSV(filteredTransactions)}
                      style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      Export CSV
                    </button>
                  </div>
                  
                  {/* Filter section */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: purpleLightest, padding: '1rem', borderRadius: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
                      <input 
                        type="date" 
                        value={transactionFilters.startDate} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>End Date</label>
                      <input 
                        type="date" 
                        value={transactionFilters.endDate} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                      <select 
                        value={transactionFilters.type} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      >
                        <option value="">All Types</option>
                        <option value="bill_paid">Bill Payments</option>
                        <option value="income_received">Income Received</option>
                        <option value="credit_received">Credits Received</option>
                        <option value="balance_updated">Balance Updates</option>
                        <option value="onetime_paid">One-time Payments</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                      <select 
                        value={transactionFilters.category} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, category: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      >
                        <option value="">All Categories</option>
                        {activeCats.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Income">Income</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Account</label>
                      <select 
                        value={transactionFilters.accountId} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, accountId: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      >
                        <option value="">All Accounts</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Search</label>
                      <input 
                        type="text" 
                        placeholder="Search transactions..." 
                        value={transactionFilters.searchText} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, searchText: e.target.value }))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button 
                        onClick={() => setTransactionFilters({
                          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                          endDate: new Date().toISOString().slice(0, 10),
                          type: '',
                          category: '',
                          accountId: '',
                          searchText: ''
                        })}
                        style={{ width: '100%', padding: '0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                  
                  {/* Transaction list */}
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    Found {filteredTransactions.length} transactions
                  </div>
                  
                  <div style={{ height: '600px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, background: purpleLightest, borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: purpleSolid }}>Date</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: purpleSolid }}>Description</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: purpleSolid }}>Category</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', color: purpleSolid }}>Account</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', color: purpleSolid }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map(transaction => {
                            const isIncome = ['income_received', 'credit_received'].includes(transaction.type);
                            const isExpense = ['bill_paid', 'onetime_paid'].includes(transaction.type);
                            
                            let rowColor = '#f9fafb';
                            
                            if (isIncome) {
                              rowColor = '#f0fdf4';
                            } else if (isExpense) {
                              rowColor = '#fef2f2';
                            }
                            
                            return (
                              <tr key={transaction.id} style={{ background: rowColor, borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '0.75rem' }}>{new Date(transaction.timestamp).toLocaleString()}</td>
                                <td style={{ padding: '0.75rem' }}>{transaction.description}</td>
                                <td style={{ padding: '0.75rem' }}>{transaction.category}</td>
                                <td style={{ padding: '0.75rem' }}>{accounts.find(a => a.id === transaction.accountId)?.name || '-'}</td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'right', 
                                  fontWeight: '600',
                                  color: isIncome ? '#16a34a' : isExpense ? '#dc2626' : '#6b7280'
                                }}>
                                  {isIncome ? '+' : isExpense ? '-' : ''}
                                  {fmt(Math.abs(transaction.amount))}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                              No transactions match your filters
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
  
              {/* DESKTOP DIALOGS */}
              {showAuth && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
                    />
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={handleAuth} disabled={authLoading} style={{ flex: 1, padding: '1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>
                        {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                      </button>
                      <button onClick={() => setShowAuth(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: purpleSolid, textDecoration: 'underline', cursor: 'pointer' }}>
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
  
              {showAddAccount && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add New Account</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      addAccount(formData.get('name'), formData.get('type'), formData.get('balance'));
                      setShowAddAccount(false);
                    }}>
                      <input name="name" placeholder="Account name" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="type" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        <option value="Bank">Bank Account</option>
                        <option value="Cash">Cash</option>
                        <option value="Credit">Credit Card</option>
                        <option value="Investment">Investment</option>
                        <option value="Other">Other</option>
                      </select>
                      <input name="balance" type="number" step="0.01" placeholder="Starting balance" defaultValue="0" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Account</button>
                        <button type="button" onClick={() => setShowAddAccount(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {showAddIncome && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add Recurring Income</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      addRecurringIncome(
                        formData.get('name'),
                        formData.get('amount'),
                        formData.get('frequency'),
                        formData.get('payDay'),
                        formData.get('accountId'),
                        formData.get('notes')
                      );
                      setShowAddIncome(false);
                    }}>
                      <input name="name" placeholder="Income name (e.g., Salary, Freelance)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="frequency" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        <option value="monthly">Monthly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <input name="payDay" type="number" min="1" max="28" placeholder="Pay day (1-28)" defaultValue="15" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="accountId" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Income</button>
                        <button type="button" onClick={() => setShowAddIncome(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {showAddCredit && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add Upcoming Credit</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      addUpcomingCredit(
                        formData.get('name'), 
                        formData.get('amount'), 
                        formData.get('expectedDate'), 
                        formData.get('accountId'),
                        formData.get('guaranteed') === 'on',
                        formData.get('notes')
                      );
                      setShowAddCredit(false);
                    }}>
                      <input name="name" placeholder="Credit name (e.g., Salary, Refund)" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <input name="expectedDate" type="date" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }} />
                      <select name="accountId" required style={{ width: '100%', padding: '1rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1rem' }}>
                        <input name="guaranteed" type="checkbox" />
                        Guaranteed (include in calculations)
                      </label>
                      <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', resize: 'vertical', minHeight: '80px' }} />
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Add Credit</button>
                        <button type="button" onClick={() => setShowAddCredit(false)} style={{ padding: '1rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {showAddBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ background: purpleGradient, margin: '-3rem -3rem 1.5rem -3rem', padding: '2rem 3rem', borderRadius: '1rem 1rem 0 0' }}>
                      <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center' }}>Add New Bill</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      
                      const billData = {
                        name: formData.get('name'),
                        category: formData.get('category'),
                        amount: Number(formData.get('amount')),
                        frequency: formData.get('frequency'),
                        dueDay: Number(formData.get('dueDay')),
                        accountId: formData.get('accountId'),
                        notes: formData.get('notes') || '',
                      };
                      
                      // Add frequency-specific fields
                      if (billData.frequency === 'weekly') {
                        billData.weeklyDay = Number(formData.get('weeklyDay') || 0);
                        billData.weeklySchedule = formData.get('weeklySchedule') || 'every';
                      } else if (billData.frequency === 'biweekly') {
                        billData.biweeklyStart = formData.get('biweeklyStart') || new Date().toISOString().slice(0, 10);
                      } else if (billData.frequency === 'yearly') {
                        billData.yearlyMonth = Number(formData.get('yearlyMonth') || 0);
                      }
                      
                      // Check if retroactive payment history should be added
                      if (formData.get('addHistory') === 'on') {
                        set                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add New Bill</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      
                      const billData = {
                        name: formData.get('name'),
                        category: formData.get('category'),
                        amount: Number(formData.get('amount')),
                        frequency: formData.get('frequency'),
                        dueDay: Number(formData.get('dueDay')),
                        accountId: formData.get('accountId'),
                        notes: formData.get('notes') || '',
                      };
                      
                      // Add frequency-specific fields
                      if (billData.frequency === 'weekly') {
                        billData.weeklyDay = Number(formData.get('weeklyDay') || 0);
                        billData.weeklySchedule = formData.get('weeklySchedule') || 'every';
                      } else if (billData.frequency === 'biweekly') {
                        billData.biweeklyStart = formData.get('biweeklyStart') || new Date().toISOString().slice(0, 10);
                      } else if (billData.frequency === 'yearly') {
                        billData.yearlyMonth = Number(formData.get('yearlyMonth') || 0);
                      }
                      
                      // Check if retroactive payment history should be added
                      if (formData.get('addHistory') === 'on') {
                        setRetroactiveBill(billData);
                        setShowRetroactiveBillHistory(true);
                        setShowAddBill(false);
                      } else {
                        // Add the bill without history
                        const success = addBill(billData);
                        if (success) {
                          setShowAddBill(false);
                        }
                      }
                    }}>
                      <input name="name" placeholder="Bill name (e.g., Electric Bill)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="category" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 125.50)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="frequency" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
                          Due Day of Month (1-28):
                        </label>
                        <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month (e.g., 15)" defaultValue="15" required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Enter the day of the month this bill is due (1-28)
                        </div>
                      </div>
                      <select name="accountId" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                      
                      <div style={{ marginBottom: '1rem', background: purpleLightest, padding: '0.5rem', borderRadius: '0.375rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                          <input name="addHistory" type="checkbox" />
                          Add retroactive payment history
                        </label>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          This will let you add past payments for existing bills
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Bill</button>
                        <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              
              {showRetroactiveBillHistory && retroactiveBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Payment History</h2>
                    </div>
                    
                    <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                      Select past months when you paid <strong>{retroactiveBill.name}</strong>
                    </p>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                        Years of history:
                      </label>
                      <select 
                        value={retroactiveYears} 
                        onChange={(e) => setRetroactiveYears(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                      >
                        <option value={1}>1 year</option>
                        <option value={2}>2 years</option>
                        <option value={3}>3 years</option>
                      </select>
                    </div>
                    
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}>
                      {retroactiveDates.map((date, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderBottom: index < retroactiveDates.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <input 
                            type="checkbox" 
                            id={`date-${index}`}
                            checked={date.paid}
                            onChange={() => {
                              setRetroactiveDates(prev => 
                                prev.map((d, i) => i === index ? { ...d, paid: !d.paid } : d)
                              );
                            }}
                            style={{ marginRight: '0.5rem' }}
                          />
                          <label htmlFor={`date-${index}`} style={{ fontSize: '0.875rem', flex: 1 }}>
                            {date.date.toLocaleDateString()}
                          </label>
                        </div>
                      ))}
                      
                      {retroactiveDates.length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                          No dates available for the selected frequency
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => {
                          // Create bill with retroactive payment history
                          const paidMonths = retroactiveDates
                            .filter(date => date.paid)
                            .map(date => date.month);
                          
                          const billWithHistory = {
                            ...retroactiveBill,
                            retroactivePaidMonths: paidMonths
                          };
                          
                          const success = addBill(billWithHistory);
                          if (success) {
                            setShowRetroactiveBillHistory(false);
                            setRetroactiveBill(null);
                          }
                        }}
                        style={{ flex: 1, padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem' }}
                      >
                        Save Payment History
                      </button>
                      <button 
                        onClick={() => {
                          setShowRetroactiveBillHistory(false);
                          setRetroactiveBill(null);
                        }}
                        style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
  
              {editingBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit Bill</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const updatedData = {
                        name: formData.get('name'),
                        category: formData.get('category'),
                        amount: Number(formData.get('amount')),
                        frequency: formData.get('frequency'),
                        dueDay: Number(formData.get('dueDay')),
                        accountId: formData.get('accountId'),
                        notes: formData.get('notes') || editingBill.notes || ''
                      };
                      
                      // Add frequency-specific fields
                      if (updatedData.frequency === 'weekly') {
                        updatedData.weeklyDay = Number(formData.get('weeklyDay') || 0);
                        updatedData.weeklySchedule = formData.get('weeklySchedule') || 'every';
                      } else if (updatedData.frequency === 'biweekly') {
                        updatedData.biweeklyStart = formData.get('biweeklyStart') || editingBill.biweeklyStart || new Date().toISOString().slice(0, 10);
                      } else if (updatedData.frequency === 'yearly') {
                        updatedData.yearlyMonth = Number(formData.get('yearlyMonth') || 0);
                      }
                      
                      updateBill(editingBill.id, updatedData);
                      setEditingBill(null);
                    }}>
                      <input name="name" placeholder="Bill name" defaultValue={editingBill.name} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="category" defaultValue={editingBill.category} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        {activeCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input name="amount" type="number" step="0.01" placeholder="Amount" defaultValue={editingBill.amount} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="frequency" defaultValue={editingBill.frequency} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem', display: 'block' }}>
                          Due Day of Month (1-28):
                        </label>
                        <input name="dueDay" type="number" min="1" max="28" placeholder="Day of month" defaultValue={editingBill.dueDay} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Enter the day of the month this bill is due (1-28)
                        </div>
                      </div>
                      <select name="accountId" defaultValue={editingBill.accountId} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" defaultValue={editingBill.notes} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Bill</button>
                        <button type="button" onClick={() => setEditingBill(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {editingOTC && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit One-Time Cost</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const updatedOTC = {
                        ...editingOTC,
                        name: formData.get('name'),
                        category: formData.get('category'),
                        amount: Number(formData.get('amount')),
                        dueDate: formData.get('dueDate'),
                        accountId: formData.get('accountId'),
                        notes: formData.get('notes')
                      };
                      setMasterState(prev => ({
                        ...prev,
                        oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? updatedOTC : o)
                      }));
                      
                      // Record transaction
                      const transactionRecord = createTransactionRecord('onetime_updated', {
                        name: updatedOTC.name,
                        amount: updatedOTC.amount,
                        accountId: updatedOTC.accountId,
                        category: updatedOTC.category,
                        description: `Updated one-time cost: ${updatedOTC.name}`
                      });
                      
                      setTransactionHistory(prev => [transactionRecord, ...prev]);
                      
                      setEditingOTC(null);
                      notify('One-time cost updated successfully!');
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
                        <button type="submit" style={{ flex: 1, padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Cost</button>
                        <button type="button" onClick={() => setEditingOTC(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ===================== DESKTOP VERSION =====================
            <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Navigation Tabs */}
              <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: currentView === 'dashboard' ? purpleGradient : 'white',
                    color: currentView === 'dashboard' ? 'white' : '#374151',
                    border: currentView === 'dashboard' ? 'none' : '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('timeline')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: currentView === 'timeline' ? purpleGradient : 'white',
                    color: currentView === 'timeline' ? 'white' : '#374151',
                    border: currentView === 'timeline' ? 'none' : '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setCurrentView('transactions')}
                  style={{
                    padding: '0.75rem 2rem',
                    background: currentView === 'transactions' ? purpleGradient : 'white',
                    color: currentView === 'transactions' ? 'white' : '#374151',
                    border: currentView === 'transactions' ? 'none' : '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Transaction History
                </button>
              </div>
  
              {currentView === 'dashboard' ? (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: purpleSolid, marginBottom: '0.5rem' }}>
                      💰 Cashfl0.io 💰
                    </h1>
                    <p style={{ color: '#4b5563' }}>Complete financial management system</p>
                    
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {user ? (
                        <div>
                          {isSyncing ? '🔄 Syncing...' : '☁️ Synced'} • {user.email}
                          <button
                            onClick={handleLogout}
                            style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                          >
                            Logout
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAuth(true)}
                          style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        >
                          Login for Cloud Sync
                        </button>
                      )}
                    </div>
                  </div>
  
                  {/* Money Needed This Week Header */}
                  <div style={{ 
                    background: purpleGradient, 
                    padding: '2rem', 
                    borderRadius: '1rem', 
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>💸</span>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Financial Overview</h2>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>💸</span>
                          <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Week Total Due</span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>{fmt(weekNeedWithoutSavings)}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Full amount due this week</div>
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>🏦</span>
                          <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Current Balance</span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>{fmt(currentLiquidWithGuaranteed)}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Including guaranteed credits</div>
                      </div>
  
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>💰</span>
                          <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>With All Income</span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '700' }}>{fmt(projectedWithIncome)}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Balance + recurring income</div>
                      </div>
  
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>📊</span>
                          <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>After Month</span>
                        </div>
                        <div style={{ 
                          fontSize: '2rem', 
                          fontWeight: '700',
                          color: afterMonth < 0 ? '#fbbf24' : '#10b981'
                        }}>
                          {fmt(afterMonth)}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {afterMonth < 0 ? 'Need to earn more' : 'Surplus expected'}
                        </div>
                      </div>
                    </div>
  
                    {monthlyRecurringIncomeTotal > 0 && (
                      <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Monthly Recurring Income</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{fmt(monthlyRecurringIncomeTotal)}</div>
                      </div>
                    )}
                  </div>
  
                  {/* Three Column Layout: Accounts, Income Sources, Due This Week */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    
                    {/* Accounts Column */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid }}>Accounts</h3>
                        <button 
                          onClick={() => setShowAddAccount(true)}
                          style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
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
                      
                      <div style={{ marginTop: '1rem', padding: '1rem', background: purpleLightest, borderRadius: '0.5rem', border: '1px solid #e9d5ff' }}>
                        <div style={{ fontSize: '0.875rem', color: purpleSolid, fontWeight: '500' }}>Total Balance</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: purpleSolid }}>{fmt(currentLiquidWithGuaranteed)}</div>
                      </div>
                    </div>
  
                    {/* Income Sources Column (Recurring + Credits) */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid }}>{showIncomeHistory ? 'Income History' : 'Income Sources'}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => setShowIncomeHistory(!showIncomeHistory)}
                            style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
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
                          filteredTransactions.filter(t => ['income_received', 'credit_received'].includes(t.type)).length > 0 ? (
                            filteredTransactions
                              .filter(t => ['income_received', 'credit_received'].includes(t.type))
                              .slice(0, 20)
                              .map((entry, index) => {
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
                                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{entry.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                          {new Date(entry.timestamp).toLocaleDateString()} • {account?.name || 'Unknown Account'} • {entry.type === 'income_received' ? 'Recurring Income' : 'Credit'}
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
                                const currentMonth = yyyyMm();
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
                                        onChange={(e) => {
                                          setMasterState(prev => ({
                                            ...prev,
                                            upcomingCredits: prev.upcomingCredits.map(c => 
                                              c.id === credit.id ? { ...c, accountId: e.target.value } : c
                                            )
                                          }));
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
  
                    {/* Due This Week Column */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid, marginBottom: '1rem' }}>Due This Week</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                        {upcoming.items
                          .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category))
                          .map((it, idx) => {
                            const name = it.bill ? it.bill.name : it.otc.name;
                            const amt = it.bill ? it.bill.amount : it.otc.amount;
                            const account = accounts.find(a => a.id === (it.bill ? it.bill.accountId : it.otc.accountId));
                            
                            return (
                              <div key={idx} style={{ 
                                background: it.overdue ? '#fef2f2' : '#f9fafb',
                                padding: '1rem', 
                                borderRadius: '0.5rem',
                                border: `2px solid ${it.overdue ? '#fca5a5' : '#d1d5db'}`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                  <div>
                                    <div style={{ fontWeight: '500', fontSize: '1rem' }}>{name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      {it.overdue ? '⚠️ OVERDUE' : ''} {it.due.toLocaleDateString()}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                      {account?.name}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: it.overdue ? '#dc2626' : '#000' }}>
                                    {fmt(amt)}
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => it.bill ? togglePaid(it.bill) : toggleOneTimePaid(it.otc)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: purpleSolid,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  Mark as Paid
                                </button>
                              </div>
                            );
                          })}
                        
                        {upcoming.items.filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category)).length === 0 && (
                          <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                            Nothing due this week! Great job!
                          </div>
                        )}
                      </div>
                      
                      <div style={{ marginTop: '1rem', padding: '1rem', background: purpleLightest, borderRadius: '0.5rem', border: '1px solid #e9d5ff' }}>
                        <div style={{ fontSize: '0.875rem', color: purpleSolid, fontWeight: '500' }}>Week Total</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: purpleSolid }}>{fmt(upcoming.weekDueTotal)}</div>
                      </div>
                    </div>
                  </div>
  
                  {/* Category Filter */}
                  <div style={{ 
                    background: purpleGradient, 
                    padding: '1rem', 
                    borderRadius: '1rem', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {['All', ...activeCats].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCat(cat)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.375rem',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            background: selectedCat === cat ? 'white' : 'transparent',
                            color: selectedCat === cat ? purpleSolid : 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
  
                  {/* Category Summary - Desktop */}
                  {selectedCat !== 'All' && (
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid, marginBottom: '1rem' }}>Category Summary: {selectedCat}</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <div style={{ background: purpleLightest, padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: purpleSolid, marginBottom: '0.25rem' }}>Total</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: purpleSolid }}>
                            {fmt(categoryTotals.categories[selectedCat]?.total || 0)}
                          </div>
                        </div>
                        
                        <div style={{ background: purpleLightest, padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: purpleSolid, marginBottom: '0.25rem' }}>Items</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: purpleSolid }}>
                            {categoryTotals.categories[selectedCat]?.count || 0}
                          </div>
                        </div>
                        
                        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#16a34a', marginBottom: '0.25rem' }}>Paid</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                            {fmt(categoryTotals.categories[selectedCat]?.paid || 0)}
                          </div>
                        </div>
                        
                        <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#dc2626', marginBottom: '0.25rem' }}>Unpaid</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>
                            {fmt(categoryTotals.categories[selectedCat]?.unpaid || 0)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Budget progress bar */}
                      {(() => {
                        const category = categories.find(c => c.name === selectedCat);
                        if (!category || !category.budget) return null;
                        
                        const spent = categorySpending[selectedCat] || 0;
                        const budget = category.budget || 0;
                        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
                        const budgetColor = percentUsed >= 100 ? '#dc2626' : percentUsed >= 80 ? '#f59e0b' : '#16a34a';
                        
                        return (
                          <div style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Budget Progress</span>
                              <span style={{ fontSize: '0.875rem', color: budgetColor, fontWeight: '600' }}>
                                {fmt(spent)} / {fmt(budget)} ({percentUsed.toFixed(0)}%)
                              </span>
                            </div>
                            <div style={{ background: '#e5e7eb', borderRadius: '0.25rem', height: '10px', overflow: 'hidden' }}>
                              <div style={{ 
                                background: budgetColor, 
                                height: '100%', 
                                width: `${Math.min(100, percentUsed)}%`,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
  
                  {/* Bills Management Section */}
                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: purpleSolid }}>All Bills</h3>
                      <button 
                        onClick={() => setShowAddBill(true)}
                        style={{ padding: '0.5rem 1rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                      >
                        + Add Bill
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                      {bills
                        .filter(b => selectedCats.includes(b.category) && (!showIgnored[0] ? !b.ignored : true))
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
                                  {isPaid ? 'Paid' : 'Not paid'}
                                </label>
                                <button
                                  onClick={() => setEditingBill(bill)}
                                  style={{ padding: '0.25rem 0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                                  style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none',import React from 'react';
import { createClient } from '@supabase/supabase-js';

// ===================== SUPABASE CONFIG WITH VALIDATION =====================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log environment status (remove in production after debugging)
if (typeof window !== 'undefined') {
  console.log('Supabase Environment Check:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    url: SUPABASE_URL ? 'Set' : 'Missing',
    key: SUPABASE_ANON_KEY ? 'Set' : 'Missing'
  });
}

// ===================== SINGLETON SUPABASE CLIENT (FIXES MULTIPLE INSTANCES) =====================
let supabaseInstance = null;

function getSupabaseClient() {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }
  return supabaseInstance;
}

// ===================== HELPERS =====================
const storageKey = "bills_balance_dashboard_v4.0"; // Updated version number
const legacyStorageKeys = [
  "bills_balance_dashboard_v3.1",
  "bills_balance_dashboard_v3",
  "bills_balance_dashboard_v2",
  "bills_balance_dashboard",
  "cashflow_dashboard"
]; // For automatic recovery
const yyyyMm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthKey = yyyyMm();
const clampDue = (d) => Math.max(1, Math.min(28, Math.round(d||1)));
const fmt = (n) => `$${(Math.round((n||0) * 100) / 100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;

// ===================== ENHANCED DATA PROTECTION SYSTEM =====================
// Data Protection - Create backup of data with version tracking
function backupData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        version: "4.0",
        checksum: generateChecksum(data)
      };
      localStorage.setItem(`${key}_backup`, JSON.stringify(backup));
      
      // Create a secondary backup to prevent data loss
      localStorage.setItem(`${key}_backup_secondary`, JSON.stringify(backup));
      
      // Keep a versioned backup history (up to 10 versions)
      const backupHistory = JSON.parse(localStorage.getItem(`${key}_history`) || '[]');
      backupHistory.unshift(backup);
      while (backupHistory.length > 10) backupHistory.pop();
      localStorage.setItem(`${key}_history`, JSON.stringify(backupHistory));
      
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }
  return false;
}

// Generate a simple checksum for data integrity
function generateChecksum(data) {
  try {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  } catch (e) {
    return "0";
  }
}

// Data Protection - Save data with versioning, backup, and integrity check
function saveData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      // First create a backup of existing data if it exists
      const existingData = localStorage.getItem(key);
      if (existingData) {
        backupData(key, JSON.parse(existingData));
      }
      
      // Now save the new data
      localStorage.setItem(key, JSON.stringify(data));
      
      // Verify the save was successful
      const savedData = localStorage.getItem(key);
      if (!savedData) {
        throw new Error('Data save verification failed');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      // Try to save to a backup key if main save failed
      try {
        localStorage.setItem(`${key}_emergency`, JSON.stringify(data));
      } catch (backupError) {
        console.error('Emergency backup also failed:', backupError);
      }
      return false;
    }
  }
  return false;
}

// Data Protection - Load data with advanced fallback recovery system
function loadData(key, defaultValue) {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    // 1. Try current localStorage
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      // Store this successful read as the latest good data
      localStorage.setItem(`${key}_last_good`, data);
      return parsed;
    }
    
    // 2. Try emergency backup if regular save failed
    const emergencyData = localStorage.getItem(`${key}_emergency`);
    if (emergencyData) {
      console.log('Recovered from emergency backup data');
      return JSON.parse(emergencyData);
    }
    
    // 3. Try the last known good data
    const lastGoodData = localStorage.getItem(`${key}_last_good`);
    if (lastGoodData) {
      console.log('Recovered from last known good data');
      return JSON.parse(lastGoodData);
    }
    
    // 4. Try backup localStorage
    const backup = localStorage.getItem(`${key}_backup`);
    if (backup) {
      const parsedBackup = JSON.parse(backup);
      console.log('Recovered from primary backup data:', parsedBackup);
      return parsedBackup.data;
    }
    
    // 5. Try secondary backup
    const secondaryBackup = localStorage.getItem(`${key}_backup_secondary`);
    if (secondaryBackup) {
      const parsedSecondary = JSON.parse(secondaryBackup);
      console.log('Recovered from secondary backup data:', parsedSecondary);
      return parsedSecondary.data;
    }
    
    // 6. Try history backups
    const historyStr = localStorage.getItem(`${key}_history`);
    if (historyStr) {
      const history = JSON.parse(historyStr);
      if (history.length > 0) {
        console.log('Recovered from historical backup version');
        return history[0].data;
      }
    }
    
    // 7. Try legacy storage keys
    for (const legacyKey of legacyStorageKeys) {
      const legacyData = localStorage.getItem(`${legacyKey}:${key.split(':')[1]}`);
      if (legacyData) {
        const parsedLegacy = JSON.parse(legacyData);
        console.log('Recovered from legacy storage:', legacyKey, parsedLegacy);
        return parsedLegacy;
      }
    }
    
    // 8. Fall back to default values
    return defaultValue;
  } catch (error) {
    console.error('Error loading data:', error);
    
    // Try to recover from any available backup
    try {
      const lastGoodData = localStorage.getItem(`${key}_last_good`);
      if (lastGoodData) {
        return JSON.parse(lastGoodData);
      }
      
      const anyBackup = localStorage.getItem(`${key}_backup`) || 
                        localStorage.getItem(`${key}_backup_secondary`) || 
                        localStorage.getItem(`${key}_emergency`);
      if (anyBackup) {
        const parsed = JSON.parse(anyBackup);
        return parsed.data || parsed;
      }
    } catch (backupError) {
      console.error('All recovery attempts failed:', backupError);
    }
    
    return defaultValue;
  }
}

// Enhanced Smart Data Merging with conflict resolution
function mergeData(localData, cloudData) {
  if (!cloudData || !Array.isArray(cloudData)) return localData;
  if (!localData || !Array.isArray(localData)) return cloudData;
  
  // For arrays of objects with IDs, merge by ID
  if (localData.length > 0 && typeof localData[0] === 'object' && localData[0].id) {
    const mergedMap = new Map();
    
    // Add all local items to map
    localData.forEach(item => {
      mergedMap.set(item.id, item);
    });
    
    // Add/override with cloud items if they're newer or don't exist locally
    cloudData.forEach(item => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      } else {
        // If the cloud item has updatedAt and it's newer, use it
        const localItem = mergedMap.get(item.id);
        
        // Complex conflict resolution strategy
        if (item.updatedAt && localItem.updatedAt) {
          const cloudDate = new Date(item.updatedAt);
          const localDate = new Date(localItem.updatedAt);
          
          if (cloudDate > localDate) {
            // Cloud is newer, but preserve any local fields not in cloud
            mergedMap.set(item.id, {...localItem, ...item});
          } else if (cloudDate.getTime() === localDate.getTime()) {
            // Same timestamp, need more sophisticated merge
            // Preserve non-null and non-undefined values from both
            const merged = {...localItem};
            for (const [key, value] of Object.entries(item)) {
              if (value !== null && value !== undefined) {
                merged[key] = value;
              }
            }
            mergedMap.set(item.id, merged);
          }
          // If local is newer, keep local
        }
      }
    });
    
    return Array.from(mergedMap.values());
  }
  
  // For simple arrays or other data types, prefer local data
  return localData;
}

// Enhanced notification system with types
function notify(msg, type = 'success'){ 
  if(typeof window!=='undefined'){ 
    const colors = {
      success: '#7c3aed', // Purple for success
      error: '#dc2626',
      info: '#3b82f6',
      warning: '#f59e0b',
      sync: '#8b5cf6' // Purple variant for sync notifications
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; background: ${colors[type] || colors.info}; color: white;
      padding: 0.75rem 1rem; border-radius: 0.5rem; z-index: 9999;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      transform: translateX(100%); transition: transform 0.3s ease;
      max-width: 400px; word-wrap: break-word;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, 5000);
  }
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f5f0ff', borderRadius: '0.5rem', margin: '1rem', border: '2px solid #7c3aed' }}>
          <h2 style={{ color: '#7c3aed' }}>Something went wrong</h2>
          <p style={{ color: '#dc2626' }}>{this.state.error?.message || 'Unknown error occurred'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.5rem 1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginTop: '1rem' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

// ===================== ENHANCED CLOUD SYNC SYSTEM =====================
// Custom hook for cloud-synced persistent state with robust error handling and retries
function useCloudState(key, initial, user, supabase){
  const [state, setState] = React.useState(initial);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);
  const [syncRetryCount, setSyncRetryCount] = React.useState(0);
  const isInitialMount = React.useRef(true);
  const syncTimeoutRef = React.useRef(null);
  const pendingSyncRef = React.useRef(false);

  // Load from localStorage on mount with enhanced error handling
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const localData = loadData(key, null);
      if (localData) {
        setState(localData);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setState(initial);
    }
  }, [key, initial]);

  // Load from cloud when user is authenticated
  React.useEffect(() => {
    if (!user || !supabase) return;
    
    const loadFromCloud = async () => {
      setSyncing(true);
      setSyncError(null);
      
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .eq('data_type', key)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data && data.data) {
          // Smart merge local and cloud data
          const localData = loadData(key, null);
          const mergedData = mergeData(localData, data.data);
          
          setState(mergedData);
          const syncDate = new Date(data.updated_at);
          setLastSync(isNaN(syncDate.getTime()) ? null : syncDate);
          saveData(key, mergedData);
          setSyncRetryCount(0); // Reset retry count on success
          notify(`Synced ${key.split(':')[1]} from cloud`, 'sync');
        }
      } catch (error) {
        console.error('Failed to load from cloud:', error);
        setSyncError(error.message);
        
        if (syncRetryCount < 3) {
          // Implement exponential backoff for retries
          const delay = Math.pow(2, syncRetryCount) * 1000; 
          notify(`Sync retry in ${delay/1000}s: ${key.split(':')[1]}`, 'warning');
          
          setTimeout(() => {
            setSyncRetryCount(prev => prev + 1);
            loadFromCloud(); // Retry
          }, delay);
        } else {
          notify(`Failed to load ${key.split(':')[1]} from cloud: ${error.message}`, 'error');
        }
      } finally {
        setSyncing(false);
      }
    };

    loadFromCloud();
  }, [user, supabase, key, initial, syncRetryCount]);

  // Save to localStorage and cloud with debounce and retry
  React.useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Save locally
    const saveSuccessful = saveData(key, state);
    
    // Don't attempt cloud sync if local save failed
    if (!saveSuccessful) {
      notify(`Warning: Local save failed for ${key.split(':')[1]}`, 'error');
      return;
    }

    // Mark that we have a pending sync
    pendingSyncRef.current = true;
    
    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Save to cloud if logged in
    if (!user || !supabase) return;

    const saveToCloud = async () => {
      // Skip if there's no longer a pending sync (another sync happened)
      if (!pendingSyncRef.current) return;
      
      setSyncing(true);
      setSyncError(null);
      
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert({
            user_id: user.id,
            data_type: key,
            data: state,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,data_type'
          });

        if (error) throw error;
        setLastSync(new Date());
        setSyncRetryCount(0); // Reset retry count on success
        pendingSyncRef.current = false; // No longer pending
      } catch (error) {
        console.error('Failed to save to cloud:', error);
        setSyncError(error.message);
        
        if (syncRetryCount < 3) {
          // Implement exponential backoff for retries
          const delay = Math.pow(2, syncRetryCount) * 1000; 
          setSyncRetryCount(prev => prev + 1);
          
          notify(`Sync retry in ${delay/1000}s: ${key.split(':')[1]}`, 'warning');
          
          syncTimeoutRef.current = setTimeout(() => {
            saveToCloud(); // Retry
          }, delay);
          return; // Don't reset pending flag since we're retrying
        } else {
          notify(`Failed to sync ${key.split(':')[1]} to cloud: ${error.message}`, 'error');
          pendingSyncRef.current = false; // Failed after retries
        }
      } finally {
        setSyncing(false);
      }
    };

    syncTimeoutRef.current = setTimeout(saveToCloud, 1000);
    
    // Cleanup
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state, user, supabase, key, syncRetryCount]);

  return [state, setState, { syncing, lastSync, syncError, retryCount: syncRetryCount }];
}

// ===================== DATE AND FINANCIAL CALCULATIONS =====================
// Calculate next occurrence for a bill
function getNextOccurrence(bill, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    
    if (bill.frequency === 'monthly') {
      date.setDate(clampDue(bill.dueDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    
    if (bill.frequency === 'yearly') {
      const dueMonth = bill.yearlyMonth || 0;
      const dueDay = clampDue(bill.dueDay || 1);
      
      date.setMonth(dueMonth);
      date.setDate(dueDay);
      
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    
    if (bill.frequency === 'weekly') {
      const dayOfWeek = bill.weeklyDay || 0;
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      
      if (bill.weeklySchedule === 'every') {
        return date;
      } else {
        const targetWeek = bill.weeklySchedule;
        const month = date.getMonth();
        date.setDate(1);
        date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7));
        
        if (targetWeek === 'last') {
          while (date.getMonth() === month) {
            const next = new Date(date);
            next.setDate(next.getDate() + 7);
            if (next.getMonth() !== month) break;
            date.setDate(date.getDate() + 7);
          }
        } else {
          const weekNum = { first: 0, second: 1, third: 2, fourth: 3 }[targetWeek] || 0;
          date.setDate(date.getDate() + (weekNum * 7));
        }
        
        if (date <= fromDate) {
          date.setMonth(date.getMonth() + 1);
          return getNextOccurrence(bill, date);
        }
        return date;
      }
    }
    
    if (bill.frequency === 'biweekly') {
      const baseDate = new Date(bill.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    
    return getNextOccurrence({ ...bill, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
    return new Date();
  }
}

// Calculate next occurrence for recurring income
function getNextIncomeOccurrence(income, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    
    if (income.frequency === 'monthly') {
      date.setDate(clampDue(income.payDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    
    if (income.frequency === 'weekly') {
      const dayOfWeek = income.weeklyDay || 5; // Default to Friday
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      return date;
    }
    
    if (income.frequency === 'biweekly') {
      const baseDate = new Date(income.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    
    if (income.frequency === 'yearly') {
      const payMonth = income.yearlyMonth || 0;
      const payDay = clampDue(income.payDay || 1);
      
      date.setMonth(payMonth);
      date.setDate(payDay);
      
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    
    return getNextIncomeOccurrence({ ...income, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next income occurrence:', error);
    return new Date();
  }
}

// ===================== TRANSACTION HISTORY SYSTEM =====================
// Create a transaction record
function createTransactionRecord(type, data) {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type,
    data,
    category: data.category || 'Uncategorized',
    amount: data.amount || 0,
    accountId: data.accountId || null,
    description: data.description || data.name || 'Transaction',
    tags: data.tags || []
  };
}

// Export transactions to CSV
function exportTransactionsToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    notify('No transactions to export', 'warning');
    return;
  }
  
  try {
    // Get all possible headers from all transactions
    const allKeys = new Set();
    transactions.forEach(transaction => {
      Object.keys(transaction).forEach(key => allKeys.add(key));
      if (transaction.data) {
        Object.keys(transaction.data).forEach(key => allKeys.add(`data_${key}`));
      }
    });
    
    // Create headers row
    const headers = Array.from(allKeys);
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    transactions.forEach(transaction => {
      const row = headers.map(header => {
        if (header.startsWith('data_') && transaction.data) {
          const dataKey = header.substring(5);
          let value = transaction.data[dataKey] || '';
          // Ensure value is properly escaped for CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          } else if (typeof value === 'object') {
            value = `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return value;
        } else {
          let value = transaction[header] || '';
          // Ensure value is properly escaped for CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          } else if (typeof value === 'object') {
            value = `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return value;
        }
      }).join(',');
      csv += row + '\n';
    });
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    notify('Transactions exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting transactions:', error);
    notify('Failed to export transactions: ' + error.message, 'error');
  }
}

// Filter transactions based on criteria
function filterTransactions(transactions, filters) {
  if (!transactions) return [];
  if (!filters || Object.keys(filters).length === 0) return transactions;
  
  return transactions.filter(transaction => {
    // Date range filter
    if (filters.startDate && new Date(transaction.timestamp) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate) {
      const endDateWithTime = new Date(filters.endDate);
      endDateWithTime.setHours(23, 59, 59, 999);
      if (new Date(transaction.timestamp) > endDateWithTime) {
        return false;
      }
    }
    
    // Type filter
    if (filters.type && transaction.type !== filters.type) {
      return false;
    }
    
    // Category filter
    if (filters.category && transaction.category !== filters.category) {
      return false;
    }
    
    // Account filter
    if (filters.accountId && transaction.accountId !== filters.accountId) {
      return false;
    }
    
    // Amount range filter
    if (filters.minAmount !== undefined && transaction.amount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && transaction.amount > filters.maxAmount) {
      return false;
    }
    
    // Search text in description
    if (filters.searchText && !transaction.description.toLowerCase().includes(filters.searchText.toLowerCase())) {
      return false;
    }
    
    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      if (!transaction.tags || !Array.isArray(transaction.tags)) {
        return false;
      }
      // Check if transaction has all the required tags
      return filters.tags.every(tag => transaction.tags.includes(tag));
    }
    
    return true;
  });
}

// ===================== MAIN DASHBOARD COMPONENT =====================
function DashboardContent() {
  const isMobile = useIsMobile();
  
  // Auth state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [user, setUser] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(false);
  const [showAuth, setShowAuth] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  
  // Navigation state
  const [currentView, setCurrentView] = React.useState('dashboard');
  
  // FIXED: Supabase client using singleton pattern
  const supabase = React.useMemo(() => {
    return getSupabaseClient();
  }, []);

  // Session persistence with error handling
  React.useEffect(() => {
    if (!supabase) return;
    
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Failed to check session:', error);
      }
    };
    
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);

  // ===================== CLOUD-SYNCED STATES =====================
  // Transaction history with cloud sync
  const [transactionHistory, setTransactionHistory, transactionHistorySync] = useCloudState(
    `${storageKey}:transactions`,
    [],
    user,
    supabase
  );
  
  // Categories with cloud sync - Now includes budgets
  const [categoriesBase, setCategoriesBase, categoriesSync] = useCloudState(
    `${storageKey}:categories`, 
    [
      { id: crypto.randomUUID(), name: 'Personal', order: 0, budget: 500 },
      { id: crypto.randomUUID(), name: 'Studio', order: 1, budget: 1200 },
      { id: crypto.randomUUID(), name: 'Smoke Shop', order: 2, budget: 800 },
      { id: crypto.randomUUID(), name: 'Botting', order: 3, budget: 300 },
    ],
    user,
    supabase
  );
  
  // Cloud-synced base data
  const [accountsBase, setAccountsBase, accountsSync] = useCloudState(
    `${storageKey}:accounts`,
    [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
    ],
    user,
    supabase
  );
  
  const [billsBase, setBillsBase, billsSync] = useCloudState(`${storageKey}:bills`, [], user, supabase);
  const [oneTimeCostsBase, setOneTimeCostsBase, oneTimeCostsSync] = useCloudState(`${storageKey}:otc`, [], user, supabase);
  const [upcomingCreditsBase, setUpcomingCreditsBase, upcomingCreditsSync] = useCloudState(`${storageKey}:credits`, [], user, supabase);
  const [recurringIncomeBase, setRecurringIncomeBase, recurringIncomeSync] = useCloudState(`${storageKey}:income`, [], user, supabase);
  const [nwHistory, setNwHistory, nwHistorySync] = useCloudState(`${storageKey}:nwHistory`, [], user, supabase);

  // Master state
  const [masterState, setMasterState] = React.useState({
    accounts: accountsBase,
    bills: billsBase,
    oneTimeCosts: oneTimeCostsBase,
    categories: categoriesBase,
    upcomingCredits: upcomingCreditsBase,
    recurringIncome: recurringIncomeBase
  });

  // Sync master state with cloud state
  React.useEffect(() => {
    setMasterState({
      accounts: accountsBase,
      bills: billsBase,
      oneTimeCosts: oneTimeCostsBase,
      categories: categoriesBase,
      upcomingCredits: upcomingCreditsBase,
      recurringIncome: recurringIncomeBase
    });
  }, [accountsBase, billsBase, oneTimeCostsBase, categoriesBase, upcomingCreditsBase, recurringIncomeBase]);

  // Sync changes back to cloud state
  React.useEffect(() => {
    setAccountsBase(masterState.accounts);
    setBillsBase(masterState.bills);
    setOneTimeCostsBase(masterState.oneTimeCosts);
    setCategoriesBase(masterState.categories);
    setUpcomingCreditsBase(masterState.upcomingCredits);
    setRecurringIncomeBase(masterState.recurringIncome || []);
  }, [masterState]);

  // Extract current state
  const { accounts, bills, oneTimeCosts, categories, upcomingCredits, recurringIncome = [] } = masterState;
  
  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  // Settings/UI with cloud sync
  const [autoDeductCash, setAutoDeductCash] = useCloudState(`${storageKey}:autoDeductCash`, true, user, supabase);
  const [showIgnored, setShowIgnored] = useCloudState(`${storageKey}:showIgnored`, false, user, supabase);
  const [selectedCat, setSelectedCat] = useCloudState(`${storageKey}:selectedCat`, 'All', user, supabase);
  
  // Transaction filters
  const [transactionFilters, setTransactionFilters] = React.useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Last 30 days
    endDate: new Date().toISOString().slice(0, 10),
    type: '',
    category: '',
    accountId: '',
    searchText: ''
  });
  
  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);
  const [editingCredit, setEditingCredit] = React.useState(null);
  const [editingIncome, setEditingIncome] = React.useState(null);
  const [showRetroactiveBillHistory, setShowRetroactiveBillHistory] = React.useState(false);
  const [retroactiveBill, setRetroactiveBill] = React.useState(null);

  // One-time cost form state
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = React.useState("");

  // Retroactive bill payment history
  const [retroactiveDates, setRetroactiveDates] = React.useState([]);
  const [retroactiveYears, setRetroactiveYears] = React.useState(1);

  // Check if any data is syncing
  const isSyncing = categoriesSync?.syncing || accountsSync?.syncing || billsSync?.syncing || 
                    oneTimeCostsSync?.syncing || upcomingCreditsSync?.syncing || nwHistorySync?.syncing || 
                    recurringIncomeSync?.syncing || transactionHistorySync?.syncing;
  
  // Get last sync time with proper null/undefined checking
  const lastSyncTime = React.useMemo(() => {
    const times = [
      categoriesSync?.lastSync, 
      accountsSync?.lastSync, 
      billsSync?.lastSync, 
      oneTimeCostsSync?.lastSync, 
      upcomingCreditsSync?.lastSync,
      recurringIncomeSync?.lastSync,
      nwHistorySync?.lastSync,
      transactionHistorySync?.lastSync
    ]
      .filter(t => t !== null && t !== undefined && t instanceof Date && !isNaN(t.getTime()))
      .map(t => t.getTime());
    
    if (times.length === 0) return null;
    return new Date(Math.max(...times));
  }, [categoriesSync, accountsSync, billsSync, oneTimeCostsSync, upcomingCreditsSync, recurringIncomeSync, nwHistorySync, transactionHistorySync]);

  // Auth functions with comprehensive error handling
  async function handleAuth() {
    if (!supabase) {
      console.error('Supabase client not initialized. Check environment variables.');
      notify('Authentication service not configured. Please check Vercel environment variables.', 'error');
      return;
    }
    
    if (!email || !password) {
      notify('Please enter both email and password', 'error');
      return;
    }
    
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        notify('Account created! Check your email for verification.', 'success');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (error) throw error;
        setUser(data.user);
        setShowAuth(false);
        notify('Logged in successfully!', 'success');
      }
    } catch (error) {
      console.error('Auth error:', error);
      notify(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      notify('Logged out', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      notify('Failed to logout', 'error');
    }
  }

  // Update form state when categories/accounts change
  React.useEffect(() => {
    if(activeCats.length && !activeCats.includes(otcCategory)) setOtcCategory(activeCats[0]);
  }, [activeCats, otcCategory]);

  React.useEffect(() => {
    if(accounts.length && !accounts.find(a => a.id === otcAccountId)) setOtcAccountId(accounts[0].id);
  }, [accounts, otcAccountId]);

  // Calculate monthly recurring income total
  const monthlyRecurringIncomeTotal = React.useMemo(() => {
    try {
      const currentMonth = yyyyMm();
      let total = 0;
      
      for (const income of recurringIncome) {
        if (income.ignored) continue;
        
        if (income.frequency === 'monthly') {
          total += Number(income.amount) || 0;
        } else if (income.frequency === 'biweekly') {
          // Biweekly = 26 payments per year, so ~2.17 per month
          total += (Number(income.amount) || 0) * 2.17;
        } else if (income.frequency === 'weekly') {
          // Weekly = 52 payments per year, so ~4.33 per month
          total += (Number(income.amount) || 0) * 4.33;
        } else if (income.frequency === 'yearly') {
          // Yearly = 1 payment per year, so /12 per month
          total += (Number(income.amount) || 0) / 12;
        }
      }
      
      return total;
    } catch (error) {
      console.error('Error calculating monthly recurring income:', error);
      return 0;
    }
  }, [recurringIncome]);

  // Calculate liquid including guaranteed credits
  const currentLiquidWithGuaranteed = React.useMemo(() => {
    try {
      const baseBalance = accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
      const guaranteedCredits = upcomingCredits
        .filter(c => c.guaranteed && !c.ignored)
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
      return baseBalance + guaranteedCredits;
    } catch (error) {
      console.error('Error calculating liquid with guaranteed:', error);
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    }
  }, [accounts, upcomingCredits]);

  // Calculate liquid with all expected income (including recurring)
  const projectedWithIncome = React.useMemo(() => {
    return currentLiquidWithGuaranteed + monthlyRecurringIncomeTotal;
  }, [currentLiquidWithGuaranteed, monthlyRecurringIncomeTotal]);

  // Derived calculations with error handling
  const currentLiquid = React.useMemo(()=> {
    try {
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    } catch (error) {
      console.error('Error calculating current liquid:', error);
      return 0;
    }
  }, [accounts]);
  
  const upcoming = React.useMemo(()=>{
    try {
      const now = new Date();
      const horizon = new Date(now); 
      horizon.setDate(now.getDate()+7);
      const items = [];
      const currentMonth = yyyyMm();

      for(const b of bills){
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue;
        
        const nextDate = getNextOccurrence(b, now);
        const paid = b.paidMonths.includes(currentMonth) && (b.frequency === 'monthly' || b.frequency === 'yearly');
        const overdue = nextDate < now && !paid;
        const withinWeek = nextDate <= horizon && !paid;
        
        if(overdue || withinWeek) {
          items.push({ bill:b, due: nextDate, overdue });
        }
      }
      
      for(const o of oneTimeCosts){
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue;
        if(o.paid) continue;
        const due = new Date(o.dueDate);
        const overdue = due < new Date();
        const withinWeek = due <= horizon;
        if(overdue || withinWeek) items.push({ otc:o, due, overdue });
      }
      
      items.sort((a,b)=> (a.overdue===b.overdue? a.due.getTime()-b.due.getTime() : a.overdue? -1: 1));

      const byAcc = {};
      const ensure = (id)=> (byAcc[id] ||= { account: accounts.find(a=>a.id===id), total:0, items:[] });
      for(const it of items){
        const amt = it.bill? it.bill.amount : it.otc.amount;
        const accId = it.bill? it.bill.accountId : it.otc.accountId;
        const g = ensure(accId); 
        g.total += amt; 
        g.items.push(it);
      }
      const byAccount = Object.values(byAcc).map(g=> ({ 
        account: g.account, 
        totalDue: g.total, 
        balance: g.account.balance, 
        deficit: Math.max(0, g.total - g.account.balance), 
        items: g.items 
      }));

      return { 
        items, 
        byAccount, 
        totalDeficit: byAccount.reduce((s,d)=> s+d.deficit, 0), 
        weekDueTotal: items.reduce((s,it)=> s + (it.bill? it.bill.amount : it.otc.amount), 0) 
      };
    } catch (error) {
      console.error('Error calculating upcoming:', error);
      return { items: [], byAccount: [], totalDeficit: 0, weekDueTotal: 0 };
    }
  }, [accounts, bills, oneTimeCosts, activeCats]);

  const monthUnpaidTotal = React.useMemo(()=>{
    try {
      const currentMonth = yyyyMm();
      let sum = 0;
      for(const b of bills){ 
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue; 
        if(!b.paidMonths.includes(currentMonth)) sum += Number(b.amount) || 0; 
      }
      for(const o of oneTimeCosts){ 
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue; 
        if(o.dueDate.slice(0,7)===currentMonth && !o.paid) sum += Number(o.amount) || 0; 
      }
      return sum;
    } catch (error) {
      console.error('Error calculating month unpaid total:', error);
      return 0;
    }
  },[bills, oneTimeCosts, activeCats]);

  // Calculate totals per category for the current filter
  const categoryTotals = React.useMemo(() => {
    try {
      const totals = {};
      
      // Initialize totals for all categories
      activeCats.forEach(cat => {
        totals[cat] = { 
          bills: 0, 
          oneTime: 0, 
          paid: 0, 
          unpaid: 0, 
          total: 0,
          count: 0
        };
      });
      
      // Current month for paid status
      const currentMonth = yyyyMm();
      
      // Add up bill totals
      for (const bill of bills) {
        if (bill.ignored) continue;
        if (!activeCats.includes(bill.category)) continue;
        if (selectedCat !== 'All' && bill.category !== selectedCat) continue;
        
        const isPaid = bill.paidMonths.includes(currentMonth);
        const amount = Number(bill.amount) || 0;
        
        totals[bill.category].bills += amount;
        totals[bill.category].count++;
        totals[bill.category].total += amount;
        
        if (isPaid) {
          totals[bill.category].paid += amount;
        } else {
          totals[bill.category].unpaid += amount;
        }
      }
      
      // Add up one-time cost totals
      for (const otc of oneTimeCosts) {
        if (otc.ignored) continue;
        if (!activeCats.includes(otc.category)) continue;
        if (selectedCat !== 'All' && otc.category !== selectedCat) continue;
        
        const amount = Number(otc.amount) || 0;
        
        totals[otc.category].oneTime += amount;
        totals[otc.category].count++;
        totals[otc.category].total += amount;
        
        if (otc.paid) {
          totals[otc.category].paid += amount;
        } else {
          totals[otc.category].unpaid += amount;
        }
      }
      
      // Calculate grand totals
      const grandTotal = {
        bills: 0,
        oneTime: 0,
        paid: 0,
        unpaid: 0,
        total: 0,
        count: 0
      };
      
      Object.values(totals).forEach(cat => {
        grandTotal.bills += cat.bills;
        grandTotal.oneTime += cat.oneTime;
        grandTotal.paid += cat.paid;
        grandTotal.unpaid += cat.unpaid;
        grandTotal.total += cat.total;
        grandTotal.count += cat.count;
      });
      
      return { categories: totals, grand: grandTotal };
    } catch (error) {
      console.error('Error calculating category totals:', error);
      return { categories: {}, grand: { bills: 0, oneTime: 0, paid: 0, unpaid: 0, total: 0, count: 0 } };
    }
  }, [bills, oneTimeCosts, activeCats, selectedCat]);

  const afterWeek = projectedWithIncome - upcoming.weekDueTotal;
  const afterMonth = projectedWithIncome - monthUnpaidTotal;
  const netWorthValue = netWorthMode==='current'? currentLiquidWithGuaranteed : netWorthMode==='afterWeek'? afterWeek : afterMonth;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquidWithGuaranteed);

  const selectedCats = selectedCat==='All' ? 
    [...activeCats, ...bills.map(b => b.category).filter(cat => !activeCats.includes(cat))] : 
    activeCats.filter(c=> c===selectedCat);

  // Filtered transactions
  const filteredTransactions = React.useMemo(() => {
    return filterTransactions(transactionHistory, transactionFilters);
  }, [transactionHistory, transactionFilters]);

  // Category spending calculations for budgets
  const categorySpending = React.useMemo(() => {
    const spending = {};
    const currentMonth = yyyyMm();
    
    categories.forEach(cat => {
      spending[cat.name] = 0;
    });
    
    bills.forEach(bill => {
      if (!bill.ignored && bill.paidMonths.includes(currentMonth)) {
        spending[bill.category] = (spending[bill.category] || 0) + Number(bill.amount);
      }
    });
    
    oneTimeCosts.forEach(otc => {
      if (!otc.ignored && otc.paid && otc.dueDate.slice(0, 7) === currentMonth) {
        spending[otc.category] = (spending[otc.category] || 0) + Number(otc.amount);
      }
    });
    
    return spending;
  }, [bills, oneTimeCosts, categories]);

  // Analytics data calculations
  const accountBalanceData = React.useMemo(() => {
    return accounts
      .filter(a => a.balance > 0)
      .map(a => ({
        name: a.name,
        value: a.balance,
        type: a.type
      }));
  }, [accounts]);

  const categorySpendingData = React.useMemo(() => {
    const categoryTotals = {};
    
    bills.forEach(bill => {
      if (!bill.ignored && activeCats.includes(bill.category)) {
        categoryTotals[bill.category] = (categoryTotals[bill.category] || 0) + bill.amount;
      }
    });
    
    oneTimeCosts.forEach(otc => {
      if (!otc.ignored && !otc.paid && activeCats.includes(otc.category)) {
        categoryTotals[otc.category] = (categoryTotals[otc.category] || 0) + otc.amount;
      }
    });
    
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bills, oneTimeCosts, activeCats]);

  // Net worth trend data
  const netWorthTrend = React.useMemo(() => {
    const trend = [...nwHistory];
    trend.push({
      ts: Date.now(),
      current: currentLiquid,
      afterWeek,
      afterMonth,
      reason: 'current'
    });
    
    return trend
      .sort((a, b) => a.ts - b.ts)
      .slice(-10)
      .map(snap => ({
        date: new Date(snap.ts).toLocaleDateString(),
        current: snap.current,
        afterWeek: snap.afterWeek,
        afterMonth: snap.afterMonth
      }));
  }, [nwHistory, currentLiquid, afterWeek, afterMonth]);

  // Generate 30-day timeline
  const timeline = React.useMemo(() => {
    try {
      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let runningBalance = currentLiquidWithGuaranteed;
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        const income = [];
        const expenses = [];
        
        // Check recurring income
        recurringIncome.forEach(inc => {
          if (inc.ignored) return;
          const nextDate = getNextIncomeOccurrence(inc, date);
          if (nextDate.toDateString() === date.toDateString()) {
            income.push({ type: 'income', name: inc.name, amount: inc.amount });
            runningBalance += Number(inc.amount);
          }
        });
        
        // Check upcoming credits
        upcomingCredits.forEach(credit => {
          if (credit.ignored) return;
          const creditDate = new Date(credit.expectedDate);
          if (creditDate.toDateString() === date.toDateString()) {
            income.push({ type: 'credit', name: credit.name, amount: credit.amount });
            if (credit.guaranteed) {
              // Already counted in initial balance
            } else {
              runningBalance += Number(credit.amount);
            }
          }
        });
        
        // Check bills
        bills.forEach(bill => {
          if (bill.ignored || !activeCats.includes(bill.category)) return;
          const nextDate = getNextOccurrence(bill, date);
          if (nextDate.toDateString() === date.toDateString()) {
            const currentMonth = yyyyMm(date);
            const isPaid = bill.paidMonths.includes(currentMonth);
            if (!isPaid) {
              expenses.push({ type: 'bill', name: bill.name, amount: bill.amount });
              runningBalance -= Number(bill.amount);
            }
          }
        });
        
        // Check one-time costs
        oneTimeCosts.forEach(otc => {
          if (otc.ignored || otc.paid || !activeCats.includes(otc.category)) return;
          const otcDate = new Date(otc.dueDate);
          if (otcDate.toDateString() === date.toDateString()) {
            expenses.push({ type: 'otc', name: otc.name, amount: otc.amount });
            runningBalance -= Number(otc.amount);
          }
        });
        
        days.push({
          date,
          income,
          expenses,
          balance: runningBalance,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate()
        });
      }
      
      return days;
    } catch (error) {
      console.error('Error generating timeline:', error);
      return [];
    }
  }, [currentLiquidWithGuaranteed, recurringIncome, upcomingCredits, bills, oneTimeCosts, activeCats]);

  // Generate retroactive bill payment dates
  React.useEffect(() => {
    if (retroactiveBill && showRetroactiveBillHistory) {
      const dates = [];
      const now = new Date();
      const years = retroactiveYears || 1;
      
      for (let i = 0; i < years * 12; i++) {
        const date = new Date(now);
        date.setMonth(now.getMonth() - i);
        
        // For monthly bills, add each month with the proper due date
        if (retroactiveBill.frequency === 'monthly') {
          const monthDate = new Date(date.getFullYear(), date.getMonth(), retroactiveBill.dueDay);
          if (monthDate < now) {
            dates.push({
              date: monthDate,
              paid: false,
              month: yyyyMm(monthDate)
            });
          }
        } 
        // For yearly bills, add only the month that matches the yearly month
        else if (retroactiveBill.frequency === 'yearly' && date.getMonth() === retroactiveBill.yearlyMonth) {
          const yearDate = new Date(date.getFullYear(), retroactiveBill.yearlyMonth, retroactiveBill.dueDay);
          if (yearDate < now) {
            dates.push({
              date: yearDate,
              paid: false,
              month: yyyyMm(yearDate)
            });
          }
        }
        // For biweekly bills
        else if (retroactiveBill.frequency === 'biweekly') {
          // Get the start date and calculate backward
          const baseDate = new Date(retroactiveBill.biweeklyStart || Date.now());
          const twoWeeks = 14 * 24 * 60 * 60 * 1000;
          let checkDate = new Date(baseDate);
          
          while (checkDate > now.getTime() - (years * 365 * 24 * 60 * 60 * 1000)) {
            if (checkDate < now) {
              dates.push({
                date: new Date(checkDate),
                paid: false,
                month: yyyyMm(checkDate)
              });
            }
            checkDate = new Date(checkDate.getTime() - oneWeek);
          }
        }
      }
      
      // Sort by date, newest first
      dates.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRetroactiveDates(dates);
    }
  }, [retroactiveBill, retroactiveYears, showRetroactiveBillHistory]);

  // ===================== RECURRING INCOME FUNCTIONS =====================
  function addRecurringIncome(name, amount, frequency, payDay, accountId, notes = '') {
    try {
      if (!name || !amount || !frequency || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      
      const newIncome = {
        id: crypto.randomUUID(),
        name: name.trim(),
        amount: Number(amount),
        frequency,
        payDay: frequency === 'monthly' ? Number(payDay) : undefined,
        weeklyDay: frequency === 'weekly' ? Number(payDay) : undefined,
        biweeklyStart: frequency === 'biweekly' ? new Date().toISOString().slice(0, 10) : undefined,
        yearlyMonth: frequency === 'yearly' ? 0 : undefined,
        accountId,
        notes: notes.trim(),
        ignored: false,
        receivedMonths: []
      };
      
      setMasterState(prev => ({
        ...prev,
        recurringIncome: [...(prev.recurringIncome || []), newIncome]
      }));
      
      // Add transaction record
      const transactionRecord = createTransactionRecord('income_added', {
        name: newIncome.name,
        amount: newIncome.amount,
        frequency: newIncome.frequency,
        accountId: newIncome.accountId,
        category: 'Income',
        description: `Added recurring income: ${newIncome.name} (${newIncome.frequency})`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      notify(`Recurring income "${name}" added`, 'success');
    } catch (error) {
      console.error('Error adding recurring income:', error);
      notify('Failed to add recurring income', 'error');
    }
  }

  function toggleIncomeReceived(income) {
    try {
      const currentMonth = yyyyMm();
      const isReceived = income.receivedMonths?.includes(currentMonth);
      
      setMasterState(prev => ({
        ...prev,
        recurringIncome: prev.recurringIncome.map(inc => 
          inc.id === income.id ? {
            ...inc,
            receivedMonths: isReceived 
              ? inc.receivedMonths.filter(m => m !== currentMonth)
              : [...(inc.receivedMonths || []), currentMonth]
          } : inc
        )
      }));
      
      // Add to transaction history if not already received
      if (!isReceived) {
        const transactionRecord = createTransactionRecord('income_received', {
          name: income.name,
          amount: income.amount,
          accountId: income.accountId,
          category: 'Income',
          description: `Received income: ${income.name}`,
          type: 'recurring'
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
      } else {
        // Log when income is marked as not received
        const transactionRecord = createTransactionRecord('income_reversed', {
          name: income.name,
          amount: -income.amount, // Negative amount since it's being reversed
          accountId: income.accountId,
          category: 'Income',
          description: `Reversed income: ${income.name}`,
          type: 'reversal'
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
      }
      
      // Auto-add to account if it's cash and not already received
      const acc = accounts.find(a => a.id === income.accountId);
      if (autoDeductCash[0] && acc?.type === 'Cash') {
        if (!isReceived) {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => 
              a.id === acc.id ? { ...a, balance: a.balance + income.amount } : a
            )
          }));
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => 
              a.id === acc.id ? { ...a, balance: a.balance - income.amount } : a
            )
          }));
        }
      }
      
      notify(`${income.name} marked as ${isReceived ? 'not received' : 'received'}`, 'success');
    } catch (error) {
      console.error('Error toggling income received:', error);
      notify('Failed to update income status', 'error');
    }
  }

  function deleteIncome(incomeId) {
    if (confirm('Delete this recurring income?')) {
      try {
        const income = recurringIncome.find(inc => inc.id === incomeId);
        setMasterState(prev => ({
          ...prev,
          recurringIncome: prev.recurringIncome.filter(inc => inc.id !== incomeId)
        }));
        
        // Add transaction record
        if (income) {
          const transactionRecord = createTransactionRecord('income_deleted', {
            name: income.name,
            amount: income.amount,
            accountId: income.accountId,
            category: 'Income',
            description: `Deleted recurring income: ${income.name}`,
            type: 'deletion'
          });
          
          setTransactionHistory(prev => [transactionRecord, ...prev]);
        }
        
        notify('Recurring income deleted');
      } catch (error) {
        console.error('Error deleting income:', error);
        notify('Failed to delete income', 'error');
      }
    }
  }

  // ===================== UPCOMING CREDITS FUNCTIONS =====================
  function addUpcomingCredit(name, amount, expectedDate, accountId, guaranteed = false, notes = '') {
    try {
      if (!name || !amount || !expectedDate || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      
      const newCredit = {
        id: crypto.randomUUID(),
        name: name.trim(),
        amount: Number(amount),
        expectedDate,
        accountId,
        guaranteed,
        notes: notes.trim(),
        ignored: false,
        received: false
      };
      
      setMasterState(prev => ({
        ...prev,
        upcomingCredits: [...prev.upcomingCredits, newCredit]
      }));
      
      // Add transaction record
      const transactionRecord = createTransactionRecord('credit_added', {
        name: newCredit.name,
        amount: newCredit.amount,
        expectedDate: newCredit.expectedDate,
        accountId: newCredit.accountId,
        guaranteed: newCredit.guaranteed,
        category: 'Credit',
        description: `Added upcoming credit: ${newCredit.name} (${guaranteed ? 'Guaranteed' : 'Not guaranteed'})`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      notify(`Upcoming credit "${name}" added`, 'success');
    } catch (error) {
      console.error('Error adding upcoming credit:', error);
      notify('Failed to add upcoming credit', 'error');
    }
  }

  function receiveCredit(creditId, finalAccountId = null) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;
      
      const targetAccountId = finalAccountId || credit.accountId;
      
      // Add money to account and mark credit as received
      setMasterState(prev => ({
        ...prev,
        accounts: prev.accounts.map(a => 
          a.id === targetAccountId ? 
            { ...a, balance: a.balance + credit.amount } : 
            a
        ),
        upcomingCredits: prev.upcomingCredits.filter(c => c.id !== creditId)
      }));
      
      // Add to transaction history
      const transactionRecord = createTransactionRecord('credit_received', {
        name: credit.name,
        amount: credit.amount,
        accountId: targetAccountId,
        category: 'Credit',
        description: `Received credit: ${credit.name}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      const account = accounts.find(a => a.id === targetAccountId);
      notify(`${fmt(credit.amount)} received in ${account?.name || 'account'}`, 'success');
    } catch (error) {
      console.error('Error receiving credit:', error);
      notify('Failed to receive credit', 'error');
    }
  }

  function toggleCreditGuaranteed(creditId) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;
      
      setMasterState(prev => ({
        ...prev,
        upcomingCredits: prev.upcomingCredits.map(c => 
          c.id === creditId ? { ...c, guaranteed: !c.guaranteed } : c
        )
      }));
      
      // Add transaction record
      const newStatus = !credit.guaranteed;
      const transactionRecord = createTransactionRecord('credit_status_changed', {
        name: credit.name,
        amount: credit.amount,
        accountId: credit.accountId,
        category: 'Credit',
        description: `Credit status changed: ${credit.name} (${newStatus ? 'Guaranteed' : 'Not guaranteed'})`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      notify(`Credit "${credit.name}" marked as ${newStatus ? 'guaranteed' : 'not guaranteed'}`, 'success');
    } catch (error) {
      console.error('Error toggling credit guaranteed:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  function toggleCreditIgnored(creditId) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;
      
      setMasterState(prev => ({
        ...prev,
        upcomingCredits: prev.upcomingCredits.map(c => 
          c.id === creditId ? { ...c, ignored: !c.ignored } : c
        )
      }));
      
      // Add transaction record
      const newStatus = !credit.ignored;
      const transactionRecord = createTransactionRecord('credit_visibility_changed', {
        name: credit.name,
        amount: credit.amount,
        accountId: credit.accountId,
        category: 'Credit',
        description: `Credit ${newStatus ? 'hidden' : 'shown'}: ${credit.name}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      notify(`Credit "${credit.name}" ${newStatus ? 'hidden' : 'shown'}`, 'success');
    } catch (error) {
      console.error('Error toggling credit ignored:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  function deleteCredit(creditId) {
    if (confirm('Delete this upcoming credit?')) {
      try {
        const credit = upcomingCredits.find(c => c.id === creditId);
        setMasterState(prev => ({
          ...prev,
          upcomingCredits: prev.upcomingCredits.filter(c => c.id !== creditId)
        }));
        
        // Add transaction record
        if (credit) {
          const transactionRecord = createTransactionRecord('credit_deleted', {
            name: credit.name,
            amount: credit.amount,
            accountId: credit.accountId,
            category: 'Credit',
            description: `Deleted upcoming credit: ${credit.name}`,
            type: 'deletion'
          });
          
          setTransactionHistory(prev => [transactionRecord, ...prev]);
        }
        
        notify('Upcoming credit deleted');
      } catch (error) {
        console.error('Error deleting credit:', error);
        notify('Failed to delete credit', 'error');
      }
    }
  }

  // ===================== BILL MANAGEMENT FUNCTIONS =====================
  function togglePaid(b){
    try {
      const currentMonth = yyyyMm();
      const isPaid = b.paidMonths.includes(currentMonth);
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          paidMonths: isPaid? x.paidMonths.filter(m=>m!==currentMonth) : [...x.paidMonths, currentMonth] 
        } : x)
      }));
      
      // Record transaction for payment or reversal
      const account = accounts.find(a => a.id === b.accountId);
      const transactionRecord = createTransactionRecord(
        isPaid ? 'bill_payment_reversed' : 'bill_paid',
        {
          name: b.name,
          amount: b.amount,
          accountId: b.accountId,
          category: b.category,
          description: isPaid 
            ? `Reversed payment for bill: ${b.name} (${account?.name || 'Unknown account'})` 
            : `Paid bill: ${b.name} (${account?.name || 'Unknown account'})`
        }
      );
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      const acc = accounts.find(a=>a.id===b.accountId);
      if(autoDeductCash[0] && acc?.type==='Cash'){ 
        if(!isPaid) {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance - b.amount } : a)
          }));
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance + b.amount } : a)
          }));
        }
      }
      notify(`${b.name} marked as ${isPaid ? 'unpaid' : 'paid'}`, 'success');
    } catch (error) {
      console.error('Error toggling paid status:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  function toggleSkipThisMonth(b){
    try {
      const currentMonth = yyyyMm();
      const isSkipped = b.skipMonths?.includes(currentMonth);
      
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { 
          ...x, 
          skipMonths: x.skipMonths?.includes(currentMonth) ? 
            x.skipMonths.filter(m=>m!==currentMonth) : 
            [ ...(x.skipMonths||[]), currentMonth ] 
        } : x)
      }));
      
      // Record transaction for skipping or unskipping
      const transactionRecord = createTransactionRecord(
        isSkipped ? 'bill_unskipped' : 'bill_skipped',
        {
          name: b.name,
          amount: b.amount,
          accountId: b.accountId,
          category: b.category,
          description: isSkipped 
            ? `Unskipped bill for this month: ${b.name}` 
            : `Skipped bill for this month: ${b.name}`
        }
      );
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`${b.name} ${isSkipped ? 'unskipped' : 'skipped'} for this month`, 'success');
    } catch (error) {
      console.error('Error toggling skip month:', error);
      notify('Failed to update skip status', 'error');
    }
  }

  function toggleBillIgnored(b){
    try {
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(x=> x.id===b.id ? { ...x, ignored: !x.ignored } : x)
      }));
      
      // Record transaction for hiding or showing
      const newStatus = !b.ignored;
      const transactionRecord = createTransactionRecord('bill_visibility_changed', {
        name: b.name,
        amount: b.amount,
        accountId: b.accountId,
        category: b.category,
        description: `Bill ${newStatus ? 'hidden' : 'shown'}: ${b.name}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`${b.name} ${newStatus ? 'hidden' : 'shown'}`, 'success');
    } catch (error) {
      console.error('Error toggling bill ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  function addBill(billData) {
    try {
      if (!billData.name || !billData.amount || !billData.frequency || !billData.dueDay || !billData.accountId || !billData.category) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      
      const newBill = {
        id: crypto.randomUUID(),
        name: billData.name.trim(),
        category: billData.category,
        amount: Number(billData.amount),
        frequency: billData.frequency,
        dueDay: Number(billData.dueDay),
        accountId: billData.accountId,
        notes: billData.notes || '',
        paidMonths: [],
        skipMonths: [],
        ignored: false
      };
      
      // Add extra frequency-specific fields
      if (billData.frequency === 'weekly') {
        newBill.weeklyDay = Number(billData.weeklyDay || 0);
        newBill.weeklySchedule = billData.weeklySchedule || 'every';
      } else if (billData.frequency === 'biweekly') {
        newBill.biweeklyStart = billData.biweeklyStart || new Date().toISOString().slice(0, 10);
      } else if (billData.frequency === 'yearly') {
        newBill.yearlyMonth = Number(billData.yearlyMonth || 0);
      }
      
      // Add retroactive payment history if provided
      if (billData.retroactivePaidMonths && Array.isArray(billData.retroactivePaidMonths)) {
        newBill.paidMonths = [...billData.retroactivePaidMonths];
      }
      
      setMasterState(prev => ({
        ...prev,
        bills: [...prev.bills, newBill]
      }));
      
      // Record transaction
      const transactionRecord = createTransactionRecord('bill_added', {
        name: newBill.name,
        amount: newBill.amount,
        frequency: newBill.frequency,
        accountId: newBill.accountId,
        category: newBill.category,
        description: `Added new bill: ${newBill.name} (${newBill.frequency})`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`Bill "${newBill.name}" added successfully`, 'success');
      return true;
    } catch (error) {
      console.error('Error adding bill:', error);
      notify('Failed to add bill', 'error');
      return false;
    }
  }

  function updateBill(billId, updatedData) {
    try {
      const originalBill = bills.find(b => b.id === billId);
      if (!originalBill) {
        notify('Bill not found', 'error');
        return false;
      }
      
      const updatedBill = { ...originalBill, ...updatedData };
      
      // Ensure numeric fields are numbers
      updatedBill.amount = Number(updatedBill.amount);
      updatedBill.dueDay = Number(updatedBill.dueDay);
      
      // Add frequency-specific fields
      if (updatedBill.frequency === 'weekly') {
        updatedBill.weeklyDay = Number(updatedBill.weeklyDay || 0);
      } else if (updatedBill.frequency === 'yearly') {
        updatedBill.yearlyMonth = Number(updatedBill.yearlyMonth || 0);
      }
      
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(b => b.id === billId ? updatedBill : b)
      }));
      
      // Record changes
      const changes = [];
      if (originalBill.name !== updatedBill.name) changes.push(`name from "${originalBill.name}" to "${updatedBill.name}"`);
      if (originalBill.amount !== updatedBill.amount) changes.push(`amount from ${fmt(originalBill.amount)} to ${fmt(updatedBill.amount)}`);
      if (originalBill.category !== updatedBill.category) changes.push(`category from "${originalBill.category}" to "${updatedBill.category}"`);
      if (originalBill.frequency !== updatedBill.frequency) changes.push(`frequency from "${originalBill.frequency}" to "${updatedBill.frequency}"`);
      if (originalBill.dueDay !== updatedBill.dueDay) changes.push(`due day from ${originalBill.dueDay} to ${updatedBill.dueDay}`);
      if (originalBill.accountId !== updatedBill.accountId) {
        const oldAccount = accounts.find(a => a.id === originalBill.accountId)?.name || 'Unknown account';
        const newAccount = accounts.find(a => a.id === updatedBill.accountId)?.name || 'Unknown account';
        changes.push(`account from "${oldAccount}" to "${newAccount}"`);
      }
      
      // Record transaction
      const transactionRecord = createTransactionRecord('bill_updated', {
        name: updatedBill.name,
        amount: updatedBill.amount,
        accountId: updatedBill.accountId,
        category: updatedBill.category,
        changes: changes.join(', '),
        description: `Updated bill: ${updatedBill.name} (${changes.join(', ')})`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`Bill "${updatedBill.name}" updated successfully`, 'success');
      return true;
    } catch (error) {
      console.error('Error updating bill:', error);
      notify('Failed to update bill', 'error');
      return false;
    }
  }

  function deleteBill(billId){
    if(confirm('Delete this bill?')){
      try {
        const bill = bills.find(b => b.id === billId);
        setMasterState(prev => ({
          ...prev,
          bills: prev.bills.filter(b => b.id !== billId)
        }));
        
        // Record transaction
        if (bill) {
          const transactionRecord = createTransactionRecord('bill_deleted', {
            name: bill.name,
            amount: bill.amount,
            accountId: bill.accountId,
            category: bill.category,
            description: `Deleted bill: ${bill.name}`,
            type: 'deletion'
          });
          
          setTransactionHistory(prev => [transactionRecord, ...prev]);
        }
        
        notify('Bill deleted');
      } catch (error) {
        console.error('Error deleting bill:', error);
        notify('Failed to delete bill', 'error');
      }
    }
  }

  function toggleOneTimePaid(o){
    try {
      setMasterState(prev => ({
        ...prev,
        oneTimeCosts: prev.oneTimeCosts.map(x=> x.id===o.id ? { ...x, paid: !x.paid } : x)
      }));
      
      // Record transaction
      const isPaid = !o.paid;
      const account = accounts.find(a => a.id === o.accountId);
      const transactionRecord = createTransactionRecord(
        isPaid ? 'onetime_paid' : 'onetime_payment_reversed',
        {
          name: o.name,
          amount: o.amount,
          accountId: o.accountId,
          category: o.category,
          description: isPaid 
            ? `Paid one-time cost: ${o.name} (${account?.name || 'Unknown account'})` 
            : `Reversed payment for one-time cost: ${o.name} (${account?.name || 'Unknown account'})`
        }
      );
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      const acc = accounts.find(a=>a.id===o.accountId);
      if(autoDeductCash[0] && acc?.type==='Cash'){ 
        if(!o.paid) {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance - o.amount } : a)
          }));
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a=> a.id===acc.id? { ...a, balance: a.balance + o.amount } : a)
          }));
        }
      }
      notify(`${o.name} marked as ${o.paid ? 'unpaid' : 'paid'}`, 'success');
    } catch (error) {
      console.error('Error toggling one-time paid:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  function toggleOTCIgnored(o){
    try {
      setMasterState(prev => ({
        ...prev,
        oneTimeCosts: prev.oneTimeCosts.map(x=> x.id===o.id ? { ...x, ignored: !x.ignored } : x)
      }));
      
      // Record transaction
      const newStatus = !o.ignored;
      const transactionRecord = createTransactionRecord('onetime_visibility_changed', {
        name: o.name,
        amount: o.amount,
        accountId: o.accountId,
        category: o.category,
        description: `One-time cost ${newStatus ? 'hidden' : 'shown'}: ${o.name}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`${o.name} ${newStatus ? 'hidden' : 'shown'}`, 'success');
    } catch (error) {
      console.error('Error toggling OTC ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  function deleteOneTimeCost(otcId){
    if(confirm('Delete this one-time cost?')){
      try {
        const otc = oneTimeCosts.find(o => o.id === otcId);
        setMasterState(prev => ({
          ...prev,
          oneTimeCosts: prev.oneTimeCosts.filter(o => o.id !== otcId)
        }));
        
        // Record transaction
        if (otc) {
          const transactionRecord = createTransactionRecord('onetime_deleted', {
            name: otc.name,
            amount: otc.amount,
            accountId: otc.accountId,
            category: otc.category,
            description: `Deleted one-time cost: ${otc.name}`,
            type: 'deletion'
          });
          
          setTransactionHistory(prev => [transactionRecord, ...prev]);
        }
        
        notify('One-time cost deleted');
      } catch (error) {
        console.error('Error deleting one-time cost:', error);
        notify('Failed to delete one-time cost', 'error');
      }
    }
  }

  function addOneTimeCost() {
    try {
      if(!otcName || !otcAmount || !otcDueDate) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      
      const newOTC = { 
        id: crypto.randomUUID(), 
        name: otcName, 
        category: otcCategory, 
        amount: Number(otcAmount), 
        dueDate: otcDueDate, 
        accountId: otcAccountId, 
        notes: otcNotes, 
        paid: false,
        ignored: false 
      };
      
      setMasterState(prev => ({
        ...prev,
        oneTimeCosts: [...prev.oneTimeCosts, newOTC]
      }));
      
      // Record transaction
      const transactionRecord = createTransactionRecord('onetime_added', {
        name: newOTC.name,
        amount: newOTC.amount,
        accountId: newOTC.accountId,
        category: newOTC.category,
        dueDate: newOTC.dueDate,
        description: `Added one-time cost: ${newOTC.name} (due: ${new Date(newOTC.dueDate).toLocaleDateString()})`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      setOtcName("");
      setOtcAmount(0);
      setOtcNotes("");
      notify('One-time cost added');
    } catch (error) {
      console.error('Error adding one-time cost:', error);
      notify('Failed to add one-time cost', 'error');
    }
  }

  // ===================== CATEGORY MANAGEMENT FUNCTIONS =====================
  function addCategory(name){ 
    try {
      const nm=name.trim(); 
      if(!nm) {
        notify('Category name cannot be empty', 'error');
        return;
      }
      if(categories.some(c=>c.name===nm)) { 
        notify('Category already exists', 'error'); 
        return; 
      } 
      const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
      const newCategory = { id: crypto.randomUUID(), name: nm, order: maxOrder + 1, budget: 0 };
      
      setMasterState(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }));
      
      // Record transaction
      const transactionRecord = createTransactionRecord('category_added', {
        name: newCategory.name,
        description: `Added category: ${newCategory.name}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify('Category added');
    } catch (error) {
      console.error('Error adding category:', error);
      notify('Failed to add category', 'error');
    }
  }

  function toggleIgnoreCategory(name){ 
    try {
      const category = categories.find(c => c.name === name);
      if (!category) return;
      
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c=> c.name===name? { ...c, ignored: !c.ignored } : c)
      }));
      
      // Record transaction
      const newStatus = !category.ignored;
      const transactionRecord = createTransactionRecord('category_visibility_changed', {
        name: name,
        description: `Category ${newStatus ? 'hidden' : 'shown'}: ${name}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`Category "${name}" ${newStatus ? 'hidden' : 'shown'}`, 'success');
    } catch (error) {
      console.error('Error toggling category ignore:', error);
      notify('Failed to update category', 'error');
    }
  }

  function removeCategory(name){ 
    try {
      const hasItems = bills.some(b=>b.category===name) || oneTimeCosts.some(o=>o.category===name); 
      if(hasItems && !confirm(`Category "${name}" has items. Move them to Uncategorized?`)) return; 
      const fallback='Uncategorized'; 
      if(!categories.find(c=>c.name===fallback)) {
        const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
        setMasterState(prev => ({
          ...prev,
          categories: [...prev.categories, {id:crypto.randomUUID(), name:fallback, order: maxOrder + 1, budget: 0}]
        }));
      }
      
      // Move items to Uncategorized
      setMasterState(prev => ({
        ...prev,
        bills: prev.bills.map(b=> b.category===name? { ...b, category: fallback } : b),
        oneTimeCosts: prev.oneTimeCosts.map(o=> o.category===name? { ...o, category: fallback } : o),
        categories: prev.categories.filter(c=> c.name!==name)
      }));
      
      // Record transaction
      const transactionRecord = createTransactionRecord('category_removed', {
        name: name,
        description: `Removed category: ${name}${hasItems ? ' (items moved to Uncategorized)' : ''}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify('Category removed');
    } catch (error) {
      console.error('Error removing category:', error);
      notify('Failed to remove category', 'error');
    }
  }

  function moveCategoryUp(id) {
    try {
      setMasterState(prev => {
        const cats = [...prev.categories];
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        cats.sort((a, b) => a.order - b.order);
        const index = cats.findIndex(c => c.id === id);
        if (index <= 0) return prev;
        const temp = cats[index];
        cats[index] = cats[index - 1];
        cats[index - 1] = temp;
        cats.forEach((c, i) => {
          c.order = i;
        });
        return { ...prev, categories: cats };
      });
      
      // Record transaction
      const category = categories.find(c => c.id === id);
      if (category) {
        const transactionRecord = createTransactionRecord('category_reordered', {
          name: category.name,
          description: `Moved category up: ${category.name}`
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
      }
      
      notify('Category moved up', 'success');
    } catch (error) {
      console.error('Error moving category up:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  function moveCategoryDown(id) {
    try {
      setMasterState(prev => {
        const cats = [...prev.categories];
        cats.forEach((c, i) => {
          if (c.order === undefined) c.order = i;
        });
        cats.sort((a, b) => a.order - b.order);
        const index = cats.findIndex(c => c.id === id);
        if (index < 0 || index >= cats.length - 1) return prev;
        const temp = cats[index];
        cats[index] = cats[index + 1];
        cats[index + 1] = temp;
        cats.forEach((c, i) => {
          c.order = i;
        });
        return { ...prev, categories: cats };
      });
      
      // Record transaction
      const category = categories.find(c => c.id === id);
      if (category) {
        const transactionRecord = createTransactionRecord('category_reordered', {
          name: category.name,
          description: `Moved category down: ${category.name}`
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
      }
      
      notify('Category moved down', 'success');
    } catch (error) {
      console.error('Error moving category down:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  function renameCategory(id, newName) {
    try {
      const trimmed = newName.trim();
      if (!trimmed) {
        notify('Category name cannot be empty', 'error');
        return;
      }
      if (categories.some(c => c.id !== id && c.name === trimmed)) {
        notify('Category name already exists', 'error');
        return;
      }
      const oldName = categories.find(c => c.id === id)?.name;
      
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === id ? { ...c, name: trimmed } : c),
        bills: prev.bills.map(b => b.category === oldName ? { ...b, category: trimmed } : b),
        oneTimeCosts: prev.oneTimeCosts.map(o => o.category === oldName ? { ...o, category: trimmed } : o)
      }));
      
      // Record transaction
      const transactionRecord = createTransactionRecord('category_renamed', {
        name: trimmed,
        oldName: oldName,
        description: `Renamed category from "${oldName}" to "${trimmed}"`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify('Category renamed');
    } catch (error) {
      console.error('Error renaming category:', error);
      notify('Failed to rename category', 'error');
    }
  }

  function updateCategoryBudget(id, newBudget) {
    try {
      const category = categories.find(c => c.id === id);
      if (!category) return;
      
      const oldBudget = category.budget || 0;
      const parsedBudget = Number(newBudget) || 0;
      
      setMasterState(prev => ({
        ...prev,
        categories: prev.categories.map(c => 
          c.id === id ? { ...c, budget: parsedBudget } : c
        )
      }));
      
      // Record transaction if budget actually changed
      if (oldBudget !== parsedBudget) {
        const transactionRecord = createTransactionRecord('budget_updated', {
          name: category.name,
          oldBudget: oldBudget,
          newBudget: parsedBudget,
          description: `Updated budget for "${category.name}" from ${fmt(oldBudget)} to ${fmt(parsedBudget)}`
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
      }
    } catch (error) {
      console.error('Error updating category budget:', error);
      notify('Failed to update budget', 'error');
    }
  }

  // ===================== ACCOUNT MANAGEMENT FUNCTIONS =====================
  function addAccount(name, type, balance = 0) {
    try {
      if (!name || !type) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      
      const newAccount = {
        id: crypto.randomUUID(),
        name: name.trim(),
        type,
        balance: Number(balance) || 0
      };
      
      setMasterState(prev => ({
        ...prev,
        accounts: [...prev.accounts, newAccount]
      }));
      
      // Record transaction
      const transactionRecord = createTransactionRecord('account_added', {
        name: newAccount.name,
        type: newAccount.type,
        balance: newAccount.balance,
        description: `Added account: ${newAccount.name} (${newAccount.type}) with starting balance: ${fmt(newAccount.balance)}`
      });
      
      setTransactionHistory(prev => [transactionRecord, ...prev]);
      
      notify(`Account "${name}" added`, 'success');
    } catch (error) {
      console.error('Error adding account:', error);
      notify('Failed to add account', 'error');
    }
  }

  function updateAccountBalance(accountId, newBalance) {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;
      
      const oldBalance = account.balance;
      const parsedBalance = Number(newBalance) || 0;
      
      setMasterState(prev => ({
        ...prev,
        accounts: prev.accounts.map(a => 
          a.id === accountId ? { ...a, balance: parsedBalance } : a
        )
      }));
      
      // Record transaction if balance actually changed
      if (oldBalance !== parsedBalance) {
        const transactionRecord = createTransactionRecord('balance_updated', {
          name: account.name,
          oldBalance: oldBalance,
          newBalance: parsedBalance,
          difference: parsedBalance - oldBalance,
          accountId: accountId,
          description: `Updated balance for "${account.name}" from ${fmt(oldBalance)} to ${fmt(parsedBalance)}`
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
      }
    } catch (error) {
      console.error('Error updating account balance:', error);
      notify('Failed to update account balance', 'error');
    }
  }

  function deleteAccount(accountId) {
    if (confirm('Delete this account? This will affect related bills and costs.')) {
      try {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return;
        
        // Check if there are any bills or costs using this account
        const relatedBills = bills.filter(b => b.accountId === accountId);
        const relatedOTCs = oneTimeCosts.filter(o => o.accountId === accountId);
        const relatedCredits = upcomingCredits.filter(c => c.accountId === accountId);
        const relatedIncome = recurringIncome.filter(i => i.accountId === accountId);
        
        // If there are related items, set them to use the first available account
        const fallbackAccount = accounts.find(a => a.id !== accountId) || null;
        
        setMasterState(prev => ({
          ...prev,
          accounts: prev.accounts.filter(a => a.id !== accountId),
          bills: prev.bills.map(b => b.accountId === accountId && fallbackAccount ? 
            { ...b, accountId: fallbackAccount.id } : b),
          oneTimeCosts: prev.oneTimeCosts.map(o => o.accountId === accountId && fallbackAccount ? 
            { ...o, accountId: fallbackAccount.id } : o),
          upcomingCredits: prev.upcomingCredits.map(c => c.accountId === accountId && fallbackAccount ? 
            { ...c, accountId: fallbackAccount.id } : c),
          recurringIncome: prev.recurringIncome.map(i => i.accountId === accountId && fallbackAccount ? 
            { ...i, accountId: fallbackAccount.id } : i)
        }));
        
        // Record transaction
        const totalRelated = relatedBills.length + relatedOTCs.length + relatedCredits.length + relatedIncome.length;
        const transactionRecord = createTransactionRecord('account_deleted', {
          name: account.name,
          type: account.type,
          balance: account.balance,
          relatedItems: totalRelated,
          fallbackAccountName: fallbackAccount?.name || 'None',
          description: `Deleted account: ${account.name} (${account.type}) with balance: ${fmt(account.balance)}` +
            (totalRelated > 0 ? ` and moved ${totalRelated} related items to ${fallbackAccount?.name || 'None'}` : '')
        });
        
        setTransactionHistory(prev => [transactionRecord, ...prev]);
        
        notify('Account deleted');
      } catch (error) {
        console.error('Error deleting account:', error);
        notify('Failed to delete account', 'error');
      }
    }
  }

  // ===================== UI HELPERS =====================
  const selectAllOnFocus = (e) => {
    e.target.select();
  };

  const purpleGradient = 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)';
  const purpleGradientLight = 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)';
  const purpleSolid = '#7c3aed';
  const purpleDark = '#6d28d9';
  const purpleLight = '#a78bfa';
  const purpleLightest = '#f5f0ff';

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: purpleLightest, padding: '0.75rem' }}>
        {/* Navigation Tabs */}
        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: currentView === 'dashboard' ? purpleGradient : 'white',
              color: currentView === 'dashboard' ? 'white' : '#374151',
              border: currentView === 'dashboard' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('timeline')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: currentView === 'timeline' ? purpleGradient : 'white',
              color: currentView === 'timeline' ? 'white' : '#374151',
              border: currentView === 'timeline' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            Timeline
          </button>
          <button
            onClick={() => setCurrentView('transactions')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: currentView === 'transactions' ? purpleGradient : 'white',
              color: currentView === 'transactions' ? 'white' : '#374151',
              border: currentView === 'transactions' ? 'none' : '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            History
          </button>
        </div>

        {currentView === 'dashboard' ? (
          <>
            <div style={{ textAlign: 'center', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem', color: purpleSolid }}>
                💰 Cashfl0.io 💰
              </h1>
              
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {user ? (
                  <div>
                    {isSyncing ? '🔄 Syncing...' : '☁️ Synced'} • {user.email}
                    <button
                      onClick={handleLogout}
                      style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{ padding: '0.25rem 0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    Login for Cloud
                  </button>
                )}
              </div>
            </div>

            {/* Net Worth Card */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: purpleSolid }}>Financial Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: purpleLightest, borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: purpleSolid }}>Current Balance</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>{fmt(currentLiquid)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f0fdf4', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#16a34a' }}>With Income</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>{fmt(projectedWithIncome)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fef3c7', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#d97706' }}>After Week</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: afterWeek < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterWeek)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: purpleLightest, borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: purpleSolid }}>After Month</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: afterMonth < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterMonth)}</div>
                </div>
              </div>
              {monthlyRecurringIncomeTotal > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: purpleLightest, borderRadius: '0.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: purpleSolid }}>Monthly Recurring Income</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: purpleSolid }}>{fmt(monthlyRecurringIncomeTotal)}</div>
                </div>
              )}
            </div>

            {/* Accounts Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid }}>Accounts</h3>
                <button 
                  onClick={() => setShowAddAccount(true)}
                  style={{ padding: '0.25rem 0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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

            {/* Recurring Income Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid }}>{showIncomeHistory ? 'Income History' : 'Recurring Income'}</h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => setShowIncomeHistory(!showIncomeHistory)}
                    style={{ padding: '0.25rem 0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                  {filteredTransactions.filter(t => ['income_received', 'credit_received'].includes(t.type)).length > 0 ? (
                    filteredTransactions
                      .filter(t => ['income_received', 'credit_received'].includes(t.type))
                      .slice(0, 20)
                      .map((entry, index) => {
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
                                onChange={(e) => {
                                  setMasterState(prev => ({
                                    ...prev,
                                    upcomingCredits: prev.upcomingCredits.map(c => 
                                      c.id === credit.id ? { ...c, accountId: e.target.value } : c
                                    )
                                  }));
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
  
                  {/* Category Summary */}
                  {selectedCat !== 'All' && (
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid, marginBottom: '0.5rem' }}>Category Summary: {selectedCat}</h3>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <div style={{ textAlign: 'center', padding: '0.5rem', background: purpleLightest, borderRadius: '0.25rem' }}>
                          <div style={{ fontWeight: '600', color: purpleSolid }}>Total</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>
                            {fmt(categoryTotals.categories[selectedCat]?.total || 0)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.5rem', background: purpleLightest, borderRadius: '0.25rem' }}>
                          <div style={{ fontWeight: '600', color: purpleSolid }}>Items</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>
                            {categoryTotals.categories[selectedCat]?.count || 0}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f0fdf4', borderRadius: '0.25rem' }}>
                          <div style={{ fontWeight: '600', color: '#16a34a' }}>Paid</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>
                            {fmt(categoryTotals.categories[selectedCat]?.paid || 0)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fef2f2', borderRadius: '0.25rem' }}>
                          <div style={{ fontWeight: '600', color: '#dc2626' }}>Unpaid</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700' }}>
                            {fmt(categoryTotals.categories[selectedCat]?.unpaid || 0)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Budget progress bar */}
                      {(() => {
                        const category = categories.find(c => c.name === selectedCat);
                        if (!category || !category.budget) return null;
                        
                        const spent = categorySpending[selectedCat] || 0;
                        const budget = category.budget || 0;
                        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
                        const budgetColor = percentUsed >= 100 ? '#dc2626' : percentUsed >= 80 ? '#f59e0b' : '#16a34a';
                        
                        return (
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Budget Progress</span>
                              <span style={{ fontSize: '0.75rem', color: budgetColor, fontWeight: '600' }}>
                                {fmt(spent)} / {fmt(budget)} ({percentUsed.toFixed(0)}%)
                              </span>
                            </div>
                            <div style={{ background: '#e5e7eb', borderRadius: '0.125rem', height: '8px', overflow: 'hidden' }}>
                              <div style={{ 
                                background: budgetColor, 
                                height: '100%', 
                                width: `${Math.min(100, percentUsed)}%`,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
  
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid, marginBottom: '0.75rem' }}>Due This Week</h3>
                    
                    {upcoming.items
                      .filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category))
                      .map((it, idx) => {
                        const name = it.bill ? it.bill.name : it.otc.name;
                        const amt = it.bill ? it.bill.amount : it.otc.amount;
                        
                        return (
                          <div key={idx} style={{ 
                            background: it.overdue ? '#fef2f2' : '#f9fafb',
                            padding: '0.5rem', 
                            borderRadius: '0.375rem',
                            border: `1px solid ${it.overdue ? '#fca5a5' : '#d1d5db'}`,
                            marginBottom: '0.375rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{name}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: it.overdue ? '#dc2626' : '#000' }}>
                                {fmt(amt)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                              {it.overdue ? '⚠️ OVERDUE' : ''} {it.due.toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => it.bill ? togglePaid(it.bill) : toggleOneTimePaid(it.otc)}
                              style={{
                                width: '100%',
                                marginTop: '0.25rem',
                                padding: '0.25rem',
                                background: purpleSolid,
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              Mark Paid
                            </button>
                          </div>
                        );
                      })}
                    
                    {upcoming.items.filter(it => selectedCats.includes(it.bill ? it.bill.category : it.otc.category)).length === 0 && (
                      <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                        Nothing due this week!
                      </div>
                    )}
                  </div>
  
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.25rem', 
                    overflowX: 'auto', 
                    paddingBottom: '0.25rem', 
                    background: purpleGradient, 
                    padding: '0.5rem', 
                    borderRadius: '0.5rem', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                    marginBottom: '0.75rem' 
                  }}>
                    {['All', ...activeCats].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCat(cat)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.25rem',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          background: selectedCat === cat ? 'white' : 'transparent',
                          color: selectedCat === cat ? purpleSolid : 'white',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
  
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid, marginBottom: '0.75rem' }}>All Bills</h3>
                    
                    {bills
                      .filter(b => selectedCats.includes(b.category))
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
                            marginBottom: '0.375rem',
                            opacity: bill.ignored ? 0.6 : 1
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{bill.name}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(bill.amount)}</span>
                            </div>
                            
                            <div style={{ fontSize: '0.625rem', color: '#6b7280', marginBottom: '0.375rem' }}>
                              {bill.frequency} • Due: {bill.dueDay}{bill.frequency === 'monthly' ? 'th of month' : ''} • {account?.name} • Next: {nextDate.toLocaleDateString()}
                              {bill.notes && <div style={{ marginTop: '0.125rem', fontStyle: 'italic' }}>{bill.notes}</div>}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.625rem' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isPaid} 
                                  onChange={() => togglePaid(bill)} 
                                />
                                {isPaid ? '✅ Paid' : 'Not paid'}
                              </label>
                              <button
                                onClick={() => setEditingBill(bill)}
                                style={{ padding: '0.125rem 0.25rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleBillIgnored(bill)}
                                style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                              >
                                {bill.ignored ? 'Show' : 'Hide'}
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
                        onClick={() => setShowAddBill(true)}
                        style={{ width: '100%', padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
                      >
                        + Add Bill
                      </button>
                  </div>
  
                  {/* One-Time Costs */}
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid, marginBottom: '0.75rem' }}>One-Time Costs</h3>
                    
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
                        style={{ width: '100%', padding: '0.375rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                      >
                        Add One-Time Cost
                      </button>
                    </div>
  
                    {oneTimeCosts
                      .filter(o => selectedCats.includes(o.category) && (!showIgnored[0] ? !o.ignored : true))
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
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
  
                  {/* Categories Management with Budgets */}
                  <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid, marginBottom: '0.75rem' }}>Categories & Budgets</h3>
                    
                    <div style={{ marginBottom: '0.75rem' }}>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const name = e.target.categoryName.value.trim();
                        if (name) {
                          addCategory(name);
                          e.target.categoryName.value = '';
                        }
                      }}>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <input
                            name="categoryName"
                            placeholder="New category name"
                            style={{ flex: 1, padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                          />
                          <button
                            type="submit"
                            style={{ padding: '0.375rem 0.75rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                          >
                            Add
                          </button>
                        </div>
                      </form>
                    </div>
  
                    {categories
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .map(cat => {
                        const spent = categorySpending[cat.name] || 0;
                        const budget = cat.budget || 0;
                        const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
                        const budgetColor = percentUsed >= 100 ? '#dc2626' : percentUsed >= 80 ? '#f59e0b' : '#16a34a';
                        
                        return (
                          <div key={cat.id} style={{ 
                            padding: '0.5rem', 
                            background: cat.ignored ? '#f3f4f6' : '#f9fafb', 
                            borderRadius: '0.25rem',
                            marginBottom: '0.5rem',
                            opacity: cat.ignored ? 0.6 : 1
                          }}>
                            {editingCategoryId === cat.id ? (
                              <input
                                type="text"
                                defaultValue={cat.name}
                                onBlur={(e) => {
                                  renameCategory(cat.id, e.target.value);
                                  setEditingCategoryId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    renameCategory(cat.id, e.target.value);
                                    setEditingCategoryId(null);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingCategoryId(null);
                                  }
                                }}
                                autoFocus
                                style={{ fontSize: '0.875rem', padding: '0.125rem 0.25rem', border: '1px solid #d1d5db', borderRadius: '0.125rem', width: '100%', marginBottom: '0.25rem' }}
                              />
                            ) : (
                              <div 
                                style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', marginBottom: '0.25rem' }}
                                onClick={() => setEditingCategoryId(cat.id)}
                              >
                                {cat.name}
                              </div>
                            )}
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>Budget:</span>
                              <input
                                type="number"
                                value={cat.budget || 0}
                                onChange={(e) => updateCategoryBudget(cat.id, e.target.value)}
                                onFocus={selectAllOnFocus}
                                style={{ width: '60px', padding: '0.125rem', border: '1px solid #d1d5db', borderRadius: '0.125rem', fontSize: '0.625rem', textAlign: 'right' }}
                              />
                              <span style={{ fontSize: '0.625rem', color: budgetColor, fontWeight: '600' }}>
                                {fmt(spent)} / {fmt(budget)} ({percentUsed.toFixed(0)}%)
                              </span>
                            </div>
                            
                            {budget > 0 && (
                              <div style={{ background: '#e5e7eb', borderRadius: '0.125rem', height: '6px', marginBottom: '0.25rem', overflow: 'hidden' }}>
                                <div style={{ 
                                  background: budgetColor, 
                                  height: '100%', 
                                  width: `${Math.min(100, percentUsed)}%`,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                onClick={() => moveCategoryUp(cat.id)}
                                style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveCategoryDown(cat.id)}
                                style={{ padding: '0.125rem 0.25rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => toggleIgnoreCategory(cat.name)}
                                style={{ padding: '0.125rem 0.25rem', background: cat.ignored ? '#16a34a' : '#f59e0b', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                              >
                                {cat.ignored ? 'Show' : 'Hide'}
                              </button>
                              <button
                                onClick={() => removeCategory(cat.name)}
                                style={{ padding: '0.125rem 0.25rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
  
                  {/* Settings */}
                  <div style={{ 
                    background: purpleGradient, 
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                    marginBottom: '0.75rem',
                    color: 'white'
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Settings & Actions</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <input 
                          type="checkbox" 
                          checked={autoDeductCash[0]} 
                          onChange={(e) => setAutoDeductCash(e.target.checked)} 
                          style={{ accentColor: 'white' }}
                        />
                        Auto-deduct from Cash accounts when marking bills as paid
                      </label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <input 
                          type="checkbox" 
                          checked={showIgnored[0]} 
                          onChange={(e) => setShowIgnored(e.target.checked)} 
                          style={{ accentColor: 'white' }}
                        />
                        Show ignored items
                      </label>
  
                      <button
                        onClick={() => setCurrentView('transactions')}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          background: 'rgba(255,255,255,0.2)', 
                          color: 'white', 
                          border: '1px solid rgba(255,255,255,0.3)', 
                          borderRadius: '0.25rem', 
                          fontSize: '0.75rem', 
                          marginTop: '0.5rem' 
                        }}
                      >
                        View Transaction History
                      </button>
                      
                      <button
                        onClick={() => {
                          setNwHistory(prev => [...prev, {
                            ts: Date.now(),
                            current: currentLiquid,
                            afterWeek,
                            afterMonth,
                            reason: 'manual_snapshot'
                          }]);
                          
                          // Also record in transaction history
                          const transactionRecord = createTransactionRecord('snapshot_created', {
                            current: currentLiquid,
                            afterWeek,
                            afterMonth,
                            description: 'Created financial snapshot'
                          });
                          
                          setTransactionHistory(prev => [transactionRecord, ...prev]);
                          
                          notify('Snapshot saved!');
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          background: 'rgba(255,255,255,0.2)', 
                          color: 'white', 
                          border: '1px solid rgba(255,255,255,0.3)', 
                          borderRadius: '0.25rem', 
                          fontSize: '0.75rem'
                        }}
                      >
                        Take Financial Snapshot
                      </button>
                    </div>
                  </div>
                </>
              ) : currentView === 'timeline' ? (
                // Timeline View (Mobile)
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: purpleSolid }}>30-Day Cash Flow Timeline</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                    {timeline.map((day, idx) => {
                      const hasActivity = day.income.length > 0 || day.expenses.length > 0;
                      const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                      
                      return (
                        <div key={idx} style={{ 
                          padding: '0.5rem', 
                          background: isWeekend ? '#f9fafb' : 'white',
                          border: `1px solid ${day.balance < 0 ? '#fca5a5' : '#e5e7eb'}`,
                          borderRadius: '0.375rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasActivity ? '0.375rem' : 0 }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                                {day.dayOfWeek}, {day.date.toLocaleDateString()}
                              </div>
                              {idx === 0 && <div style={{ fontSize: '0.625rem', color: '#16a34a', fontWeight: '600' }}>TODAY</div>}
                            </div>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: '700',
                              color: day.balance < 0 ? '#dc2626' : '#000'
                            }}>
                              {fmt(day.balance)}
                            </div>
                          </div>
                          
                          {hasActivity && (
                            <div style={{ fontSize: '0.625rem' }}>
                              {day.income.map((inc, i) => (
                                <div key={`inc-${i}`} style={{ color: '#16a34a', marginBottom: '0.125rem' }}>
                                  + {inc.name}: {fmt(inc.amount)}
                                </div>
                              ))}
                              {day.expenses.map((exp, i) => (
                                <div key={`exp-${i}`} style={{ color: '#dc2626', marginBottom: '0.125rem' }}>
                                  - {exp.name}: {fmt(exp.amount)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Transaction History View (Mobile)
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: purpleSolid }}>Transaction History</h3>
                  
                  {/* Filter controls */}
                  <div style={{ marginBottom: '1rem', background: purpleLightest, padding: '0.75rem', borderRadius: '0.375rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Filters</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
                        <input 
                          type="date" 
                          value={transactionFilters.startDate} 
                          onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>End Date</label>
                        <input 
                          type="date" 
                          value={transactionFilters.endDate} 
                          onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                      <select 
                        value={transactionFilters.type} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
                        style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      >
                        <option value="">All Types</option>
                        <option value="bill_paid">Bill Payments</option>
                        <option value="income_received">Income Received</option>
                        <option value="credit_received">Credits Received</option>
                        <option value="balance_updated">Balance Updates</option>
                        <option value="onetime_paid">One-time Payments</option>
                      </select>
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                      <select 
                        value={transactionFilters.category} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, category: e.target.value }))}
                        style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      >
                        <option value="">All Categories</option>
                        {activeCats.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Income">Income</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Account</label>
                      <select 
                        value={transactionFilters.accountId} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, accountId: e.target.value }))}
                        style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      >
                        <option value="">All Accounts</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#4b5563', display: 'block', marginBottom: '0.25rem' }}>Search</label>
                      <input 
                        type="text" 
                        placeholder="Search transactions..." 
                        value={transactionFilters.searchText} 
                        onChange={(e) => setTransactionFilters(prev => ({ ...prev, searchText: e.target.value }))}
                        style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setTransactionFilters({
                          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                          endDate: new Date().toISOString().slice(0, 10),
                          type: '',
                          category: '',
                          accountId: '',
                          searchText: ''
                        })}
                        style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem' }}
                      >
                        Reset Filters
                      </button>
                      <button 
                        onClick={() => exportTransactionsToCSV(filteredTransactions)}
                        style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.25rem' }}
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>
                  
                  {/* Transactions list */}
                  <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    Found {filteredTransactions.length} transactions
                  </div>
                  
                  <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map(transaction => {
                        const isIncome = ['income_received', 'credit_received'].includes(transaction.type);
                        const isExpense = ['bill_paid', 'onetime_paid'].includes(transaction.type);
                        
                        let backgroundColor = '#f9fafb';
                        let borderColor = '#e5e7eb';
                        
                        if (isIncome) {
                          backgroundColor = '#f0fdf4';
                          borderColor = '#bbf7d0';
                        } else if (isExpense) {
                          backgroundColor = '#fef2f2';
                          borderColor = '#fecaca';
                        }
                        
                        return (
                          <div key={transaction.id} style={{
                            padding: '0.5rem',
                            background: backgroundColor,
                            borderRadius: '0.375rem',
                            border: `1px solid ${borderColor}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: '500', fontSize: '0.75rem' }}>{transaction.description}</span>
                              <span style={{ 
                                fontWeight: '600', 
                                fontSize: '0.75rem',
                                color: isIncome ? '#16a34a' : isExpense ? '#dc2626' : '#6b7280'
                              }}>
                                {isIncome ? '+' : isExpense ? '-' : ''}
                                {fmt(Math.abs(transaction.amount))}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                              {new Date(transaction.timestamp).toLocaleString()} • {transaction.category} • 
                              {accounts.find(a => a.id === transaction.accountId)?.name || 'Unknown Account'}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                        No transactions match your filters
                      </div>
                    )}
                  </div>
                </div>
              )}
  
              {/* MOBILE DIALOGS */}
              {showAuth && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>{isSignUp ? 'Create Account' : 'Login'} for Cloud Sync</h2>
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleAuth} disabled={authLoading} style={{ flex: 1, padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                        {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                      </button>
                      <button onClick={() => setShowAuth(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                        Cancel
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: purpleSolid, textDecoration: 'underline'
                                                                            }}>
                        {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
  
              {showAddAccount && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Account</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      addAccount(formData.get('name'), formData.get('type'), formData.get('balance'));
                      setShowAddAccount(false);
                    }}>
                      <input name="name" placeholder="Account name" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="type" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        <option value="Bank">Bank Account</option>
                        <option value="Cash">Cash</option>
                        <option value="Credit">Credit Card</option>
                        <option value="Investment">Investment</option>
                        <option value="Other">Other</option>
                      </select>
                      <input name="balance" type="number" step="0.01" placeholder="Starting balance" defaultValue="0" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '0.5rem', background: purpleSolid, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Account</button>
                        <button type="button" onClick={() => setShowAddAccount(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {showAddIncome && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Recurring Income</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      addRecurringIncome(
                        formData.get('name'),
                        formData.get('amount'),
                        formData.get('frequency'),
                        formData.get('payDay'),
                        formData.get('accountId'),
                        formData.get('notes')
                      );
                      setShowAddIncome(false);
                    }}>
                      <input name="name" placeholder="Income name (e.g., Salary)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="frequency" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        <option value="monthly">Monthly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <input name="payDay" type="number" min="1" max="28" placeholder="Pay day (1-28)" defaultValue="15" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="accountId" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Income</button>
                        <button type="button" onClick={() => setShowAddIncome(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {showAddCredit && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                      <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Upcoming Credit</h2>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      addUpcomingCredit(
                        formData.get('name'), 
                        formData.get('amount'), 
                        formData.get('expectedDate'), 
                        formData.get('accountId'),
                        formData.get('guaranteed') === 'on',
                        formData.get('notes')
                      );
                      setShowAddCredit(false);
                    }}>
                      <input name="name" placeholder="Credit name (e.g., Refund)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <input name="expectedDate" type="date" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                      <select name="accountId" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <input name="guaranteed" type="checkbox" />
                        Guaranteed (include in calculations)
                      </label>
                      <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Credit</button>
                        <button type="button" onClick={() => setShowAddCredit(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
  
              {showAddBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                  <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ background: purpleGradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{entry.description}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#16a34a' }}>
                                +{fmt(entry.amount)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                              {new Date(entry.timestamp).toLocaleDateString()} • {account?.name || 'Unknown Account'} • {entry.type === 'income_received' ? 'Recurring Income' : 'Credit'}
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
                      const currentMonth = yyyyMm();
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
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: purpleSolid }}>Upcoming Credits</h3>
                <button 
                  onClick={() => setShowAddCredit(true)}
                  style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  + Credit
                </button>
              </div>
              
              {upcomingCredits
                .filter(c => !c.ignored)
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
                      <div style={{ display: 'flex', justifyContent:  new Date(checkDate.getTime() - twoWeeks);
          }
        }
       // For weekly bills
else if (retroactiveBill.frequency === 'weekly') {
  // Generate up to years*52 weeks back
  const weekDay = retroactiveBill.weeklyDay || 0;
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  // Find the most recent occurrence of this weekday
  let checkDate = new Date();
  while (checkDate.getDay() !== weekDay) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Generate past dates
  for (let w = 0; w < years * 52; w++) {
    if (checkDate < now) {
      dates.push({
        date: new Date(checkDate),
        paid: false,
        month: yyyyMm(checkDate)
      });
    }
    checkDate = new Date(checkDate.getTime() - oneWeek);
  }
}
