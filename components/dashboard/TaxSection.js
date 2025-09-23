import React from 'react';
import { fmt } from '../../lib/utils';

// IRS categories for expenses
export const IRS_TAX_CATEGORIES = [
  'None/Personal',
  'Business Equipment',
  'Office Supplies',
  'Travel',
  'Meals & Entertainment',
  'Professional Services',
  'Advertising',
  'Vehicle Expenses',
  'Home Office',
  'Education & Training',
  'Insurance',
  'Utilities',
  'Rent',
  'Phone & Internet',
  'Software & Subscriptions',
  'Medical Expenses',
  'Charitable Donations',
  'State & Local Taxes',
  'Mortgage Interest',
  'Other Deductible'
];

// 2024 Tax Brackets
const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191050, rate: 0.24 },
    { min: 191050, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ],
  marriedJoint: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ],
  marriedSeparate: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 }
  ],
  headOfHousehold: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191050, rate: 0.24 },
    { min: 191050, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 }
  ],
  qualifyingWidow: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ]
};

// Standard Deductions 2024
const STANDARD_DEDUCTIONS_2024 = {
  single: 14600,
  marriedJoint: 29200,
  marriedSeparate: 14600,
  headOfHousehold: 21900,
  qualifyingWidow: 29200
};

// EITC Income Limits 2024
const EITC_LIMITS_2024 = {
  0: { single: 17640, married: 23740 },
  1: { single: 46560, married: 52918 },
  2: { single: 51464, married: 57822 },
  3: { single: 55529, married: 61887 }
};

// EITC Credit Amounts 2024
const EITC_AMOUNTS_2024 = {
  0: 632,
  1: 4213,
  2: 6960,
  3: 7830
};

export default function TaxSection({ isMobile, transactions, bills, oneTimeCosts }) {
  // Basic Info
  const [annualIncome, setAnnualIncome] = React.useState('');
  const [selfEmploymentIncome, setSelfEmploymentIncome] = React.useState('');
  const [filingStatus, setFilingStatus] = React.useState('single');
  const [totalWithholdings, setTotalWithholdings] = React.useState('');
  const [estimatedQuarterlyPaid, setEstimatedQuarterlyPaid] = React.useState('');

  // Dependents & Family
  const [numChildren, setNumChildren] = React.useState(0);
  const [numChildrenUnder6, setNumChildrenUnder6] = React.useState(0);
  const [numOtherDependents, setNumOtherDependents] = React.useState(0);
  const [dependentCareExpenses, setDependentCareExpenses] = React.useState('');

  // Education
  const [educationExpenses, setEducationExpenses] = React.useState('');
  const [studentLoanInterest, setStudentLoanInterest] = React.useState('');

  // Retirement & Savings
  const [traditional401k, setTraditional401k] = React.useState('');
  const [traditionalIRA, setTraditionalIRA] = React.useState('');
  const [hsaContributions, setHSAContributions] = React.useState('');

  // Health & Medical
  const [healthInsurancePremiums, setHealthInsurancePremiums] = React.useState('');
  const [medicalExpenses, setMedicalExpenses] = React.useState('');

  // Other Deductions
  const [stateLocalTaxes, setStateLocalTaxes] = React.useState('');
  const [mortgageInterest, setMortgageInterest] = React.useState('');
  const [charitableDonations, setCharitableDonations] = React.useState('');

  // Calculate income from transaction data
  const calculateIncomeFromTransactions = () => {
    const currentYear = new Date().getFullYear();
    const incomeTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      const isCurrentYear = txDate.getFullYear() === currentYear;

      // Look for income-related transaction types and positive amounts
      const isIncome = (
        tx.action_type?.includes('income') ||
        tx.action_type?.includes('credit_received') ||
        tx.action_type?.includes('payment_received') ||
        (tx.description && (
          tx.description.toLowerCase().includes('salary') ||
          tx.description.toLowerCase().includes('paycheck') ||
          tx.description.toLowerCase().includes('wage') ||
          tx.description.toLowerCase().includes('freelance') ||
          tx.description.toLowerCase().includes('contract') ||
          tx.description.toLowerCase().includes('bonus') ||
          tx.description.toLowerCase().includes('commission')
        ))
      ) && (tx.details?.amount > 0 || tx.amount > 0);

      return isCurrentYear && isIncome;
    });

    const totalIncome = incomeTransactions.reduce((sum, tx) => {
      return sum + (tx.details?.amount || tx.amount || 0);
    }, 0);

    const selfEmploymentIncome = incomeTransactions
      .filter(tx =>
        tx.description?.toLowerCase().includes('freelance') ||
        tx.description?.toLowerCase().includes('contract') ||
        tx.description?.toLowerCase().includes('1099') ||
        tx.action_type?.includes('business')
      )
      .reduce((sum, tx) => sum + (tx.details?.amount || tx.amount || 0), 0);

    return {
      totalIncome,
      w2Income: totalIncome - selfEmploymentIncome,
      selfEmploymentIncome,
      incomeTransactions
    };
  };

  // Calculate deductible expenses from tracked bills and one-time costs
  const calculateTrackedExpenses = () => {
    let total = 0;
    const breakdown = {};

    // Add bills with categories (excluding 'None/Personal')
    bills.forEach(bill => {
      if (bill.taxCategory && bill.taxCategory !== 'None/Personal') {
        let annualAmount = 0;
        if (bill.frequency === 'monthly') annualAmount = bill.amount * 12;
        else if (bill.frequency === 'weekly') annualAmount = bill.amount * 52;
        else if (bill.frequency === 'biweekly') annualAmount = bill.amount * 26;
        else if (bill.frequency === 'yearly') annualAmount = bill.amount;

        breakdown[bill.taxCategory] = (breakdown[bill.taxCategory] || 0) + annualAmount;
        total += annualAmount;
      }
    });

    // Add one-time costs with categories
    oneTimeCosts.forEach(cost => {
      if (cost.taxCategory && cost.taxCategory !== 'None/Personal') {
        breakdown[cost.taxCategory] = (breakdown[cost.taxCategory] || 0) + cost.amount;
        total += cost.amount;
      }
    });

    return { total, breakdown };
  };

  // Calculate federal income tax using brackets
  const calculateIncomeTax = (taxableIncome, status) => {
    const brackets = TAX_BRACKETS_2024[status];
    let tax = 0;

    for (const bracket of brackets) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
        tax += taxableInBracket * bracket.rate;
      }
    }

    return tax;
  };

  // Calculate Self-Employment Tax
  const calculateSelfEmploymentTax = (seIncome) => {
    if (seIncome <= 0) return 0;
    const seIncome92_35 = seIncome * 0.9235; // SE income subject to SE tax
    const socialSecurityBase = Math.min(seIncome92_35, 160200); // 2024 SS wage base
    const socialSecurityTax = socialSecurityBase * 0.124; // 12.4%
    const medicareTax = seIncome92_35 * 0.029; // 2.9%
    return socialSecurityTax + medicareTax;
  };

  // Calculate Child Tax Credit
  const calculateChildTaxCredit = (agi, children, status) => {
    if (children <= 0) return 0;

    const phaseoutThresholds = {
      marriedJoint: 400000,
      qualifyingWidow: 400000,
      single: 200000,
      headOfHousehold: 200000,
      marriedSeparate: 200000
    };

    const maxCredit = children * 2000; // $2000 per child under 17
    const threshold = phaseoutThresholds[status];

    if (agi <= threshold) return maxCredit;

    const phaseout = Math.floor((agi - threshold) / 1000) * 50;
    return Math.max(0, maxCredit - phaseout);
  };

  // Calculate EITC
  const calculateEITC = (agi, children, status) => {
    const isMarried = status === 'marriedJoint' || status === 'qualifyingWidow';
    const childrenForEITC = Math.min(children, 3);
    const limit = EITC_LIMITS_2024[childrenForEITC][isMarried ? 'married' : 'single'];

    if (agi > limit) return 0;

    const maxCredit = EITC_AMOUNTS_2024[childrenForEITC];

    // Simplified EITC calculation (actual calculation is more complex)
    if (childrenForEITC === 0) {
      if (agi <= 8260) return Math.min(agi * 0.0765, maxCredit);
      return Math.max(0, maxCredit - (agi - 8260) * 0.0765);
    } else {
      const phaseInLimit = childrenForEITC === 1 ? 11750 : 16510;
      const phaseInRate = childrenForEITC === 1 ? 0.34 : childrenForEITC === 2 ? 0.40 : 0.45;
      const phaseOutStart = childrenForEITC === 1 ? 20130 : 20130;
      const phaseOutRate = childrenForEITC === 1 ? 0.1598 : childrenForEITC === 2 ? 0.2106 : 0.2106;

      if (agi <= phaseInLimit) {
        return Math.min(agi * phaseInRate, maxCredit);
      } else if (agi <= phaseOutStart) {
        return maxCredit;
      } else {
        return Math.max(0, maxCredit - (agi - phaseOutStart) * phaseOutRate);
      }
    }
  };

  // Calculate American Opportunity Tax Credit
  const calculateEducationCredit = (expenses, agi, status) => {
    const eduExp = Number(expenses) || 0;
    if (eduExp <= 0) return 0;

    const phaseoutThresholds = {
      marriedJoint: 160000,
      qualifyingWidow: 80000,
      single: 80000,
      headOfHousehold: 80000,
      marriedSeparate: 80000
    };

    const maxCredit = Math.min(2500, eduExp * 1); // 100% of first $2000, 25% of next $2000
    const actualCredit = eduExp <= 2000 ? eduExp : 2000 + (eduExp - 2000) * 0.25;
    const credit = Math.min(maxCredit, actualCredit);

    const threshold = phaseoutThresholds[status];
    const phaseoutRange = status === 'marriedJoint' ? 20000 : 10000;

    if (agi <= threshold) return credit;
    if (agi >= threshold + phaseoutRange) return 0;

    const reduction = (agi - threshold) / phaseoutRange;
    return credit * (1 - reduction);
  };

  // Calculate Dependent Care Credit
  const calculateDependentCareCredit = (expenses, agi, children) => {
    const careExp = Number(expenses) || 0;
    if (careExp <= 0 || children <= 0) return 0;

    const maxExpenses = children === 1 ? 3000 : 6000;
    const qualifyingExpenses = Math.min(careExp, maxExpenses);

    let creditRate = 0.35; // 35% for AGI under $15,000
    if (agi > 15000) {
      creditRate = Math.max(0.20, 0.35 - Math.floor((agi - 15000) / 2000) * 0.01);
    }

    return qualifyingExpenses * creditRate;
  };

  // Main tax calculation
  const calculateTax = () => {
    const transactionIncome = calculateIncomeFromTransactions();

    // Use transaction data if available, otherwise fall back to manual entry
    const income = transactionIncome.totalIncome > 0 ? transactionIncome.w2Income : (Number(annualIncome) || 0);
    const seIncome = transactionIncome.selfEmploymentIncome > 0 ? transactionIncome.selfEmploymentIncome : (Number(selfEmploymentIncome) || 0);
    const trackedExpenses = calculateTrackedExpenses();

    // Calculate AGI
    const seDeduction = seIncome > 0 ? calculateSelfEmploymentTax(seIncome) * 0.5 : 0; // Half of SE tax is deductible
    const iraDeduction = Number(traditionalIRA) || 0;
    const hsa = Number(hsaContributions) || 0;
    const studentLoan = Math.min(Number(studentLoanInterest) || 0, 2500); // $2500 limit

    const agi = income + seIncome - seDeduction - iraDeduction - hsa - studentLoan;

    // Calculate deductions
    const standardDeduction = STANDARD_DEDUCTIONS_2024[filingStatus];
    const itemizedDeductions =
      trackedExpenses.total +
      (Number(stateLocalTaxes) || 0) +
      (Number(mortgageInterest) || 0) +
      (Number(charitableDonations) || 0) +
      Math.max(0, (Number(medicalExpenses) || 0) - agi * 0.075); // Medical expenses over 7.5% AGI

    const totalDeductions = Math.max(standardDeduction, itemizedDeductions);
    const taxableIncome = Math.max(0, agi - totalDeductions);

    // Calculate taxes
    const incomeTax = calculateIncomeTax(taxableIncome, filingStatus);
    const seTax = calculateSelfEmploymentTax(seIncome);
    const grossTax = incomeTax + seTax;

    // Calculate credits
    const childTaxCredit = calculateChildTaxCredit(agi, Number(numChildren), filingStatus);
    const eitc = calculateEITC(agi, Number(numChildren), filingStatus);
    const educationCredit = calculateEducationCredit(educationExpenses, agi, filingStatus);
    const dependentCareCredit = calculateDependentCareCredit(dependentCareExpenses, agi, Number(numChildren));

    const totalCredits = childTaxCredit + eitc + educationCredit + dependentCareCredit;
    const netTax = Math.max(0, grossTax - totalCredits);

    // Calculate payments
    const withholdings = Number(totalWithholdings) || 0;
    const quarterlyPaid = Number(estimatedQuarterlyPaid) || 0;
    const totalPaid = withholdings + quarterlyPaid;

    return {
      agi,
      taxableIncome,
      standardDeduction,
      itemizedDeductions,
      totalDeductions,
      usingItemized: itemizedDeductions > standardDeduction,
      incomeTax,
      seTax,
      grossTax,
      childTaxCredit,
      eitc,
      educationCredit,
      dependentCareCredit,
      totalCredits,
      netTax,
      totalPaid,
      refundOrOwed: totalPaid - netTax,
      trackedExpenses
    };
  };

  const taxCalc = calculateTax();
  const transactionIncome = calculateIncomeFromTransactions();
  const selectAllOnFocus = (e) => e.target.select();

  return (
    <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', color: '#000', marginBottom: '1rem' }}>
        📊 Comprehensive Tax Calculator
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        {/* Input Section */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
            Income & Filing Information
          </h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Filing Status:
            </label>
            <select
              value={filingStatus}
              onChange={(e) => setFilingStatus(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              <option value="single">Single</option>
              <option value="marriedJoint">Married Filing Jointly</option>
              <option value="marriedSeparate">Married Filing Separately</option>
              <option value="headOfHousehold">Head of Household</option>
              <option value="qualifyingWidow">Qualifying Widow(er)</option>
            </select>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Annual W-2/1099 Income:
              {transactionIncome.w2Income > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '400', marginLeft: '0.5rem' }}>
                  (Auto-calculated from transactions: {fmt(transactionIncome.w2Income)})
                </span>
              )}
            </label>
            <input
              type="number"
              value={transactionIncome.w2Income > 0 ? transactionIncome.w2Income : annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder={transactionIncome.w2Income > 0 ? "Auto-calculated from transactions" : "Enter annual income"}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${transactionIncome.w2Income > 0 ? '#059669' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                background: transactionIncome.w2Income > 0 ? '#f0fdf4' : 'white'
              }}
              disabled={transactionIncome.w2Income > 0}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Self-Employment Income:
              {transactionIncome.selfEmploymentIncome > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '400', marginLeft: '0.5rem' }}>
                  (Auto-calculated: {fmt(transactionIncome.selfEmploymentIncome)})
                </span>
              )}
            </label>
            <input
              type="number"
              value={transactionIncome.selfEmploymentIncome > 0 ? transactionIncome.selfEmploymentIncome : selfEmploymentIncome}
              onChange={(e) => setSelfEmploymentIncome(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder={transactionIncome.selfEmploymentIncome > 0 ? "Auto-calculated from transactions" : "1099 income, business profits"}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: `1px solid ${transactionIncome.selfEmploymentIncome > 0 ? '#059669' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                background: transactionIncome.selfEmploymentIncome > 0 ? '#f0fdf4' : 'white'
              }}
              disabled={transactionIncome.selfEmploymentIncome > 0}
            />
          </div>

          {(transactionIncome.totalIncome > 0) && (
            <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', marginBottom: '0.25rem' }}>
                📊 Income Auto-Detected from Transactions
              </div>
              <div style={{ fontSize: '0.75rem', color: '#065f46' }}>
                Found {transactionIncome.incomeTransactions.length} income transactions for {new Date().getFullYear()}
                <br />
                Total Income: {fmt(transactionIncome.totalIncome)}
                {transactionIncome.selfEmploymentIncome > 0 && (
                  <span> (W-2: {fmt(transactionIncome.w2Income)}, Self-Employment: {fmt(transactionIncome.selfEmploymentIncome)})</span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Children Under 17:
              </label>
              <input
                type="number"
                value={numChildren}
                onChange={(e) => setNumChildren(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Other Dependents:
              </label>
              <input
                type="number"
                value={numOtherDependents}
                onChange={(e) => setNumOtherDependents(Math.max(0, Number(e.target.value)))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Total Tax Withholdings:
            </label>
            <input
              type="number"
              value={totalWithholdings}
              onChange={(e) => setTotalWithholdings(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder="Federal tax withheld from paychecks"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Estimated Quarterly Payments:
            </label>
            <input
              type="number"
              value={estimatedQuarterlyPaid}
              onChange={(e) => setEstimatedQuarterlyPaid(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder="Self-employment quarterly payments"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          {/* Collapsible sections for other deductions */}
          <details style={{ marginBottom: '0.75rem' }}>
            <summary style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', cursor: 'pointer', marginBottom: '0.5rem' }}>
              🏦 Retirement Contributions
            </summary>
            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Traditional 401(k)/403(b):
                </label>
                <input
                  type="number"
                  value={traditional401k}
                  onChange={(e) => setTraditional401k(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Traditional IRA:
                </label>
                <input
                  type="number"
                  value={traditionalIRA}
                  onChange={(e) => setTraditionalIRA(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  HSA Contributions:
                </label>
                <input
                  type="number"
                  value={hsaContributions}
                  onChange={(e) => setHSAContributions(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </details>

          <details style={{ marginBottom: '0.75rem' }}>
            <summary style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', cursor: 'pointer', marginBottom: '0.5rem' }}>
              🎓 Education & Childcare
            </summary>
            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Qualified Education Expenses:
                </label>
                <input
                  type="number"
                  value={educationExpenses}
                  onChange={(e) => setEducationExpenses(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Student Loan Interest:
                </label>
                <input
                  type="number"
                  value={studentLoanInterest}
                  onChange={(e) => setStudentLoanInterest(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Dependent Care Expenses:
                </label>
                <input
                  type="number"
                  value={dependentCareExpenses}
                  onChange={(e) => setDependentCareExpenses(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </details>

          <details style={{ marginBottom: '0.75rem' }}>
            <summary style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', cursor: 'pointer', marginBottom: '0.5rem' }}>
              🏠 Itemized Deductions
            </summary>
            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  State & Local Taxes (SALT):
                </label>
                <input
                  type="number"
                  value={stateLocalTaxes}
                  onChange={(e) => setStateLocalTaxes(e.target.value)}
                  onFocus={selectAllOnFocus}
                  placeholder="Max $10,000"
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Mortgage Interest:
                </label>
                <input
                  type="number"
                  value={mortgageInterest}
                  onChange={(e) => setMortgageInterest(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Charitable Donations:
                </label>
                <input
                  type="number"
                  value={charitableDonations}
                  onChange={(e) => setCharitableDonations(e.target.value)}
                  onFocus={selectAllOnFocus}
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                  Medical Expenses:
                </label>
                <input
                  type="number"
                  value={medicalExpenses}
                  onChange={(e) => setMedicalExpenses(e.target.value)}
                  onFocus={selectAllOnFocus}
                  placeholder="Only amount over 7.5% AGI counts"
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </details>
        </div>

        {/* Results Section */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
            Tax Calculation Results
          </h4>

          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Income & AGI</h5>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Total Income:</span>
              <span style={{ fontWeight: '600' }}>{fmt((Number(annualIncome) || 0) + (Number(selfEmploymentIncome) || 0))}</span>
            </div>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Adjusted Gross Income:</span>
              <span style={{ fontWeight: '600' }}>{fmt(taxCalc.agi)}</span>
            </div>
          </div>

          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Deductions</h5>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Standard Deduction:</span>
              <span style={{ fontWeight: '600' }}>{fmt(taxCalc.standardDeduction)}</span>
            </div>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Itemized Deductions:</span>
              <span style={{ fontWeight: '600' }}>{fmt(taxCalc.itemizedDeductions)}</span>
            </div>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Using:</span>
              <span style={{ fontWeight: '600', color: taxCalc.usingItemized ? '#059669' : '#6b7280' }}>
                {taxCalc.usingItemized ? 'Itemized' : 'Standard'}
              </span>
            </div>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Tracked Deductible Expenses:</span>
              <span style={{ fontWeight: '600', color: '#059669' }}>{fmt(taxCalc.trackedExpenses.total)}</span>
            </div>
          </div>

          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Tax Calculation</h5>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Taxable Income:</span>
              <span style={{ fontWeight: '600' }}>{fmt(taxCalc.taxableIncome)}</span>
            </div>

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Income Tax:</span>
              <span style={{ fontWeight: '600' }}>{fmt(taxCalc.incomeTax)}</span>
            </div>

            {taxCalc.seTax > 0 && (
              <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>Self-Employment Tax:</span>
                <span style={{ fontWeight: '600' }}>{fmt(taxCalc.seTax)}</span>
              </div>
            )}

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: '#6b7280' }}>Total Tax Before Credits:</span>
              <span style={{ fontWeight: '600' }}>{fmt(taxCalc.grossTax)}</span>
            </div>
          </div>

          <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #d1fae5', marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Tax Credits</h5>

            {taxCalc.childTaxCredit > 0 && (
              <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>Child Tax Credit:</span>
                <span style={{ fontWeight: '600', color: '#059669' }}>-{fmt(taxCalc.childTaxCredit)}</span>
              </div>
            )}

            {taxCalc.eitc > 0 && (
              <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>Earned Income Credit:</span>
                <span style={{ fontWeight: '600', color: '#059669' }}>-{fmt(taxCalc.eitc)}</span>
              </div>
            )}

            {taxCalc.educationCredit > 0 && (
              <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>Education Credit:</span>
                <span style={{ fontWeight: '600', color: '#059669' }}>-{fmt(taxCalc.educationCredit)}</span>
              </div>
            )}

            {taxCalc.dependentCareCredit > 0 && (
              <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>Dependent Care Credit:</span>
                <span style={{ fontWeight: '600', color: '#059669' }}>-{fmt(taxCalc.dependentCareCredit)}</span>
              </div>
            )}

            <div style={{ marginBottom: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', paddingTop: '0.375rem', borderTop: '1px solid #d1fae5' }}>
              <span style={{ color: '#374151', fontWeight: '600' }}>Total Credits:</span>
              <span style={{ fontWeight: '600', color: '#059669' }}>-{fmt(taxCalc.totalCredits)}</span>
            </div>
          </div>

          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Net Tax Owed:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.netTax)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Payments:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.totalPaid)}</span>
            </div>

            <hr style={{ margin: '0.75rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                {taxCalc.refundOrOwed >= 0 ? 'Estimated Refund:' : 'Estimated Amount Owed:'}
              </span>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: taxCalc.refundOrOwed >= 0 ? '#059669' : '#dc2626'
              }}>
                {fmt(Math.abs(taxCalc.refundOrOwed))}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.75rem', fontStyle: 'italic' }}>
            * This is a comprehensive estimate using 2024 tax law. Results may vary based on specific circumstances. Consult a tax professional for complete accuracy.
            {taxCalc.usingItemized && (
              <div style={{ marginTop: '0.25rem', color: '#059669' }}>
                💡 You benefit from itemizing deductions! Itemized deductions save you {fmt(taxCalc.itemizedDeductions - taxCalc.standardDeduction)} over the standard deduction.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}