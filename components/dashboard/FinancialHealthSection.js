import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Shield,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';

const FinancialHealthSection = ({ transactions, accounts, bills }) => {
  const [healthProfile, setHealthProfile] = useState(() => {
    const saved = localStorage.getItem('financialHealthProfile');
    return saved ? JSON.parse(saved) : {
      monthlyIncome: 5000,
      monthlyDebt: 1200,
      emergencyFund: 8000,
      monthlySavings: 750,
      creditScore: 720,
      budgetAdherence: 82,
      investmentDiversification: 65
    };
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    localStorage.setItem('financialHealthProfile', JSON.stringify(healthProfile));
  }, [healthProfile]);

  // Calculate wellness score
  const calculateWellnessScore = (profile) => {
    const weights = {
      creditScore: 0.25,
      debtToIncome: 0.20,
      emergencyFund: 0.20,
      savingsRate: 0.15,
      budgetAdherence: 0.10,
      diversification: 0.10
    };

    let score = 0;

    // Credit Score (300-850 → 0-100)
    if (profile.creditScore) {
      score += ((profile.creditScore - 300) / 550) * 100 * weights.creditScore;
    }

    // Debt-to-Income Ratio (lower is better)
    const dtiRatio = profile.monthlyDebt / profile.monthlyIncome || 0;
    const dtiScore = Math.max(0, 100 - (dtiRatio * 100 * 2.5)); // 40% DTI = 0 score
    score += dtiScore * weights.debtToIncome;

    // Emergency Fund (3-6 months expenses)
    const monthlyExpenses = profile.monthlyIncome * 0.7; // Estimate 70% of income
    const emergencyMonths = profile.emergencyFund / monthlyExpenses || 0;
    const emergencyScore = Math.min(100, (emergencyMonths / 6) * 100);
    score += emergencyScore * weights.emergencyFund;

    // Savings Rate (% of income saved)
    const savingsRate = profile.monthlySavings / profile.monthlyIncome || 0;
    const savingsScore = Math.min(100, (savingsRate / 0.20) * 100); // 20% = perfect
    score += savingsScore * weights.savingsRate;

    // Budget Adherence
    const budgetScore = profile.budgetAdherence || 75;
    score += budgetScore * weights.budgetAdherence;

    // Investment Diversification
    const diversificationScore = profile.investmentDiversification || 60;
    score += diversificationScore * weights.diversification;

    return Math.round(Math.max(0, Math.min(100, score)));
  };

  const wellnessScore = calculateWellnessScore(healthProfile);

  const getScoreCategory = (score) => {
    if (score >= 80) return { category: 'Excellent', color: '#10b981', textColor: '#059669' };
    if (score >= 70) return { category: 'Good', color: '#3b82f6', textColor: '#2563eb' };
    if (score >= 60) return { category: 'Fair', color: '#f59e0b', textColor: '#d97706' };
    if (score >= 40) return { category: 'Needs Work', color: '#f97316', textColor: '#ea580c' };
    return { category: 'Poor', color: '#ef4444', textColor: '#dc2626' };
  };

  const scoreInfo = getScoreCategory(wellnessScore);

  const updateProfile = (field, value) => {
    setHealthProfile(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const generateRecommendations = () => {
    const recommendations = [];

    if (!healthProfile.creditScore || healthProfile.creditScore < 700) {
      recommendations.push({
        priority: 'high',
        title: 'Improve Credit Score',
        description: 'Pay down credit card balances and ensure on-time payments',
        impact: '+15-25 points'
      });
    }

    const dtiRatio = healthProfile.monthlyDebt / healthProfile.monthlyIncome || 0;
    if (dtiRatio > 0.36) {
      recommendations.push({
        priority: 'high',
        title: 'Reduce Debt-to-Income Ratio',
        description: 'Focus on paying down high-interest debt first',
        impact: 'Save $' + Math.round(healthProfile.monthlyDebt * 0.1) + '/month'
      });
    }

    const monthlyExpenses = healthProfile.monthlyIncome * 0.7;
    const emergencyMonths = healthProfile.emergencyFund / monthlyExpenses || 0;
    if (emergencyMonths < 3) {
      recommendations.push({
        priority: 'medium',
        title: 'Build Emergency Fund',
        description: 'Aim for 3-6 months of expenses in savings',
        impact: 'Target: $' + Math.round(monthlyExpenses * 3).toLocaleString()
      });
    }

    const savingsRate = healthProfile.monthlySavings / healthProfile.monthlyIncome || 0;
    if (savingsRate < 0.15) {
      recommendations.push({
        priority: 'medium',
        title: 'Increase Savings Rate',
        description: 'Try to save at least 15-20% of your income',
        impact: 'Target: $' + Math.round(healthProfile.monthlyIncome * 0.15).toLocaleString() + '/month'
      });
    }

    return recommendations.slice(0, 4);
  };

  const recommendations = generateRecommendations();

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
          <BarChart3 style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: '#2563eb' }} />
          Financial Health Dashboard
        </h2>
        <span style={{
          background: scoreInfo.color,
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {wellnessScore}/100 - {scoreInfo.category}
        </span>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'metrics', label: 'Key Metrics' },
          { key: 'recommendations', label: 'Action Items' }
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
          {/* Wellness Score Circle */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '12rem', height: '12rem' }}>
              <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={scoreInfo.color}
                  strokeWidth="2"
                  strokeDasharray={`${wellnessScore}, 100`}
                />
              </svg>
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700' }}>{wellnessScore}</div>
                  <div style={{ fontSize: '0.875rem', color: scoreInfo.textColor }}>{scoreInfo.category}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#eff6ff', borderRadius: '0.5rem' }}>
              <DollarSign style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem auto', color: '#2563eb' }} />
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>${healthProfile.monthlyIncome.toLocaleString()}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Monthly Income</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
              <PiggyBank style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem auto', color: '#16a34a' }} />
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>${healthProfile.monthlySavings.toLocaleString()}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Monthly Savings</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#faf5ff', borderRadius: '0.5rem' }}>
              <CreditCard style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem auto', color: '#9333ea' }} />
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>{healthProfile.creditScore}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Credit Score</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#fff7ed', borderRadius: '0.5rem' }}>
              <Shield style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem auto', color: '#ea580c' }} />
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>${healthProfile.emergencyFund.toLocaleString()}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Emergency Fund</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem', margin: 0 }}>Income & Savings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Monthly Income</label>
                <input
                  type="number"
                  value={healthProfile.monthlyIncome}
                  onChange={(e) => updateProfile('monthlyIncome', e.target.value)}
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
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Monthly Savings</label>
                <input
                  type="number"
                  value={healthProfile.monthlySavings}
                  onChange={(e) => updateProfile('monthlySavings', e.target.value)}
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
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Savings Rate</div>
                <div style={{ fontWeight: '600' }}>{((healthProfile.monthlySavings / healthProfile.monthlyIncome) * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem', margin: 0 }}>Debt & Credit</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Monthly Debt Payments</label>
                <input
                  type="number"
                  value={healthProfile.monthlyDebt}
                  onChange={(e) => updateProfile('monthlyDebt', e.target.value)}
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
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Credit Score</label>
                <input
                  type="number"
                  value={healthProfile.creditScore}
                  onChange={(e) => updateProfile('creditScore', e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                  min="300"
                  max="850"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Debt-to-Income Ratio</div>
                <div style={{ fontWeight: '600' }}>{((healthProfile.monthlyDebt / healthProfile.monthlyIncome) * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem', margin: 0 }}>Emergency & Investments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280' }}>Emergency Fund</label>
                <input
                  type="number"
                  value={healthProfile.emergencyFund}
                  onChange={(e) => updateProfile('emergencyFund', e.target.value)}
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
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Emergency Fund Coverage</div>
                <div style={{ fontWeight: '600' }}>
                  {((healthProfile.emergencyFund / (healthProfile.monthlyIncome * 0.7))).toFixed(1)} months
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Investment Diversification</div>
                <div style={{ fontWeight: '600' }}>{healthProfile.investmentDiversification}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: '500', color: '#111827', marginBottom: '0.5rem', margin: 0 }}>Personalized Action Items</h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Based on your financial profile, here are the top recommendations to improve your wellness score:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recommendations.map((rec, index) => {
              const priorityColors = {
                high: 'border-red-200 bg-red-50',
                medium: 'border-yellow-200 bg-yellow-50',
                low: 'border-green-200 bg-green-50'
              };

              return (
                <div key={index} style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  background: priorityColors[rec.priority] || 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                    <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', color: '#6b7280' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: '500', color: '#111827', margin: 0 }}>{rec.title}</h4>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0.5rem 0' }}>{rec.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.375rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          background: 'white'
                        }}>
                          {rec.priority} priority
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#16a34a' }}>
                          {rec.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {recommendations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
              <CheckCircle style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem auto', color: '#10b981' }} />
              <h3 style={{ fontWeight: '500', margin: 0 }}>Great job!</h3>
              <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Your financial health looks good. Keep up the excellent work!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialHealthSection;