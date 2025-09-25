import React from 'react';
import { fmt } from '../../lib/utils';
import { notify } from '../Notify';

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
  ]
};

const calculateIncomeTax = (income, status) => {
  const brackets = TAX_BRACKETS_2024[status] || TAX_BRACKETS_2024.single;
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

const calculateChildTaxCredit = (agi, numChildren, filingStatus) => {
  const children = Number(numChildren) || 0;
  if (children === 0) return 0;

  const creditPerChild = 2000;
  const maxCredit = children * creditPerChild;

  const phaseoutThresholds = {
    marriedJoint: 400000,
    single: 200000,
    marriedSeparate: 200000,
    headOfHousehold: 200000,
    qualifyingWidow: 400000
  };

  const threshold = phaseoutThresholds[filingStatus] || 200000;
  if (agi <= threshold) return maxCredit;

  const excess = Math.max(0, agi - threshold);
  const reduction = Math.ceil(excess / 1000) * 50;
  return Math.max(0, maxCredit - reduction);
};

export default function TaxSectionV2({ isMobile, transactions, bills, oneTimeCosts }) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const [taxData, setTaxData] = React.useState({
    filingStatus: 'single',
    annualIncome: '',
    selfEmploymentIncome: '',
    numChildren: 0,
    numOtherDependents: 0,
    totalWithholdings: '',
    estimatedQuarterlyPaid: '',
    traditionalIRA: '',
    hsaContributions: '',
    studentLoanInterest: '',
    stateLocalTaxes: '',
    mortgageInterest: '',
    charitableDonations: '',
    medicalExpenses: ''
  });

  // SMART TAX INTELLIGENCE - Auto-detect everything from transactions
  const analyzeAllTaxData = () => {
    if (!transactions || transactions.length === 0) {
      return {
        income: { totalIncome: 0, w2Income: 0, selfEmploymentIncome: 0, incomeTransactions: [] },
        deductions: {},
        payments: {},
        summary: { detectedItems: 0, confidence: 0 }
      };
    }

    const currentYear = new Date().getFullYear();
    let detectedItems = 0;

    // === INCOME DETECTION ===
    const incomeTransactions = transactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear();
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';

      return transactionYear === currentYear && t.amount > 0 && (
        cat.includes('income') || cat.includes('salary') || cat.includes('wages') ||
        cat.includes('payroll') || cat.includes('employment') ||
        desc.includes('payroll') || desc.includes('salary') || desc.includes('wages') ||
        desc.includes('paycheck') || desc.includes('direct deposit') ||
        desc.includes('bonus') || desc.includes('commission')
      );
    });

    let w2Income = 0;
    let selfEmploymentIncome = 0;

    incomeTransactions.forEach(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';

      if (cat.includes('self-employment') || cat.includes('freelance') ||
          cat.includes('business') || cat.includes('contractor') ||
          desc.includes('freelance') || desc.includes('1099') ||
          desc.includes('contractor') || desc.includes('consulting')) {
        selfEmploymentIncome += t.amount;
      } else {
        w2Income += t.amount;
      }
    });

    if (incomeTransactions.length > 0) detectedItems++;

    // === DEDUCTION DETECTION ===
    const expenseTransactions = transactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear();
      return transactionYear === currentYear && t.amount < 0;
    });

    // Medical expenses
    const medicalTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('medical') || cat.includes('health') || cat.includes('pharmacy') ||
             cat.includes('doctor') || cat.includes('hospital') || cat.includes('dental') ||
             desc.includes('medical') || desc.includes('pharmacy') || desc.includes('cvs') ||
             desc.includes('walgreens') || desc.includes('doctor') || desc.includes('hospital') ||
             desc.includes('dental') || desc.includes('urgent care') || desc.includes('clinic');
    });
    const medicalExpenses = Math.abs(medicalTransactions.reduce((sum, t) => sum + t.amount, 0));

    // Charitable donations
    const charityTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('charity') || cat.includes('donation') || cat.includes('nonprofit') ||
             desc.includes('donation') || desc.includes('charity') || desc.includes('church') ||
             desc.includes('salvation army') || desc.includes('goodwill') || desc.includes('red cross') ||
             desc.includes('united way') || desc.includes('nonprofit') || desc.includes('foundation');
    });
    const charitableDonations = Math.abs(charityTransactions.reduce((sum, t) => sum + t.amount, 0));

    // Mortgage interest (from bills or transactions)
    const mortgageTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('mortgage') || cat.includes('home loan') ||
             desc.includes('mortgage') || desc.includes('home loan') || desc.includes('wells fargo home') ||
             desc.includes('quicken loan') || desc.includes('bank of america home') || desc.includes('chase home');
    });
    const mortgageTotal = Math.abs(mortgageTransactions.reduce((sum, t) => sum + t.amount, 0));
    const mortgageInterest = mortgageTotal * 0.75; // Estimate 75% is interest

    // State and local taxes
    const taxTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('tax') && !cat.includes('federal') ||
             desc.includes('state tax') || desc.includes('property tax') ||
             desc.includes('irs') && desc.includes('state') || desc.includes('dmv') ||
             desc.includes('county tax') || desc.includes('city tax');
    });
    const stateLocalTaxes = Math.abs(taxTransactions.reduce((sum, t) => sum + t.amount, 0));

    // Student loan interest
    const studentLoanTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('student loan') || cat.includes('education loan') ||
             desc.includes('student loan') || desc.includes('navient') || desc.includes('great lakes') ||
             desc.includes('fedloan') || desc.includes('nelnet') || desc.includes('sallie mae');
    });
    const studentLoanTotal = Math.abs(studentLoanTransactions.reduce((sum, t) => sum + t.amount, 0));
    const studentLoanInterest = Math.min(studentLoanTotal * 0.6, 2500); // Estimate 60% interest, cap at $2500

    // IRA contributions
    const iraTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('ira') || cat.includes('retirement') ||
             desc.includes('traditional ira') || desc.includes('ira contribution') ||
             desc.includes('retirement') || desc.includes('401k') || desc.includes('403b');
    });
    const traditionalIRA = Math.abs(iraTransactions.reduce((sum, t) => sum + t.amount, 0));

    // HSA contributions
    const hsaTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return cat.includes('hsa') || desc.includes('health savings') || desc.includes('hsa');
    });
    const hsaContributions = Math.abs(hsaTransactions.reduce((sum, t) => sum + t.amount, 0));

    // === TAX PAYMENTS/WITHHOLDINGS DETECTION ===
    const taxPaymentTransactions = expenseTransactions.filter(t => {
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category?.toLowerCase() || '';
      return desc.includes('irs') || desc.includes('tax payment') ||
             desc.includes('federal withholding') || desc.includes('estimated tax') ||
             cat.includes('tax payment') || cat.includes('withholding');
    });
    const estimatedQuarterlyPaid = Math.abs(taxPaymentTransactions.reduce((sum, t) => sum + t.amount, 0));

    // Estimate withholdings from payroll (typically 20-25% of gross income)
    const estimatedWithholdings = w2Income * 0.22;

    // Count detected deduction categories
    if (medicalExpenses > 0) detectedItems++;
    if (charitableDonations > 0) detectedItems++;
    if (mortgageInterest > 0) detectedItems++;
    if (stateLocalTaxes > 0) detectedItems++;
    if (studentLoanInterest > 0) detectedItems++;
    if (traditionalIRA > 0) detectedItems++;
    if (hsaContributions > 0) detectedItems++;
    if (estimatedQuarterlyPaid > 0) detectedItems++;

    const maxPossibleItems = 9; // Total categories we check for
    const confidence = Math.round((detectedItems / maxPossibleItems) * 100);

    return {
      income: {
        totalIncome: w2Income + selfEmploymentIncome,
        w2Income,
        selfEmploymentIncome,
        incomeTransactions
      },
      deductions: {
        medicalExpenses,
        charitableDonations,
        mortgageInterest,
        stateLocalTaxes,
        studentLoanInterest,
        traditionalIRA,
        hsaContributions,
        // Add transaction details for transparency
        medicalTransactions,
        charityTransactions,
        mortgageTransactions,
        taxTransactions,
        studentLoanTransactions,
        iraTransactions,
        hsaTransactions
      },
      payments: {
        estimatedQuarterlyPaid,
        totalWithholdings: estimatedWithholdings,
        taxPaymentTransactions
      },
      summary: {
        detectedItems,
        maxPossibleItems,
        confidence,
        totalTransactionsAnalyzed: transactions.length,
        currentYearTransactions: transactions.filter(t => new Date(t.date).getFullYear() === currentYear).length
      }
    };
  };

  // Get comprehensive smart analysis
  const smartTaxData = analyzeAllTaxData();

  // Main tax calculation with smart auto-population
  const calculateTax = () => {
    // Use detected values or fall back to manual input
    const income = smartTaxData.income.w2Income > 0 ? smartTaxData.income.w2Income : (Number(taxData.annualIncome) || 0);
    const seIncome = smartTaxData.income.selfEmploymentIncome > 0 ? smartTaxData.income.selfEmploymentIncome : (Number(taxData.selfEmploymentIncome) || 0);

    // Use detected deductions or manual input
    const iraDeduction = smartTaxData.deductions.traditionalIRA > 0 ? smartTaxData.deductions.traditionalIRA : (Number(taxData.traditionalIRA) || 0);
    const hsa = smartTaxData.deductions.hsaContributions > 0 ? smartTaxData.deductions.hsaContributions : (Number(taxData.hsaContributions) || 0);
    const studentLoan = smartTaxData.deductions.studentLoanInterest > 0 ? smartTaxData.deductions.studentLoanInterest : Math.min(Number(taxData.studentLoanInterest) || 0, 2500);
    const agi = income + seIncome - iraDeduction - hsa - studentLoan;

    // Calculate deductions with smart detection
    const standardDeduction = STANDARD_DEDUCTIONS_2024[taxData.filingStatus];
    const itemizedDeductions =
      (smartTaxData.deductions.stateLocalTaxes > 0 ? smartTaxData.deductions.stateLocalTaxes : (Number(taxData.stateLocalTaxes) || 0)) +
      (smartTaxData.deductions.mortgageInterest > 0 ? smartTaxData.deductions.mortgageInterest : (Number(taxData.mortgageInterest) || 0)) +
      (smartTaxData.deductions.charitableDonations > 0 ? smartTaxData.deductions.charitableDonations : (Number(taxData.charitableDonations) || 0)) +
      Math.max(0, (smartTaxData.deductions.medicalExpenses > 0 ? smartTaxData.deductions.medicalExpenses : (Number(taxData.medicalExpenses) || 0)) - agi * 0.075);

    const totalDeductions = Math.max(standardDeduction, itemizedDeductions);
    const taxableIncome = Math.max(0, agi - totalDeductions);

    // Calculate taxes and credits
    const incomeTax = calculateIncomeTax(taxableIncome, taxData.filingStatus);
    const childTaxCredit = calculateChildTaxCredit(agi, taxData.numChildren, taxData.filingStatus);
    const netTax = Math.max(0, incomeTax - childTaxCredit);

    // Calculate payments with smart detection
    const withholdings = smartTaxData.payments.totalWithholdings > 0 ? smartTaxData.payments.totalWithholdings : (Number(taxData.totalWithholdings) || 0);
    const quarterlyPaid = smartTaxData.payments.estimatedQuarterlyPaid > 0 ? smartTaxData.payments.estimatedQuarterlyPaid : (Number(taxData.estimatedQuarterlyPaid) || 0);
    const totalPaid = withholdings + quarterlyPaid;

    return {
      agi,
      taxableIncome,
      standardDeduction,
      itemizedDeductions,
      totalDeductions,
      usingItemized: itemizedDeductions > standardDeduction,
      incomeTax,
      childTaxCredit,
      netTax,
      totalPaid,
      refundOrOwed: totalPaid - netTax
    };
  };

  const taxCalc = calculateTax();

  // Modern app-style input component
  const AppInput = ({ label, value, onChange, placeholder, type = "text", icon, prefix, suffix }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '0.5rem',
        letterSpacing: '-0.01em'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.1rem',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            {icon}
          </div>
        )}
        {prefix && (
          <div style={{
            position: 'absolute',
            left: icon ? '2.5rem' : '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#6b7280',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            {prefix}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: isMobile ? '1rem' : '0.875rem',
            paddingLeft: prefix ? (icon ? '4rem' : '2.5rem') : (icon ? '2.5rem' : '1rem'),
            paddingRight: suffix ? '3rem' : '1rem',
            minHeight: isMobile ? '48px' : '44px',
            border: '2px solid #f3f4f6',
            borderRadius: isMobile ? '16px' : '12px',
            fontSize: isMobile ? '1rem' : '0.9rem',
            fontWeight: '500',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxSizing: 'border-box',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            touchAction: 'manipulation'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)';
            e.target.style.transform = 'translateY(-1px)';
            e.target.select();
            if (e.target.value === '0' || e.target.value === 0) {
              e.target.value = '';
              onChange('');
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#f3f4f6';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        />
        {suffix && (
          <div style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.9rem',
            color: '#6b7280',
            zIndex: 1
          }}>
            {suffix}
          </div>
        )}
      </div>
    </div>
  );

  // Modern app-style select component
  const AppSelect = ({ label, value, onChange, options, icon }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '0.5rem',
        letterSpacing: '-0.01em'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.1rem',
            zIndex: 1,
            pointerEvents: 'none'
          }}>
            {icon}
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: isMobile ? '1rem' : '0.875rem',
            paddingLeft: icon ? '2.5rem' : '1rem',
            border: '2px solid #f3f4f6',
            borderRadius: isMobile ? '16px' : '12px',
            fontSize: isMobile ? '1rem' : '0.9rem',
            fontWeight: '500',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            outline: 'none',
            cursor: 'pointer',
            boxSizing: 'border-box',
            appearance: 'none',
            WebkitAppearance: 'none',
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1rem',
            paddingRight: '3rem'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#f3f4f6';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Step progress indicator
  const StepIndicator = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: isMobile ? '2rem' : '1.5rem',
      padding: '0 1rem'
    }}>
      {[1, 2, 3].map(step => (
        <React.Fragment key={step}>
          <div
            onClick={() => setCurrentStep(step)}
            style={{
              width: isMobile ? '40px' : '36px',
              height: isMobile ? '40px' : '36px',
              borderRadius: '50%',
              background: currentStep >= step
                ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                : '#f3f4f6',
              color: currentStep >= step ? 'white' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: isMobile ? '1rem' : '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: currentStep >= step
                ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: currentStep === step ? '3px solid rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            {step}
          </div>
          {step < 3 && (
            <div style={{
              width: isMobile ? '30px' : '24px',
              height: '2px',
              background: currentStep > step
                ? 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                : '#e5e7eb',
              borderRadius: '1px',
              transition: 'all 0.3s ease'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div>
            <div style={{
              textAlign: 'center',
              marginBottom: isMobile ? '2rem' : '1.5rem'
            }}>
              <h3 style={{
                fontSize: isMobile ? '1.5rem' : '1.3rem',
                fontWeight: '800',
                color: '#1f2937',
                margin: 0,
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em'
              }}>
                Let's start with the basics
              </h3>
              <p style={{
                fontSize: isMobile ? '1rem' : '0.9rem',
                color: '#6b7280',
                margin: 0
              }}>
                We'll make this quick and easy
              </p>
            </div>

            {/* Smart Intelligence Dashboard */}
            <div style={{
              background: `linear-gradient(135deg,
                rgba(59, 130, 246, 0.05) 0%,
                rgba(16, 185, 129, 0.05) 50%,
                rgba(245, 158, 11, 0.05) 100%)`,
              border: `2px solid ${smartTaxData.summary.confidence > 70 ? '#10b981' : smartTaxData.summary.confidence > 40 ? '#f59e0b' : '#ef4444'}`,
              borderRadius: isMobile ? '20px' : '16px',
              padding: isMobile ? '1.5rem' : '1.25rem',
              marginBottom: isMobile ? '2rem' : '1.5rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  background: smartTaxData.summary.confidence > 70 ? '#10b981' : smartTaxData.summary.confidence > 40 ? '#f59e0b' : '#ef4444',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>🤖</div>
                <div>
                  <h4 style={{
                    margin: 0,
                    fontSize: isMobile ? '1.1rem' : '1rem',
                    fontWeight: '700',
                    color: '#1f2937'
                  }}>
                    Smart Tax Intelligence
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: isMobile ? '0.9rem' : '0.8rem',
                    color: '#6b7280'
                  }}>
                    {smartTaxData.summary.confidence}% confidence • {smartTaxData.summary.detectedItems}/{smartTaxData.summary.maxPossibleItems} categories detected
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1rem'
              }}>
                {smartTaxData.income.w2Income > 0 && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600', marginBottom: '0.25rem' }}>
                      💼 W-2 Income Detected
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f2937' }}>
                      {fmt(smartTaxData.income.w2Income)}
                    </div>
                  </div>
                )}

                {smartTaxData.income.selfEmploymentIncome > 0 && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: '600', marginBottom: '0.25rem' }}>
                      🚀 Self-Employment Income
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f2937' }}>
                      {fmt(smartTaxData.income.selfEmploymentIncome)}
                    </div>
                  </div>
                )}

                {smartTaxData.deductions.charitableDonations > 0 && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: '600', marginBottom: '0.25rem' }}>
                      ❤️ Charitable Donations
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f2937' }}>
                      {fmt(smartTaxData.deductions.charitableDonations)}
                    </div>
                  </div>
                )}

                {smartTaxData.deductions.medicalExpenses > 0 && (
                  <div style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(236, 72, 153, 0.2)'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#be185d', fontWeight: '600', marginBottom: '0.25rem' }}>
                      🩺 Medical Expenses
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1f2937' }}>
                      {fmt(smartTaxData.deductions.medicalExpenses)}
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                textAlign: 'center',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '8px'
              }}>
                Analyzed {smartTaxData.summary.currentYearTransactions} transactions from this year •
                All values auto-populate as placeholders • You can override any amount
              </div>
            </div>

            <AppSelect
              label="Filing Status"
              value={taxData.filingStatus}
              onChange={(value) => setTaxData({...taxData, filingStatus: value})}
              icon="👤"
              options={[
                { value: 'single', label: 'Single' },
                { value: 'marriedJoint', label: 'Married Filing Jointly' },
                { value: 'marriedSeparate', label: 'Married Filing Separately' },
                { value: 'headOfHousehold', label: 'Head of Household' },
                { value: 'qualifyingWidow', label: 'Qualifying Widow(er)' }
              ]}
            />

            <AppInput
              key="w2-income-input"
              label="Annual W-2 Income"
              value={taxData.annualIncome || ''}
              onChange={(value) => setTaxData({...taxData, annualIncome: value})}
              placeholder={smartTaxData.income.w2Income > 0 ? `Auto-detected: $${smartTaxData.income.w2Income}` : "Enter your total W-2 income"}
              type="number"
              icon="💼"
              prefix="$"
            />

            {smartTaxData.income.w2Income > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #10b981',
                borderRadius: isMobile ? '16px' : '12px',
                padding: isMobile ? '1rem' : '0.75rem',
                marginTop: '-0.5rem',
                marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>✨</span>
                  <span style={{
                    fontSize: isMobile ? '0.9rem' : '0.8rem',
                    fontWeight: '700',
                    color: '#065f46'
                  }}>
                    Auto-detected from your transactions!
                  </span>
                </div>
                <div style={{
                  fontSize: isMobile ? '0.8rem' : '0.75rem',
                  color: '#047857'
                }}>
                  Found {smartTaxData.income.incomeTransactions.length} income transactions totaling {fmt(smartTaxData.income.w2Income)}
                </div>
              </div>
            )}

            <AppInput
              key="self-employment-input"
              label="Self-Employment Income (1099, business)"
              value={taxData.selfEmploymentIncome || ''}
              onChange={(value) => setTaxData({...taxData, selfEmploymentIncome: value})}
              placeholder={smartTaxData.income.selfEmploymentIncome > 0 ? `Auto-detected: $${smartTaxData.income.selfEmploymentIncome}` : "Enter your 1099 or business income"}
              type="number"
              icon="🚀"
              prefix="$"
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '0.75rem' : '1rem'
            }}>
              <AppInput
                key="children-input"
                label="Children Under 17"
                value={taxData.numChildren}
                onChange={(value) => setTaxData({...taxData, numChildren: Math.max(0, Number(value))})}
                placeholder="0"
                type="number"
                icon="👶"
              />
              <AppInput
                key="other-dependents-input"
                label="Other Dependents"
                value={taxData.numOtherDependents}
                onChange={(value) => setTaxData({...taxData, numOtherDependents: Math.max(0, Number(value))})}
                placeholder="0"
                type="number"
                icon="👥"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div style={{
              textAlign: 'center',
              marginBottom: isMobile ? '2rem' : '1.5rem'
            }}>
              <h3 style={{
                fontSize: isMobile ? '1.5rem' : '1.3rem',
                fontWeight: '800',
                color: '#1f2937',
                margin: 0,
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em'
              }}>
                Payments & Deductions
              </h3>
              <p style={{
                fontSize: isMobile ? '1rem' : '0.9rem',
                color: '#6b7280',
                margin: 0
              }}>
                Help us calculate your refund or amount owed
              </p>
            </div>

            <AppInput
              key="withholdings-input"
              label="Tax Withholdings (from paychecks)"
              value={taxData.totalWithholdings}
              onChange={(value) => setTaxData({...taxData, totalWithholdings: value})}
              placeholder={smartTaxData.payments.totalWithholdings > 0 ? `Auto-estimated: $${smartTaxData.payments.totalWithholdings}` : "Federal taxes withheld from your pay"}
              type="number"
              icon="💰"
              prefix="$"
            />

            <AppInput
              key="quarterly-payments-input"
              label="Estimated Quarterly Payments"
              value={taxData.estimatedQuarterlyPaid}
              onChange={(value) => setTaxData({...taxData, estimatedQuarterlyPaid: value})}
              placeholder={smartTaxData.payments.estimatedQuarterlyPaid > 0 ? `Auto-detected: $${smartTaxData.payments.estimatedQuarterlyPaid}` : "Self-employment quarterly payments"}
              type="number"
              icon="📅"
              prefix="$"
            />

            <AppInput
              key="ira-input"
              label="Traditional IRA Contributions"
              value={taxData.traditionalIRA}
              onChange={(value) => setTaxData({...taxData, traditionalIRA: value})}
              placeholder={smartTaxData.deductions.traditionalIRA > 0 ? `Auto-detected: $${smartTaxData.deductions.traditionalIRA}` : "Tax-deductible retirement contributions"}
              type="number"
              icon="🏦"
              prefix="$"
            />

            <AppInput
              key="hsa-input"
              label="HSA Contributions"
              value={taxData.hsaContributions}
              onChange={(value) => setTaxData({...taxData, hsaContributions: value})}
              placeholder={smartTaxData.deductions.hsaContributions > 0 ? `Auto-detected: $${smartTaxData.deductions.hsaContributions}` : "Health Savings Account contributions"}
              type="number"
              icon="🏥"
              prefix="$"
            />

            <AppInput
              key="student-loan-input"
              label="Student Loan Interest"
              value={taxData.studentLoanInterest}
              onChange={(value) => setTaxData({...taxData, studentLoanInterest: value})}
              placeholder={smartTaxData.deductions.studentLoanInterest > 0 ? `Auto-estimated: $${smartTaxData.deductions.studentLoanInterest}` : "Interest paid on student loans (up to $2,500)"}
              type="number"
              icon="🎓"
              prefix="$"
            />
          </div>
        );

      case 3:
        return (
          <div>
            <div style={{
              textAlign: 'center',
              marginBottom: isMobile ? '2rem' : '1.5rem'
            }}>
              <h3 style={{
                fontSize: isMobile ? '1.5rem' : '1.3rem',
                fontWeight: '800',
                color: '#1f2937',
                margin: 0,
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em'
              }}>
                Itemized Deductions
              </h3>
              <p style={{
                fontSize: isMobile ? '1rem' : '0.9rem',
                color: '#6b7280',
                margin: 0
              }}>
                Only fill these out if you itemize (most people don't need to)
              </p>
            </div>

            <AppInput
              label="State & Local Taxes (SALT)"
              value={taxData.stateLocalTaxes}
              onChange={(value) => setTaxData({...taxData, stateLocalTaxes: value})}
              placeholder={smartTaxData.deductions.stateLocalTaxes > 0 ? `Auto-detected: $${smartTaxData.deductions.stateLocalTaxes}` : "Max $10,000 deductible"}
              type="number"
              icon="🏛️"
              prefix="$"
            />

            <AppInput
              label="Mortgage Interest"
              value={taxData.mortgageInterest}
              onChange={(value) => setTaxData({...taxData, mortgageInterest: value})}
              placeholder={smartTaxData.deductions.mortgageInterest > 0 ? `Auto-estimated: $${smartTaxData.deductions.mortgageInterest}` : "Interest paid on home mortgage"}
              type="number"
              icon="🏠"
              prefix="$"
            />

            <AppInput
              label="Charitable Donations"
              value={taxData.charitableDonations}
              onChange={(value) => setTaxData({...taxData, charitableDonations: value})}
              placeholder={smartTaxData.deductions.charitableDonations > 0 ? `Auto-detected: $${smartTaxData.deductions.charitableDonations}` : "Cash and property donations"}
              type="number"
              icon="❤️"
              prefix="$"
            />

            <AppInput
              label="Medical Expenses"
              value={taxData.medicalExpenses}
              onChange={(value) => setTaxData({...taxData, medicalExpenses: value})}
              placeholder={smartTaxData.deductions.medicalExpenses > 0 ? `Auto-detected: $${smartTaxData.deductions.medicalExpenses}` : "Only amount over 7.5% of AGI counts"}
              type="number"
              icon="🩺"
              prefix="$"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      background: isMobile
        ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        : '#ffffff',
      borderRadius: isMobile ? '24px' : '16px',
      boxShadow: isMobile
        ? '0 20px 40px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.8)'
        : '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      position: 'relative',
      maxWidth: '100%'
    }}>
      {/* App Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        padding: isMobile ? '2rem 1.5rem 1.5rem' : '1.5rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transform: 'rotate(15deg) translate(50px, -50px)',
          pointerEvents: 'none'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            width: isMobile ? '48px' : '40px',
            height: isMobile ? '48px' : '40px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '1.5rem' : '1.2rem',
            backdropFilter: 'blur(10px)'
          }}>
            📊
          </div>
          <div>
            <h2 style={{
              fontSize: isMobile ? '1.5rem' : '1.3rem',
              fontWeight: '800',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Smart Tax Calculator
            </h2>
            <p style={{
              fontSize: isMobile ? '0.9rem' : '0.8rem',
              margin: '0.25rem 0 0 0',
              opacity: 0.9,
              fontWeight: '500'
            }}>
              Get your max refund in minutes
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        padding: isMobile ? '2rem 1.5rem' : '2rem'
      }}>
        <StepIndicator />

        {/* Step Content */}
        <div style={{
          minHeight: isMobile ? '400px' : '350px'
        }}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #f3f4f6'
        }}>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                flex: 1,
                padding: isMobile ? '1rem' : '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: isMobile ? '16px' : '12px',
                background: '#ffffff',
                color: '#6b7280',
                fontSize: isMobile ? '1rem' : '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (currentStep < 3) {
                setCurrentStep(currentStep + 1);
              } else {
                // Calculate and show results
                setIsExpanded(true);
              }
            }}
            style={{
              flex: currentStep === 1 ? 1 : 2,
              padding: isMobile ? '1rem' : '0.875rem',
              border: 'none',
              borderRadius: isMobile ? '16px' : '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              fontSize: isMobile ? '1rem' : '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            {currentStep < 3 ? 'Continue' : 'Calculate My Taxes'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {isExpanded && (
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          padding: isMobile ? '2rem 1.5rem' : '2rem',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              fontSize: isMobile ? '1.5rem' : '1.3rem',
              fontWeight: '800',
              color: '#1f2937',
              margin: 0,
              marginBottom: '0.5rem'
            }}>
              Your 2024 Tax Results
            </h3>
            <p style={{
              fontSize: isMobile ? '1rem' : '0.9rem',
              color: '#6b7280',
              margin: 0
            }}>
              Based on the information you provided
            </p>
          </div>

          {/* Key Results Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Refund/Owed Card */}
            <div style={{
              background: taxCalc.refundOrOwed >= 0
                ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
                : 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
              border: `2px solid ${taxCalc.refundOrOwed >= 0 ? '#10b981' : '#ef4444'}`,
              borderRadius: isMobile ? '20px' : '16px',
              padding: isMobile ? '1.5rem' : '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '2.5rem' : '2rem',
                marginBottom: '0.5rem'
              }}>
                {taxCalc.refundOrOwed >= 0 ? '🎉' : '💸'}
              </div>
              <div style={{
                fontSize: isMobile ? '0.9rem' : '0.8rem',
                fontWeight: '600',
                color: taxCalc.refundOrOwed >= 0 ? '#065f46' : '#991b1b',
                marginBottom: '0.5rem'
              }}>
                {taxCalc.refundOrOwed >= 0 ? 'ESTIMATED REFUND' : 'ESTIMATED AMOUNT OWED'}
              </div>
              <div style={{
                fontSize: isMobile ? '2rem' : '1.75rem',
                fontWeight: '800',
                color: taxCalc.refundOrOwed >= 0 ? '#059669' : '#dc2626',
                letterSpacing: '-0.02em'
              }}>
                {fmt(Math.abs(taxCalc.refundOrOwed))}
              </div>
            </div>

            {/* Tax Breakdown Card */}
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '2px solid #e2e8f0',
              borderRadius: isMobile ? '20px' : '16px',
              padding: isMobile ? '1.5rem' : '1.25rem'
            }}>
              <div style={{
                fontSize: isMobile ? '1.5rem' : '1.2rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                📋
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Taxable Income:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{fmt(taxCalc.taxableIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Income Tax:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{fmt(taxCalc.incomeTax)}</span>
                </div>
                {taxCalc.childTaxCredit > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>Child Tax Credit:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#059669' }}>-{fmt(taxCalc.childTaxCredit)}</span>
                  </div>
                )}
                <div style={{
                  height: '1px',
                  background: '#e5e7eb',
                  margin: '0.5rem 0'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Total Tax:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>{fmt(taxCalc.netTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deduction Info */}
          {taxCalc.usingItemized && (
            <div style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '2px solid #f59e0b',
              borderRadius: isMobile ? '16px' : '12px',
              padding: '1rem',
              textAlign: 'center',
              marginTop: '1rem'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>💡</div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#92400e'
              }}>
                You benefit from itemizing! You save {fmt(taxCalc.itemizedDeductions - taxCalc.standardDeduction)} over the standard deduction.
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            textAlign: 'center',
            fontStyle: 'italic',
            marginTop: '1.5rem',
            lineHeight: 1.4
          }}>
            * This is an estimate based on 2024 tax law. Actual results may vary.
            Consult a tax professional for personalized advice.
          </div>
        </div>
      )}
    </div>
  );
}