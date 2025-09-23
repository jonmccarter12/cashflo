import React from 'react';
import { fmt } from '../../lib/utils';

export default function CreditSection({ isMobile, accounts, transactions }) {
  const [selectedCreditCard, setSelectedCreditCard] = React.useState(null);
  const [paymentScenario, setPaymentScenario] = React.useState('minimum');
  const [customPayment, setCustomPayment] = React.useState('');

  // Filter credit accounts
  const creditAccounts = accounts.filter(acc => acc.accountType === 'credit');

  // Calculate credit metrics
  const calculateCreditMetrics = () => {
    let totalCreditLimit = 0;
    let totalBalance = 0;
    let totalAvailableCredit = 0;
    let totalMinimumPayment = 0;

    creditAccounts.forEach(acc => {
      const limit = acc.creditLimit || 0;
      const balance = acc.balance || 0;
      const available = Math.max(0, limit - balance);
      const minPayment = balance * 0.025; // Estimate 2.5% minimum payment

      totalCreditLimit += limit;
      totalBalance += balance;
      totalAvailableCredit += available;
      totalMinimumPayment += minPayment;
    });

    const overallUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

    return {
      totalCreditLimit,
      totalBalance,
      totalAvailableCredit,
      totalMinimumPayment,
      overallUtilization,
      accountCount: creditAccounts.length
    };
  };

  // Calculate payment scenarios
  const calculatePaymentScenarios = (account) => {
    const balance = account.balance || 0;
    const limit = account.creditLimit || 0;
    const apr = account.apr || 18; // Default 18% APR
    const monthlyRate = apr / 100 / 12;

    if (balance <= 0) return null;

    const minimumPayment = balance * 0.025; // 2.5% minimum
    const mediumPayment = balance * 0.05; // 5%
    const aggressivePayment = balance * 0.10; // 10%

    const calculatePayoff = (payment) => {
      let currentBalance = balance;
      let months = 0;
      let totalInterest = 0;

      while (currentBalance > 0 && months < 600) { // Max 50 years
        const interestCharge = currentBalance * monthlyRate;
        const principalPayment = Math.min(payment - interestCharge, currentBalance);

        if (principalPayment <= 0) return { months: 'Never', totalInterest: 'Infinite' };

        totalInterest += interestCharge;
        currentBalance -= principalPayment;
        months++;
      }

      return { months, totalInterest, totalPaid: balance + totalInterest };
    };

    return {
      minimum: calculatePayoff(minimumPayment),
      medium: calculatePayoff(mediumPayment),
      aggressive: calculatePayoff(aggressivePayment),
      custom: customPayment ? calculatePayoff(Number(customPayment)) : null,
      payments: {
        minimum: minimumPayment,
        medium: mediumPayment,
        aggressive: aggressivePayment
      }
    };
  };

  // Credit score impact estimation
  const getCreditScoreImpact = (utilization) => {
    if (utilization <= 10) return { score: 'Excellent (750+)', color: '#059669', impact: 'Very Positive' };
    if (utilization <= 30) return { score: 'Good (650-749)', color: '#16a34a', impact: 'Positive' };
    if (utilization <= 50) return { score: 'Fair (550-649)', color: '#ca8a04', impact: 'Neutral' };
    if (utilization <= 70) return { score: 'Poor (450-549)', color: '#ea580c', impact: 'Negative' };
    return { score: 'Very Poor (<450)', color: '#dc2626', impact: 'Very Negative' };
  };

  // Simple utilization chart
  const UtilizationChart = ({ utilization, title, size = 80 }) => {
    const radius = size / 2 - 5;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (utilization / 100) * circumference;

    const getColor = () => {
      if (utilization <= 30) return '#059669';
      if (utilization <= 50) return '#ca8a04';
      return '#dc2626';
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getColor()}
              strokeWidth="6"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: getColor()
          }}>
            {utilization.toFixed(0)}%
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
          {title}
        </div>
      </div>
    );
  };

  const metrics = calculateCreditMetrics();
  const scoreImpact = getCreditScoreImpact(metrics.overallUtilization);

  if (creditAccounts.length === 0) {
    return (
      <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', color: '#000', marginBottom: '1rem' }}>
          💳 Credit Accounts
        </h3>
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
          <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No Credit Accounts</div>
          <div style={{ fontSize: '0.875rem' }}>Add credit cards or credit lines to track utilization and optimize your credit score.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', color: '#000', marginBottom: '1rem' }}>
        💳 Credit Accounts & Score Optimization
      </h3>

      {/* Overall Credit Metrics */}
      <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <UtilizationChart utilization={metrics.overallUtilization} title="Overall Utilization" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>{fmt(metrics.totalAvailableCredit)}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Available Credit</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>{fmt(metrics.totalBalance)}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Balance</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '600', color: scoreImpact.color }}>{scoreImpact.score}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Estimated Score Range</div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '0.375rem', border: `1px solid ${scoreImpact.color}` }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: scoreImpact.color, marginBottom: '0.25rem' }}>
            Credit Score Impact: {scoreImpact.impact}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {metrics.overallUtilization <= 10
              ? '🎉 Excellent! Keep utilization under 10% for optimal credit scores.'
              : metrics.overallUtilization <= 30
              ? '👍 Good utilization. Consider paying down balances to get under 10%.'
              : '⚠️ High utilization may hurt your credit score. Consider paying down balances.'}
          </div>
        </div>
      </div>

      {/* Individual Credit Cards */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
          Individual Credit Accounts
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {creditAccounts.map(account => {
            const utilization = account.creditLimit > 0 ? (account.balance / account.creditLimit) * 100 : 0;
            const available = Math.max(0, (account.creditLimit || 0) - (account.balance || 0));
            const scenarios = calculatePaymentScenarios(account);

            return (
              <div key={account.id} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedCreditCard === account.id ? '0 4px 12px rgba(139, 92, 246, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
              onClick={() => setSelectedCreditCard(selectedCreditCard === account.id ? null : account.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#000' }}>{account.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {fmt(account.balance)} / {fmt(account.creditLimit)} • {fmt(available)} available
                    </div>
                  </div>
                  <UtilizationChart utilization={utilization} title="" size={60} />
                </div>

                {/* Expanded details */}
                {selectedCreditCard === account.id && scenarios && (
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                      💳 Payoff Scenarios
                    </h5>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                        Custom Payment Amount:
                      </label>
                      <input
                        type="number"
                        value={customPayment}
                        onChange={(e) => setCustomPayment(e.target.value)}
                        placeholder="Enter amount"
                        style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                      {[
                        { key: 'minimum', label: 'Minimum Payment', payment: scenarios.payments.minimum },
                        { key: 'medium', label: '5% Payment', payment: scenarios.payments.medium },
                        { key: 'aggressive', label: '10% Payment', payment: scenarios.payments.aggressive },
                        ...(scenarios.custom ? [{ key: 'custom', label: 'Custom Payment', payment: Number(customPayment) }] : [])
                      ].map(scenario => {
                        const result = scenarios[scenario.key];
                        return (
                          <div key={scenario.key} style={{ background: '#f9fafb', padding: '0.5rem', borderRadius: '0.25rem' }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                              {scenario.label} ({fmt(scenario.payment)})
                            </div>
                            <div style={{ color: '#6b7280' }}>
                              {result?.months === 'Never' ? (
                                <span style={{ color: '#dc2626' }}>Payment too low</span>
                              ) : result ? (
                                <>
                                  <div>{result.months} months</div>
                                  <div>Interest: {fmt(result.totalInterest)}</div>
                                </>
                              ) : (
                                <span>Enter amount</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {scenarios.minimum.months !== 'Never' && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#fef3c7', borderRadius: '0.25rem', border: '1px solid #f59e0b' }}>
                        <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                          💡 <strong>Tip:</strong> Paying {fmt(scenarios.payments.aggressive)} instead of the minimum saves{' '}
                          {fmt(scenarios.minimum.totalInterest - scenarios.aggressive.totalInterest)} in interest!
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Optimization Tips */}
      <div style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '0.5rem', padding: '1rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem' }}>
          💡 Credit Score Optimization Tips
        </h4>
        <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>
          <div style={{ marginBottom: '0.25rem' }}>• Keep utilization under 30% per card, ideally under 10%</div>
          <div style={{ marginBottom: '0.25rem' }}>• Pay balances before statement dates to lower reported utilization</div>
          <div style={{ marginBottom: '0.25rem' }}>• Consider balance transfers to cards with lower utilization</div>
          <div>• Pay more than minimum to reduce interest and improve credit faster</div>
        </div>
      </div>
    </div>
  );
}