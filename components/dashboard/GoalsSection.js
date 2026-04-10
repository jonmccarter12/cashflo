import React from 'react';
import { fmt, logTransaction } from '../../lib/utils';
import { notify } from '../Notify';

function GoalsSection({
  isMobile,
  savingsGoals = [],
  accounts = [],
  user,
  supabase,
  setTransactions
}) {
  const [showAddGoal, setShowAddGoal] = React.useState(false);

  const addGoal = async (formData) => {
    try {
      if (!user?.id) {
        notify('Please log in to add goals', 'error');
        return;
      }

      const name = formData.get('goalName');
      const targetAmount = Number(formData.get('targetAmount'));
      const deadline = formData.get('deadline');
      const accountId = formData.get('accountId');

      if (!name || !targetAmount || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }

      const account = accounts.find(a => a.id === accountId);

      const transaction = await logTransaction(
        supabase,
        user.id,
        'goal_created',
        crypto.randomUUID(),
        {
          name: name.trim(),
          targetAmount,
          deadline: deadline || null,
          accountId,
          startBalance: account?.balance || 0
        },
        `Created savings goal "${name}" for ${fmt(targetAmount)}`
      );

      if (transaction) {
        setTransactions(prev => [...prev, transaction]);
        notify('Goal created!', 'success');
        setShowAddGoal(false);
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      notify('Failed to add goal', 'error');
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const transaction = await logTransaction(
        supabase,
        user.id,
        'goal_deleted',
        goalId,
        {},
        'Deleted savings goal'
      );
      if (transaction) {
        setTransactions(prev => [...prev, transaction]);
        notify('Goal deleted', 'success');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      notify('Failed to delete goal', 'error');
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: isMobile ? '0.75rem' : '1.5rem',
      borderRadius: isMobile ? '0.5rem' : '1rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      marginBottom: isMobile ? '0.5rem' : '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: isMobile ? '0.875rem' : '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          Savings Goals
        </h3>
        <button
          onClick={() => setShowAddGoal(true)}
          style={{
            padding: '0.375rem 0.75rem',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
        >
          + Add Goal
        </button>
      </div>

      {savingsGoals.length === 0 && !showAddGoal && (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem', fontSize: '0.875rem' }}>
          No savings goals yet. Set a target to start tracking!
        </div>
      )}

      {savingsGoals.map(goal => {
        const account = accounts.find(a => a.id === goal.accountId);
        const currentBalance = account?.balance || 0;
        const saved = Math.max(0, currentBalance - goal.startBalance);
        const progress = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
        const remaining = Math.max(0, goal.targetAmount - saved);

        let daysLeft = null;
        if (goal.deadline) {
          const deadlineDate = new Date(goal.deadline);
          const today = new Date();
          daysLeft = Math.max(0, Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24)));
        }

        const progressColor = progress >= 100 ? '#10b981' : progress >= 60 ? '#8b5cf6' : progress >= 30 ? '#f59e0b' : '#ef4444';

        return (
          <div key={goal.id} style={{
            padding: '0.75rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: `1px solid ${progress >= 100 ? '#10b981' : '#e5e7eb'}`,
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1f2937' }}>{goal.name}</span>
                {account && (
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                    ({account.name})
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteGoal(goal.id)}
                style={{
                  padding: '0.125rem 0.375rem',
                  background: 'transparent',
                  color: '#9ca3af',
                  border: 'none',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                x
              </button>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                width: `${Math.min(100, progress)}%`,
                height: '100%',
                background: progressColor,
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>
                {fmt(saved)} / {fmt(goal.targetAmount)}
                <span style={{ color: progressColor, fontWeight: '600', marginLeft: '0.5rem' }}>
                  {progress.toFixed(0)}%
                </span>
              </span>
              <span style={{ color: '#6b7280' }}>
                {progress >= 100 ? (
                  <span style={{ color: '#10b981', fontWeight: '600' }}>Goal reached!</span>
                ) : (
                  <>
                    {fmt(remaining)} to go
                    {daysLeft !== null && (
                      <span style={{ marginLeft: '0.5rem', color: daysLeft < 30 ? '#ef4444' : '#6b7280' }}>
                        ({daysLeft}d left)
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}

      {/* Add Goal Dialog */}
      {showAddGoal && (
        <div style={{
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '0.5rem',
          marginTop: '0.5rem'
        }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            addGoal(new FormData(e.target));
          }}>
            <input
              name="goalName"
              placeholder="Goal name (e.g., Emergency Fund)"
              required
              aria-label="Goal name"
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }}
            />
            <input
              name="targetAmount"
              type="number"
              step="0.01"
              placeholder="Target amount (e.g., 5000)"
              required
              aria-label="Target amount"
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }}
            />
            <input
              name="deadline"
              type="date"
              aria-label="Target date"
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }}
            />
            <select
              name="accountId"
              required
              aria-label="Linked account"
              style={{ width: '100%', padding: '0.5rem', marginBottom: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxSizing: 'border-box' }}
            >
              <option value="">Select account to track...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" style={{
                flex: 1,
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}>
                Create Goal
              </button>
              <button type="button" onClick={() => setShowAddGoal(false)} style={{
                padding: '0.5rem 1rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default React.memo(GoalsSection);
