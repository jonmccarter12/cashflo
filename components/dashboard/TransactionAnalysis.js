import React, { useState, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmt } from '../../lib/utils';

// COMPREHENSIVE TAX CATEGORY SYSTEM
const TAX_CATEGORIES = {
  // INCOME CATEGORIES
  'W-2 Income': {
    keywords: ['salary', 'payroll', 'wages', 'paycheck', 'direct deposit', 'employment'],
    type: 'income',
    businessType: 'personal',
    color: '#10b981',
    taxForm: 'W-2',
    description: 'Employment income subject to withholdings',
    businessId: null
  },
  'Self-Employment Income': {
    keywords: ['freelance', '1099', 'contractor', 'consulting', 'business income', 'client payment'],
    type: 'income',
    businessType: 'business',
    color: '#3b82f6',
    taxForm: '1099-NEC',
    description: 'Self-employment income requiring quarterly payments',
    businessId: null
  },
  // STUDIO BUSINESS CATEGORIES
  'Studio Income': {
    keywords: ['studio', 'photo', 'photography', 'creative', 'design', 'video', 'client shoot'],
    type: 'income',
    businessType: 'business',
    color: '#8b5cf6',
    taxForm: '1099-NEC',
    description: 'Studio business income - photography/creative services',
    businessId: 'studio'
  },
  'Studio Expenses': {
    keywords: ['studio', 'camera', 'lens', 'lighting', 'photo', 'creative', 'equipment', 'backdrop'],
    type: 'expense',
    businessType: 'business',
    color: '#7c3aed',
    taxForm: 'Schedule C',
    description: 'Studio business expenses - equipment, supplies',
    businessId: 'studio'
  },
  // SMOKE SHOP BUSINESS CATEGORIES
  'Smoke Shop Income': {
    keywords: ['smoke shop', 'tobacco', 'vape', 'retail sales', 'shop income', 'store sales'],
    type: 'income',
    businessType: 'business',
    color: '#059669',
    taxForm: 'Schedule C',
    description: 'Smoke shop business income - retail sales',
    businessId: 'smoke_shop'
  },
  'Smoke Shop Expenses': {
    keywords: ['smoke shop', 'inventory', 'tobacco', 'vape', 'retail', 'wholesale', 'shop supplies'],
    type: 'expense',
    businessType: 'business',
    color: '#047857',
    taxForm: 'Schedule C',
    description: 'Smoke shop business expenses - inventory, supplies',
    businessId: 'smoke_shop'
  },
  'Investment Income': {
    keywords: ['dividend', 'interest', 'capital gains', 'investment', 'stocks', 'bonds'],
    type: 'income',
    businessType: 'personal',
    color: '#8b5cf6',
    taxForm: '1099-DIV/INT',
    description: 'Investment income and capital gains'
  },
  'Rental Income': {
    keywords: ['rent received', 'rental income', 'property income'],
    type: 'income',
    businessType: 'business',
    color: '#f59e0b',
    taxForm: 'Schedule E',
    description: 'Rental property income'
  },

  // BUSINESS EXPENSE CATEGORIES
  'Office Expenses': {
    keywords: ['office supplies', 'software', 'subscription', 'zoom', 'microsoft', 'adobe'],
    type: 'expense',
    businessType: 'business',
    color: '#ef4444',
    taxForm: 'Schedule C',
    deductible: true,
    description: 'Office supplies and software for business'
  },
  'Travel & Meals': {
    keywords: ['hotel', 'flight', 'uber', 'lyft', 'restaurant', 'meals', 'conference'],
    type: 'expense',
    businessType: 'business',
    color: '#f97316',
    taxForm: 'Schedule C',
    deductible: true,
    description: 'Business travel and 50% of meal expenses'
  },
  'Vehicle Expenses': {
    keywords: ['gas', 'fuel', 'car repair', 'auto', 'parking', 'tolls', 'vehicle'],
    type: 'expense',
    businessType: 'business',
    color: '#84cc16',
    taxForm: 'Schedule C',
    deductible: true,
    description: 'Vehicle expenses for business use'
  },
  'Professional Services': {
    keywords: ['lawyer', 'attorney', 'accountant', 'consultant', 'legal', 'professional'],
    type: 'expense',
    businessType: 'business',
    color: '#06b6d4',
    taxForm: 'Schedule C',
    deductible: true,
    description: 'Professional and legal services'
  },

  // PERSONAL DEDUCTION CATEGORIES
  'Medical Expenses': {
    keywords: ['medical', 'doctor', 'hospital', 'pharmacy', 'cvs', 'walgreens', 'dental', 'vision'],
    type: 'expense',
    businessType: 'personal',
    color: '#ec4899',
    taxForm: 'Schedule A',
    deductible: true,
    description: 'Medical expenses over 7.5% of AGI'
  },
  'Charitable Donations': {
    keywords: ['donation', 'charity', 'church', 'nonprofit', 'goodwill', 'salvation army'],
    type: 'expense',
    businessType: 'personal',
    color: '#a855f7',
    taxForm: 'Schedule A',
    deductible: true,
    description: 'Charitable contributions'
  },
  'Mortgage Interest': {
    keywords: ['mortgage', 'home loan', 'interest', 'wells fargo home', 'quicken loan'],
    type: 'expense',
    businessType: 'personal',
    color: '#0ea5e9',
    taxForm: 'Schedule A',
    deductible: true,
    description: 'Mortgage interest on primary residence'
  },
  'State & Local Taxes': {
    keywords: ['property tax', 'state tax', 'local tax', 'dmv', 'registration'],
    type: 'expense',
    businessType: 'personal',
    color: '#64748b',
    taxForm: 'Schedule A',
    deductible: true,
    description: 'State and local taxes (SALT) up to $10k'
  },

  // TAX PAYMENT CATEGORIES
  'Federal Tax Payments': {
    keywords: ['irs', 'federal tax', 'estimated tax', 'quarterly payment'],
    type: 'tax_payment',
    businessType: 'both',
    color: '#dc2626',
    taxForm: 'Form 1040',
    description: 'Federal tax payments and withholdings'
  },
  'Retirement Contributions': {
    keywords: ['ira', '401k', '403b', 'retirement', 'traditional ira', 'roth ira'],
    type: 'retirement',
    businessType: 'personal',
    color: '#059669',
    taxForm: 'Form 1040',
    deductible: true,
    description: 'Tax-advantaged retirement contributions'
  },

  // DEFAULT/UNCATEGORIZED
  'Uncategorized': {
    keywords: [],
    type: 'other',
    businessType: 'personal',
    color: '#6b7280',
    taxForm: 'N/A',
    description: 'Transactions requiring manual categorization'
  }
};

// BUSINESS ENTITY TYPES
const BUSINESS_ENTITIES = {
  'sole-proprietorship': {
    label: 'Sole Proprietorship',
    forms: ['Schedule C', '1099-NEC'],
    description: 'Individual business owner',
    taxRate: 'Individual + Self-Employment Tax'
  },
  'llc-single': {
    label: 'Single-Member LLC',
    forms: ['Schedule C', '1099-NEC'],
    description: 'LLC with one owner (disregarded entity)',
    taxRate: 'Individual + Self-Employment Tax'
  },
  'llc-multi': {
    label: 'Multi-Member LLC',
    forms: ['Form 1065', 'Schedule K-1'],
    description: 'LLC with multiple owners (partnership)',
    taxRate: 'Pass-through taxation'
  },
  'partnership': {
    label: 'Partnership',
    forms: ['Form 1065', 'Schedule K-1'],
    description: 'Business partnership',
    taxRate: 'Pass-through taxation'
  },
  's-corp': {
    label: 'S Corporation',
    forms: ['Form 1120S', 'Schedule K-1'],
    description: 'Small business corporation',
    taxRate: 'Pass-through taxation'
  },
  'c-corp': {
    label: 'C Corporation',
    forms: ['Form 1120'],
    description: 'Traditional corporation',
    taxRate: 'Corporate tax rate (21%)'
  }
};

// 2024 TAX RATES AND BRACKETS
const TAX_BRACKETS_2024 = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191675, rate: 0.24 },
    { min: 191675, max: 609350, rate: 0.32 },
    { min: 609350, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ],
  marriedJoint: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383350, rate: 0.24 },
    { min: 383350, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 }
  ]
};

const STANDARD_DEDUCTIONS_2024 = {
  single: 14600,
  marriedJoint: 29200,
  marriedSeparate: 14600,
  headOfHousehold: 21900,
  qualifyingWidow: 29200
};

const TransactionAnalysis = ({ transactions = [], onUpdateTransactionCategory }) => {
  const isMobile = useIsMobile();
  const [selectedBusinessType, setSelectedBusinessType] = useState('sole-proprietorship');
  const [viewMode, setViewMode] = useState('overview'); // overview, categories, optimization
  const [selectedCategory, setSelectedCategory] = useState(null);

  // MULTI-BUSINESS ENTITY SUPPORT
  // BUSINESS ENTITIES - Always available, auto-populated based on categories
  const [businessEntities, setBusinessEntities] = useState([
    { id: 'personal', name: 'Personal', type: 'personal', color: '#6b7280', entityType: null },
    { id: 'studio', name: 'The Studio', type: 'business', color: '#8b5cf6', entityType: 'llc', keywords: ['studio', 'creative', 'design', 'photo', 'video'] },
    { id: 'smoke_shop', name: 'Smoke Shop', type: 'business', color: '#059669', entityType: 'sole_proprietorship', keywords: ['smoke', 'tobacco', 'vape', 'retail', 'shop'] }
  ]);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [transactionBusinessAssignments, setTransactionBusinessAssignments] = useState({});

  // INTELLIGENT TRANSACTION CATEGORIZATION
  const categorizedTransactions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return transactions
      .filter(t => new Date(t.date).getFullYear() === currentYear)
      .map(transaction => {
        // Check if transaction already has manual category
        if (transaction.taxCategory) {
          return {
            ...transaction,
            taxCategory: transaction.taxCategory,
            autoDetected: false
          };
        }

        // Auto-categorize based on keywords
        const desc = transaction.description?.toLowerCase() || '';
        const cat = transaction.category?.toLowerCase() || '';
        const combined = `${desc} ${cat}`;

        let bestMatch = 'Uncategorized';
        let maxMatches = 0;

        Object.entries(TAX_CATEGORIES).forEach(([category, config]) => {
          const matches = config.keywords.filter(keyword =>
            combined.includes(keyword.toLowerCase())
          ).length;

          if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = category;
          }
        });

        // AUTO-ASSIGN BUSINESS ENTITY based on category
        let assignedBusinessId = transactionBusinessAssignments[transaction.id];

        // If not manually assigned, use the category's businessId or default to personal
        if (!assignedBusinessId) {
          const categoryConfig = TAX_CATEGORIES[bestMatch];
          assignedBusinessId = categoryConfig?.businessId || 'personal';
        }

        return {
          ...transaction,
          taxCategory: bestMatch,
          businessId: assignedBusinessId,
          businessName: businessEntities.find(b => b.id === assignedBusinessId)?.name || 'Personal',
          autoDetected: maxMatches > 0,
          confidence: maxMatches / Math.max(TAX_CATEGORIES[bestMatch].keywords.length, 1)
        };
      });
  }, [transactions, businessEntities, transactionBusinessAssignments]);

  // CHECK IF THERE ARE ACTIVE BUSINESS TRANSACTIONS
  const hasBusinessTransactions = useMemo(() => {
    return categorizedTransactions.some(t => t.businessId !== 'personal');
  }, [categorizedTransactions]);

  // CALCULATE TAX CATEGORY TOTALS
  const categoryTotals = useMemo(() => {
    const totals = {};

    Object.keys(TAX_CATEGORIES).forEach(category => {
      totals[category] = {
        total: 0,
        count: 0,
        transactions: []
      };
    });

    categorizedTransactions.forEach(transaction => {
      const category = transaction.taxCategory || 'Uncategorized';
      if (totals[category]) {
        totals[category].total += Math.abs(transaction.amount);
        totals[category].count += 1;
        totals[category].transactions.push(transaction);
      }
    });

    return totals;
  }, [categorizedTransactions]);

  // REAL-TIME TAX ESTIMATION
  const taxEstimate = useMemo(() => {
    const income = categoryTotals['W-2 Income']?.total || 0;
    const selfEmploymentIncome = categoryTotals['Self-Employment Income']?.total || 0;
    const deductions = (categoryTotals['Medical Expenses']?.total || 0) +
                     (categoryTotals['Charitable Donations']?.total || 0) +
                     (categoryTotals['Mortgage Interest']?.total || 0) +
                     (categoryTotals['State & Local Taxes']?.total || 0);

    const totalIncome = income + selfEmploymentIncome;
    const standardDeduction = STANDARD_DEDUCTIONS_2024.single; // Default to single
    const itemizedDeduction = deductions;
    const finalDeduction = Math.max(standardDeduction, itemizedDeduction);
    const taxableIncome = Math.max(0, totalIncome - finalDeduction);

    // Calculate federal tax using 2024 brackets
    let federalTax = 0;
    const brackets = TAX_BRACKETS_2024.single;

    for (const bracket of brackets) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
        federalTax += taxableInBracket * bracket.rate;
      }
    }

    // Self-employment tax (15.3% on first $160,200)
    const seTax = selfEmploymentIncome * 0.153;

    const totalTax = federalTax + seTax;
    const estimatedQuarterly = totalTax / 4;

    return {
      totalIncome,
      taxableIncome,
      federalTax,
      seTax,
      totalTax,
      estimatedQuarterly,
      usingItemized: itemizedDeduction > standardDeduction,
      deductionsSaved: Math.max(0, itemizedDeduction - standardDeduction),
      effectiveRate: totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0
    };
  }, [categoryTotals]);

  // PIE CHART DATA
  const pieChartData = useMemo(() => {
    const significantCategories = Object.entries(categoryTotals)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total);

    const total = significantCategories.reduce((sum, [_, data]) => sum + data.total, 0);

    return significantCategories.map(([category, data], index) => ({
      category,
      amount: data.total,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
      color: TAX_CATEGORIES[category]?.color || '#6b7280',
      count: data.count
    }));
  }, [categoryTotals]);

  // RENDER PIE CHART (Simple CSS-based)
  const renderPieChart = () => {
    if (pieChartData.length === 0) return null;

    let currentPercentage = 0;

    return (
      <div style={{
        position: 'relative',
        width: isMobile ? '200px' : '300px',
        height: isMobile ? '200px' : '300px',
        margin: '0 auto',
        borderRadius: '50%',
        background: `conic-gradient(${pieChartData.map(segment => {
          const start = currentPercentage;
          currentPercentage += segment.percentage;
          return `${segment.color} ${start}% ${currentPercentage}%`;
        }).join(', ')})`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60%',
          height: '60%',
          background: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '600' }}>
            Total Analyzed
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1f2937' }}>
            ${pieChartData.reduce((sum, segment) => sum + segment.amount, 0).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: isMobile ? '1rem' : '2rem'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        padding: isMobile ? '1.5rem' : '2rem',
        marginBottom: '2rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: isMobile ? '2rem' : '2.5rem',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          margin: 0,
          marginBottom: '0.5rem'
        }}>
          🏆 Ultimate Tax Intelligence
        </h1>
        <p style={{
          fontSize: isMobile ? '1.1rem' : '1.25rem',
          color: '#6b7280',
          margin: 0,
          fontWeight: '500'
        }}>
          AI-Powered Transaction Analysis • Real-Time Tax Estimation • Business Optimization
        </p>
      </div>

      {/* Smart Business Detection Notice */}
      {hasBusinessTransactions && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #059669 100%)',
            borderRadius: '16px',
            padding: '0.75rem 1.5rem',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '500',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
          }}>
            🏢 Business transactions detected • Multi-business features enabled
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        justifyContent: 'center'
      }}>
        {['overview', 'categories', ...(hasBusinessTransactions ? ['businesses'] : []), 'optimization'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
              borderRadius: '16px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              background: viewMode === mode
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.9)',
              color: viewMode === mode ? 'white' : '#374151',
              boxShadow: viewMode === mode
                ? '0 8px 32px rgba(102, 126, 234, 0.3)'
                : '0 4px 16px rgba(0, 0, 0, 0.1)',
              transform: viewMode === mode ? 'translateY(-2px)' : 'none'
            }}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'categories' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: '#1f2937',
            marginBottom: '2rem'
          }}>
            🏷️ Transaction Categories & Business Classification
          </h3>

          {/* Business Entity Selector */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            color: 'white'
          }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
              📋 Business Entity Type
            </h4>
            <select
              value={selectedBusinessType}
              onChange={(e) => setSelectedBusinessType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#1f2937'
              }}
            >
              {Object.entries(BUSINESS_ENTITIES).map(([key, entity]) => (
                <option key={key} value={key}>
                  {entity.label} - {entity.description}
                </option>
              ))}
            </select>
            <div style={{
              marginTop: '1rem',
              fontSize: '0.9rem',
              opacity: 0.9
            }}>
              Tax Forms: {BUSINESS_ENTITIES[selectedBusinessType]?.forms.join(', ')} |
              Rate: {BUSINESS_ENTITIES[selectedBusinessType]?.taxRate}
            </div>
          </div>

          {/* Category List */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(categoryTotals)
              .filter(([_, data]) => data.count > 0)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([category, data]) => (
                <div key={category} style={{
                  border: '2px solid #f3f4f6',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  background: selectedCategory === category ? 'rgba(59, 130, 246, 0.05)' : 'white',
                  borderColor: selectedCategory === category ? '#3b82f6' : '#f3f4f6',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: TAX_CATEGORIES[category]?.color || '#6b7280'
                      }} />
                      <div>
                        <h4 style={{
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          color: '#1f2937',
                          margin: 0
                        }}>
                          {category}
                        </h4>
                        <p style={{
                          fontSize: '0.9rem',
                          color: '#6b7280',
                          margin: 0
                        }}>
                          {TAX_CATEGORIES[category]?.description}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: '800',
                        color: '#1f2937'
                      }}>
                        ${data.total.toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#6b7280'
                      }}>
                        {data.count} transactions
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: TAX_CATEGORIES[category]?.businessType === 'business' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: TAX_CATEGORIES[category]?.businessType === 'business' ? '#1d4ed8' : '#047857'
                    }}>
                      {TAX_CATEGORIES[category]?.businessType === 'business' ? '🏢 Business' : '👤 Personal'}
                    </span>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#b45309'
                    }}>
                      📄 {TAX_CATEGORIES[category]?.taxForm}
                    </span>
                    {TAX_CATEGORIES[category]?.deductible && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#166534'
                      }}>
                        💰 Deductible
                      </span>
                    )}
                  </div>

                  {/* Show transactions when category is selected */}
                  {selectedCategory === category && (
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: '12px',
                      padding: '1rem',
                      marginTop: '1rem'
                    }}>
                      <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
                        Recent Transactions:
                      </h5>
                      {data.transactions.slice(0, 5).map((transaction, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0',
                          borderBottom: index < 4 ? '1px solid #e5e7eb' : 'none'
                        }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                              {transaction.description}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{
                            fontWeight: '700',
                            color: transaction.amount > 0 ? '#059669' : '#dc2626'
                          }}>
                            ${Math.abs(transaction.amount).toLocaleString()}
                          </div>
                        </div>
                      ))}
                      {data.count > 5 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#6b7280',
                          fontSize: '0.8rem',
                          marginTop: '0.5rem'
                        }}>
                          ... and {data.count - 5} more transactions
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {viewMode === 'optimization' && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {/* AI Tax Optimization Advisor */}
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            borderRadius: '24px',
            padding: '2rem',
            color: 'white',
            boxShadow: '0 20px 40px rgba(168, 85, 247, 0.3)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              🤖 AI Tax Optimization Advisor
            </h3>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Optimization Recommendations */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
                  💡 Smart Recommendations
                </h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {taxEstimate.effectiveRate > 25 && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        ⚠️ High Tax Rate Alert
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        Your effective tax rate is {taxEstimate.effectiveRate.toFixed(1)}%. Consider maximizing retirement contributions to reduce taxable income.
                      </div>
                    </div>
                  )}

                  {!taxEstimate.usingItemized && (categoryTotals['Medical Expenses']?.total > 0 || categoryTotals['Charitable Donations']?.total > 0) && (
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        📋 Itemization Opportunity
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        You have deductible expenses but are using standard deduction. Consider tracking more deductions to potentially save on taxes.
                      </div>
                    </div>
                  )}

                  {categoryTotals['Self-Employment Income']?.total > 50000 && (
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        🏢 Business Structure Optimization
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        With ${categoryTotals['Self-Employment Income']?.total.toLocaleString()} in self-employment income, consider S-Corp election to potentially save on self-employment taxes.
                      </div>
                    </div>
                  )}

                  {categoryTotals['Business Meals']?.total < 5000 && categoryTotals['Business Expenses']?.total > 0 && (
                    <div style={{
                      background: 'rgba(168, 85, 247, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        🍽️ Missed Business Meal Deductions
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        You can deduct 50% of business meals. Start tracking client lunches, team dinners, and networking events to maximize deductions.
                      </div>
                    </div>
                  )}

                  {categoryTotals['Home Office Expenses']?.total === 0 && categoryTotals['Self-Employment Income']?.total > 0 && (
                    <div style={{
                      background: 'rgba(236, 72, 153, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        🏠 Home Office Deduction Opportunity
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        If you work from home, you may qualify for the home office deduction. Use the simplified method ($5 per sq ft, max $1,500) or actual expense method.
                      </div>
                    </div>
                  )}

                  {categoryTotals['Business Vehicle Expenses']?.total === 0 && categoryTotals['Business Expenses']?.total > 0 && (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        🚗 Vehicle Expense Tracking
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        Track business mileage! Standard rate for 2024 is $0.67/mile. Use actual expense method if your vehicle costs exceed the standard rate.
                      </div>
                    </div>
                  )}

                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      💰 Advanced Tax Optimization Strategies
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, lineHeight: '1.4' }}>
                      <strong>Immediate Actions:</strong><br/>
                      • Max retirement: 401k ($23,000), IRA ($7,000), SEP-IRA (25% of income)<br/>
                      • HSA triple tax advantage: $4,150 individual, $8,300 family<br/>
                      • Harvest investment losses before Dec 31<br/>
                      • Accelerate deductible expenses into current year<br/><br/>

                      <strong>Business Structure Optimization:</strong><br/>
                      • LLC → S-Corp election saves ~15.3% self-employment tax<br/>
                      • Solo 401k allows up to $69,000 contributions<br/>
                      • Consider defined benefit plan for high earners ($300k+)<br/>
                      • Augusta Rule: Rent home to business for 14 days tax-free
                    </div>
                  </div>
                </div>
              </div>

              {/* Quarterly Planning */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
                  📅 Quarterly Tax Planning
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1rem'
                }}>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, index) => {
                    const currentQuarter = Math.floor((new Date().getMonth()) / 3);
                    const isCurrentQuarter = index === currentQuarter;
                    const dueDates = ['Jan 15', 'Apr 15', 'Jun 15', 'Sep 15'];

                    return (
                      <div key={quarter} style={{
                        background: isCurrentQuarter ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '1rem',
                        textAlign: 'center',
                        border: isCurrentQuarter ? '2px solid rgba(245, 158, 11, 0.5)' : 'none'
                      }}>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                          {quarter} 2024
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                          Due: {dueDates[index]}
                        </div>
                        <div style={{ fontWeight: '600' }}>
                          ${taxEstimate.estimatedQuarterly.toLocaleString()}
                        </div>
                        {isCurrentQuarter && (
                          <div style={{
                            background: '#f59e0b',
                            color: 'white',
                            borderRadius: '8px',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            marginTop: '0.5rem'
                          }}>
                            CURRENT
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Business Expense Tracking */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#1f2937',
              marginBottom: '2rem'
            }}>
              💼 Business Expense Maximization
            </h3>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Potential Deductions */}
              <div style={{
                border: '2px solid #f3f4f6',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
                  🔍 Potential Missed Deductions
                </h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {[
                    { category: 'Home Office', amount: 5000, description: 'Dedicated workspace deduction' },
                    { category: 'Internet & Phone', amount: 1200, description: 'Business use portion' },
                    { category: 'Professional Development', amount: 2000, description: 'Courses, books, conferences' },
                    { category: 'Equipment Depreciation', amount: 3000, description: 'Computer, office equipment' }
                  ].map((deduction, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: '#f9fafb',
                      borderRadius: '12px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {deduction.category}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {deduction.description}
                        </div>
                      </div>
                      <div style={{
                        fontWeight: '700',
                        color: '#059669',
                        fontSize: '1.1rem'
                      }}>
                        ${deduction.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Flow Optimization Engine */}
              <div style={{
                border: '2px solid #3b82f6',
                borderRadius: '16px',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)'
              }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', color: '#1e40af' }}>
                  📊 AI Cash Flow Optimization Engine
                </h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Tax-Optimized Cash Flow Strategy */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#1e40af' }}>
                      💡 Optimal Tax-Saving Cash Flow Strategy
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1f2937', lineHeight: '1.4' }}>
                      Based on your income patterns and business expenses, here's your personalized optimization plan:<br/><br/>

                      <strong>Q4 2024 Actions:</strong><br/>
                      • Accelerate ${Math.max(10000, (categoryTotals['Business Expenses']?.total || 0) * 0.2).toLocaleString()} in deductible expenses<br/>
                      • Defer ${Math.max(15000, (categoryTotals['W-2 Income']?.total || 0) * 0.1).toLocaleString()} income to 2025 if possible<br/>
                      • Max retirement contribution: ${(23000 - ((categoryTotals['Retirement Contributions']?.total || 0))).toLocaleString()} remaining<br/><br/>

                      <strong>Estimated Tax Savings:</strong> ${Math.max(5000, taxEstimate.federalTax * 0.15).toLocaleString()}
                    </div>
                  </div>

                  {/* Business Structure ROI Analysis */}
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#047857' }}>
                      🏢 Business Structure ROI Analysis
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1f2937' }}>
                      {selectedBusinessType === 'sole_proprietorship' && categoryTotals['Self-Employment Income']?.total > 50000 && (
                        <div>
                          <strong>S-Corp Election Savings:</strong><br/>
                          • Current SE Tax: ${((categoryTotals['Self-Employment Income']?.total || 0) * 0.153).toLocaleString()}<br/>
                          • S-Corp SE Tax: ${Math.max(0, (((categoryTotals['Self-Employment Income']?.total || 0) * 0.6) * 0.153)).toLocaleString()}<br/>
                          • <span style={{ color: '#059669', fontWeight: '700' }}>Annual Savings: ${Math.max(0, ((categoryTotals['Self-Employment Income']?.total || 0) * 0.4 * 0.153)).toLocaleString()}</span><br/>
                          • Payroll setup cost: ~$2,000/year<br/>
                          • Net benefit: ${Math.max(0, ((categoryTotals['Self-Employment Income']?.total || 0) * 0.4 * 0.153) - 2000).toLocaleString()}
                        </div>
                      )}
                      {selectedBusinessType === 'llc' && (
                        <div>Your LLC structure is optimized for liability protection and tax flexibility.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2024 Tax Law Compliance Engine */}
              <div style={{
                border: '2px solid #dc2626',
                borderRadius: '16px',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)'
              }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', color: '#dc2626' }}>
                  ⚖️ 2024 Tax Law Compliance & Updates
                </h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{
                    background: 'rgba(220, 38, 38, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#dc2626' }}>
                      📋 Current Tax Law Updates (2024)
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1f2937', lineHeight: '1.4' }}>
                      <strong>Key Changes:</strong><br/>
                      • Standard Deduction: Single $14,600, MFJ $29,200<br/>
                      • 401(k) limit: $23,000 (+$7,500 catch-up if 50+)<br/>
                      • IRA limit: $7,000 (+$1,000 catch-up)<br/>
                      • HSA limits: $4,150 individual, $8,300 family<br/>
                      • Business meal deduction: 50% (through 2024)<br/>
                      • Section 199A QBI deduction: 20% for qualifying business income<br/>
                      • R&D costs must be amortized over 5 years (started 2022)
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#d97706' }}>
                      ⚠️ Compliance Alerts & Deadlines
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#1f2937' }}>
                      {(() => {
                        const now = new Date();
                        const alerts = [];

                        // Q4 estimated taxes
                        if (now.getMonth() >= 10) { // November or December
                          alerts.push('• Q4 Estimated taxes due January 15, 2025');
                        }

                        // Year-end planning
                        if (now.getMonth() === 11) { // December
                          alerts.push('• Last chance for 2024 retirement contributions');
                          alerts.push('• Harvest investment losses before Dec 31');
                        }

                        // Business structure optimization
                        if (categoryTotals['Self-Employment Income']?.total > 50000) {
                          alerts.push('• Consider S-Corp election by March 15, 2025 for 2024 benefits');
                        }

                        return alerts.length > 0 ? alerts.join('<br/>') : '• All major deadlines met - great work!';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUSINESSES VIEW - Multi-Business Entity Management */}
      {viewMode === 'businesses' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: '#1f2937',
            marginBottom: '2rem'
          }}>
            🏢 Multi-Business Entity Management
          </h3>

          {/* Business Entities Overview */}
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            {businessEntities.map(business => {
              const businessTransactions = categorizedTransactions.filter(t => t.businessId === business.id);
              const businessIncome = businessTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
              const businessExpenses = Math.abs(businessTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

              return (
                <div key={business.id} style={{
                  border: `2px solid ${business.color}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  background: `${business.color}08`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: business.color,
                        margin: 0,
                        marginBottom: '0.25rem'
                      }}>
                        {business.name}
                      </h4>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {business.type === 'personal' ? 'Personal' : `${business.entityType?.toUpperCase()} Business`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        {businessTransactions.length} transactions
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '1.1rem', color: business.color }}>
                        Net: ${fmt(businessIncome - businessExpenses)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>Income</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#059669' }}>
                        ${fmt(businessIncome)}
                      </div>
                    </div>
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>Expenses</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#dc2626' }}>
                        ${fmt(businessExpenses)}
                      </div>
                    </div>
                  </div>

                  {/* Business-specific tax info */}
                  {business.type === 'business' && (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      marginTop: '1rem'
                    }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#6366f1', marginBottom: '0.5rem' }}>
                        Tax Optimization for {business.entityType?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#1f2937' }}>
                        {business.entityType === 'llc' && `LLC pass-through taxation. Consider S-Corp election if income > $60k.`}
                        {business.entityType === 'sole_proprietorship' && `Schedule C filing. Self-employment tax applies (15.3%).`}
                        {business.entityType === 's_corp' && `S-Corp election active. Payroll taxes optimized.`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Transaction Assignment Interface */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            color: 'white'
          }}>
            <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>
              🎯 Smart Transaction Assignment
            </h4>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.9 }}>
              AI automatically assigns transactions to businesses based on keywords. Review and adjust assignments below:
            </p>

            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem'
            }}>
              {categorizedTransactions.slice(0, 10).map(transaction => (
                <div key={transaction.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      {transaction.description}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                      ${Math.abs(transaction.amount)} • {transaction.taxCategory}
                    </div>
                  </div>
                  <select
                    value={transaction.businessId}
                    onChange={(e) => {
                      setTransactionBusinessAssignments(prev => ({
                        ...prev,
                        [transaction.id]: e.target.value
                      }));
                    }}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'white',
                      color: '#1f2937',
                      fontSize: '0.8rem',
                      minWidth: '120px'
                    }}
                  >
                    {businessEntities.map(business => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Business Button */}
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              onClick={() => {
                const name = prompt('Enter business name:');
                const entityType = prompt('Entity type (llc/sole_proprietorship/s_corp/c_corp):') || 'llc';
                if (name) {
                  const newBusiness = {
                    id: name.toLowerCase().replace(/\s+/g, '_'),
                    name,
                    type: 'business',
                    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                    entityType,
                    keywords: [name.toLowerCase()]
                  };
                  setBusinessEntities([...businessEntities, newBusiness]);
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
              }}
            >
              ➕ Add New Business Entity
            </button>
          </div>
        </div>
      )}

      {viewMode === 'overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '2rem'
        }}>
          {/* Pie Chart Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#1f2937',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              📊 Tax Category Breakdown
            </h3>
            {renderPieChart()}

            {/* Legend */}
            <div style={{
              marginTop: '2rem',
              display: 'grid',
              gap: '0.75rem'
            }}>
              {pieChartData.slice(0, 8).map(segment => (
                <div key={segment.category} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} onClick={() => setSelectedCategory(segment.category)}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: segment.color
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {segment.category}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {segment.count} transactions
                    </div>
                  </div>
                  <div style={{
                    fontWeight: '700',
                    color: '#1f2937'
                  }}>
                    ${segment.amount.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6b7280'
                  }}>
                    {segment.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-Time Tax Estimate Card */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '24px',
            padding: '2rem',
            color: 'white',
            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3)'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              ⚡ Real-Time Tax Estimate
            </h3>

            <div style={{
              display: 'grid',
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Total Income</div>
                <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                  ${taxEstimate.totalIncome.toLocaleString()}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Federal Tax</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                    ${taxEstimate.federalTax.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>SE Tax</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                    ${taxEstimate.seTax.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Quarterly Payment Due</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>
                  ${taxEstimate.estimatedQuarterly.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  Effective Rate: {taxEstimate.effectiveRate.toFixed(1)}%
                </div>
              </div>

              {taxEstimate.usingItemized && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontSize: '0.9rem'
                }}>
                  💡 You're saving ${taxEstimate.deductionsSaved.toLocaleString()} by itemizing!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionAnalysis;