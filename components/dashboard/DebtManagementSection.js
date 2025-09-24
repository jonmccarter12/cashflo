import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingDown,
  Target,
  Calendar,
  BarChart3,
  Calculator,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  PiggyBank,
  Flame,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DEBT_MANAGEMENT_ENGINE = {
  calculatePayoffStrategies: (debts, extraPayment = 0) => {
    if (!debts || debts.length === 0) return { snowball: [], avalanche: [] };

    // Debt Snowball (lowest balance first)
    const snowballDebts = [...debts].sort((a, b) => a.balance - b.balance);

    // Debt Avalanche (highest interest rate first)
    const avalancheDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);

    const calculatePayoffPlan = (sortedDebts) => {
      let plan = [];
      let totalFreedPayment = extraPayment;
      let currentDate = new Date();

      sortedDebts.forEach((debt, index) => {
        const monthlyPayment = debt.minimumPayment + totalFreedPayment;
        const monthsToPayoff = Math.ceil(
          Math.log(1 + (debt.balance * (debt.interestRate / 100 / 12)) / monthlyPayment) /
          Math.log(1 + (debt.interestRate / 100 / 12))
        );

        const totalInterest = (monthsToPayoff * monthlyPayment) - debt.balance;
        const payoffDate = new Date(currentDate);
        payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

        plan.push({
          ...debt,
          monthlyPayment,
          monthsToPayoff: isFinite(monthsToPayoff) ? monthsToPayoff : 0,
          totalInterest: totalInterest > 0 ? totalInterest : 0,
          payoffDate,
          order: index + 1
        });

        // After paying off this debt, add its payment to the next debt
        totalFreedPayment += debt.minimumPayment;
        currentDate = new Date(payoffDate);
      });

      return plan;
    };

    return {
      snowball: calculatePayoffPlan(snowballDebts),
      avalanche: calculatePayoffPlan(avalancheDebts)
    };
  },

  getDebtSummary: (debts) => {
    if (!debts || debts.length === 0) {
      return {
        totalBalance: 0,
        totalMinimumPayment: 0,
        weightedInterestRate: 0,
        highestInterestRate: 0,
        lowestInterestRate: 0,
        totalAccounts: 0
      };
    }

    const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const weightedInterestRate = debts.reduce((sum, debt) => sum + (debt.interestRate * debt.balance), 0) / totalBalance;
    const interestRates = debts.map(debt => debt.interestRate);

    return {
      totalBalance,
      totalMinimumPayment,
      weightedInterestRate: weightedInterestRate || 0,
      highestInterestRate: Math.max(...interestRates),
      lowestInterestRate: Math.min(...interestRates),
      totalAccounts: debts.length
    };
  },

  generateDebtTips: (debts) => {
    const tips = [];
    const summary = DEBT_MANAGEMENT_ENGINE.getDebtSummary(debts);

    if (summary.totalBalance > 0) {
      tips.push({
        icon: Zap,
        title: 'Choose Your Strategy',
        description: 'Debt Snowball for motivation (pay smallest first) or Debt Avalanche for savings (pay highest interest first)',
        priority: 'high'
      });
    }

    if (summary.weightedInterestRate > 15) {
      tips.push({
        icon: Flame,
        title: 'High Interest Alert',
        description: `Your average interest rate is ${summary.weightedInterestRate.toFixed(1)}%. Consider debt consolidation or balance transfers.`,
        priority: 'high'
      });
    }

    if (debts.some(debt => debt.interestRate > 20)) {
      tips.push({
        icon: AlertTriangle,
        title: 'Credit Card Emergency',
        description: 'You have high-interest credit cards. These should be your top priority for payoff.',
        priority: 'high'
      });
    }

    tips.push({
      icon: PiggyBank,
      title: 'Emergency Fund First',
      description: 'Build a $1,000 emergency fund before aggressive debt payoff to avoid more debt.',
      priority: 'medium'
    });

    tips.push({
      icon: Calculator,
      title: 'Extra Payments Work',
      description: 'Even an extra $50/month can save thousands in interest and years of payments.',
      priority: 'medium'
    });

    return tips;
  }
};

const DebtManagementSection = ({ transactions, accounts, bills }) => {
  const [debts, setDebts] = useState(() => {
    const saved = localStorage.getItem('debtManagementData');
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        name: 'Credit Card #1',
        type: 'Credit Card',
        balance: 5000,
        interestRate: 18.99,
        minimumPayment: 125,
        creditor: 'Chase Freedom'
      },
      {
        id: 2,
        name: 'Credit Card #2',
        type: 'Credit Card',
        balance: 3200,
        interestRate: 24.99,
        minimumPayment: 85,
        creditor: 'Capital One'
      },
      {
        id: 3,
        name: 'Personal Loan',
        type: 'Personal Loan',
        balance: 8500,
        interestRate: 12.5,
        minimumPayment: 250,
        creditor: 'SoFi'
      }
    ];
  });

  const [extraPayment, setExtraPayment] = useState(100);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('snowball');
  const [expandedDebt, setExpandedDebt] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    localStorage.setItem('debtManagementData', JSON.stringify(debts));
  }, [debts]);

  const payoffPlans = DEBT_MANAGEMENT_ENGINE.calculatePayoffStrategies(debts, extraPayment);
  const debtSummary = DEBT_MANAGEMENT_ENGINE.getDebtSummary(debts);
  const debtTips = DEBT_MANAGEMENT_ENGINE.generateDebtTips(debts);

  const addDebt = (newDebt) => {
    setDebts(prev => [...prev, { ...newDebt, id: Date.now() }]);
    setShowAddDebt(false);
  };

  const updateDebt = (id, updates) => {
    setDebts(prev => prev.map(debt => debt.id === id ? { ...debt, ...updates } : debt));
  };

  const deleteDebt = (id) => {
    setDebts(prev => prev.filter(debt => debt.id !== id));
  };

  const DebtCard = ({ debt, payoffInfo, showPayoffInfo = false }) => {
    const isExpanded = expandedDebt === debt.id;

    return (
      <div style={{
        background: 'white',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CreditCard style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
            <div>
              <h4 style={{ fontWeight: '500', margin: 0 }}>{debt.name}</h4>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>{debt.creditor}</p>
            </div>
          </div>
          <button
            onClick={() => setExpandedDebt(isExpanded ? null : debt.id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '0.5rem',
              cursor: 'pointer',
              borderRadius: '0.25rem'
            }}
          >
            {isExpanded ? <ChevronUp style={{ width: '1rem', height: '1rem' }} /> : <ChevronDown style={{ width: '1rem', height: '1rem' }} />}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Balance</p>
            <p style={{ fontWeight: '600', margin: 0 }}>${debt.balance.toLocaleString()}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Interest Rate</p>
            <p style={{ fontWeight: '600', margin: 0 }}>{debt.interestRate}%</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Min Payment</p>
            <p style={{ fontWeight: '600', margin: 0 }}>${debt.minimumPayment}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Type</p>
            <span style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              background: 'white'
            }}>{debt.type}</span>
          </div>
        </div>

        {showPayoffInfo && payoffInfo && (
          <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <p style={{ color: '#6b7280', margin: 0 }}>Payoff Order</p>
                <p style={{ fontWeight: '600', margin: 0 }}>#{payoffInfo.order}</p>
              </div>
              <div>
                <p style={{ color: '#6b7280', margin: 0 }}>Monthly Payment</p>
                <p style={{ fontWeight: '600', margin: 0 }}>${payoffInfo.monthlyPayment?.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: '#6b7280', margin: 0 }}>Payoff Date</p>
                <p style={{ fontWeight: '600', margin: 0 }}>{payoffInfo.payoffDate?.toLocaleDateString()}</p>
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Total Interest: ${payoffInfo.totalInterest?.toFixed(2)}</p>
              <div style={{
                width: '100%',
                height: '0.5rem',
                background: '#e5e7eb',
                borderRadius: '0.25rem',
                marginTop: '0.25rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.max(0, 100 - (payoffInfo.monthsToPayoff || 0) * 2)}%`,
                  height: '100%',
                  background: '#3b82f6',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          </div>
        )}

        {isExpanded && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Balance</label>
                <input
                  type="number"
                  value={debt.balance}
                  onChange={(e) => updateDebt(debt.id, { balance: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={debt.interestRate}
                  onChange={(e) => updateDebt(debt.id, { interestRate: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Minimum Payment</label>
                <input
                  type="number"
                  value={debt.minimumPayment}
                  onChange={(e) => updateDebt(debt.id, { minimumPayment: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  onClick={() => deleteDebt(debt.id)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Trash2 style={{ width: '1rem', height: '1rem' }} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', margin: 0 }}>
          <Target style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: '#dc2626' }} />
          Debt Management & Payoff
        </h2>
        <span style={{
          background: '#dc2626',
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          ${debtSummary.totalBalance.toLocaleString()} total debt
        </span>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'strategies', label: 'Payoff Plans' },
          { key: 'manage', label: 'Manage Debts' },
          { key: 'tips', label: 'Tips & Tools' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === tab.key ? '#8b5cf6' : '#6b7280',
              fontWeight: activeTab === tab.key ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', textAlign: 'center', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontWeight: '500', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                <DollarSign style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
                Total Debt
              </h4>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626', margin: '0.5rem 0 0 0' }}>${debtSummary.totalBalance.toLocaleString()}</p>
            </div>
            <div style={{ padding: '1rem', textAlign: 'center', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontWeight: '500', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                <Calendar style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
                Min Payments
              </h4>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb', margin: '0.5rem 0 0 0' }}>${debtSummary.totalMinimumPayment.toLocaleString()}</p>
            </div>
            <div style={{ padding: '1rem', textAlign: 'center', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontWeight: '500', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                <BarChart3 style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
                Avg Interest
              </h4>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ea580c', margin: '0.5rem 0 0 0' }}>{debtSummary.weightedInterestRate.toFixed(1)}%</p>
            </div>
            <div style={{ padding: '1rem', textAlign: 'center', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
              <h4 style={{ fontWeight: '500', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}>
                <CreditCard style={{ width: '1rem', height: '1rem', marginRight: '0.25rem' }} />
                Accounts
              </h4>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7c3aed', margin: '0.5rem 0 0 0' }}>{debtSummary.totalAccounts}</p>
            </div>
          </div>

          {/* Extra Payment Calculator */}
          <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem', display: 'flex', alignItems: 'center', margin: 0 }}>
              <Calculator style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
              Extra Payment Impact
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', marginTop: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>Extra monthly payment:</label>
              <input
                type="number"
                value={extraPayment}
                onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  width: '8rem'
                }}
                min="0"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '0.5rem' }}>
                <h4 style={{ fontWeight: '500', color: '#166534', margin: 0 }}>Debt Snowball</h4>
                <p style={{ fontSize: '0.875rem', color: '#15803d', margin: '0.25rem 0 0 0' }}>
                  Total Interest: ${payoffPlans.snowball.reduce((sum, debt) => sum + (debt.totalInterest || 0), 0).toFixed(2)}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#15803d', margin: 0 }}>
                  Time to Freedom: {Math.max(...payoffPlans.snowball.map(debt => debt.monthsToPayoff || 0))} months
                </p>
              </div>
              <div style={{ padding: '0.75rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                <h4 style={{ fontWeight: '500', color: '#1e40af', margin: 0 }}>Debt Avalanche</h4>
                <p style={{ fontSize: '0.875rem', color: '#1d4ed8', margin: '0.25rem 0 0 0' }}>
                  Total Interest: ${payoffPlans.avalanche.reduce((sum, debt) => sum + (debt.totalInterest || 0), 0).toFixed(2)}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#1d4ed8', margin: 0 }}>
                  Time to Freedom: {Math.max(...payoffPlans.avalanche.map(debt => debt.monthsToPayoff || 0))} months
                </p>
              </div>
            </div>
          </div>

          {/* Current Debts */}
          <div>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem' }}>Your Current Debts</h3>
            {debts.map(debt => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: '500', margin: 0 }}>Manage Your Debts</h3>
            <button
              onClick={() => setShowAddDebt(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <Plus style={{ width: '1rem', height: '1rem' }} />
              Add Debt
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {debts.map(debt => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>

          {debts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
              <Target style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem auto', color: '#9ca3af' }} />
              <h3 style={{ fontWeight: '500', margin: 0 }}>No debts added yet</h3>
              <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Add your debts to create a personalized payoff plan.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Debt Modal */}
      {showAddDebt && (
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
          padding: '1rem',
          zIndex: 50
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '28rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Add New Debt</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addDebt({
                name: formData.get('name'),
                type: formData.get('type'),
                creditor: formData.get('creditor'),
                balance: parseFloat(formData.get('balance')),
                interestRate: parseFloat(formData.get('interestRate')),
                minimumPayment: parseFloat(formData.get('minimumPayment'))
              });
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Debt Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="e.g., Credit Card #3"
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Type</label>
                    <select name="type" required style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }}>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="Auto Loan">Auto Loan</option>
                      <option value="Student Loan">Student Loan</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Creditor</label>
                    <input
                      name="creditor"
                      type="text"
                      required
                      placeholder="Bank/Lender"
                      style={{
                        width: '100%',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Balance ($)</label>
                    <input
                      name="balance"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Interest Rate (%)</label>
                    <input
                      name="interestRate"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Min Payment ($)</label>
                    <input
                      name="minimumPayment"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem'
                      }}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddDebt(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  Add Debt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtManagementSection;