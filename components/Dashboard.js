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
                                  style={{ padding: '0.25rem 0.5rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                                  style={{ padding: '0.25rem 0.5rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                
                {showTransactionHistory && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowExportOptions(true)}
                      style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Export Data
                    </button>
                    <button
                      onClick={() => takeFinancialSnapshot('manual')}
                      style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Take Snapshot
                    </button>
                  </div>
                )}
              </div>

              {/* Due This Week Column */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: THEME.primary.dark }}>Due This Week</h3>
                
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
                              background: THEME.primary.gradient,
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
                
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '500' }}>Week Total</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#92400e' }}>{fmt(upcoming.weekDueTotal)}</div>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div style={{ 
              background: THEME.primary.gradient, 
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
                      border: selectedCat === cat ? '1px solid white' : 'none',
                      background: selectedCat === cat ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Bills Management Section */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: THEME.primary.dark }}>All Bills</h3>
                <button 
                  onClick={() => setShowAddBill(true)}
                  style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
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
                            style={{ padding: '0.25rem 0.5rem', background: THEME.primary.main, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                            style={{ padding: '0.25rem 0.5rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: THEME.primary.dark }}>One-Time Costs</h3>
              
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
                    style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', alignSelf: 'flex-start' }}
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
                            style={{ padding: '0.25rem 0.5rem', background: THEME.primary.main, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                            style={{ padding: '0.25rem 0.5rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: THEME.primary.dark }}>Categories & Budget Management</h3>
              
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
                    style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
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
                        background: cat.ignored ? '#f3f4f6' : '#f9fafb', 
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e7eb',
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
                              style={{ fontSize: '1rem', fontWeight: '600', cursor: 'pointer', flex: 1 }}
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
                              style={{ padding: '0.25rem 0.5rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: THEME.primary.dark }}>Net Worth & Financial Analytics</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center' }}>Where Your Money Is</h4>
                  {accountBalanceData.length > 0 ? (
                    <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '300px', height: '300px' }}>
                        <svg width="300" height="300" viewBox="0 0 300 300">
                          {(() => {
                            const total = accountBalanceData.reduce((sum, item) => sum + item.value, 0);
                            let currentAngle = 0;
                            const colors = [THEME.primary.main, '#10b981', '#f59e0b', '#ef4444', THEME.primary.light];
                            
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
                      const colors = [THEME.primary.main, '#10b981', '#f59e0b', '#ef4444', THEME.primary.light];
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
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', textAlign: 'center' }}>Spending by Category</h4>
                  {categorySpendingData.length > 0 ? (
                    <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '300px', height: '300px' }}>
                        <svg width="300" height="300" viewBox="0 0 300 300">
                          {(() => {
                            const total = categorySpendingData.reduce((sum, item) => sum + item.value, 0);
                            let currentAngle = 0;
                            const colors = ['#ef4444', '#f59e0b', THEME.primary.main, '#10b981', THEME.primary.light];
                            
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
                      const colors = ['#ef4444', '#f59e0b', THEME.primary.main, '#10b981', THEME.primary.light];
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
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: THEME.primary.dark }}>Net Worth Trend</h4>
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
                              <path d={currentPath} stroke={THEME.primary.main} strokeWidth="2" fill="none" />
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
                      <div style={{ width: '12px', height: '2px', backgroundColor: THEME.primary.main }}></div>
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
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: THEME.primary.dark }}>Quick Actions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      onClick={() => takeFinancialSnapshot('manual')}
                      style={{ padding: '0.75rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      📸 Take Financial Snapshot
                    </button>
                    <button
                      onClick={() => setShowExportOptions(true)}
                      style={{ padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      📊 Export Transaction History
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: THEME.primary.dark }}>30-Day Cash Flow Timeline</h3>
            
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: THEME.primary.dark }}>Transaction History</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowExportOptions(true)}
                  style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Export Data
                </button>
                <button
                  onClick={() => takeFinancialSnapshot('manual')}
                  style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Take Snapshot
                </button>
              </div>
            </div>
            
            {/* Filters */}
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: THEME.primary.dark }}>Filter Transactions</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={transactionFilters.startDate || ''} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>End Date</label>
                  <input 
                    type="date" 
                    value={transactionFilters.endDate || ''} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                  <select 
                    value={transactionFilters.type} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  >
                    <option value="all">All Types</option>
                    <option value="income_received">Income</option>
                    <option value="bill_paid">Bill Payment</option>
                    <option value="onetime_cost_paid">One-Time Payment</option>
                    <option value="credit_received">Credit</option>
                    <option value="account_adjustment">Account Adjustment</option>
                    <option value="financial_snapshot">Snapshot</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                  <select 
                    value={transactionFilters.category} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Account</label>
                  <select 
                    value={transactionFilters.account} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, account: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  >
                    <option value="all">All Accounts</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Search</label>
                  <input 
                    type="text" 
                    placeholder="Search transactions..." 
                    value={transactionFilters.searchTerm} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setTransactionFilters({
                    startDate: null,
                    endDate: null,
                    type: 'all',
                    category: 'all',
                    account: 'all',
                    minAmount: null,
                    maxAmount: null,
                    searchTerm: ''
                  })}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: '#6b7280', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.375rem', 
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
                <button 
                  onClick={() => handleExportTransactions()}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: THEME.primary.gradient, 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.375rem', 
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Transaction List */}
            <div style={{ maxHeight: '600px', overflowY: 'auto', padding: '0.5rem' }}>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => {
                  const account = accounts.find(a => a.id === transaction.accountId);
                  
                  let typeColor, typeIcon;
                  switch (transaction.type) {
                    case 'income_received':
                    case 'credit_received':
                      typeColor = '#16a34a';
                      typeIcon = '💰';
                      break;
                    case 'bill_paid':
                    case 'onetime_cost_paid':
                      typeColor = '#dc2626';
                      typeIcon = '💸';
                      break;
                    case 'account_adjustment':
                      typeColor = '#3b82f6';
                      typeIcon = '🔄';
                      break;
                    case 'financial_snapshot':
                      typeColor = THEME.primary.dark;
                      typeIcon = '📸';
                      break;
                    default:
                      typeColor = '#6b7280';
                      typeIcon = '📝';
                  }
                  
                  return (
                    <div key={transaction.id || index} style={{ 
                      background: '#f9fafb',
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      border: `2px solid ${typeColor}`,
                      marginBottom: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          {typeIcon} {transaction.details?.name || transaction.type.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          {new Date(transaction.timestamp).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {account?.name || 'N/A'} •
                          {transaction.category ? ` ${transaction.category} •` : ''}
                          {' '}{transaction.type.replace  // Desktop Version - COMPLETE ORIGINAL FUNCTIONALITY WITH PURPLE THEME
  return (
    <div style={{ minHeight: '100vh', background: THEME.background, padding: '1.5rem' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Navigation Tabs */}
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              padding: '0.75rem 2rem',
              background: currentView === 'dashboard' ? THEME.primary.gradient : 'white',
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
              background: currentView === 'timeline' ? THEME.primary.gradient : 'white',
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
              background: currentView === 'transactions' ? THEME.primary.gradient : 'white',
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
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: 'transparent', 
                background: THEME.primary.gradient, 
                WebkitBackgroundClip: 'text', 
                backgroundClip: 'text',
                marginBottom: '0.5rem' 
              }}>
                💰 Cashfl0.io 💰
              </h1>
              <p style={{ color: '#4b5563' }}>Complete financial management system</p>
              
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SyncStatusIndicator />
                    <span>{user.email}</span>
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
                    style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  >
                    Login for Cloud Sync
                  </button>
                )}
              </div>
            </div>

            {/* Money Needed This Week Header */}
            <div style={{ 
              background: THEME.primary.gradient, 
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
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: THEME.primary.dark }}>Accounts</h3>
                  <button 
                    onClick={() => setShowAddAccount(true)}
                    style={{ padding: '0.5rem 1rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
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
                          style={{ padding: '0.25rem 0.5rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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
                
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f3ff', borderRadius: '0.5rem', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '0.875rem', color: THEME.primary.dark, fontWeight: '500' }}>Total Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: THEME.primary.dark }}>{fmt(currentLiquidWithGuaranteed)}</div>
                </div>
              </div>

              {/* Income Sources Column (Recurring + Credits) */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: THEME.primary.dark }}>
                    {showTransactionHistory ? 'Transaction History' : 'Income Sources'}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setShowTransactionHistory(!showTransactionHistory)}
                      style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                      {showTransactionHistory ? 'Show Income' : 'Show History'}
                    </button>
                    {!showTransactionHistory && (
                      <>
                        <button 
                          onClick={() => setShowAddIncome(true)}
                          style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          + Recurring
                        </button>
                        <button 
                          onClick={() => setShowAddCredit(true)}
                          style={{ padding: '0.5rem 1rem', background: THEME.primary.main, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          + Credit
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                  {showTransactionHistory ? (
                    // Transaction History View
                    filteredTransactions.length > 0 ? (
                      filteredTransactions.slice(0, 20).map((transaction, index) => {
                        const account = accounts.find(a => a.id === transaction.accountId);
                        
                        let typeColor, typeIcon;
                        switch (transaction.type) {
                          case 'income_received':
                          case 'credit_received':
                            typeColor = '#16a34a';
                            typeIcon = '💰';
                            break;
                          case 'bill_paid':
                          case 'onetime_cost_paid':
                            typeColor = '#dc2626';
                            typeIcon = '💸';
                            break;
                          case 'account_adjustment':
                            typeColor = '#3b82f6';
                            typeIcon = '🔄';
                            break;
                          case 'financial_snapshot':
                            typeColor = THEME.primary.dark;
                            typeIcon = '📸';
                            break;
                          default:
                            typeColor = '#6b7280';
                            typeIcon = '📝';
                        }
                        
                        return (
                          <div key={transaction.id || index} style={{ 
                            background: '#f9fafb',
                            padding: '0.75rem', 
                            borderRadius: '0.5rem',
                            border: `2px solid ${typeColor}`,
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                              <span style={{ fontSize: '1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {typeIcon} {transaction.details?.name || transaction.type.replace(/_/g, ' ')}
                              </span>
                              {transaction.amount !== 0 && (
                                <span style={{ 
                                  fontSize: '1rem', 
                                  fontWeight: '600', 
                                  color: transaction.amount > 0 ? '#16a34a' : '#dc2626' 
                                }}>
                                  {transaction.amount > 0 ? '+' : ''}{fmt(transaction.amount)}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                              {new Date(transaction.timestamp).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              {account?.name || 'N/A'} •
                              {transaction.category ? ` ${transaction.category} •` : ''}
                              {' '}{transaction.type.replace(/_/g, ' ')}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                        No transactions found with current filters.
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start        {showAddBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add New Bill</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newBill = {
                  id: crypto.randomUUID(),
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  frequency: formData.get('frequency'),
                  dueDay: Number(formData.get('dueDay')),
                  accountId: formData.get('accountId'),
                  notes: formData.get('notes') || '',
                  paidMonths: [],
                  skipMonths: [],
                  ignored: false
                };
                setMasterState(prev => ({...prev, bills: [...prev.bills, newBill]}));
                
                // Create transaction record
                const transaction = createTransaction(
                  'bill_created',
                  {
                    name: formData.get('name'),
                    amount: Number(formData.get('amount')),
                    category: formData.get('category'),
                    frequency: formData.get('frequency'),
                    dueDay: Number(formData.get('dueDay')),
                    accountId: formData.get('accountId')
                  }
                );
                
                setTransactionHistory(prev => [transaction, ...prev]);
                
                setShowAddBill(false);
                notify('Bill added successfully!', 'success');
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
                <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Bill</button>
                  <button type="button" onClick={() => setShowAddBill(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingBill && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit Bill</h2>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const updatedBill = {
                  ...editingBill,
                  name: formData.get('name'),
                  category: formData.get('category'),
                  amount: Number(formData.get('amount')),
                  frequency: formData.get('frequency'),
                  dueDay: Number(formData.get('dueDay')),
                  accountId: formData.get('accountId'),
                  notes: formData.get('notes') || editingBill.notes || ''
                };
                
                // Create transaction record
                const transaction = createTransaction(
                  'bill_updated',
                  {
                    name: formData.get('name'),
                    oldAmount: editingBill.amount,
                    newAmount: Number(formData.get('amount')),
                    oldCategory: editingBill.category,
                    newCategory: formData.get('category'),
                    oldFrequency: editingBill.frequency,
                    newFrequency: formData.get('frequency'),
                    oldDueDay: editingBill.dueDay,
                    newDueDay: Number(formData.get('dueDay')),
                    oldAccountId: editingBill.accountId,
                    newAccountId: formData.get('accountId')
                  }
                );
                
                setTransactionHistory(prev => [transaction, ...prev]);
                
                setMasterState(prev => ({
                  ...prev,
                  bills: prev.bills.map(b => b.id === editingBill.id ? updatedBill : b)
                }));
                setEditingBill(null);
                notify('Bill updated successfully!', 'success');
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
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Bill</button>
                  <button type="button" onClick={() => setEditingBill(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingOTC && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
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
                
                // Create transaction record
                const transaction = createTransaction(
                  'onetime_cost_updated',
                  {
                    name: formData.get('name'),
                    oldAmount: editingOTC.amount,
                    newAmount: Number(formData.get('amount')),
                    oldCategory: editingOTC.category,
                    newCategory: formData.get('category'),
                    oldDueDate: editingOTC.dueDate,
                    newDueDate: formData.get('dueDate'),
                    oldAccountId: editingOTC.accountId,
                    newAccountId: formData.get('accountId')
                  }
                );
                
                setTransactionHistory(prev => [transaction, ...prev]);
                
                setMasterState(prev => ({
                  ...prev,
                  oneTimeCosts: prev.oneTimeCosts.map(o => o.id === editingOTC.id ? updatedOTC : o)
                }));
                setEditingOTC(null);
                notify('One-time cost updated successfully!', 'success');
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
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Update Cost</button>
                  <button type="button" onClick={() => setEditingOTC(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showExportOptions && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
                <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Export Options</h2>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Export Transaction History</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  Export your transaction history as a CSV file for use in spreadsheet applications.
                </p>
                <button
                  onClick={() => {
                    handleExportTransactions();
                    setShowExportOptions(false);
                  }}
                  style={{ width: '100%', padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem', marginBottom: '0.5rem' }}
                >
                  Export All Transactions
                </button>
                <button
                  onClick={() => {
                    if (filteredTransactions.length > 0) {
                      exportTransactionsToCSV(filteredTransactions);
                    } else {
                      notify('No transactions match your current filters', 'warning');
                    }
                    setShowExportOptions(false);
                  }}
                  style={{ width: '100%', padding: '0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                >
                  Export Filtered Transactions Only
                </button>
              </div>
              <button
                onClick={() => setShowExportOptions(false)}
                style={{ width: '100%', padding: '0.5rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.625rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem' }}>Type</label>
                  <select 
                    value={transactionFilters.type} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    <option value="all">All Types</option>
                    <option value="income_received">Income</option>
                    <option value="bill_paid">Bill Payment</option>
                    <option value="onetime_cost_paid">One-Time Payment</option>
                    <option value="credit_received">Credit</option>
                    <option value="account_adjustment">Account Adjustment</option>
                    <option value="financial_snapshot">Snapshot</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.625rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem' }}>Category</label>
                  <select 
                    value={transactionFilters.category} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.625rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem' }}>Account</label>
                <select 
                  value={transactionFilters.account} 
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, account: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.625rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem' }}>Search</label>
                <input 
                  type="text" 
                  placeholder="Search transactions..." 
                  value={transactionFilters.searchTerm} 
                  onChange={(e) => setTransactionFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setTransactionFilters({
                    startDate: null,
                    endDate: null,
                    type: 'all',
                    category: 'all',
                    account: 'all',
                    minAmount: null,
                    maxAmount: null,
                    searchTerm: ''
                  })}
                  style={{ 
                    flex: 1, 
                    padding: '0.375rem', 
                    background: '#6b7280', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem' 
                  }}
                >
                  Clear Filters
                </button>
                <button 
                  onClick={handleExportTransactions}
                  style={{ 
                    flex: 1, 
                    padding: '0.375rem', 
                    background: THEME.primary.gradient, 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '0.25rem', 
                    fontSize: '0.75rem' 
                  }}
                >
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Transaction List */}
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => {
                  const account = accounts.find(a => a.id === transaction.accountId);
                  
                  let typeColor, typeIcon;
                  switch (transaction.type) {
                    case 'income_received':
                    case 'credit_received':
                      typeColor = '#16a34a';
                      typeIcon = '💰';
                      break;
                    case 'bill_paid':
                    case 'onetime_cost_paid':
                      typeColor = '#dc2626';
                      typeIcon = '💸';
                      break;
                    case 'account_adjustment':
                      typeColor = '#3b82f6';
                      typeIcon = '🔄';
                      break;
                    case 'financial_snapshot':
                      typeColor = THEME.primary.dark;
                      typeIcon = '📸';
                      break;
                    default:
                      typeColor = '#6b7280';
                      typeIcon = '📝';
                  }
                  
                  return (
                    <div key={transaction.id || index} style={{ 
                      background: '#f9fafb',
                      padding: '0.75rem', 
                      borderRadius: '0.375rem',
                      border: `2px solid ${typeColor}`,
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {typeIcon} {transaction.details?.name || transaction.type.replace(/_/g, ' ')}
                        </span>
                        {transaction.amount !== 0 && (
                          <span style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: '600', 
                            color: transaction.amount > 0 ? '#16a34a' : '#dc2626' 
                          }}>
                            {transaction.amount > 0 ? '+' : ''}{fmt(transaction.amount)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        {new Date(transaction.timestamp).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {account?.name || 'N/A'} •
                        {transaction.category ? ` ${transaction.category} •` : ''}
                        {' '}{transaction.type.replace(/_/g, ' ')}
                      </div>
                      {transaction.details && transaction.details.notes && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          {transaction.details.notes}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                  No transactions found. Adjust filters or add new transactions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOBILE DIALOGS */}
        {showAuth && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
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
                <button onClick={handleAuth} disabled={authLoading} style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  {authLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
                </button>
                <button onClick={() => setShowAuth(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Cancel
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: THEME.primary.main, textDecoration: 'underline'
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
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
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
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Account</button>
                  <button type="button" onClick={() => setShowAddAccount(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddIncome && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
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
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Income</button>
                  <button type="button" onClick={() => setShowAddIncome(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddCredit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: '400px' }}>
              <div style={{ background: THEME.primary.gradient, margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
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
                  <button type="submit" style={{ flex: 1, padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.375rem' }}>Add Credit</button>
                  <button type="button" onClick={() => setShowAddCredit(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>Analytics - Pie Charts</h3>
              
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Account Balances</h4>
                {accountBalanceData.length > 0 ? (
                  <>
                    <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        {(() => {
                          const total = accountBalanceData.reduce((sum, item) => sum + item.value, 0);
                          let currentAngle = 0;
                          const colors = [THEME.primary.main, '#10b981', '#f59e0b', '#ef4444', THEME.primary.light];
                          
                          return accountBalanceData.map((item, index) => {
                            const percentage = item.value / total;
                            const angle = percentage * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;
                            
                            const startRadians = (startAngle - 90) * Math.PI / 180;
                            const endRadians = (endAngle - 90) * Math.PI / 180;
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            const x1 = 100 + 80 * Math.cos(startRadians);
                            const y1 = 100 + 80 * Math.sin(startRadians);
                            const x2 = 100 + 80 * Math.cos(endRadians);
                            const y2 = 100 + 80 * Math.sin(endRadians);
                            
                            const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                            
                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="2"
                              />
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      {accountBalanceData.map((item, index) => {
                        const colors = [THEME.primary.main, '#10b981', '#f59e0b', '#ef4444', THEME.primary.light];
                        return (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <div style={{ width: '8px', height: '8px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                            <span>{item.name}: {fmt(item.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No account data</div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Category Spending</h4>
                {categorySpendingData.length > 0 ? (
                  <>
                    <div style={{ width: '200px', height: '200px', margin: '0 auto' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        {(() => {
                          const total = categorySpendingData.reduce((sum, item) => sum + item.value, 0);
                          let currentAngle = 0;
                          const colors = ['#ef4444', '#f59e0b', THEME.primary.main, '#10b981', THEME.primary.light];
                          
                          return categorySpendingData.map((item, index) => {
                            const percentage = item.value / total;
                            const angle = percentage * 360;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            currentAngle = endAngle;
                            
                            const startRadians = (startAngle - 90) * Math.PI / 180;
                            const endRadians = (endAngle - 90) * Math.PI / 180;
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            const x1 = 100 + 80 * Math.cos(startRadians);
                            const y1 = 100 + 80 * Math.sin(startRadians);
                            const x2 = 100 + 80 * Math.cos(endRadians);
                            const y2 = 100 + 80 * Math.sin(endRadians);
                            
                            const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                            
                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="2"
                              />
                            );
                          });
                        })()}
                      </svg>
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      {categorySpendingData.map((item, index) => {
                        const colors = ['#ef4444', '#f59e0b', THEME.primary.main, '#10b981', THEME.primary.light];
                        return (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <div style={{ width: '8px', height: '8px', backgroundColor: colors[index % colors.length], borderRadius: '50%' }}></div>
                            <span>{item.name}: {fmt(item.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No spending data</div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div style={{ 
              background: THEME.primary.gradient, 
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
                  onClick={() => takeFinancialSnapshot('manual')}
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
                  📸 Take Financial Snapshot
                </button>
                
                <button
                  onClick={() => setShowExportOptions(true)}
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
                  📊 Export Transaction History
                </button>
              </div>
            </div>
          </>
        ) : currentView === 'timeline' ? (
          // Timeline View (Mobile)
          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>30-Day Cash Flow Timeline</h3>
            
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
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>Transaction History</h3>
            
            {/* Filters */}
            <div style={{ marginBottom: '1rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: THEME.primary.dark }}>Filters</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.625rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={transactionFilters.startDate || ''} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.625rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem' }}>End Date</label>
                  <input 
                    type="date" 
                    value={transactionFilters.endDate || ''} 
                    onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.25rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem'  const selectAllOnFocus = (e) => {
    e.target.select();
  };

  // UI Components with Purple Theme
  const SyncStatusIndicator = () => {
    let icon, color, text;
    
    switch (overallSyncStatus) {
      case 'syncing':
        icon = '🔄';
        color = THEME.info;
        text = 'Syncing...';
        break;
      case 'success':
        icon = '☁️';
        color = THEME.success;
        text = lastSyncTime ? `Synced ${lastSyncTime.toLocaleTimeString()}` : 'Synced';
        break;
      case 'error':
        icon = '⚠️';
        color = THEME.error;
        text = 'Sync error';
        break;
      case 'retrying':
        icon = '🔄';
        color = THEME.warning;
        text = 'Retrying sync...';
        break;
      default:
        icon = '📱';
        color = THEME.secondary.dark;
        text = 'Local only';
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.25rem', 
        fontSize: '0.75rem', 
        color: color,
        padding: '0.25rem 0.5rem',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '0.25rem'
      }}>
        <span>{icon}</span>
        <span>{text}</span>
      </div>
    );
  };

  // Styled buttons with theme
  const PrimaryButton = ({ children, onClick, ...props }) => (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: THEME.primary.gradient,
        color: THEME.primary.text,
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontWeight: '600',
        transition: 'opacity 0.2s ease',
        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)',
        ...props.style
      }}
      {...props}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({ children, onClick, ...props }) => (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: 'white',
        color: '#374151',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        ...props.style
      }}
      {...props}
    >
      {children}
    </button>
  );

  const DangerButton = ({ children, onClick, ...props }) => (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: THEME.error,
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'opacity 0.2s ease',
        ...props.style
      }}
      {...props}
    >
      {children}
    </button>
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: THEME.background, padding: '0.75rem' }}>
        {/* Navigation Tabs */}
        <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem', display: 'flex', gap: '0.25rem' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: currentView === 'dashboard' ? THEME.primary.gradient : 'white',
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
              background: currentView === 'timeline' ? THEME.primary.gradient : 'white',
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
              background: currentView === 'transactions' ? THEME.primary.gradient : 'white',
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

        <div style={{ textAlign: 'center', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.25rem', background: THEME.primary.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            💰 Cashfl0.io 💰
          </h1>
          
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <SyncStatusIndicator />
                <span>{user.email}</span>
                <button
                  onClick={handleLogout}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                style={{ padding: '0.25rem 0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
              >
                Login for Cloud
              </button>
            )}
          </div>
        </div>

        {currentView === 'dashboard' && (
          <>
            {/* Net Worth Card */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: THEME.primary.dark }}>Financial Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f0f9ff', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: '#0369a1' }}>Current Balance</div>
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
                <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f5f3ff', borderRadius: '0.25rem' }}>
                  <div style={{ fontWeight: '600', color: THEME.primary.dark }}>After Month</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '700', color: afterMonth < 0 ? '#dc2626' : '#16a34a' }}>{fmt(afterMonth)}</div>
                </div>
              </div>
              {monthlyRecurringIncomeTotal > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#e0f2fe', borderRadius: '0.25rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>Monthly Recurring Income</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0369a1' }}>{fmt(monthlyRecurringIncomeTotal)}</div>
                </div>
              )}
            </div>

            {/* Accounts Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: THEME.primary.dark }}>Accounts</h3>
                <button 
                  onClick={() => setShowAddAccount(true)}
                  style={{ padding: '0.25rem 0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                      style={{ padding: '0.125rem 0.25rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
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
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: THEME.primary.dark }}>
                  {showTransactionHistory ? 'Transaction History' : 'Recurring Income'}
                </h3>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => setShowTransactionHistory(!showTransactionHistory)}
                    style={{ padding: '0.25rem 0.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                  >
                    {showTransactionHistory ? 'Show Income' : 'Show History'}
                  </button>
                  {!showTransactionHistory && (
                    <button 
                      onClick={() => setShowAddIncome(true)}
                      style={{ padding: '0.25rem 0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                    >
                      + Income
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {showTransactionHistory ? (
                  // Transaction History View
                  filteredTransactions.length > 0 ? (
                    filteredTransactions.slice(0, 20).map((transaction, index) => {
                      const account = accounts.find(a => a.id === transaction.accountId);
                      
                      let typeColor, typeIcon;
                      switch (transaction.type) {
                        case 'income_received':
                        case 'credit_received':
                          typeColor = '#16a34a';
                          typeIcon = '💰';
                          break;
                        case 'bill_paid':
                        case 'onetime_cost_paid':
                          typeColor = '#dc2626';
                          typeIcon = '💸';
                          break;
                        case 'account_adjustment':
                          typeColor = '#3b82f6';
                          typeIcon = '🔄';
                          break;
                        case 'financial_snapshot':
                          typeColor = THEME.primary.dark;
                          typeIcon = '📸';
                          break;
                        default:
                          typeColor = '#6b7280';
                          typeIcon = '📝';
                      }
                      
                      return (
                        <div key={transaction.id || index} style={{ 
                          background: '#f9fafb',
                          padding: '0.5rem', 
                          borderRadius: '0.375rem',
                          border: `2px solid ${typeColor}`,
                          marginBottom: '0.375rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {typeIcon} {transaction.details?.name || transaction.type}
                            </span>
                            {transaction.amount !== 0 && (
                              <span style={{ 
                                fontSize: '0.875rem', 
                                fontWeight: '600', 
                                color: transaction.amount > 0 ? '#16a34a' : '#dc2626' 
                              }}>
                                {transaction.amount > 0 ? '+' : ''}{fmt(transaction.amount)}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>
                            {new Date(transaction.timestamp).toLocaleString()} • 
                            {account?.name || 'N/A'} •
                            {transaction.category ? ` ${transaction.category} •` : ''}
                            {' '}{transaction.type.replace(/_/g, ' ')}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
                      No transaction history yet.
                    </div>
                  )
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
                                style={{ 
                                  padding: '0.125rem 0.25rem', 
                                  background: isReceived ? '#f59e0b' : '#16a34a', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '0.125rem', 
                                  fontSize: '0.625rem' 
                                }}
                              >
                                {isReceived ? 'Mark Not Received' : 'Mark Received'}
                              </button>
                              <button
                                onClick={() => deleteIncome(income.id)}
                                style={{ 
                                  padding: '0.125rem 0.25rem', 
                                  background: THEME.error, 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '0.125rem', 
                                  fontSize: '0.625rem' 
                                }}
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
            </div>

            {/* Upcoming Credits Section */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: THEME.primary.dark }}>Upcoming Credits</h3>
                <button 
                  onClick={() => setShowAddCredit(true)}
                  style={{ padding: '0.25rem 0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                          style={{ padding: '0.125rem 0.25rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
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

            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>Due This Week</h3>
              
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
                          background: THEME.primary.gradient,
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
              background: THEME.primary.gradient, 
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
                    border: selectedCat === cat ? '1px solid white' : 'none',
                    background: selectedCat === cat ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    color: 'white',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>All Bills</h3>
              
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
                          style={{ padding: '0.125rem 0.25rem', background: THEME.primary.main, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBill(bill.id)}
                          style={{ padding: '0.125rem 0.25rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button 
                  onClick={() => setShowAddBill(true)}
                  style={{ width: '100%', padding: '0.5rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
                >
                  + Add Bill
                </button>
            </div>

            {/* One-Time Costs */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>One-Time Costs</h3>
              
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
                  style={{ width: '100%', padding: '0.375rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                          style={{ padding: '0.125rem 0.25rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
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
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: THEME.primary.dark }}>Categories & Budgets</h3>
              
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
                      style={{ padding: '0.375rem 0.75rem', background: THEME.primary.gradient, color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem' }}
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
                          style={{ padding: '0.125rem 0.25rem', background: THEME.error, color: 'white', border: 'none', borderRadius: '0.125rem', fontSize: '0.625rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>import React from 'react';
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

// Theme constants - Purple Gradient Theme
const THEME = {
  primary: {
    gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    light: '#c4b5fd',
    main: '#8b5cf6',
    dark: '#7c3aed',
    text: 'white'
  },
  secondary: {
    light: '#f3f4f6',
    main: '#e5e7eb',
    dark: '#d1d5db'
  },
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
};

// ===================== ENHANCED DATA PROTECTION SYSTEM =====================
// Data Protection - Create backup of data with versioning
function backupData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        version: "4.0"
      };
      localStorage.setItem(`${key}_backup`, JSON.stringify(backup));
      
      // Create a timestamped backup for additional safety
      const date = new Date();
      const timestampedKey = `${key}_backup_${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}`;
      localStorage.setItem(timestampedKey, JSON.stringify(backup));
      
      // Manage backup retention - keep only the last 10 timestamped backups
      const backupPattern = `${key}_backup_`;
      const backupKeys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith(backupPattern)) {
          backupKeys.push(storageKey);
        }
      }
      
      // Sort by date (newest first) and remove extras
      backupKeys.sort().reverse();
      if (backupKeys.length > 10) {
        backupKeys.slice(10).forEach(oldKey => {
          localStorage.removeItem(oldKey);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }
  return false;
}

// Data Protection - Save data with versioning and backup
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
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }
  return false;
}

// Data Protection - Load data with advanced fallback recovery
function loadData(key, defaultValue) {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    // 1. Try current localStorage
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    
    // 2. Try backup localStorage
    const backup = localStorage.getItem(`${key}_backup`);
    if (backup) {
      const parsedBackup = JSON.parse(backup);
      console.log('Recovered from backup data:', parsedBackup);
      return parsedBackup.data;
    }
    
    // 3. Try timestamped backups (newest first)
    const backupPattern = `${key}_backup_`;
    const backupKeys = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(backupPattern)) {
        backupKeys.push(storageKey);
      }
    }
    
    if (backupKeys.length > 0) {
      // Sort by date (newest first)
      backupKeys.sort().reverse();
      
      for (const backupKey of backupKeys) {
        try {
          const timestampedBackup = localStorage.getItem(backupKey);
          if (timestampedBackup) {
            const parsedTimestampedBackup = JSON.parse(timestampedBackup);
            console.log(`Recovered from timestamped backup: ${backupKey}`, parsedTimestampedBackup);
            return parsedTimestampedBackup.data;
          }
        } catch (e) {
          console.error(`Error parsing timestamped backup ${backupKey}:`, e);
        }
      }
    }
    
    // 4. Try legacy storage keys
    for (const legacyKey of legacyStorageKeys) {
      const legacyData = localStorage.getItem(`${legacyKey}:${key.split(':')[1]}`);
      if (legacyData) {
        const parsedLegacy = JSON.parse(legacyData);
        console.log('Recovered from legacy storage:', legacyKey, parsedLegacy);
        return parsedLegacy;
      }
    }
    
    // 5. Fall back to default values
    return defaultValue;
  } catch (error) {
    console.error('Error loading data:', error);
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
      mergedMap.set(item.id, {...item, _source: 'local'});
    });
    
    // Add/override with cloud items if they're newer or don't exist locally
    cloudData.forEach(item => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, {...item, _source: 'cloud'});
      } else {
        // If the cloud item has updatedAt and it's newer, use it
        const localItem = mergedMap.get(item.id);
        
        // Always prefer cloud item if it has an updatedAt timestamp and it's newer
        if (item.updatedAt && localItem.updatedAt && new Date(item.updatedAt) > new Date(localItem.updatedAt)) {
          mergedMap.set(item.id, {...item, _source: 'cloud'});
        } 
        // If local item was modified more recently than last sync, keep local changes
        else if (localItem._locallyModified && localItem._lastModified) {
          mergedMap.set(item.id, {...localItem, _source: 'local_preferred'});
        }
        // If conflict resolution strategy is needed, implement here
        // For now, prefer cloud data in case of a tie
        else if (item.updatedAt && localItem.updatedAt && new Date(item.updatedAt).getTime() === new Date(localItem.updatedAt).getTime()) {
          // For equivalent timestamps, merge non-null properties
          const merged = {...localItem};
          Object.keys(item).forEach(key => {
            if (item[key] !== null && item[key] !== undefined) {
              merged[key] = item[key];
            }
          });
          merged._source = 'merged';
          mergedMap.set(item.id, merged);
        }
      }
    });
    
    // Clean up temporary _source tracking
    return Array.from(mergedMap.values()).map(item => {
      const cleanItem = {...item};
      delete cleanItem._source;
      return cleanItem;
    });
  }
  
  // For simple arrays or other data types, prefer local data
  return localData;
}

// Enhanced notification system with types and autohide
function notify(msg, type = 'success', duration = 5000){ 
  if(typeof window!=='undefined'){ 
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; background: ${colors[type] || colors.info}; color: white;
      padding: 0.75rem 1rem; border-radius: 0.5rem; z-index: 9999;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      transform: translateX(100%); transition: transform 0.3s ease;
      max-width: 400px; word-wrap: break-word;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 10);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.contains(toast) && document.body.removeChild(toast), 300);
    }, duration);
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
        <div style={{ padding: '2rem', textAlign: 'center', background: '#fee', borderRadius: '0.5rem', margin: '1rem' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#dc2626' }}>{this.state.error?.message || 'Unknown error occurred'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '0.5rem 1rem', background: THEME.primary.main, color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', marginTop: '1rem' }}
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

// ===================== ENHANCED CLOUD SYNC HOOK =====================
// Custom hook for cloud-synced persistent state with enhanced error handling and retry mechanism
function useCloudState(key, initial, user, supabase){
  const [state, setState] = React.useState(initial);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);
  const [syncError, setSyncError] = React.useState(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const [syncQueue, setSyncQueue] = React.useState([]);
  const [syncStatus, setSyncStatus] = React.useState('idle'); // 'idle', 'syncing', 'success', 'error', 'retrying'
  const isInitialMount = React.useRef(true);
  const pendingSync = React.useRef(null);

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
      setSyncStatus('syncing');
      
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
          setSyncStatus('success');
          setRetryCount(0); // Reset retry count on success
        } else {
          setSyncStatus('success'); // No data found, but no error
        }
      } catch (error) {
        console.error('Failed to load from cloud:', error);
        setSyncError(error.message);
        setSyncStatus('error');
        
        // Implement retry logic
        if (retryCount < 3) {
          setSyncStatus('retrying');
          notify(`Retrying cloud sync (${retryCount + 1}/3)...`, 'info');
          
          // Exponential backoff for retries
          const retryDelay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            // The useEffect will trigger again due to retryCount change
          }, retryDelay);
        } else {
          notify(`Failed to load ${key} from cloud: ${error.message}. Using local data.`, 'warning');
          setRetryCount(0); // Reset for next sync attempt
        }
      } finally {
        setSyncing(false);
      }
    };

    loadFromCloud();
  }, [user, supabase, key, initial, retryCount]);

  // Save to localStorage and cloud with queue and debounce
  React.useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Save locally
    saveData(key, state);

    // Prepare for cloud sync if logged in
    if (!user || !supabase) return;

    // Clear any existing timeout
    if (pendingSync.current) {
      clearTimeout(pendingSync.current);
    }

    // Add sync request to queue with timestamp
    const syncRequest = {
      id: Date.now(),
      data: state,
      attempts: 0
    };
    
    setSyncQueue(prev => [...prev, syncRequest]);

    // Debounce cloud save
    pendingSync.current = setTimeout(() => {
      const saveToCloud = async () => {
        if (syncQueue.length === 0) return;
        
        setSyncing(true);
        setSyncError(null);
        setSyncStatus('syncing');
        
        try {
          // Get the latest sync request
          const latestRequest = syncQueue[syncQueue.length - 1];
          
          const { error } = await supabase
            .from('user_data')
            .upsert({
              user_id: user.id,
              data_type: key,
              data: latestRequest.data,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,data_type'
            });

          if (error) throw error;
          
          setLastSync(new Date());
          setSyncStatus('success');
          setSyncQueue([]); // Clear queue on success
        } catch (error) {
          console.error('Failed to save to cloud:', error);
          setSyncError(error.message);
          setSyncStatus('error');
          
          // Update retry attempts for the failed request
          setSyncQueue(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              const lastIndex = updated.length - 1;
              updated[lastIndex] = {
                ...updated[lastIndex],
                attempts: updated[lastIndex].attempts + 1
              };
              
              // If we've tried 3 times, give up on this request
              if (updated[lastIndex].attempts >= 3) {
                notify(`Failed to sync ${key} to cloud after multiple attempts: ${error.message}`, 'error');
                return updated.slice(0, -1); // Remove the failed request
              }
              
              // Schedule a retry with exponential backoff
              const retryDelay = Math.pow(2, updated[lastIndex].attempts) * 1000;
              setTimeout(() => {
                pendingSync.current = setTimeout(saveToCloud, 0);
              }, retryDelay);
              
              notify(`Retrying cloud sync (${updated[lastIndex].attempts}/3)...`, 'info');
            }
            return updated;
          });
        } finally {
          setSyncing(false);
        }
      };

      saveToCloud();
    }, 1000);

    return () => {
      if (pendingSync.current) {
        clearTimeout(pendingSync.current);
      }
    };
  }, [state, user, supabase, key, syncQueue]);

  return [state, setState, { syncing, lastSync, syncError, syncStatus }];
}

// ===================== TRANSACTION HISTORY SYSTEM =====================
// Create a new transaction record
function createTransaction(type, details) {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type, // 'income', 'expense', 'transfer', 'adjustment', etc.
    details,
    category: details.category || null,
    amount: details.amount || 0,
    accountId: details.accountId || null,
    paid: details.paid || false,
    notes: details.notes || ''
  };
}

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

// Export transaction history to CSV
function exportTransactionsToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    notify('No transactions to export', 'warning');
    return;
  }
  
  try {
    // Get all possible keys from all transactions
    const allKeys = new Set();
    transactions.forEach(transaction => {
      Object.keys(transaction).forEach(key => allKeys.add(key));
    });
    
    // Create header row
    const headers = Array.from(allKeys);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    // Add rows
    transactions.forEach(transaction => {
      const row = headers.map(header => {
        let cell = transaction[header] !== undefined ? transaction[header] : '';
        
        // Handle special formatting for certain types
        if (header === 'timestamp' && cell) {
          cell = new Date(cell).toISOString();
        }
        
        // Escape commas and quotes
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        
        return cell;
      });
      
      csvContent += row.join(',') + '\n';
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    notify('Transaction export complete!', 'success');
  } catch (error) {
    console.error('Error exporting transactions:', error);
    notify('Failed to export transactions: ' + error.message, 'error');
  }
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

  // Transaction history with cloud sync
  const [transactionHistory, setTransactionHistory, transactionHistorySync] = useCloudState(
    `${storageKey}:transactions`,
    [],
    user,
    supabase
  );
  
  // Transaction history filters
  const [transactionFilters, setTransactionFilters] = React.useState({
    startDate: null,
    endDate: null,
    type: 'all',
    category: 'all',
    account: 'all',
    minAmount: null,
    maxAmount: null,
    searchTerm: ''
  });
  
  // Show transaction history toggle
  const [showTransactionHistory, setShowTransactionHistory] = React.useState(false);

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
  
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showExportOptions, setShowExportOptions] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);
  const [editingCredit, setEditingCredit] = React.useState(null);
  const [editingIncome, setEditingIncome] = React.useState(null);

  // One-time cost form state
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = React.useState("");

  // Check if any data is syncing
  const isSyncing = categoriesSync?.syncing || accountsSync?.syncing || billsSync?.syncing || 
                   oneTimeCostsSync?.syncing || upcomingCreditsSync?.syncing || 
                   recurringIncomeSync?.syncing || transactionHistorySync?.syncing;
  
  // Get overall sync status
  const overallSyncStatus = React.useMemo(() => {
    if (categoriesSync?.syncStatus === 'error' || accountsSync?.syncStatus === 'error' || 
        billsSync?.syncStatus === 'error' || oneTimeCostsSync?.syncStatus === 'error' || 
        upcomingCreditsSync?.syncStatus === 'error' || recurringIncomeSync?.syncStatus === 'error' ||
        transactionHistorySync?.syncStatus === 'error') {
      return 'error';
    }
    
    if (categoriesSync?.syncStatus === 'retrying' || accountsSync?.syncStatus === 'retrying' || 
        billsSync?.syncStatus === 'retrying' || oneTimeCostsSync?.syncStatus === 'retrying' || 
        upcomingCreditsSync?.syncStatus === 'retrying' || recurringIncomeSync?.syncStatus === 'retrying' ||
        transactionHistorySync?.syncStatus === 'retrying') {
      return 'retrying';
    }
    
    if (isSyncing) {
      return 'syncing';
    }
    
    return 'success';
  }, [
    categoriesSync?.syncStatus, accountsSync?.syncStatus, billsSync?.syncStatus,
    oneTimeCostsSync?.syncStatus, upcomingCreditsSync?.syncStatus,
    recurringIncomeSync?.syncStatus, transactionHistorySync?.syncStatus,
    isSyncing
  ]);
  
  // FIXED: Get last sync time with proper null/undefined checking
  const lastSyncTime = React.useMemo(() => {
    const times = [
      categoriesSync?.lastSync, 
      accountsSync?.lastSync, 
      billsSync?.lastSync, 
      oneTimeCostsSync?.lastSync, 
      upcomingCreditsSync?.lastSync,
      recurringIncomeSync?.lastSync,
      transactionHistorySync?.lastSync
    ]
      .filter(t => t !== null && t !== undefined && t instanceof Date && !isNaN(t.getTime()))
      .map(t => t.getTime());
    
    if (times.length === 0) return null;
    return new Date(Math.max(...times));
  }, [categoriesSync, accountsSync, billsSync, oneTimeCostsSync, upcomingCreditsSync, recurringIncomeSync, transactionHistorySync]);

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

  const afterWeek = projectedWithIncome - upcoming.weekDueTotal;
  const afterMonth = projectedWithIncome - monthUnpaidTotal;

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquidWithGuaranteed);

  const selectedCats = selectedCat==='All' ? 
    [...activeCats, ...bills.map(b => b.category).filter(cat => !activeCats.includes(cat))] : 
    activeCats.filter(c=> c===selectedCat);

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

  // Net worth trend data from transaction history
  const netWorthTrend = React.useMemo(() => {
    // Filter transaction history to get snapshots or significant financial events
    const snapshots = transactionHistory
      .filter(t => t.type === 'snapshot' || t.type === 'balance_update')
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // If no snapshots, create a current one
    if (snapshots.length === 0) {
      snapshots.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'snapshot',
        details: {
          current: currentLiquid,
          afterWeek,
          afterMonth,
          reason: 'current'
        }
      });
    }
    
    return snapshots
      .slice(-10)
      .map(snap => ({
        date: new Date(snap.timestamp).toLocaleDateString(),
        current: snap.details.current || 0,
        afterWeek: snap.details.afterWeek || 0,
        afterMonth: snap.details.afterMonth || 0
      }));
  }, [transactionHistory, currentLiquid, afterWeek, afterMonth]);

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

  // Apply filters to transaction history
  const filteredTransactions = React.useMemo(() => {
    if (!transactionHistory || transactionHistory.length === 0) {
      return [];
    }
    
    return transactionHistory.filter(transaction => {
      // Date range filter
      if (transactionFilters.startDate && new Date(transaction.timestamp) < new Date(transactionFilters.startDate)) {
        return false;
      }
      
      if (transactionFilters.endDate) {
        const endDate = new Date(transactionFilters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (new Date(transaction.timestamp) > endDate) {
          return false;
        }
      }
      
      // Type filter
      if (transactionFilters.type !== 'all' && transaction.type !== transactionFilters.type) {
        return false;
      }
      
      // Category filter
      if (transactionFilters.category !== 'all' && transaction.category !== transactionFilters.category) {
        return false;
      }
      
      // Account filter
      if (transactionFilters.account !== 'all' && transaction.accountId !== transactionFilters.account) {
        return false;
      }
      
      // Amount range filter
      if (transactionFilters.minAmount !== null && transaction.amount < transactionFilters.minAmount) {
        return false;
      }
      
      if (transactionFilters.maxAmount !== null && transaction.amount > transactionFilters.maxAmount) {
        return false;
      }
      
      // Search term filter
      if (transactionFilters.searchTerm) {
        const searchLower = transactionFilters.searchTerm.toLowerCase();
        const matchesSearch = 
          (transaction.details?.name?.toLowerCase().includes(searchLower)) ||
          (transaction.details?.notes?.toLowerCase().includes(searchLower)) ||
          (transaction.category?.toLowerCase().includes(searchLower)) ||
          (transaction.type?.toLowerCase().includes(searchLower));
          
        if (!matchesSearch) {
          return false;
        }
      }
      
      return true;
    });
  }, [transactionHistory, transactionFilters]);

  // RECURRING INCOME FUNCTIONS
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
      
      // Add to transaction history
      const transaction = createTransaction('recurring_income_created', {
        name: name.trim(),
        amount: Number(amount),
        frequency,
        accountId,
        notes: notes.trim()
      });
      
      setTransactionHistory(prev => [transaction, ...prev]);
      
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
      
      // Add to transaction history
      const transaction = createTransaction(
        isReceived ? 'income_unmark_received' : 'income_received',
        {
          name: income.name,
          amount: income.amount,
          accountId: income.accountId,
          month: currentMonth,
          source: 'recurring'
        }
      );
      
      setTransactionHistory(prev => [transaction, ...prev]);
      
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
          
          // Add account adjustment to transaction history
          const adjustmentTransaction = createTransaction('account_adjustment', {
            name: `Auto-deposit from ${income.name}`,
            amount: income.amount,
            accountId: acc.id,
            balance: acc.balance + income.amount,
            adjustment: income.amount
          });
          
          setTransactionHistory(prev => [adjustmentTransaction, ...prev]);
        } else {
          setMasterState(prev => ({
            ...prev,
            accounts: prev.accounts.map(a => 
              a.id === acc.id ? { ...a, balance: a.balance - income.amount } : a
            )
          }));
          
          // Add account adjustment to transaction history
          const adjustmentTransaction = createTransaction('account_adjustment', {
            name: `Reversal of auto-deposit from ${income.name}`,
            amount: -income.amount,
            accountId: acc.id,
            balance: acc.balance - income.amount,
            adjustment: -income.amount
          });
          
          setTransactionHistory(prev => [adjustmentTransaction, ...prev]);
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
        
        // Add to transaction history
        if (income) {
          const transaction = createTransaction('recurring_income_deleted', {
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            accountId: income.accountId
          });
          
          setTransactionHistory(prev => [transaction, ...prev]);
        }
        
        notify('Recurring income deleted', 'success');
      } catch (error) {
        console.error('Error deleting income:', error);
        notify('Failed to delete income', 'error');
      }
    }
  }
