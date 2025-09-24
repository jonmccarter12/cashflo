import React from 'react';
import { fmt } from '../../lib/utils';
import { notify } from '../Notify';

// Advanced Tax Planning Engine
const TAX_OPTIMIZER = {
  analyzeDeductions: (expenses, filingStatus, income) => {
    const standardDeduction = STANDARD_DEDUCTIONS_2024[filingStatus] || 14600;
    const itemizedTotal = expenses.reduce((sum, expense) => {
      if (expense.taxCategory && expense.taxCategory !== 'None/Personal') {
        return sum + (expense.amount || 0);
      }
      return sum;
    }, 0);

    return {
      standard: standardDeduction,
      itemized: itemizedTotal,
      recommended: itemizedTotal > standardDeduction ? 'itemized' : 'standard',
      savings: Math.max(0, itemizedTotal - standardDeduction)
    };
  },

  getOptimizationTips: (income, deductions, filingStatus) => {
    const tips = [];

    if (deductions.itemized < deductions.standard) {
      tips.push({
        category: 'Deduction Strategy',
        tip: 'Consider bundling charitable donations in alternating years to exceed standard deduction',
        impact: 'High',
        action: 'Bundle donations'
      });
    }

    if (income > 100000) {
      tips.push({
        category: 'Tax Planning',
        tip: 'Max out 401(k) contributions to reduce taxable income',
        impact: 'High',
        action: 'Increase retirement contributions'
      });
    }

    tips.push({
      category: 'Quarterly Planning',
      tip: 'Make estimated tax payments to avoid penalties',
      impact: 'Medium',
      action: 'Set up quarterly payments'
    });

    return tips;
  },

  calculateQuarterlyPayments: (income, federalTax, stateTax) => {
    const totalTax = federalTax + stateTax;
    const quarterly = totalTax / 4;
    const safeharbor = income > 150000 ? totalTax * 1.1 : totalTax;

    return {
      quarterly: quarterly,
      safeharbor: safeharbor / 4,
      dueQ1: '2024-04-15',
      dueQ2: '2024-06-17',
      dueQ3: '2024-09-16',
      dueQ4: '2025-01-15'
    };
  }
};

// Advanced tax scenarios
const TAX_SCENARIOS = {
  optimistic: { factor: 0.9, label: 'Optimistic (10% less income)' },
  realistic: { factor: 1.0, label: 'Current Income' },
  growth: { factor: 1.2, label: 'Growth (20% income increase)' },
  conservative: { factor: 1.1, label: 'Conservative (10% increase)' }
};

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

// 2024 Tax Brackets (Corrected)
const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11000, rate: 0.10 },
    { min: 11000, max: 44725, rate: 0.12 },
    { min: 44725, max: 95375, rate: 0.22 },
    { min: 95375, max: 182050, rate: 0.24 },
    { min: 182050, max: 231250, rate: 0.32 },
    { min: 231250, max: 578125, rate: 0.35 },
    { min: 578125, max: Infinity, rate: 0.37 }
  ],
  marriedJoint: [
    { min: 0, max: 22000, rate: 0.10 },
    { min: 22000, max: 89450, rate: 0.12 },
    { min: 89450, max: 190750, rate: 0.22 },
    { min: 190750, max: 364200, rate: 0.24 },
    { min: 364200, max: 462500, rate: 0.32 },
    { min: 462500, max: 693750, rate: 0.35 },
    { min: 693750, max: Infinity, rate: 0.37 }
  ],
  marriedSeparate: [
    { min: 0, max: 11000, rate: 0.10 },
    { min: 11000, max: 44725, rate: 0.12 },
    { min: 44725, max: 95375, rate: 0.22 },
    { min: 95375, max: 182100, rate: 0.24 },
    { min: 182100, max: 231250, rate: 0.32 },
    { min: 231250, max: 346875, rate: 0.35 },
    { min: 346875, max: Infinity, rate: 0.37 }
  ],
  headOfHousehold: [
    { min: 0, max: 15700, rate: 0.10 },
    { min: 15700, max: 59850, rate: 0.12 },
    { min: 59850, max: 95350, rate: 0.22 },
    { min: 95350, max: 182050, rate: 0.24 },
    { min: 182050, max: 231250, rate: 0.32 },
    { min: 231250, max: 578100, rate: 0.35 },
    { min: 578100, max: Infinity, rate: 0.37 }
  ],
  qualifyingWidow: [
    { min: 0, max: 22000, rate: 0.10 },
    { min: 22000, max: 89450, rate: 0.12 },
    { min: 89450, max: 190750, rate: 0.22 },
    { min: 190750, max: 364200, rate: 0.24 },
    { min: 364200, max: 462500, rate: 0.32 },
    { min: 462500, max: 693750, rate: 0.35 },
    { min: 693750, max: Infinity, rate: 0.37 }
  ]
};

// Standard Deductions 2024 (Corrected)
const STANDARD_DEDUCTIONS_2024 = {
  single: 13850,
  marriedJoint: 27700,
  marriedSeparate: 13850,
  headOfHousehold: 20800,
  qualifyingWidow: 27700
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
  // Enhanced state management
  const [activeTab, setActiveTab] = React.useState('calculator');
  const [taxScenario, setTaxScenario] = React.useState('realistic');
  const [taxProfile, setTaxProfile] = React.useState({
    // Basic Info
    annualIncome: '',
    selfEmploymentIncome: '',
    filingStatus: 'single',
    totalWithholdings: '',
    estimatedQuarterlyPaid: '',

    // Dependents & Family
    numChildren: 0,
    numChildrenUnder6: 0,
    numOtherDependents: 0,
    dependentCareExpenses: '',

    // Education
    educationExpenses: '',
    studentLoanInterest: '',

    // Retirement & Savings
    traditional401k: '',
    traditionalIRA: '',
    hsaContributions: '',

    // Health & Medical
    healthInsurancePremiums: '',
    medicalExpenses: '',

    // Other Deductions
    stateLocalTaxes: '',
    mortgageInterest: '',
    charitableDonations: '',

    // Business deductions (for self-employed)
    businessExpenses: '',
    homeOfficeExpenses: '',
    businessMileage: '',

    // Advanced planning
    estimatedTaxPenalty: '',
    priorYearTax: '',
    priorYearAGI: ''
  });

  const [taxAnalysis, setTaxAnalysis] = React.useState(null);
  const [optimizationTips, setOptimizationTips] = React.useState([]);
  const [quarterlyPayments, setQuarterlyPayments] = React.useState(null);

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
    const socialSecurityBase = Math.min(seIncome92_35, 168600); // 2024 SS wage base
    const socialSecurityTax = socialSecurityBase * 0.124; // 12.4%
    const medicareTax = seIncome92_35 * 0.029; // 2.9%

    // Additional Medicare tax for high earners
    const additionalMedicareTax = seIncome > 200000 ? (seIncome - 200000) * 0.009 : 0;

    return socialSecurityTax + medicareTax + additionalMedicareTax;
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
    const income = transactionIncome.totalIncome > 0 ? transactionIncome.w2Income : (Number(taxProfile.annualIncome) || 0);
    const seIncome = transactionIncome.selfEmploymentIncome > 0 ? transactionIncome.selfEmploymentIncome : (Number(taxProfile.selfEmploymentIncome) || 0);
    const trackedExpenses = calculateTrackedExpenses();

    // Calculate AGI
    const seDeduction = seIncome > 0 ? calculateSelfEmploymentTax(seIncome) * 0.5 : 0; // Half of SE tax is deductible
    const iraDeduction = Number(taxProfile.traditionalIRA) || 0;
    const hsa = Number(taxProfile.hsaContributions) || 0;
    const studentLoan = Math.min(Number(taxProfile.studentLoanInterest) || 0, 2500); // $2500 limit

    const agi = income + seIncome - seDeduction - iraDeduction - hsa - studentLoan;

    // Calculate deductions
    const standardDeduction = STANDARD_DEDUCTIONS_2024[taxProfile.filingStatus];
    const itemizedDeductions =
      trackedExpenses.total +
      (Number(taxProfile.stateLocalTaxes) || 0) +
      (Number(taxProfile.mortgageInterest) || 0) +
      (Number(taxProfile.charitableDonations) || 0) +
      Math.max(0, (Number(taxProfile.medicalExpenses) || 0) - agi * 0.075); // Medical expenses over 7.5% AGI

    const totalDeductions = Math.max(standardDeduction, itemizedDeductions);
    const taxableIncome = Math.max(0, agi - totalDeductions);

    // Calculate taxes
    const incomeTax = calculateIncomeTax(taxableIncome, taxProfile.filingStatus);
    const seTax = calculateSelfEmploymentTax(seIncome);
    const grossTax = incomeTax + seTax;

    // Calculate credits
    const childTaxCredit = calculateChildTaxCredit(agi, Number(taxProfile.numChildren), taxProfile.filingStatus);
    const eitc = calculateEITC(agi, Number(taxProfile.numChildren), taxProfile.filingStatus);
    const educationCredit = calculateEducationCredit(taxProfile.educationExpenses, agi, taxProfile.filingStatus);
    const dependentCareCredit = calculateDependentCareCredit(taxProfile.dependentCareExpenses, agi, Number(taxProfile.numChildren));

    const totalCredits = childTaxCredit + eitc + educationCredit + dependentCareCredit;
    const netTax = Math.max(0, grossTax - totalCredits);

    // Calculate payments
    const withholdings = Number(taxProfile.totalWithholdings) || 0;
    const quarterlyPaid = Number(taxProfile.estimatedQuarterlyPaid) || 0;
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

  // Modern input styling helper
  const getModernInputStyle = (isDisabled = false, isSuccess = false) => ({
    width: '100%',
    padding: '0.75rem',
    border: isSuccess ? '2px solid #10b981' : '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '500',
    background: isSuccess ? '#f0fdf4' : 'white',
    boxShadow: isSuccess ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease',
    outline: 'none'
  });

  const handleInputFocus = (e) => {
    selectAllOnFocus(e);
    if (!e.target.disabled) {
      e.target.style.borderColor = '#8b5cf6';
      e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
    }
  };

  const handleInputBlur = (e) => {
    if (!e.target.disabled) {
      e.target.style.borderColor = '#e5e7eb';
      e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
    }
  };

  // Advanced tax analysis
  React.useEffect(() => {
    if (taxProfile.annualIncome || transactionIncome.totalIncome > 0) {
      const income = Number(taxProfile.annualIncome) || transactionIncome.totalIncome;
      const adjustedIncome = income * TAX_SCENARIOS[taxScenario].factor;

      const analysis = performComprehensiveTaxAnalysis(adjustedIncome);
      setTaxAnalysis(analysis);

      const tips = TAX_OPTIMIZER.getOptimizationTips(adjustedIncome, analysis.deductions, taxProfile.filingStatus);
      setOptimizationTips(tips);

      const quarterly = TAX_OPTIMIZER.calculateQuarterlyPayments(adjustedIncome, analysis.federalTax, analysis.stateTax);
      setQuarterlyPayments(quarterly);
    }
  }, [taxProfile, taxScenario, transactionIncome, bills, oneTimeCosts]);

  const performComprehensiveTaxAnalysis = (income) => {
    const expenses = [...bills, ...oneTimeCosts];
    const deductionAnalysis = TAX_OPTIMIZER.analyzeDeductions(expenses, taxProfile.filingStatus, income);

    const standardDeduction = STANDARD_DEDUCTIONS_2024[taxProfile.filingStatus] || 14600;
    const deduction = deductionAnalysis.recommended === 'itemized' ? deductionAnalysis.itemized : standardDeduction;

    const taxableIncome = Math.max(0, income - deduction);
    const federalTax = calculateIncomeTax(taxableIncome, taxProfile.filingStatus);
    const selfEmploymentTax = calculateSelfEmploymentTax(Number(taxProfile.selfEmploymentIncome) || 0);
    const childTaxCredit = calculateChildTaxCredit(income, taxProfile.numChildren, taxProfile.filingStatus);

    const totalTax = federalTax + selfEmploymentTax - childTaxCredit;
    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
    const marginalRate = getMarginalRate(taxableIncome, taxProfile.filingStatus);

    return {
      income,
      taxableIncome,
      standardDeduction,
      federalTax,
      selfEmploymentTax,
      childTaxCredit,
      totalTax,
      effectiveRate,
      marginalRate,
      stateTax: totalTax * 0.06, // Estimated 6% state tax
      deductions: deductionAnalysis,
      refund: (Number(taxProfile.totalWithholdings) || 0) - totalTax
    };
  };

  const getMarginalRate = (taxableIncome, status) => {
    const brackets = TAX_BRACKETS_2024[status];
    for (const bracket of brackets) {
      if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
        return bracket.rate * 100;
      }
    }
    return 37; // Top rate
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
      padding: isMobile ? '1rem' : '1.5rem',
      borderRadius: isMobile ? '1rem' : '1.5rem',
      boxShadow: isMobile
        ? '0 8px 25px rgba(139, 92, 246, 0.15), 0 2px 8px rgba(0, 0, 0, 0.05)'
        : '0 20px 40px rgba(139, 92, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)',
      border: '1px solid rgba(139, 92, 246, 0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Modern gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '150px',
        height: '150px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(99, 102, 241, 0.03) 100%)',
        borderRadius: '50%',
        transform: 'translate(75px, -75px)',
        pointerEvents: 'none'
      }} />

      {/* Header with modern styling */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: isMobile ? '40px' : '48px',
          height: isMobile ? '40px' : '48px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(139, 92, 246, 0.3)',
          fontSize: isMobile ? '18px' : '22px'
        }}>
          📊
        </div>
        <div>
          <h3 style={{
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            lineHeight: 1.2
          }}>
            Tax Calculator
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0.25rem 0 0 0',
            fontWeight: '500'
          }}>
            Smart tax estimation & planning
          </p>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '0.5rem' : '0.75rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'relative',
        zIndex: 1
      }}>
        {[
          { id: 'calculator', label: isMobile ? 'Calculator' : '📊 Calculator', icon: '📊' },
          { id: 'planning', label: isMobile ? 'Planning' : '📈 Planning', icon: '📈' },
          { id: 'quarterly', label: isMobile ? 'Quarterly' : '📅 Quarterly', icon: '📅' },
          { id: 'optimization', label: isMobile ? 'Tips' : '🎯 Tips', icon: '🎯' },
          { id: 'scenarios', label: isMobile ? 'Scenarios' : '🔮 Scenarios', icon: '🔮' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                : 'rgba(255, 255, 255, 0.7)',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              border: activeTab === tab.id
                ? '1px solid rgba(139, 92, 246, 0.3)'
                : '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '12px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab.id
                ? '0 4px 12px rgba(139, 92, 246, 0.25)'
                : '0 2px 4px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'rgba(255, 255, 255, 0.7)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '1rem' : '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Modern Input Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 8px 25px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(139, 92, 246, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>
              💰
            </div>
            <h4 style={{
              fontSize: isMobile ? '1rem' : '1.125rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              Income & Filing Info
            </h4>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Filing Status:
            </label>
            <select
              value={taxProfile.filingStatus}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, filingStatus: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '500',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
              }}
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
              value={transactionIncome.w2Income > 0 ? transactionIncome.w2Income : taxProfile.annualIncome}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, annualIncome: e.target.value }))}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={transactionIncome.w2Income > 0 ? "Auto-calculated from transactions" : "Enter annual income"}
              style={getModernInputStyle(transactionIncome.w2Income > 0, transactionIncome.w2Income > 0)}
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
              value={transactionIncome.selfEmploymentIncome > 0 ? transactionIncome.selfEmploymentIncome : taxProfile.selfEmploymentIncome}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, selfEmploymentIncome: e.target.value }))}
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
                value={taxProfile.numChildren}
                onChange={(e) => setTaxProfile(prev => ({ ...prev, numChildren: Math.max(0, Number(e.target.value)) }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Other Dependents:
              </label>
              <input
                type="number"
                value={taxProfile.numOtherDependents}
                onChange={(e) => setTaxProfile(prev => ({ ...prev, numOtherDependents: Math.max(0, Number(e.target.value)) }))}
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
              value={taxProfile.totalWithholdings}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, totalWithholdings: e.target.value }))}
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
              value={taxProfile.estimatedQuarterlyPaid}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, estimatedQuarterlyPaid: e.target.value }))}
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
                  value={taxProfile.traditional401k}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, traditional401k: e.target.value }))}
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
                  value={taxProfile.traditionalIRA}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, traditionalIRA: e.target.value }))}
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
                  value={taxProfile.hsaContributions}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, hsaContributions: e.target.value }))}
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
                  value={taxProfile.educationExpenses}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, educationExpenses: e.target.value }))}
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
                  value={taxProfile.studentLoanInterest}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, studentLoanInterest: e.target.value }))}
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
                  value={taxProfile.dependentCareExpenses}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, dependentCareExpenses: e.target.value }))}
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
                  value={taxProfile.stateLocalTaxes}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, stateLocalTaxes: e.target.value }))}
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
                  value={taxProfile.mortgageInterest}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, mortgageInterest: e.target.value }))}
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
                  value={taxProfile.charitableDonations}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, charitableDonations: e.target.value }))}
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
                  value={taxProfile.medicalExpenses}
                  onChange={(e) => setTaxProfile(prev => ({ ...prev, medicalExpenses: e.target.value }))}
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
              <span style={{ fontWeight: '600' }}>{fmt((Number(taxProfile.annualIncome) || 0) + (Number(taxProfile.selfEmploymentIncome) || 0))}</span>
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