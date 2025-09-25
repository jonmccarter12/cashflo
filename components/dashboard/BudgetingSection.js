import React from 'react';
import { fmt } from '../../lib/utils';
import { notify } from '../Notify';

// AI-powered budgeting engine
const BUDGETING_AI = {
  // Analyze spending patterns and suggest budget amounts
  analyzeCategorySpending: (transactions, timeframe = 3) => {
    const months = Array.from({length: timeframe}, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7); // YYYY-MM format
    });

    const categorySpending = {};
    const categoryTrends = {};

    transactions.forEach(tx => {
      const txMonth = tx.timestamp?.slice(0, 7);
      if (!months.includes(txMonth)) return;

      const category = tx.category || 'Uncategorized';
      const amount = Math.abs(tx.amount || 0);

      if (!categorySpending[category]) {
        categorySpending[category] = [];
        categoryTrends[category] = { total: 0, count: 0, avg: 0 };
      }

      categorySpending[category].push({ month: txMonth, amount });
      categoryTrends[category].total += amount;
      categoryTrends[category].count += 1;
    });

    // Calculate averages and trends
    Object.keys(categoryTrends).forEach(category => {
      const trend = categoryTrends[category];
      trend.avg = trend.total / timeframe;

      // Calculate spending trend (increasing/decreasing)
      const monthlyAmounts = categorySpending[category].reduce((acc, tx) => {
        acc[tx.month] = (acc[tx.month] || 0) + tx.amount;
        return acc;
      }, {});

      const sortedMonths = Object.keys(monthlyAmounts).sort();
      if (sortedMonths.length >= 2) {
        const recent = monthlyAmounts[sortedMonths[sortedMonths.length - 1]];
        const previous = monthlyAmounts[sortedMonths[sortedMonths.length - 2]];
        trend.direction = recent > previous ? 'increasing' : recent < previous ? 'decreasing' : 'stable';
        trend.changePercent = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
      }
    });

    return categoryTrends;
  },

  // Suggest budget amounts based on spending patterns
  suggestBudgets: (categoryTrends, income) => {
    const suggestions = {};
    const totalHistoricalSpending = Object.values(categoryTrends).reduce((sum, trend) => sum + trend.avg, 0);

    Object.entries(categoryTrends).forEach(([category, trend]) => {
      let suggestedAmount = trend.avg;

      // Adjust based on spending trend
      if (trend.direction === 'increasing' && trend.changePercent > 20) {
        suggestedAmount = trend.avg * 1.1; // 10% buffer for increasing spending
      } else if (trend.direction === 'decreasing') {
        suggestedAmount = trend.avg * 0.9; // Reduce for decreasing spending
      }

      // Apply 50/30/20 rule logic
      const spendingPercentage = (suggestedAmount / income) * 100;
      let recommendation = 'optimal';

      if (['Housing', 'Rent', 'Mortgage'].includes(category) && spendingPercentage > 30) {
        recommendation = 'reduce'; // Housing should be <30% of income
      } else if (['Entertainment', 'Dining', 'Shopping'].includes(category) && spendingPercentage > 10) {
        recommendation = 'reduce'; // Discretionary spending
      } else if (['Savings', 'Investment'].includes(category) && spendingPercentage < 20) {
        recommendation = 'increase'; // Savings should be 20%+
      }

      suggestions[category] = {
        suggested: Math.round(suggestedAmount),
        historical: Math.round(trend.avg),
        trend: trend.direction,
        changePercent: Math.round(trend.changePercent || 0),
        recommendation,
        priority: spendingPercentage > 15 ? 'high' : spendingPercentage > 5 ? 'medium' : 'low'
      };
    });

    return suggestions;
  },

  // Calculate financial health metrics
  calculateBudgetHealth: (budgets, actualSpending, income) => {
    const totalBudgeted = Object.values(budgets).reduce((sum, budget) => sum + (budget.amount || 0), 0);
    const totalSpent = Object.values(actualSpending).reduce((sum, spent) => sum + spent, 0);

    const budgetUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const savingsRate = ((income - totalSpent) / income) * 100;

    let healthScore = 100;

    // Deduct points for overspending
    if (budgetUtilization > 100) healthScore -= Math.min(50, (budgetUtilization - 100) * 2);

    // Deduct points for low savings rate
    if (savingsRate < 20) healthScore -= Math.min(30, (20 - savingsRate) * 1.5);

    // Deduct points for high essential spending
    const essentialCategories = ['Housing', 'Food', 'Transportation', 'Utilities'];
    const essentialSpending = essentialCategories.reduce((sum, cat) =>
      sum + (actualSpending[cat] || 0), 0);
    const essentialPercentage = (essentialSpending / income) * 100;

    if (essentialPercentage > 50) healthScore -= Math.min(20, (essentialPercentage - 50));

    return {
      score: Math.max(0, Math.round(healthScore)),
      budgetUtilization: Math.round(budgetUtilization),
      savingsRate: Math.round(savingsRate),
      essentialPercentage: Math.round(essentialPercentage),
      status: healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'poor'
    };
  }
};

// Savings goals templates
const SAVINGS_GOALS_TEMPLATES = {
  emergency: {
    name: 'Emergency Fund',
    description: '3-6 months of expenses',
    icon: '🛡️',
    priority: 'high',
    calculateTarget: (monthlyExpenses) => monthlyExpenses * 6
  },
  vacation: {
    name: 'Vacation Fund',
    description: 'Dream vacation savings',
    icon: '✈️',
    priority: 'medium',
    calculateTarget: (income) => income * 0.1
  },
  house: {
    name: 'House Down Payment',
    description: '20% down payment fund',
    icon: '🏠',
    priority: 'high',
    calculateTarget: (targetPrice) => targetPrice * 0.2
  },
  car: {
    name: 'Car Fund',
    description: 'Vehicle purchase or replacement',
    icon: '🚗',
    priority: 'medium',
    calculateTarget: (targetPrice) => targetPrice
  },
  retirement: {
    name: 'Retirement Boost',
    description: 'Extra retirement savings',
    icon: '🏖️',
    priority: 'high',
    calculateTarget: (income) => income * 0.15
  },
  education: {
    name: 'Education Fund',
    description: 'College or skill development',
    icon: '🎓',
    priority: 'medium',
    calculateTarget: (targetAmount) => targetAmount
  }
};

export default function BudgetingSection({
  isMobile,
  transactions,
  bills,
  accounts,
  recurringIncome
}) {
  const [activeTab, setActiveTab] = React.useState('budget');
  const [budgets, setBudgets] = React.useState({});
  const [savingsGoals, setSavingsGoals] = React.useState([]);
  const [budgetSuggestions, setBudgetSuggestions] = React.useState({});
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState(null);
  const [categoryBusinessTypes, setCategoryBusinessTypes] = React.useState({});

  // Calculate monthly income
  const monthlyIncome = React.useMemo(() => {
    const totalRecurring = recurringIncome?.reduce((sum, income) => sum + (income.amount || 0), 0) || 0;
    return totalRecurring || 5000; // Default if no income data
  }, [recurringIncome]);

  // Calculate current month spending by category
  const currentMonthSpending = React.useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const categorySpending = {};

    transactions?.forEach(tx => {
      if (tx.timestamp?.slice(0, 7) === currentMonth && tx.amount < 0) {
        const category = tx.category || 'Uncategorized';
        categorySpending[category] = (categorySpending[category] || 0) + Math.abs(tx.amount);
      }
    });

    // Add bill payments for current month
    bills?.forEach(bill => {
      if (bill.paidMonths?.includes(currentMonth)) {
        categorySpending[bill.category] = (categorySpending[bill.category] || 0) + (bill.amount || 0);
      }
    });

    return categorySpending;
  }, [transactions, bills]);

  // Generate AI budget suggestions
  React.useEffect(() => {
    if (transactions?.length > 0) {
      const categoryTrends = BUDGETING_AI.analyzeCategorySpending(transactions);
      const suggestions = BUDGETING_AI.suggestBudgets(categoryTrends, monthlyIncome);
      setBudgetSuggestions(suggestions);
    }
  }, [transactions, monthlyIncome]);

  // Load saved budgets, goals, and business types
  React.useEffect(() => {
    const savedBudgets = localStorage.getItem('cashflo_budgets');
    const savedGoals = localStorage.getItem('cashflo_savings_goals');
    const savedBusinessTypes = localStorage.getItem('cashflo_category_business_types');

    if (savedBudgets) {
      try {
        setBudgets(JSON.parse(savedBudgets));
      } catch (error) {
        console.error('Error loading budgets:', error);
      }
    }

    if (savedGoals) {
      try {
        setSavingsGoals(JSON.parse(savedGoals));
      } catch (error) {
        console.error('Error loading savings goals:', error);
      }
    }

    if (savedBusinessTypes) {
      try {
        setCategoryBusinessTypes(JSON.parse(savedBusinessTypes));
      } catch (error) {
        console.error('Error loading category business types:', error);
      }
    }
  }, []);

  // Save budgets to localStorage
  const saveBudgets = (newBudgets) => {
    setBudgets(newBudgets);
    localStorage.setItem('cashflo_budgets', JSON.stringify(newBudgets));
  };

  // Save goals to localStorage
  const saveGoals = (newGoals) => {
    setSavingsGoals(newGoals);
    localStorage.setItem('cashflo_savings_goals', JSON.stringify(newGoals));
  };

  // Save business types to localStorage
  const saveBusinessTypes = (newBusinessTypes) => {
    setCategoryBusinessTypes(newBusinessTypes);
    localStorage.setItem('cashflo_category_business_types', JSON.stringify(newBusinessTypes));
  };

  // Add or update budget for category
  const updateBudget = (category, amount) => {
    if (!amount || isNaN(Number(amount))) {
      notify('Please enter a valid budget amount', 'error');
      return;
    }
    const newBudgets = {
      ...budgets,
      [category]: {
        amount: Number(amount),
        category,
        createdAt: budgets[category]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    saveBudgets(newBudgets);
    notify(`Budget updated for ${category}`, 'success');
  };

  // Update business classification for category
  const updateCategoryBusiness = (category, businessType, entityType) => {
    const newBusinessTypes = {
      ...categoryBusinessTypes,
      [category]: {
        businessType: businessType || 'personal',
        entityType: entityType || null,
        updatedAt: new Date().toISOString()
      }
    };
    saveBusinessTypes(newBusinessTypes);
    notify(`Business classification updated for ${category}`, 'success');
    setEditingCategory(null);
  };

  // Apply AI suggestions
  const applySuggestions = () => {
    const newBudgets = { ...budgets };
    Object.entries(budgetSuggestions).forEach(([category, suggestion]) => {
      newBudgets[category] = {
        amount: suggestion.suggested,
        category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    saveBudgets(newBudgets);
    setShowSuggestions(false);
    notify('AI budget suggestions applied!', 'success');
  };

  // Add savings goal
  const addSavingsGoal = (goalData) => {
    const newGoal = {
      id: Date.now().toString(),
      ...goalData,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveGoals([...savingsGoals, newGoal]);
    notify(`${goalData.name} goal created!`, 'success');
  };

  // Update goal progress
  const updateGoalProgress = (goalId, amount) => {
    const updatedGoals = savingsGoals.map(goal =>
      goal.id === goalId
        ? { ...goal, currentAmount: Number(amount), updatedAt: new Date().toISOString() }
        : goal
    );
    saveGoals(updatedGoals);
    notify('Goal progress updated!', 'success');
  };

  // Calculate budget health
  const budgetHealth = React.useMemo(() => {
    return BUDGETING_AI.calculateBudgetHealth(budgets, currentMonthSpending, monthlyIncome);
  }, [budgets, currentMonthSpending, monthlyIncome]);

  // Get categories for budget setup
  const availableCategories = React.useMemo(() => {
    const categories = new Set();

    // From transactions
    transactions?.forEach(tx => {
      if (tx.category) categories.add(tx.category);
    });

    // From bills
    bills?.forEach(bill => {
      if (bill.category) categories.add(bill.category);
    });

    // Add common categories if not present
    ['Housing', 'Food', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Savings'].forEach(cat => {
      categories.add(cat);
    });

    return Array.from(categories).sort();
  }, [transactions, bills]);

  return (
    <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
          💰 Smart Budgeting & Goals
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          AI-powered budgeting with savings goals and spending insights
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'budget', label: '📊 Budget', icon: '📊' },
          { id: 'goals', label: '🎯 Goals', icon: '🎯' },
          { id: 'insights', label: '💡 Insights', icon: '💡' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? '#8b5cf6' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Budget Overview Card */}
      {activeTab === 'budget' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${budgetHealth.status === 'excellent' ? '#10b981' : budgetHealth.status === 'good' ? '#f59e0b' : '#ef4444'} 0%, ${budgetHealth.status === 'excellent' ? '#059669' : budgetHealth.status === 'good' ? '#d97706' : '#dc2626'} 100%)`,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            color: 'white',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  Budget Health Score
                </h4>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>
                  {budgetHealth.status === 'excellent' ? 'Excellent financial management!' :
                   budgetHealth.status === 'good' ? 'Good budgeting with room to improve' :
                   budgetHealth.status === 'fair' ? 'Fair - consider budget adjustments' :
                   'Needs attention - review spending habits'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>{budgetHealth.score}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>/ 100</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Budget Used</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{budgetHealth.budgetUtilization}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Savings Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{budgetHealth.savingsRate}%</div>
              </div>
              {!isMobile && (
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Essentials</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{budgetHealth.essentialPercentage}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'budget' && (
        <div>
          {/* AI Suggestions Banner */}
          {Object.keys(budgetSuggestions).length > 0 && !showSuggestions && (
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '1rem',
              borderRadius: '0.5rem',
              color: 'white',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>🤖 AI Budget Suggestions Available</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Based on your {Object.keys(budgetSuggestions).length} spending categories
                </div>
              </div>
              <button
                onClick={() => setShowSuggestions(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                View Suggestions
              </button>
            </div>
          )}

          {/* AI Suggestions Modal */}
          {showSuggestions && (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
                🤖 AI Budget Recommendations
              </h4>

              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                {Object.entries(budgetSuggestions).slice(0, 6).map(([category, suggestion]) => (
                  <div key={category} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{category}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {suggestion.trend === 'increasing' ? '📈' : suggestion.trend === 'decreasing' ? '📉' : '➡️'}
                        {suggestion.changePercent !== 0 && ` ${suggestion.changePercent > 0 ? '+' : ''}${suggestion.changePercent}%`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600' }}>{fmt(suggestion.suggested)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        was {fmt(suggestion.historical)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={applySuggestions}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Apply All Suggestions
                </button>
                <button
                  onClick={() => setShowSuggestions(false)}
                  style={{
                    background: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Budget Categories */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {availableCategories.map(category => {
              const budgetAmount = budgets[category]?.amount || 0;
              const spentAmount = currentMonthSpending[category] || 0;
              const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
              const isOverBudget = percentage > 100;

              return (
                <div key={category} style={{
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  background: isOverBudget ? '#fef2f2' : '#ffffff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>{category}</h5>
                      {categoryBusinessTypes[category] && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {categoryBusinessTypes[category].businessType === 'business' ? (
                            <span>🏢 Business {categoryBusinessTypes[category].entityType ? `(${categoryBusinessTypes[category].entityType})` : ''}</span>
                          ) : (
                            <span>👤 Personal</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        placeholder="Budget"
                        value={budgetAmount || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
                            updateBudget(category, value);
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          if (value && !isNaN(value) && Number(value) > 0) {
                            updateBudget(category, value);
                          }
                        }}
                        style={{
                          width: '100px',
                          padding: '0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      />
                      <button
                        onClick={() => setEditingCategory(category)}
                        style={{
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          padding: '0.375rem 0.5rem',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: '#6b7280'
                        }}
                        title="Edit business classification"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>

                  {budgetAmount > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {fmt(spentAmount)} of {fmt(budgetAmount)}
                        </span>
                        <span style={{
                          fontSize: '0.875rem',
                          color: isOverBudget ? '#dc2626' : '#059669',
                          fontWeight: '600'
                        }}>
                          {Math.round(percentage)}%
                        </span>
                      </div>

                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min(percentage, 100)}%`,
                          height: '100%',
                          background: isOverBudget ? '#dc2626' : percentage > 80 ? '#f59e0b' : '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Business Classification Modal */}
                  {editingCategory === category && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '0.75rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        width: isMobile ? '90%' : '400px',
                        maxWidth: '90vw'
                      }}>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
                          🏷️ Classify "{category}"
                        </h4>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                          Set business classification for tax purposes
                        </p>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>Type</label>
                          <select
                            defaultValue={categoryBusinessTypes[category]?.businessType || 'personal'}
                            onChange={(e) => {
                              const businessType = e.target.value;
                              if (businessType === 'personal') {
                                updateCategoryBusiness(category, 'personal', null);
                              } else {
                                // Let them select entity type for business
                              }
                            }}
                            id={`businessType-${category}`}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="personal">👤 Personal</option>
                            <option value="business">🏢 Business</option>
                          </select>
                        </div>

                        {(categoryBusinessTypes[category]?.businessType === 'business' ||
                          document.getElementById(`businessType-${category}`)?.value === 'business') && (
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>Business Entity</label>
                            <select
                              defaultValue={categoryBusinessTypes[category]?.entityType || ''}
                              id={`entityType-${category}`}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="">Select entity type...</option>
                              <option value="Sole Proprietorship">Sole Proprietorship</option>
                              <option value="LLC">LLC</option>
                              <option value="Corporation">Corporation</option>
                              <option value="S-Corp">S-Corp</option>
                              <option value="Partnership">Partnership</option>
                              <option value="Non-Profit">Non-Profit</option>
                            </select>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setEditingCategory(null)}
                            style={{
                              background: 'white',
                              color: '#6b7280',
                              border: '1px solid #d1d5db',
                              padding: '0.5rem 1rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const businessType = document.getElementById(`businessType-${category}`).value;
                              const entityType = document.getElementById(`entityType-${category}`)?.value || null;
                              updateCategoryBusiness(category, businessType, entityType);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '600'
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings Goals Tab */}
      {activeTab === 'goals' && (
        <div>
          {/* Add Goal Button */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => {
                const goalName = prompt('Goal name:');
                const goalAmount = prompt('Target amount:');
                const goalDeadline = prompt('Target date (YYYY-MM-DD):');

                if (goalName && goalAmount && goalDeadline) {
                  addSavingsGoal({
                    name: goalName,
                    targetAmount: Number(goalAmount),
                    deadline: goalDeadline,
                    description: `Custom goal: ${goalName}`,
                    priority: 'medium'
                  });
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '0.5rem'
              }}
            >
              ➕ Add Custom Goal
            </button>
          </div>

          {/* Goal Templates */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              🎯 Quick Start Templates
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {Object.entries(SAVINGS_GOALS_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => {
                    let targetAmount;
                    if (key === 'emergency') {
                      targetAmount = template.calculateTarget(monthlyIncome * 0.7); // 70% of income as expenses estimate
                    } else if (key === 'house') {
                      const housePrice = prompt('Target house price:');
                      if (!housePrice) return;
                      targetAmount = template.calculateTarget(Number(housePrice));
                    } else if (key === 'car') {
                      const carPrice = prompt('Target car price:');
                      if (!carPrice) return;
                      targetAmount = template.calculateTarget(Number(carPrice));
                    } else {
                      targetAmount = template.calculateTarget(monthlyIncome);
                    }

                    const deadline = prompt('Target date (YYYY-MM-DD):');
                    if (deadline) {
                      addSavingsGoal({
                        ...template,
                        targetAmount,
                        deadline
                      });
                    }
                  }}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                  onMouseOut={(e) => e.target.style.background = 'white'}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{template.icon}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1f2937' }}>{template.name}</div>
                  <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Goals */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              📈 Your Goals Progress
            </h4>

            {savingsGoals.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                background: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                <h5 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>
                  No Goals Yet
                </h5>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Start by adding a savings goal above. Emergency fund is recommended first!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {savingsGoals.map(goal => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysLeft < 0;

                  return (
                    <div key={goal.id} style={{
                      padding: '1.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      background: 'white'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <h5 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                            {goal.icon} {goal.name}
                          </h5>
                          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            {goal.description}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: isOverdue ? '#dc2626' : '#6b7280' }}>
                            {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                            {Math.round(progress)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{
                        width: '100%',
                        height: '12px',
                        background: '#e5e7eb',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          width: `${Math.min(progress, 100)}%`,
                          height: '100%',
                          background: progress >= 100 ? '#10b981' : progress >= 75 ? '#059669' : progress >= 50 ? '#f59e0b' : '#8b5cf6',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>

                      {/* Update Progress Input */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          placeholder="Current amount"
                          defaultValue={goal.currentAmount}
                          onBlur={(e) => updateGoalProgress(goal.id, e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem'
                          }}
                        />
                        <button
                          onClick={() => {
                            const amount = prompt('Add to this goal:', '');
                            if (amount) {
                              updateGoalProgress(goal.id, goal.currentAmount + Number(amount));
                            }
                          }}
                          style={{
                            background: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          💰 Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Insights Tab */}
      {activeTab === 'insights' && (
        <div>
          {/* Monthly Spending Trends */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              📊 Spending Analysis
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
              {/* Top Spending Categories */}
              <div style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1f2937' }}>
                  🏆 Top Spending Categories
                </h5>
                {Object.entries(currentMonthSpending)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([category, amount]) => (
                    <div key={category} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span style={{ fontSize: '0.875rem' }}>{category}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(amount)}</span>
                    </div>
                  ))}
              </div>

              {/* Budget vs Actual */}
              <div style={{
                padding: '1rem',
                background: '#f0fdf4',
                borderRadius: '0.5rem',
                border: '1px solid #d1fae5'
              }}>
                <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1f2937' }}>
                  🎯 Budget Performance
                </h5>
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Budgeted</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                    {fmt(Object.values(budgets).reduce((sum, budget) => sum + (budget.amount || 0), 0))}
                  </div>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Spent</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                    {fmt(Object.values(currentMonthSpending).reduce((sum, spent) => sum + spent, 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Remaining</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#8b5cf6' }}>
                    {fmt(Object.values(budgets).reduce((sum, budget) => sum + (budget.amount || 0), 0) -
                         Object.values(currentMonthSpending).reduce((sum, spent) => sum + spent, 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Tips */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            color: 'white'
          }}>
            <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>
              💡 Smart Financial Tips
            </h4>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {budgetHealth.savingsRate < 20 && (
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>💰 Boost Your Savings Rate</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    Your savings rate is {budgetHealth.savingsRate}%. Try to reach 20% by reducing discretionary spending.
                  </div>
                </div>
              )}

              {budgetHealth.budgetUtilization > 90 && (
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>⚠️ Budget Alert</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    You've used {budgetHealth.budgetUtilization}% of your budget. Consider adjusting spending habits.
                  </div>
                </div>
              )}

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>🎯 Pro Tip</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Follow the 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt repayment.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}