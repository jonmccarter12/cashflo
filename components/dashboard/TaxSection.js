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

// 2024 Standard Deductions
const STANDARD_DEDUCTIONS_2024 = {
  single: 14600,
  marriedJoint: 29200,
  marriedSeparate: 14600,
  headOfHousehold: 21900,
  qualifyingWidow: 29200
};

// 2024 Tax Brackets
const TAX_BRACKETS_2024 = {
  single: [
    { rate: 0.10, min: 0, max: 11000 },
    { rate: 0.12, min: 11000, max: 44725 },
    { rate: 0.22, min: 44725, max: 95375 },
    { rate: 0.24, min: 95375, max: 182050 },
    { rate: 0.32, min: 182050, max: 231250 },
    { rate: 0.35, min: 231250, max: 578100 },
    { rate: 0.37, min: 578100, max: Infinity }
  ],
  marriedJoint: [
    { rate: 0.10, min: 0, max: 22000 },
    { rate: 0.12, min: 22000, max: 89450 },
    { rate: 0.22, min: 89450, max: 190750 },
    { rate: 0.24, min: 190750, max: 364200 },
    { rate: 0.32, min: 364200, max: 462500 },
    { rate: 0.35, min: 462500, max: 693750 },
    { rate: 0.37, min: 693750, max: Infinity }
  ],
  marriedSeparate: [
    { rate: 0.10, min: 0, max: 11000 },
    { rate: 0.12, min: 11000, max: 44725 },
    { rate: 0.22, min: 44725, max: 95375 },
    { rate: 0.24, min: 95375, max: 182100 },
    { rate: 0.32, min: 182100, max: 231250 },
    { rate: 0.35, min: 231250, max: 346875 },
    { rate: 0.37, min: 346875, max: Infinity }
  ],
  headOfHousehold: [
    { rate: 0.10, min: 0, max: 15700 },
    { rate: 0.12, min: 15700, max: 59850 },
    { rate: 0.22, min: 59850, max: 95350 },
    { rate: 0.24, min: 95350, max: 182050 },
    { rate: 0.32, min: 182050, max: 231250 },
    { rate: 0.35, min: 231250, max: 578100 },
    { rate: 0.37, min: 578100, max: Infinity }
  ],
  qualifyingWidow: [
    { rate: 0.10, min: 0, max: 22000 },
    { rate: 0.12, min: 22000, max: 89450 },
    { rate: 0.22, min: 89450, max: 190750 },
    { rate: 0.24, min: 190750, max: 364200 },
    { rate: 0.32, min: 364200, max: 462500 },
    { rate: 0.35, min: 462500, max: 693750 },
    { rate: 0.37, min: 693750, max: Infinity }
  ]
};

// Calculate income tax for given income and filing status
const calculateIncomeTax = (income, status) => {
  const brackets = TAX_BRACKETS_2024[status];
  let tax = 0;
  let remainingIncome = income;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return tax;
};

// Calculate self-employment tax
const calculateSelfEmploymentTax = (seIncome) => {
  if (seIncome <= 400) return 0;

  const seTaxableIncome = seIncome * 0.9235; // 92.35% of SE income is subject to SE tax
  const ssTax = Math.min(seTaxableIncome, 160200) * 0.124; // SS tax on first $160,200 (2024)
  const medicareTax = seTaxableIncome * 0.029; // Medicare tax on all SE income
  const additionalMedicare = Math.max(0, seTaxableIncome - 200000) * 0.009; // Additional Medicare tax

  return ssTax + medicareTax + additionalMedicare;
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
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        w2Income: 0,
        selfEmploymentIncome: 0,
        incomeTransactions: []
      };
    }

    const currentYear = new Date().getFullYear();
    const incomeTransactions = transactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear();
      return transactionYear === currentYear &&
             t.amount > 0 &&
             (t.category?.toLowerCase().includes('income') ||
              t.category?.toLowerCase().includes('salary') ||
              t.category?.toLowerCase().includes('wages') ||
              t.description?.toLowerCase().includes('payroll') ||
              t.description?.toLowerCase().includes('salary'));
    });

    let w2Income = 0;
    let selfEmploymentIncome = 0;

    incomeTransactions.forEach(t => {
      if (t.category?.toLowerCase().includes('self-employment') ||
          t.category?.toLowerCase().includes('freelance') ||
          t.category?.toLowerCase().includes('business') ||
          t.description?.toLowerCase().includes('1099')) {
        selfEmploymentIncome += t.amount;
      } else {
        w2Income += t.amount;
      }
    });

    return {
      totalIncome: w2Income + selfEmploymentIncome,
      w2Income,
      selfEmploymentIncome,
      incomeTransactions
    };
  };

  const transactionIncome = calculateIncomeFromTransactions();

  // Calculate tracked tax-deductible expenses from bills and costs
  const calculateTrackedExpenses = () => {
    const allExpenses = [...(bills || []), ...(oneTimeCosts || [])];

    const deductibleExpenses = allExpenses.filter(expense =>
      expense.taxCategory &&
      expense.taxCategory !== 'None/Personal' &&
      IRS_TAX_CATEGORIES.includes(expense.taxCategory)
    );

    const categoryTotals = {};
    let total = 0;

    deductibleExpenses.forEach(expense => {
      const amount = expense.amount || 0;
      total += amount;
      categoryTotals[expense.taxCategory] = (categoryTotals[expense.taxCategory] || 0) + amount;
    });

    return {
      total,
      categoryTotals,
      expenses: deductibleExpenses
    };
  };

  // Calculate Child Tax Credit
  const calculateChildTaxCredit = (agi, numChildren, filingStatus) => {
    const children = Number(numChildren) || 0;
    if (children === 0) return 0;

    const creditPerChild = 2000;
    const maxCredit = children * creditPerChild;

    // Phase-out thresholds for 2024
    const phaseoutThresholds = {
      marriedJoint: 400000,
      single: 200000,
      marriedSeparate: 200000,
      headOfHousehold: 200000,
      qualifyingWidow: 400000
    };

    const threshold = phaseoutThresholds[filingStatus];
    if (agi <= threshold) return maxCredit;

    // Phase out $50 for every $1,000 over threshold
    const excess = Math.max(0, agi - threshold);
    const reduction = Math.ceil(excess / 1000) * 50;

    return Math.max(0, maxCredit - reduction);
  };

  // Calculate Earned Income Tax Credit (EITC)
  const calculateEITC = (agi, numChildren, filingStatus) => {
    const children = Number(numChildren) || 0;

    // 2024 EITC parameters
    const eitcParams = {
      0: { max: 600, phaseInRate: 0.0765, phaseOutStart: 9800, phaseOutRate: 0.0765 },
      1: { max: 3995, phaseInRate: 0.34, phaseOutStart: 20330, phaseOutRate: 0.1598 },
      2: { max: 6604, phaseInRate: 0.40, phaseOutStart: 20330, phaseOutRate: 0.2106 },
      3: { max: 7430, phaseInRate: 0.45, phaseOutStart: 20330, phaseOutRate: 0.2106 }
    };

    const childKey = Math.min(children, 3);
    const params = eitcParams[childKey];

    if (!params) return 0;

    // Married filing joint gets higher phase-out thresholds
    const marriedBonus = filingStatus === 'marriedJoint' ? 6900 : 0;
    const phaseOutStart = params.phaseOutStart + marriedBonus;

    if (agi <= phaseOutStart) {
      return Math.min(params.max, agi * params.phaseInRate);
    }

    const phaseOutAmount = (agi - phaseOutStart) * params.phaseOutRate;
    return Math.max(0, params.max - phaseOutAmount);
  };

  // Calculate Education Credit (American Opportunity Tax Credit)
  const calculateEducationCredit = (expenses, agi, filingStatus) => {
    const educationExp = Number(expenses) || 0;
    if (educationExp <= 0) return 0;

    // Phase-out ranges for AOTC
    const phaseoutThresholds = {
      marriedJoint: 160000,
      single: 80000,
      marriedSeparate: 80000,
      headOfHousehold: 80000,
      qualifyingWidow: 160000
    };

    const maxCredit = 2500; // 100% of first $2000, 25% of next $2000
    const actualCredit = Math.min(2000, educationExp) + Math.min(2000, Math.max(0, educationExp - 2000)) * 0.25;
    const credit = Math.min(maxCredit, actualCredit);

    const threshold = phaseoutThresholds[filingStatus];
    const phaseoutRange = filingStatus === 'marriedJoint' ? 20000 : 10000;

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

  // Modern input helper functions
  const selectAllOnFocus = (e) => {
    e.target.select();
    // Clear out zeros when focusing
    if (e.target.value === '0' || e.target.value === 0) {
      e.target.value = '';
    }
  };

  // Ultra-modern input styling for mobile-first design
  const getModernInputStyle = (isDisabled = false, isSuccess = false) => ({
    width: '100%',
    padding: isMobile ? '1.25rem' : '0.875rem',
    border: 'none',
    borderRadius: isMobile ? '20px' : '16px',
    fontSize: isMobile ? '1.1rem' : '0.9rem',
    fontWeight: '500',
    background: isSuccess
      ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
      : 'rgba(255, 255, 255, 0.95)',
    boxShadow: isSuccess
      ? '0 8px 20px rgba(34, 197, 94, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
      : '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    // Remove input arrows on all number inputs - works across browsers
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: isDisabled ? '#6b7280' : '#1f2937'
  });

  const handleInputFocus = (e) => {
    selectAllOnFocus(e);
    if (!e.target.disabled) {
      e.target.style.background = 'linear-gradient(135deg, #faf5ff 0%, #f3f4f6 100%)';
      e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
      e.target.style.transform = 'translateY(-1px)';
    }
  };

  const handleInputBlur = (e) => {
    if (!e.target.disabled) {
      e.target.style.background = 'rgba(255, 255, 255, 0.95)';
      e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
      e.target.style.transform = 'translateY(0)';
    }
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

  return (
    <div style={{
      background: isMobile
        ? 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
      padding: isMobile ? '1.5rem' : '2rem',
      borderRadius: isMobile ? '24px' : '20px',
      boxShadow: isMobile
        ? '0 12px 40px rgba(139, 92, 246, 0.15), 0 4px 16px rgba(0, 0, 0, 0.05)'
        : '0 20px 60px rgba(139, 92, 246, 0.12), 0 8px 20px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(139, 92, 246, 0.08)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ultra-modern gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: isMobile ? '200px' : '250px',
        height: isMobile ? '200px' : '250px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(99, 102, 241, 0.04) 100%)',
        borderRadius: '50%',
        transform: isMobile ? 'translate(100px, -100px)' : 'translate(125px, -125px)',
        pointerEvents: 'none',
        filter: 'blur(60px)'
      }} />

      {/* Modern mobile-first header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '1rem' : '0.75rem',
        marginBottom: isMobile ? '2rem' : '1.5rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: isMobile ? '56px' : '48px',
          height: isMobile ? '56px' : '48px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          borderRadius: isMobile ? '18px' : '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 24px rgba(139, 92, 246, 0.25)',
          fontSize: isMobile ? '24px' : '20px'
        }}>
          💰
        </div>
        <div>
          <h3 style={{
            fontSize: isMobile ? '1.75rem' : '1.5rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>
            Smart Tax Calculator
          </h3>
          <p style={{
            fontSize: isMobile ? '1rem' : '0.875rem',
            color: '#64748b',
            margin: '0.5rem 0 0 0',
            fontWeight: '500'
          }}>
            AI-powered tax estimation & planning
          </p>
        </div>
      </div>

      {/* Ultra-modern tab navigation optimized for mobile */}
      <div style={{
        display: 'flex',
        gap: isMobile ? '0.75rem' : '0.5rem',
        marginBottom: isMobile ? '2.5rem' : '2rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: 'relative',
        zIndex: 1,
        WebkitOverflowScrolling: 'touch'
      }}>
        {[
          { id: 'calculator', label: isMobile ? '📊 Calculate' : '📊 Calculator', icon: '📊' },
          { id: 'planning', label: isMobile ? '📈 Plan' : '📈 Planning', icon: '📈' },
          { id: 'quarterly', label: isMobile ? '📅 Quarterly' : '📅 Quarterly', icon: '📅' },
          { id: 'optimization', label: isMobile ? '🎯 Tips' : '🎯 Tips', icon: '🎯' },
          { id: 'scenarios', label: isMobile ? '🔮 Scenarios' : '🔮 Scenarios', icon: '🔮' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1rem',
              background: activeTab === tab.id
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                : 'rgba(255, 255, 255, 0.8)',
              color: activeTab === tab.id ? 'white' : '#64748b',
              border: 'none',
              borderRadius: isMobile ? '16px' : '12px',
              fontWeight: activeTab === tab.id ? '700' : '500',
              fontSize: isMobile ? '0.875rem' : '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeTab === tab.id
                ? '0 8px 16px rgba(139, 92, 246, 0.25)'
                : '0 2px 8px rgba(0, 0, 0, 0.06)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              transform: 'translateY(0)',
              letterSpacing: '-0.01em'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'rgba(139, 92, 246, 0.08)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Modern card-based layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? '1.5rem' : '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Ultra-modern input card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: isMobile ? '24px' : '20px',
          padding: isMobile ? '1.75rem' : '2rem',
          boxShadow: '0 12px 32px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(139, 92, 246, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Card header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.75rem' : '0.5rem',
            marginBottom: isMobile ? '2rem' : '1.5rem'
          }}>
            <div style={{
              width: isMobile ? '40px' : '32px',
              height: isMobile ? '40px' : '32px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: isMobile ? '12px' : '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '20px' : '16px',
              boxShadow: '0 6px 12px rgba(16, 185, 129, 0.25)'
            }}>
              💰
            </div>
            <h4 style={{
              fontSize: isMobile ? '1.25rem' : '1.1rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              letterSpacing: '-0.01em'
            }}>
              Income & Filing Info
            </h4>
          </div>

          {/* Filing status */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: isMobile ? '0.75rem' : '0.5rem'
            }}>
              Filing Status:
            </label>
            <select
              value={taxProfile.filingStatus}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, filingStatus: e.target.value }))}
              style={{
                ...getModernInputStyle(),
                cursor: 'pointer'
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            >
              <option value="single">Single</option>
              <option value="marriedJoint">Married Filing Jointly</option>
              <option value="marriedSeparate">Married Filing Separately</option>
              <option value="headOfHousehold">Head of Household</option>
              <option value="qualifyingWidow">Qualifying Widow(er)</option>
            </select>
          </div>

          {/* Annual income */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: isMobile ? '0.75rem' : '0.5rem'
            }}>
              Annual W-2/1099 Income:
              {transactionIncome.w2Income > 0 && (
                <span style={{
                  fontSize: isMobile ? '0.8rem' : '0.75rem',
                  color: '#059669',
                  fontWeight: '500',
                  marginLeft: '0.5rem',
                  display: isMobile ? 'block' : 'inline',
                  marginTop: isMobile ? '0.25rem' : '0'
                }}>
                  Auto-calculated from transactions: {fmt(transactionIncome.w2Income)}
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

          {/* Self-employment income */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: isMobile ? '0.75rem' : '0.5rem'
            }}>
              Self-Employment Income:
              {transactionIncome.selfEmploymentIncome > 0 && (
                <span style={{
                  fontSize: isMobile ? '0.8rem' : '0.75rem',
                  color: '#059669',
                  fontWeight: '500',
                  marginLeft: '0.5rem',
                  display: isMobile ? 'block' : 'inline',
                  marginTop: isMobile ? '0.25rem' : '0'
                }}>
                  Auto-calculated: {fmt(transactionIncome.selfEmploymentIncome)}
                </span>
              )}
            </label>
            <input
              type="number"
              value={transactionIncome.selfEmploymentIncome > 0 ? transactionIncome.selfEmploymentIncome : taxProfile.selfEmploymentIncome}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, selfEmploymentIncome: e.target.value }))}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={transactionIncome.selfEmploymentIncome > 0 ? "Auto-calculated from transactions" : "1099 income, business profits"}
              style={getModernInputStyle(transactionIncome.selfEmploymentIncome > 0, transactionIncome.selfEmploymentIncome > 0)}
              disabled={transactionIncome.selfEmploymentIncome > 0}
            />
          </div>

          {/* Auto-detected income alert */}
          {transactionIncome.totalIncome > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: isMobile ? '16px' : '12px',
              padding: isMobile ? '1.25rem' : '1rem',
              marginBottom: isMobile ? '1.5rem' : '1rem'
            }}>
              <div style={{
                fontSize: isMobile ? '0.95rem' : '0.875rem',
                fontWeight: '700',
                color: '#059669',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🎯 Income Auto-Detected
              </div>
              <div style={{
                fontSize: isMobile ? '0.85rem' : '0.75rem',
                color: '#065f46',
                lineHeight: 1.5
              }}>
                Found {transactionIncome.incomeTransactions.length} income transactions for {new Date().getFullYear()}
                <br />
                <strong>Total Income: {fmt(transactionIncome.totalIncome)}</strong>
                {transactionIncome.selfEmploymentIncome > 0 && (
                  <span> (W-2: {fmt(transactionIncome.w2Income)}, Self-Employment: {fmt(transactionIncome.selfEmploymentIncome)})</span>
                )}
              </div>
            </div>
          )}

          {/* Children and dependents - mobile-optimized grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '1.25rem' : '1rem',
            marginBottom: isMobile ? '1.5rem' : '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.95rem' : '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.75rem' : '0.5rem'
              }}>
                Children Under 17:
              </label>
              <input
                type="number"
                value={taxProfile.numChildren}
                onChange={(e) => setTaxProfile(prev => ({ ...prev, numChildren: Math.max(0, Number(e.target.value)) }))}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                style={getModernInputStyle()}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.95rem' : '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.75rem' : '0.5rem'
              }}>
                Other Dependents:
              </label>
              <input
                type="number"
                value={taxProfile.numOtherDependents}
                onChange={(e) => setTaxProfile(prev => ({ ...prev, numOtherDependents: Math.max(0, Number(e.target.value)) }))}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                style={getModernInputStyle()}
              />
            </div>
          </div>

          {/* Withholdings */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: isMobile ? '0.75rem' : '0.5rem'
            }}>
              Total Tax Withholdings:
            </label>
            <input
              type="number"
              value={taxProfile.totalWithholdings}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, totalWithholdings: e.target.value }))}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Federal tax withheld from paychecks"
              style={getModernInputStyle()}
            />
          </div>

          {/* Quarterly payments */}
          <div style={{ marginBottom: isMobile ? '1.5rem' : '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: isMobile ? '0.75rem' : '0.5rem'
            }}>
              Estimated Quarterly Payments:
            </label>
            <input
              type="number"
              value={taxProfile.estimatedQuarterlyPaid}
              onChange={(e) => setTaxProfile(prev => ({ ...prev, estimatedQuarterlyPaid: e.target.value }))}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Self-employment quarterly payments"
              style={getModernInputStyle()}
            />
          </div>

        </div>

        {/* Modern results section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: isMobile ? '24px' : '20px',
          padding: isMobile ? '1.75rem' : '2rem',
          boxShadow: '0 12px 32px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(139, 92, 246, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <h4 style={{
            fontSize: isMobile ? '1.25rem' : '1.1rem',
            fontWeight: '700',
            color: '#374151',
            marginBottom: isMobile ? '1.5rem' : '1rem',
            letterSpacing: '-0.01em'
          }}>
            💡 Tax Calculation Results
          </h4>

          {/* Income summary card */}
          <div style={{
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            padding: isMobile ? '1.5rem' : '1.25rem',
            borderRadius: isMobile ? '16px' : '12px',
            border: '1px solid #e5e7eb',
            marginBottom: isMobile ? '1.5rem' : '1rem'
          }}>
            <h5 style={{
              fontSize: isMobile ? '1rem' : '0.875rem',
              fontWeight: '700',
              color: '#374151',
              marginBottom: isMobile ? '1rem' : '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              💰 Income & AGI
            </h5>

            <div style={{
              marginBottom: isMobile ? '0.75rem' : '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '0.875rem' : '0.8rem'
            }}>
              <span style={{ color: '#6b7280' }}>Total Income:</span>
              <span style={{ fontWeight: '700', color: '#1f2937' }}>{fmt((Number(taxProfile.annualIncome) || 0) + (Number(taxProfile.selfEmploymentIncome) || 0))}</span>
            </div>

            <div style={{
              marginBottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '0.875rem' : '0.8rem'
            }}>
              <span style={{ color: '#6b7280' }}>Adjusted Gross Income:</span>
              <span style={{ fontWeight: '700', color: '#059669' }}>{fmt(taxCalc.agi)}</span>
            </div>
          </div>

          {/* Tax calculation card */}
          <div style={{
            background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
            padding: isMobile ? '1.5rem' : '1.25rem',
            borderRadius: isMobile ? '16px' : '12px',
            border: '1px solid #fcd34d',
            marginBottom: isMobile ? '1.5rem' : '1rem'
          }}>
            <h5 style={{
              fontSize: isMobile ? '1rem' : '0.875rem',
              fontWeight: '700',
              color: '#374151',
              marginBottom: isMobile ? '1rem' : '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🧮 Tax Calculation
            </h5>

            <div style={{
              marginBottom: isMobile ? '0.75rem' : '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '0.875rem' : '0.8rem'
            }}>
              <span style={{ color: '#6b7280' }}>Taxable Income:</span>
              <span style={{ fontWeight: '700' }}>{fmt(taxCalc.taxableIncome)}</span>
            </div>

            <div style={{
              marginBottom: isMobile ? '0.75rem' : '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '0.875rem' : '0.8rem'
            }}>
              <span style={{ color: '#6b7280' }}>Income Tax:</span>
              <span style={{ fontWeight: '700' }}>{fmt(taxCalc.incomeTax)}</span>
            </div>

            {taxCalc.seTax > 0 && (
              <div style={{
                marginBottom: isMobile ? '0.75rem' : '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: isMobile ? '0.875rem' : '0.8rem'
              }}>
                <span style={{ color: '#6b7280' }}>Self-Employment Tax:</span>
                <span style={{ fontWeight: '700' }}>{fmt(taxCalc.seTax)}</span>
              </div>
            )}

            <div style={{
              marginBottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '0.875rem' : '0.8rem',
              paddingTop: isMobile ? '0.75rem' : '0.5rem',
              borderTop: '1px solid #fbbf24'
            }}>
              <span style={{ color: '#374151', fontWeight: '700' }}>Total Tax Before Credits:</span>
              <span style={{ fontWeight: '700', color: '#d97706' }}>{fmt(taxCalc.grossTax)}</span>
            </div>
          </div>

          {/* Credits card */}
          {taxCalc.totalCredits > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              padding: isMobile ? '1.5rem' : '1.25rem',
              borderRadius: isMobile ? '16px' : '12px',
              border: '1px solid #bbf7d0',
              marginBottom: isMobile ? '1.5rem' : '1rem'
            }}>
              <h5 style={{
                fontSize: isMobile ? '1rem' : '0.875rem',
                fontWeight: '700',
                color: '#374151',
                marginBottom: isMobile ? '1rem' : '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🎁 Tax Credits
              </h5>

              {taxCalc.childTaxCredit > 0 && (
                <div style={{
                  marginBottom: isMobile ? '0.75rem' : '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: isMobile ? '0.875rem' : '0.8rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Child Tax Credit:</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>-{fmt(taxCalc.childTaxCredit)}</span>
                </div>
              )}

              {taxCalc.eitc > 0 && (
                <div style={{
                  marginBottom: isMobile ? '0.75rem' : '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: isMobile ? '0.875rem' : '0.8rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Earned Income Credit:</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>-{fmt(taxCalc.eitc)}</span>
                </div>
              )}

              <div style={{
                marginBottom: 0,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: isMobile ? '0.875rem' : '0.8rem',
                paddingTop: isMobile ? '0.75rem' : '0.5rem',
                borderTop: '1px solid #bbf7d0'
              }}>
                <span style={{ color: '#374151', fontWeight: '700' }}>Total Credits:</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>-{fmt(taxCalc.totalCredits)}</span>
              </div>
            </div>
          )}

          {/* Final result card */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: isMobile ? '1.75rem' : '1.5rem',
            borderRadius: isMobile ? '18px' : '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              marginBottom: isMobile ? '1rem' : '0.75rem',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: isMobile ? '1rem' : '0.875rem',
                color: '#6b7280',
                fontWeight: '600'
              }}>Net Tax Owed:</span>
              <span style={{
                fontSize: isMobile ? '1rem' : '0.875rem',
                fontWeight: '700'
              }}>{fmt(taxCalc.netTax)}</span>
            </div>

            <div style={{
              marginBottom: isMobile ? '1rem' : '0.75rem',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{
                fontSize: isMobile ? '1rem' : '0.875rem',
                color: '#6b7280',
                fontWeight: '600'
              }}>Total Payments:</span>
              <span style={{
                fontSize: isMobile ? '1rem' : '0.875rem',
                fontWeight: '700'
              }}>{fmt(taxCalc.totalPaid)}</span>
            </div>

            <hr style={{
              margin: isMobile ? '1.25rem 0' : '1rem 0',
              border: 'none',
              borderTop: '2px solid #e2e8f0'
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: isMobile ? '1.25rem' : '1.1rem',
                fontWeight: '700',
                color: '#374151'
              }}>
                {taxCalc.refundOrOwed >= 0 ? '🎉 Estimated Refund:' : '💸 Estimated Amount Owed:'}
              </span>
              <span style={{
                fontSize: isMobile ? '1.5rem' : '1.25rem',
                fontWeight: '800',
                color: taxCalc.refundOrOwed >= 0 ? '#059669' : '#dc2626',
                textShadow: taxCalc.refundOrOwed >= 0
                  ? '0 1px 3px rgba(5, 150, 105, 0.3)'
                  : '0 1px 3px rgba(220, 38, 38, 0.3)'
              }}>
                {fmt(Math.abs(taxCalc.refundOrOwed))}
              </span>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            fontSize: isMobile ? '0.8rem' : '0.75rem',
            color: '#6b7280',
            marginTop: isMobile ? '1.25rem' : '1rem',
            fontStyle: 'italic',
            lineHeight: 1.4
          }}>
            * This is a comprehensive estimate using 2024 tax law. Results may vary based on specific circumstances. Consult a tax professional for complete accuracy.
            {taxCalc.usingItemized && (
              <div style={{
                marginTop: isMobile ? '0.75rem' : '0.5rem',
                color: '#059669',
                fontWeight: '600'
              }}>
                💡 You benefit from itemizing deductions! You save {fmt(taxCalc.itemizedDeductions - taxCalc.standardDeduction)} over the standard deduction.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}