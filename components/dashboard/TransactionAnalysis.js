import React, { useState, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { fmt } from '../../lib/utils';
import { notify } from '../Notify';

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

// CATEGORY TO BUSINESS ID MAPPING - moved to top to avoid hoisting issues
const mapCategoryToBusinessId = (categoryName) => {
  const mapping = {
    'Personal': 'personal',
    'Studio': 'studio',
    'Smoke Shop': 'smoke_shop',
    'Botting': 'botting',
    'Coding': 'coding',
    'Tech': 'coding',
    'Development': 'coding',
    'W-2 Income': 'personal',
    'Self-Employment Income': 'personal',
    'Studio Income': 'studio',
    'Studio Expenses': 'studio',
    'Smoke Shop Income': 'smoke_shop',
    'Smoke Shop Expenses': 'smoke_shop'
  };
  return mapping[categoryName] || 'personal';
};

const TransactionAnalysis = ({
  transactions = [],
  bills = [],
  oneTimeCosts = [],
  accounts = [],
  setTransactions,
  recurringIncome = [],
  selectedCat = 'All',
  selectedCats = [],
  onUpdateTransactionCategory,
  onTransactionUpdate,
  togglePaid,
  toggleOneTimePaid
}) => {
  const isMobile = useIsMobile();
  const [selectedBusinessType, setSelectedBusinessType] = useState('sole-proprietorship');
  const [viewMode, setViewMode] = useState('transactions'); // transactions, overview
  const [selectedCategory, setSelectedCategory] = useState(null);

  // MULTI-BUSINESS ENTITY SUPPORT
  // BUSINESS ENTITIES - Always available, auto-populated based on categories
  const [businessEntities, setBusinessEntities] = useState([
    { id: 'personal', name: 'Personal', type: 'personal', color: '#6b7280', entityType: null },
    { id: 'studio', name: 'The Studio', type: 'business', color: '#8b5cf6', entityType: 'llc', keywords: ['studio', 'creative', 'design', 'photo', 'video'] },
    { id: 'smoke_shop', name: 'Smoke Shop', type: 'business', color: '#059669', entityType: 'sole_proprietorship', keywords: ['smoke', 'tobacco', 'vape', 'retail', 'shop'] },
    { id: 'botting', name: 'Botting Business', type: 'business', color: '#f59e0b', entityType: 'sole_proprietorship', keywords: ['bot', 'automation', 'resale', 'sneaker', 'retail'] },
    { id: 'coding', name: 'Coding/Development', type: 'business', color: '#3b82f6', entityType: 'sole_proprietorship', keywords: ['code', 'development', 'programming', 'software', 'tech', 'web', 'app'] }
  ]);
  const [showBusinessSetup, setShowBusinessSetup] = useState(false);
  const [transactionBusinessAssignments, setTransactionBusinessAssignments] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySettings, setCategorySettings] = useState({});
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all'); // New channel filter
  const [openActionDropdown, setOpenActionDropdown] = useState(null); // For actions dropdown
  const [editingField, setEditingField] = useState(null); // {transactionId, field}
  const [editingValue, setEditingValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [showNotesPopup, setShowNotesPopup] = useState(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(null);
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [showMassActions, setShowMassActions] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showAutoCategorization, setShowAutoCategorization] = useState(false);
  const [showSmartAssignment, setShowSmartAssignment] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    autoCategorize: true,
    createRecurring: false
  });
  const [autoCategorizeProposals, setAutoCategorizeProposals] = useState([]);
  const [selectedProposals, setSelectedProposals] = useState(new Set());

  // CSV Processing Functions
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, rows };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      setCsvData(parsed);

      // Auto-detect column mappings
      const autoMapping = {};
      parsed.headers.forEach(header => {
        const lower = header.toLowerCase();
        if (lower.includes('description') || lower.includes('memo') || lower.includes('payee')) {
          autoMapping.description = header;
        } else if (lower.includes('amount') || lower.includes('debit') || lower.includes('credit')) {
          autoMapping.amount = header;
        } else if (lower.includes('date') || lower.includes('posted')) {
          autoMapping.date = header;
        } else if (lower.includes('account')) {
          autoMapping.account = header;
        }
      });
      setColumnMapping(autoMapping);
    };
    reader.readAsText(file);
  };

  const processCSVImport = () => {
    if (!csvData.rows || csvData.rows.length === 0) {
      alert('No data to import');
      return;
    }

    const newTransactions = csvData.rows.map((row, index) => {
      let amount = parseFloat(row[columnMapping.amount] || '0');
      let description = row[columnMapping.description] || 'Imported Transaction';
      let date = row[columnMapping.date] || new Date().toISOString().slice(0, 10);
      let account = row[columnMapping.account] || 'Imported Account';

      // Handle different amount formats
      if (isNaN(amount)) {
        const amountStr = row[columnMapping.amount] || '0';
        amount = parseFloat(amountStr.replace(/[$,()]/g, '').replace(/\s+/g, ''));
        if (amountStr.includes('(') || amountStr.includes('-')) {
          amount = -Math.abs(amount);
        }
      }

      // Auto-categorize if enabled
      let taxCategory = 'Uncategorized';
      if (importOptions.autoCategorize) {
        const descLower = description.toLowerCase();
        for (const [category, config] of Object.entries(TAX_CATEGORIES)) {
          if (config.keywords && config.keywords.some(keyword =>
            descLower.includes(keyword.toLowerCase())
          )) {
            taxCategory = category;
            break;
          }
        }
      }

      return {
        id: `imported_${Date.now()}_${index}`,
        description,
        amount,
        date,
        account,
        taxCategory,
        source: 'csv_import',
        type: amount > 0 ? 'credit_received' : 'debit_spent',
        businessId: 'personal'
      };
    });

    // Skip duplicates if enabled
    let finalTransactions = newTransactions;
    if (importOptions.skipDuplicates) {
      const existingTransactions = allFinancialData.flatMap(account => account.transactions || []);
      finalTransactions = newTransactions.filter(newTx => {
        return !existingTransactions.some(existing =>
          existing.description === newTx.description &&
          Math.abs(existing.amount - newTx.amount) < 0.01 &&
          existing.date === newTx.date
        );
      });
    }

    // Add to existing transactions
    if (finalTransactions.length > 0 && onTransactionUpdate) {
      finalTransactions.forEach(transaction => {
        onTransactionUpdate('add', null, transaction);
      });
      alert(`Successfully imported ${finalTransactions.length} transactions`);
    } else {
      alert('No new transactions to import (all were duplicates)');
    }

    // Reset and close
    setCsvFile(null);
    setCsvData([]);
    setColumnMapping({});
    setShowCSVImport(false);
  };

  // Auto-Categorization Functions
  const generateAutoCategorizeProposals = () => {
    const uncategorizedTransactions = categorizedTransactions.filter(t =>
      t.taxCategory === 'Uncategorized' || !t.taxCategory
    );

    if (uncategorizedTransactions.length === 0) {
      alert('No uncategorized transactions found');
      return;
    }

    // Group transactions by vendor/description patterns
    const vendorGroups = {};
    uncategorizedTransactions.forEach(transaction => {
      const desc = transaction.description.toLowerCase();

      // Extract vendor name (simplified logic)
      let vendor = desc.split(' ')[0];
      if (vendor.length < 3) vendor = desc.split(' ').slice(0, 2).join(' ');
      if (vendor.length < 3) vendor = transaction.description;

      if (!vendorGroups[vendor]) {
        vendorGroups[vendor] = [];
      }
      vendorGroups[vendor].push(transaction);
    });

    // Generate proposals for each vendor group
    const proposals = Object.entries(vendorGroups).map(([vendor, transactions]) => {
      const description = transactions[0].description.toLowerCase();
      let proposedCategory = 'Uncategorized';
      let confidence = 0;

      // Find best matching category based on keywords
      for (const [category, config] of Object.entries(TAX_CATEGORIES)) {
        if (config.keywords) {
          const matches = config.keywords.filter(keyword =>
            description.includes(keyword.toLowerCase())
          ).length;

          if (matches > 0) {
            const categoryConfidence = (matches / config.keywords.length) * 100;
            if (categoryConfidence > confidence) {
              confidence = categoryConfidence;
              proposedCategory = category;
            }
          }
        }
      }

      // If no keyword match, use common patterns
      if (confidence === 0) {
        if (description.includes('amazon') || description.includes('office') || description.includes('staple')) {
          proposedCategory = 'Office Expenses';
          confidence = 85;
        } else if (description.includes('gas') || description.includes('fuel') || description.includes('shell') || description.includes('exxon')) {
          proposedCategory = 'Vehicle Expenses';
          confidence = 90;
        } else if (description.includes('restaurant') || description.includes('coffee') || description.includes('starbucks') || description.includes('food')) {
          proposedCategory = 'Travel & Meals';
          confidence = 80;
        } else if (description.includes('software') || description.includes('adobe') || description.includes('microsoft')) {
          proposedCategory = 'Software & Subscriptions';
          confidence = 85;
        } else if (description.includes('internet') || description.includes('phone') || description.includes('verizon') || description.includes('att')) {
          proposedCategory = 'Communications';
          confidence = 85;
        } else {
          confidence = 25; // Low confidence fallback
        }
      }

      return {
        id: `proposal_${vendor}_${Date.now()}`,
        vendor: vendor.charAt(0).toUpperCase() + vendor.slice(1),
        originalDescription: transactions[0].description,
        currentCategory: 'Uncategorized',
        proposedCategory,
        confidence: Math.min(confidence, 98),
        transactionIds: transactions.map(t => t.id),
        count: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      };
    }).filter(p => p.confidence > 20 && p.proposedCategory !== 'Uncategorized');

    setAutoCategorizeProposals(proposals);
    setSelectedProposals(new Set(proposals.map(p => p.id)));
  };

  const applyAutoCategorization = () => {
    const proposalsToApply = autoCategorizeProposals.filter(p =>
      selectedProposals.has(p.id)
    );

    if (proposalsToApply.length === 0) {
      alert('No proposals selected');
      return;
    }

    let updatedCount = 0;
    proposalsToApply.forEach(proposal => {
      proposal.transactionIds.forEach(transactionId => {
        const success = onTransactionUpdate('edit', transactionId, {
          taxCategory: proposal.proposedCategory
        });
        if (success) updatedCount++;
      });
    });

    alert(`Successfully updated ${updatedCount} transactions`);
    setAutoCategorizeProposals([]);
    setSelectedProposals(new Set());
    setShowAutoCategorization(false);
  };

  const toggleProposal = (proposalId) => {
    setSelectedProposals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(proposalId)) {
        newSet.delete(proposalId);
      } else {
        newSet.add(proposalId);
      }
      return newSet;
    });
  };

  const toggleAllProposals = () => {
    if (selectedProposals.size === autoCategorizeProposals.length) {
      setSelectedProposals(new Set());
    } else {
      setSelectedProposals(new Set(autoCategorizeProposals.map(p => p.id)));
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (openActionDropdown && !event.target.closest('[data-dropdown]')) {
        setOpenActionDropdown(null);
      }
      if (showNotesPopup && !event.target.closest('[data-notes-popup]')) {
        setShowNotesPopup(null);
      }
      if (showReceiptUpload && !event.target.closest('[data-receipt-popup]')) {
        setShowReceiptUpload(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openActionDropdown, showNotesPopup, showReceiptUpload]);

  // Inline editing functions
  const startEditing = (transactionId, field, currentValue) => {
    setEditingField({ transactionId, field });
    setEditingValue(currentValue);
  };

  const saveEdit = (transactionId, field, newValue) => {
    // TODO: Update transaction in database/state
    console.log('Saving edit:', { transactionId, field, newValue });
    setEditingField(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // Selection functions
  const toggleTransactionSelection = (transactionId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.size === sortedTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(sortedTransactions.map(t => t.id)));
    }
  };

  const massDeleteTransactions = () => {
    if (confirm(`Delete ${selectedTransactions.size} selected transactions?`)) {
      // TODO: Implement mass delete
      console.log('Mass delete:', Array.from(selectedTransactions));
      setSelectedTransactions(new Set());
    }
  };

  const massEditTransactions = (field, value) => {
    // TODO: Implement mass edit
    console.log('Mass edit:', { field, value, transactions: Array.from(selectedTransactions) });
    setSelectedTransactions(new Set());
  };

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort transactions - will be defined after categorizedTransactions

  // Inline editable field components
  const EditableField = ({ transaction, field, value, type = 'text', options = [] }) => {
    const isEditing = editingField?.transactionId === transaction.id && editingField?.field === field;

    if (isEditing) {
      if (type === 'select') {
        return (
          <select
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => saveEdit(transaction.id, field, editingValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit(transaction.id, field, editingValue);
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '0.25rem',
              border: '2px solid #3b82f6',
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          type={type === 'amount' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => saveEdit(transaction.id, field, editingValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit(transaction.id, field, editingValue);
            if (e.key === 'Escape') cancelEdit();
          }}
          onFocus={(e) => (type === 'amount' || type === 'date') && e.target.select()}
          autoFocus
          style={{
            width: '100%',
            padding: '0.25rem',
            border: '2px solid #3b82f6',
            borderRadius: '4px',
            fontSize: '0.8rem',
            textAlign: type === 'amount' ? 'right' : 'left'
          }}
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(transaction.id, field, value)}
        style={{
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '4px',
          minHeight: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        {type === 'amount' ? fmt(value) :
         type === 'date' ? new Date(value).toLocaleDateString() :
         type === 'select' && field === 'taxCategory' ? (
           <span style={{
             background: TAX_CATEGORIES[value]?.color || '#6b7280',
             color: 'white',
             padding: '0.25rem 0.75rem',
             borderRadius: '12px',
             fontSize: '0.8rem',
             fontWeight: '500'
           }}>
             {value}
           </span>
         ) :
         value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Click to edit</span>}
      </div>
    );
  };

  const NotesField = ({ transaction }) => {
    const hasNotes = transaction.notes && transaction.notes !== 'Auto-pay setup for this account';

    if (showNotesPopup === transaction.id) {
      return (
        <div data-notes-popup style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotesPopup(null)}
            style={{
              padding: '0.25rem 0.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {hasNotes ? 'Edit Notes' : '+ Add Notes'}
          </button>

          {/* Notes Popup */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            padding: '1rem',
            minWidth: '250px'
          }}>
            <textarea
              defaultValue={hasNotes ? transaction.notes : ''}
              placeholder="Add notes..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.9rem'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowNotesPopup(null);
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  // TODO: Save notes
                  setShowNotesPopup(null);
                }}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowNotesPopup(null)}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => setShowNotesPopup(transaction.id)}
        style={{
          padding: '0.25rem 0.5rem',
          background: hasNotes ? '#f3f4f6' : '#3b82f6',
          color: hasNotes ? '#374151' : 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        {hasNotes ? (
          <span style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100px'
          }}>
            {transaction.notes}
          </span>
        ) : '+ Add Notes'}
      </button>
    );
  };

  const ReceiptField = ({ transaction }) => {
    const hasReceipts = transaction.receipts && transaction.receipts.length > 0;

    if (showReceiptUpload === transaction.id) {
      return (
        <div data-receipt-popup style={{ position: 'relative' }}>
          <button
            onClick={() => setShowReceiptUpload(null)}
            style={{
              padding: '0.25rem 0.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Upload
          </button>

          {/* Receipt Upload Popup */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            padding: '1rem',
            minWidth: '200px'
          }}>
            <input
              type="file"
              accept="image/*"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  // TODO: Upload receipt
                  setShowReceiptUpload(null);
                }}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Upload
              </button>
              <button
                onClick={() => setShowReceiptUpload(null)}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (hasReceipts) {
      return (
        <span
          onClick={() => setShowReceiptUpload(transaction.id)}
          style={{
            fontSize: '1.2rem',
            color: '#059669',
            cursor: 'pointer'
          }}
          title={`${transaction.receipts.length} receipt(s)`}
        >
          📎
        </span>
      );
    }

    return (
      <button
        onClick={() => setShowReceiptUpload(transaction.id)}
        style={{
          padding: '0.25rem 0.5rem',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        + Add
      </button>
    );
  };

  // Dropdown options for editable fields
  const categoryOptions = Object.keys(TAX_CATEGORIES).map(category => ({
    value: category,
    label: category
  }));

  const accountOptions = [
    { value: 'Main Account', label: 'Main Account' },
    { value: 'Business Checking', label: 'Business Checking' },
    { value: 'Savings', label: 'Savings' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Cash', label: 'Cash' }
  ];

  const paymentMethodOptions = [
    { value: 'Debit Card', label: 'Debit Card' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Check', label: 'Check' },
    { value: 'Deposit', label: 'Deposit' },
    { value: 'Wire Transfer', label: 'Wire Transfer' }
  ];

  // COMPREHENSIVE TRANSACTION + BILLS DATA INTEGRATION
  const allFinancialData = useMemo(() => {
    const currentYear = new Date().getFullYear();

    // Convert bills to transaction format
    const billTransactions = bills.map(bill => ({
      id: `bill-${bill.id}`,
      description: bill.name,
      amount: -Math.abs(bill.amount), // Bills are expenses (negative)
      date: new Date().toISOString().split('T')[0], // Current date for bills
      category: bill.category || 'Bills',
      source: 'bills',
      frequency: bill.frequency,
      annualAmount: bill.frequency === 'monthly' ? bill.amount * 12 :
                   bill.frequency === 'weekly' ? bill.amount * 52 :
                   bill.frequency === 'biweekly' ? bill.amount * 26 : bill.amount,
      // Professional data fields
      account: bill.account || 'Auto-pay Account',
      paymentMethod: bill.paymentMethod || 'Auto-debit',
      notes: `Recurring ${bill.frequency} bill${bill.notes ? ` - ${bill.notes}` : ''}`,
      receipts: []
    }));

    // Convert one-time costs to transaction format
    const oneTimeCostTransactions = oneTimeCosts.map(cost => ({
      id: `cost-${cost.id}`,
      description: cost.name,
      amount: -Math.abs(cost.amount), // Costs are expenses (negative)
      date: cost.date || new Date().toISOString().split('T')[0],
      category: cost.category || 'One-time Expenses',
      source: 'oneTimeCosts',
      // Professional data fields
      account: cost.account || 'Business Checking',
      paymentMethod: cost.paymentMethod || 'Debit Card',
      notes: cost.notes || '',
      receipts: cost.receipts || []
    }));

    // Convert recurring income to transaction format
    const incomeTransactions = recurringIncome.map(income => ({
      id: `income-${income.id}`,
      description: income.name,
      amount: Math.abs(income.amount), // Income is positive
      date: new Date().toISOString().split('T')[0],
      category: income.category || 'Recurring Income',
      source: 'recurringIncome',
      frequency: income.frequency,
      annualAmount: income.frequency === 'monthly' ? income.amount * 12 :
                   income.frequency === 'weekly' ? income.amount * 52 :
                   income.frequency === 'biweekly' ? income.amount * 26 : income.amount,
      // Professional data fields
      account: income.account || 'Business Checking',
      paymentMethod: income.paymentMethod || 'Direct Deposit',
      notes: `Recurring ${income.frequency} income${income.notes ? ` - ${income.notes}` : ''}`,
      receipts: []
    }));

    // Enhance existing transactions with professional fields if missing
    const enhancedTransactions = transactions
      .filter(t => new Date(t.date).getFullYear() === currentYear)
      .map(transaction => ({
        ...transaction,
        // Add professional fields with defaults if missing
        account: transaction.account || 'Main Account',
        paymentMethod: transaction.paymentMethod || (transaction.amount > 0 ? 'Deposit' : 'Debit Card'),
        notes: transaction.notes || '',
        receipts: transaction.receipts || []
      }));

    // Combine all financial data
    const allTransactions = [
      ...enhancedTransactions,
      ...billTransactions,
      ...oneTimeCostTransactions,
      ...incomeTransactions
    ];

    return allTransactions;
  }, [transactions, bills, oneTimeCosts, recurringIncome]);

  // INTELLIGENT TRANSACTION CATEGORIZATION
  const categorizedTransactions = useMemo(() => {
    return allFinancialData.map(transaction => {
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

        // Determine if this is income or expense
        const isExpense = transaction.amount < 0;
        const isIncome = transaction.amount > 0;

        Object.entries(TAX_CATEGORIES).forEach(([category, config]) => {
          const matches = (config.keywords || []).filter(keyword =>
            combined.includes(keyword.toLowerCase())
          ).length;

          // Only consider categories that match the transaction type (income vs expense)
          if (matches > maxMatches) {
            // For business categories, create appropriate income/expense subcategory
            if (category === 'Self-Employment Income' && isExpense) {
              bestMatch = 'Business Expenses';
            } else if (category === 'Self-Employment Income' && isIncome) {
              bestMatch = 'Self-Employment Income';
            } else if (config.businessType === 'business') {
              // For business-related transactions
              if (isExpense) {
                bestMatch = 'Business Expenses';
              } else if (isIncome) {
                bestMatch = 'Self-Employment Income';
              } else {
                bestMatch = category;
              }
            } else {
              bestMatch = category;
            }
            maxMatches = matches;
          }
        });

        // AUTO-ASSIGN BUSINESS ENTITY based on category
        let assignedBusinessId = transactionBusinessAssignments[transaction.id];

        // If not manually assigned, use the category's businessId or default to personal
        if (!assignedBusinessId) {
          // For bills and one-time costs, use their category directly
          if (transaction.source === 'bills' || transaction.source === 'oneTimeCosts') {
            assignedBusinessId = mapCategoryToBusinessId(transaction.category);
          } else {
            const categoryConfig = TAX_CATEGORIES[bestMatch];
            assignedBusinessId = categoryConfig?.businessId || 'personal';
          }
        }

        return {
          ...transaction,
          taxCategory: bestMatch,
          businessId: assignedBusinessId,
          businessName: businessEntities.find(b => b.id === assignedBusinessId)?.name || 'Personal',
          autoDetected: maxMatches > 0,
          confidence: maxMatches / Math.max((bestMatch && TAX_CATEGORIES[bestMatch]?.keywords || []).length, 1)
        };
      });
  }, [allFinancialData, businessEntities, transactionBusinessAssignments]);

  // Sort transactions
  const sortedTransactions = React.useMemo(() => {
    const filtered = categorizedTransactions.filter(transaction => {
      // Channel filter - filter by business entity
      if (selectedChannel !== 'all') {
        if (transaction.businessId !== selectedChannel) {
          return false;
        }
      }

      // Category filter
      if (selectedCat !== 'All') {
        const allowedBusinessIds = selectedCats.map(cat => mapCategoryToBusinessId(cat));
        if (!allowedBusinessIds.includes(transaction.businessId)) {
          return false;
        }
      }

      // Filter by transaction type (credits/debits)
      if (transactionTypeFilter === 'all') return true;
      const isCredit = transaction.amount > 0 ||
        transaction.type === 'credit_received' ||
        transaction.type === 'recurring_income_received';
      const isDebit = transaction.amount < 0 ||
        transaction.type === 'bill_payment' ||
        transaction.type === 'one_time_cost_payment';

      return transactionTypeFilter === 'credits' ? isCredit : isDebit;
    });

    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'amount') {
        const aVal = Math.abs(a.amount);
        const bVal = Math.abs(b.amount);
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (sortConfig.key === 'date') {
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
      const aVal = (a[sortConfig.key] || '').toString().toLowerCase();
      const bVal = (b[sortConfig.key] || '').toString().toLowerCase();
      if (sortConfig.direction === 'asc') {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });
  }, [categorizedTransactions, selectedChannel, selectedCat, selectedCats, transactionTypeFilter, sortConfig]);

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

  // REAL-TIME TAX ESTIMATION (Enhanced with Business Settings)
  const taxEstimate = useMemo(() => {
    const income = categoryTotals['W-2 Income']?.total || 0;

    // Calculate business income with entity type considerations
    let businessIncome = 0;
    let selfEmploymentIncome = 0;

    // Check each category for business classification and entity type
    Object.entries(categoryTotals).forEach(([category, data]) => {
      const categoryBusinessType = categorySettings[category]?.businessType || TAX_CATEGORIES[category]?.businessType;
      const entityType = categorySettings[category]?.entityType || 'sole_proprietorship';

      if (categoryBusinessType === 'business' && data.total > 0) {
        businessIncome += data.total;

        // Only add to SE tax if entity type is subject to SE tax
        if (['sole_proprietorship', 'llc'].includes(entityType)) {
          selfEmploymentIncome += data.total;
        }
      }
    });

    // Add traditional SE income categories
    const traditionalSEIncome = categoryTotals['Self-Employment Income']?.total || 0;
    selfEmploymentIncome += traditionalSEIncome;

    // Calculate deductions with business expense considerations
    let personalDeductions = (categoryTotals['Medical Expenses']?.total || 0) +
                           (categoryTotals['Charitable Donations']?.total || 0) +
                           (categoryTotals['Mortgage Interest']?.total || 0) +
                           (categoryTotals['State & Local Taxes']?.total || 0);

    let businessExpenses = 0;
    Object.entries(categoryTotals).forEach(([category, data]) => {
      const categoryBusinessType = categorySettings[category]?.businessType || TAX_CATEGORIES[category]?.businessType;
      if (categoryBusinessType === 'business' && data.total < 0) { // Expenses are negative
        businessExpenses += Math.abs(data.total);
      }
    });

    const totalIncome = income + businessIncome;
    const netBusinessIncome = Math.max(0, businessIncome - businessExpenses);
    const adjustedTotalIncome = income + netBusinessIncome;

    const standardDeduction = STANDARD_DEDUCTIONS_2024.single; // Default to single
    const itemizedDeduction = personalDeductions;
    const finalDeduction = Math.max(standardDeduction, itemizedDeduction);
    const taxableIncome = Math.max(0, adjustedTotalIncome - finalDeduction);

    // Calculate federal tax using 2024 brackets
    let federalTax = 0;
    const brackets = TAX_BRACKETS_2024.single;

    for (const bracket of brackets) {
      if (taxableIncome > bracket.min) {
        const taxableInBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
        federalTax += taxableInBracket * bracket.rate;
      }
    }

    // Self-employment tax (15.3% on first $160,200) - Only applies to SE entities
    const netSEIncome = Math.max(0, selfEmploymentIncome - businessExpenses);
    const seTax = netSEIncome * 0.153;

    const totalTax = federalTax + seTax;
    const estimatedQuarterly = totalTax / 4;

    return {
      totalIncome: adjustedTotalIncome,
      businessIncome,
      businessExpenses,
      netBusinessIncome,
      selfEmploymentIncome: netSEIncome,
      taxableIncome,
      federalTax,
      seTax,
      totalTax,
      estimatedQuarterly,
      usingItemized: itemizedDeduction > standardDeduction,
      deductionsSaved: Math.max(0, itemizedDeduction - standardDeduction),
      effectiveRate: adjustedTotalIncome > 0 ? (totalTax / adjustedTotalIncome) * 100 : 0
    };
  }, [categoryTotals, categorySettings]);

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

  // FINANCIAL SUMMARY CALCULATIONS
  const financialSummary = useMemo(() => {
    // Filter transactions using the same logic as the transaction table
    const filteredTransactions = categorizedTransactions.filter(transaction => {
      // Channel filter - filter by business entity
      if (selectedChannel !== 'all') {
        if (transaction.businessId !== selectedChannel) {
          return false;
        }
      }

      // Category filter
      if (selectedCat !== 'All') {
        const allowedBusinessIds = selectedCats.map(cat => mapCategoryToBusinessId(cat));
        if (!allowedBusinessIds.includes(transaction.businessId)) {
          return false;
        }
      }

      // Filter by transaction type (credits/debits) - same logic as transaction table
      if (transactionTypeFilter === 'all') return true;
      const isCredit = transaction.amount > 0 ||
        transaction.type === 'credit_received' ||
        transaction.type === 'recurring_income_received';
      const isDebit = transaction.amount < 0 ||
        transaction.type === 'bill_payment' ||
        transaction.type === 'one_time_cost_payment';

      return transactionTypeFilter === 'credits' ? isCredit : isDebit;
    });

    const grossProfit = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = Math.abs(filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    const netProfit = grossProfit - totalExpenses;

    return { grossProfit, totalExpenses, netProfit };
  }, [categorizedTransactions, transactionTypeFilter, selectedCat, selectedCats, selectedChannel]);

  const { grossProfit, totalExpenses, netProfit } = financialSummary;

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
      {/* Financial Summary Boxes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#f0fdf4',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #bbf7d0',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '700', color: '#16a34a', marginBottom: '0.25rem' }}>
            {fmt(grossProfit)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: '600' }}>Gross Profit</div>
        </div>
        <div style={{
          background: '#fef2f2',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #fecaca',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '700', color: '#dc2626', marginBottom: '0.25rem' }}>
            {fmt(totalExpenses)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '600' }}>Total Expenses</div>
        </div>
        <div style={{
          background: netProfit >= 0 ? '#f0f9ff' : '#fef2f2',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: `1px solid ${netProfit >= 0 ? '#38bdf8' : '#fecaca'}`,
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '700', color: netProfit >= 0 ? '#0284c7' : '#dc2626', marginBottom: '0.25rem' }}>
            {fmt(netProfit)}
          </div>
          <div style={{ fontSize: '0.875rem', color: netProfit >= 0 ? '#0369a1' : '#991b1b', fontWeight: '600' }}>Net Profit</div>
        </div>
        <div style={{
          background: '#f0f9ff',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #38bdf8',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '700', color: '#0284c7', marginBottom: '0.25rem' }}>
            {categorizedTransactions.filter(t => selectedChannel === 'all' || t.businessId === selectedChannel).length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: '600' }}>Transactions</div>
        </div>
        <div style={{
          background: '#faf5ff',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #c084fc',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '700', color: '#7c3aed', marginBottom: '0.25rem' }}>
            {netProfit > 0 ? fmt(netProfit * 0.3) : '$0.00'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b46c1', fontWeight: '600' }}>Est. Tax Owed</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        justifyContent: 'center'
      }}>
        {['transactions', 'overview'].map(mode => (
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
            {mode === 'transactions' ? '📋 Transaction Log' :
             mode === 'overview' ? '📊 Overview' :
             mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Content based on view mode */}


      {/* ENHANCED TRANSACTION HISTORY - Original Log Format + AI Features */}
      {viewMode === 'transactions' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
        }}>

          {/* Channel Filter and Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Transaction Type Filter */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.25rem'
              }}>
                {['all', 'credits', 'debits'].map(type => (
                  <button
                    key={type}
                    onClick={() => setTransactionTypeFilter(type)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: transactionTypeFilter === type ? '#3b82f6' : 'transparent',
                      color: transactionTypeFilter === type ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {type === 'all' ? '💰 All' : type === 'credits' ? '💵 Credits' : '💸 Debits'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowCSVImport(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                📁 Import CSV
              </button>
              <button
                onClick={() => {
                  generateAutoCategorizeProposals();
                  setShowAutoCategorization(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                🤖 Auto-Categorize
              </button>
              <button
                onClick={() => {/* Add export functionality */}}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                📤 Export
              </button>
            </div>
          </div>

          {/* Advanced Filters & Search - Wave/QuickBooks Style */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <input
                type="text"
                placeholder="🔍 Search transactions..."
                style={{
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />

              <select
                style={{
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option>All Categories</option>
                {Object.keys(TAX_CATEGORIES).map(category => (
                  <option key={category}>{category}</option>
                ))}
              </select>


              <select
                style={{
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option>All Time</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Quarter</option>
                <option>This Year</option>
              </select>
            </div>

            {/* Quick Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'All', color: '#6b7280' },
                { label: 'Income', color: '#10b981' },
                { label: 'Expenses', color: '#ef4444' },
                { label: 'Business', color: '#3b82f6' },
                { label: 'Personal', color: '#8b5cf6' },
                { label: 'Uncategorized', color: '#f59e0b' }
              ].map(filter => (
                <button
                  key={filter.label}
                  style={{
                    padding: '0.5rem 1rem',
                    background: filter.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    opacity: 0.8,
                    transition: 'opacity 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '1'}
                  onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mass Actions Bar */}
          {selectedTransactions.size > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{selectedTransactions.size}</strong> transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const [field, value] = e.target.value.split(':');
                      massEditTransactions(field, value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="">Bulk Edit...</option>
                  <optgroup label="Category">
                    {categoryOptions.map(cat => (
                      <option key={cat.value} value={`taxCategory:${cat.value}`}>
                        Set Category: {cat.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Account">
                    {accountOptions.map(acc => (
                      <option key={acc.value} value={`account:${acc.value}`}>
                        Set Account: {acc.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <button
                  onClick={massDeleteTransactions}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Delete Selected
                </button>
                <button
                  onClick={() => setSelectedTransactions(new Set())}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Transaction Table - Wave/QuickBooks Style */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: 'white'
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '0.3fr 2fr 1fr 1fr'
                : '0.3fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0.5fr',
              padding: '1rem',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: '#374151'
            }}>
              <div style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedTransactions.size === sortedTransactions.length && sortedTransactions.length > 0}
                  onChange={toggleSelectAll}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
              </div>
              <div
                onClick={() => handleSort('description')}
                style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div
                onClick={() => handleSort('amount')}
                style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              <div
                onClick={() => handleSort('date')}
                style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>
              {!isMobile && <div
                onClick={() => handleSort('category')}
                style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>}
              {!isMobile && <div
                onClick={() => handleSort('account')}
                style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                Account {sortConfig.key === 'account' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </div>}
              {!isMobile && <div style={{ textAlign: 'center' }}>Notes</div>}
              {!isMobile && <div style={{ textAlign: 'center' }}>Receipt</div>}
              {!isMobile && <div style={{ textAlign: 'center' }}>Tax Impact</div>}
              {!isMobile && <div style={{ textAlign: 'center' }}>Actions</div>}
            </div>

            {/* Transaction Rows - Enhanced with Credit/Debit Logic */}
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {sortedTransactions
                .slice(0, 50).map((transaction, index) => {
                  // Determine transaction type and formatting
                  const isCredit = transaction.amount > 0 ||
                    transaction.type === 'credit_received' ||
                    transaction.type === 'recurring_income_received';
                  const transactionLabel = isCredit ? '💵 CREDIT' : '💸 DEBIT';
                  const amountColor = isCredit ? '#059669' : '#dc2626'; // Credits green, debits red

                  return (
                <div
                  key={transaction.id || index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? '0.3fr 2fr 1fr 1fr'
                      : '0.3fr 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 0.5fr',
                    padding: '1rem',
                    borderBottom: index < 19 ? '1px solid #f1f5f9' : 'none',
                    alignItems: 'center',
                    fontSize: '0.9rem',
                    transition: 'background-color 0.3s ease',
                    backgroundColor: selectedTransactions.has(transaction.id) ? '#f0f9ff' : 'transparent'
                  }}
                  onMouseEnter={(e) => !selectedTransactions.has(transaction.id) && (e.currentTarget.style.backgroundColor = '#fafbff')}
                  onMouseLeave={(e) => !selectedTransactions.has(transaction.id) && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Checkbox */}
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={() => toggleTransactionSelection(transaction.id)}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Description with Credit/Debit Label */}
                  <div style={{
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        background: isCredit ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: amountColor
                      }}>
                        {transactionLabel}
                      </span>
                      <EditableField
                        transaction={transaction}
                        field="description"
                        value={transaction.description}
                        type="text"
                      />
                    </div>
                    {isMobile && (
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        {transaction.taxCategory} • {transaction.businessName}
                      </div>
                    )}
                  </div>

                  {/* Amount with better formatting */}
                  <div style={{
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '1rem',
                    color: amountColor
                  }}>
                    <EditableField
                      transaction={transaction}
                      field="amount"
                      value={Math.abs(transaction.amount)}
                      type="amount"
                    />
                  </div>

                  {/* Date */}
                  <div style={{
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '0.9rem'
                  }}>
                    <EditableField
                      transaction={transaction}
                      field="date"
                      value={new Date(transaction.date).toISOString().slice(0, 10)}
                      type="date"
                    />
                  </div>

                  {/* Category - Desktop Only */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center'
                    }}>
                      <EditableField
                        transaction={transaction}
                        field="taxCategory"
                        value={transaction.taxCategory}
                        type="select"
                        options={categoryOptions}
                      />
                    </div>
                  )}

                  {/* Business - Desktop Only */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center',
                      color: '#6b7280'
                    }}>
                      {transaction.businessName}
                    </div>
                  )}

                  {/* Account - Desktop Only */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.9rem'
                    }}>
                      <EditableField
                        transaction={transaction}
                        field="account"
                        value={transaction.account}
                        type="select"
                        options={accountOptions}
                      />
                    </div>
                  )}

                  {/* Notes - Desktop Only */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center'
                    }}>
                      <NotesField transaction={transaction} />
                    </div>
                  )}

                  {/* Receipt - Desktop Only */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center'
                    }}>
                      <ReceiptField transaction={transaction} />
                    </div>
                  )}

                  {/* Tax Impact - Desktop Only */}
                  {!isMobile && (
                    <div style={{
                      textAlign: 'center',
                      fontWeight: '500',
                      color: transaction.amount < 0 ? '#059669' : '#6b7280'
                    }}>
                      {transaction.amount < 0 ? 'Deductible' : 'Taxable'}
                    </div>
                  )}

                  {/* Actions - Desktop Only */}
                  {!isMobile && (
                    <div
                      data-dropdown
                      style={{
                        textAlign: 'center',
                        position: 'relative'
                      }}>
                      <button
                        onClick={() => setOpenActionDropdown(openActionDropdown === transaction.id ? null : transaction.id)}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                      >
                        Actions ▼
                      </button>

                      {/* Actions Dropdown */}
                      {openActionDropdown === transaction.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          zIndex: 1000,
                          minWidth: '160px',
                          overflow: 'hidden'
                        }}>
                          <button
                            onClick={() => {
                              // TODO: Add edit functionality
                              console.log('Edit transaction:', transaction);
                              setOpenActionDropdown(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                          >
                            ✏️ Edit
                          </button>

                          <button
                            onClick={() => {
                              // TODO: Add upload receipt functionality
                              console.log('Upload receipt for:', transaction);
                              setOpenActionDropdown(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                          >
                            📎 Upload Receipt
                          </button>

                          <button
                            onClick={() => {
                              // TODO: Add copy functionality
                              console.log('Copy transaction:', transaction);
                              setOpenActionDropdown(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                          >
                            📋 Copy
                          </button>

                          {/* Unmark as Paid Button - Only for payment transactions */}
                          {(transaction.type === 'bill_payment' || transaction.type === 'one_time_cost_payment') && transaction.payload?.is_paid && togglePaid && toggleOneTimePaid && (
                            <button
                              onClick={async () => {
                                try {
                                  if (transaction.type === 'bill_payment') {
                                    const bill = bills.find(b => b.id === transaction.item_id);
                                    if (bill) {
                                      await togglePaid(bill);
                                      notify(`"${bill.name}" unmarked as paid`, 'success');
                                    }
                                  } else if (transaction.type === 'one_time_cost_payment') {
                                    const otc = oneTimeCosts.find(o => o.id === transaction.item_id);
                                    if (otc) {
                                      await toggleOneTimePaid(otc);
                                      notify(`"${otc.name}" unmarked as paid`, 'success');
                                    }
                                  }
                                  setOpenActionDropdown(null);
                                } catch (error) {
                                  console.error('Error unmarking as paid:', error);
                                  notify('Failed to unmark as paid', 'error');
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'none',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                color: '#f59e0b'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#fffbeb'}
                              onMouseLeave={(e) => e.target.style.background = 'none'}
                            >
                              ↩️ Unmark as Paid
                            </button>
                          )}

                          <button
                            onClick={() => {
                              // TODO: Add delete functionality
                              console.log('Delete transaction:', transaction);
                              setOpenActionDropdown(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              background: 'none',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              color: '#dc2626'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                  );
                })}
            </div>
          </div>

        </div>
      )}


      {viewMode === 'overview' && (
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
            📊 Spending Overview
          </h3>

          {/* Simple Pie Chart */}
          {renderPieChart()}

          {/* Clean Legend - Top 6 Categories */}
          <div style={{
            marginTop: '2rem',
            display: 'grid',
            gap: '0.75rem'
          }}>
            {pieChartData.slice(0, 6).map(segment => (
              <div key={segment.category} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.02)'
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: segment.color
                }} />
                <div style={{ flex: 1, fontWeight: '600', color: '#1f2937' }}>
                  {segment.category}
                </div>
                <div style={{ fontWeight: '700', color: '#1f2937' }}>
                  ${segment.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Basic Income vs Expenses */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem',
            marginTop: '2rem'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '2px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📈</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Total Income
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                {fmt(categorizedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0))}
              </div>
            </div>
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '2px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📉</div>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Total Expenses
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                {fmt(Math.abs(categorizedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Editing Modal */}
      {editingCategory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#1f2937',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              ⚙️ Configure Category: {editingCategory}
            </h3>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Business Type Selection */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  🏢 Category Type
                </label>
                <select
                  value={categorySettings[editingCategory]?.businessType || TAX_CATEGORIES[editingCategory]?.businessType || 'personal'}
                  onChange={(e) => setCategorySettings(prev => ({
                    ...prev,
                    [editingCategory]: {
                      ...prev[editingCategory],
                      businessType: e.target.value
                    }
                  }))}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    fontSize: '1rem',
                    background: 'white',
                    color: '#374151'
                  }}
                >
                  <option value="personal">👤 Personal</option>
                  <option value="business">🏢 Business</option>
                </select>
              </div>

              {/* Business Entity Type - Only show if business type selected */}
              {(categorySettings[editingCategory]?.businessType === 'business') && (
                <>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      🏛️ Business Entity Type
                    </label>
                    <select
                      value={categorySettings[editingCategory]?.entityType || 'sole_proprietorship'}
                      onChange={(e) => setCategorySettings(prev => ({
                        ...prev,
                        [editingCategory]: {
                          ...prev[editingCategory],
                          entityType: e.target.value
                        }
                      }))}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        fontSize: '1rem',
                        background: 'white',
                        color: '#374151'
                      }}
                    >
                      <option value="sole_proprietorship">Sole Proprietorship</option>
                      <option value="llc">LLC (Single Member)</option>
                      <option value="llc_multi">LLC (Multi Member)</option>
                      <option value="s_corp">S Corporation</option>
                      <option value="c_corp">C Corporation</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>

                  {/* Business Details */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        📛 Business Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., My Studio LLC"
                        value={categorySettings[editingCategory]?.businessName || ''}
                        onChange={(e) => setCategorySettings(prev => ({
                          ...prev,
                          [editingCategory]: {
                            ...prev[editingCategory],
                            businessName: e.target.value
                          }
                        }))}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e5e7eb',
                          fontSize: '1rem',
                          background: 'white',
                          color: '#374151'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        🏢 EIN/Tax ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="XX-XXXXXXX"
                        value={categorySettings[editingCategory]?.ein || ''}
                        onChange={(e) => setCategorySettings(prev => ({
                          ...prev,
                          [editingCategory]: {
                            ...prev[editingCategory],
                            ein: e.target.value
                          }
                        }))}
                        style={{
                          width: '100%',
                          padding: '1rem',
                          borderRadius: '12px',
                          border: '2px solid #e5e7eb',
                          fontSize: '1rem',
                          background: 'white',
                          color: '#374151'
                        }}
                      />
                    </div>
                  </div>

                  {/* Quarterly Tax Settings */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      📅 Quarterly Tax Planning
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem'
                    }}>
                      <div>
                        <label style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          Estimated Tax Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          placeholder="25"
                          value={categorySettings[editingCategory]?.estimatedTaxRate || ''}
                          onChange={(e) => setCategorySettings(prev => ({
                            ...prev,
                            [editingCategory]: {
                              ...prev[editingCategory],
                              estimatedTaxRate: e.target.value
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          Set Aside % for Taxes
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="1"
                          placeholder="30"
                          value={categorySettings[editingCategory]?.taxSetAsidePercent || ''}
                          onChange={(e) => setCategorySettings(prev => ({
                            ...prev,
                            [editingCategory]: {
                              ...prev[editingCategory],
                              taxSetAsidePercent: e.target.value
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Tax Forms Information */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h4 style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  📄 Tax Forms & Information
                </h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Primary Form:</span>
                    <span style={{ fontWeight: '600' }}>
                      {TAX_CATEGORIES[editingCategory]?.taxForm || 'Form 1040'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Deductible:</span>
                    <span style={{ fontWeight: '600' }}>
                      {TAX_CATEGORIES[editingCategory]?.deductible ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  {(categorySettings[editingCategory]?.businessType === 'business') && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Business Form:</span>
                        <span style={{ fontWeight: '600' }}>
                          {categorySettings[editingCategory]?.entityType === 's_corp' ? 'Form 1120S' :
                           categorySettings[editingCategory]?.entityType === 'c_corp' ? 'Form 1120' :
                           categorySettings[editingCategory]?.entityType === 'partnership' ? 'Form 1065' :
                           categorySettings[editingCategory]?.entityType?.includes('llc') ? 'Schedule C/Form 1065' :
                           'Schedule C'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Self-Employment Tax:</span>
                        <span style={{ fontWeight: '600' }}>
                          {['sole_proprietorship', 'llc'].includes(categorySettings[editingCategory]?.entityType) ? '✅ Yes (15.3%)' : '❌ No'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Deduction & Expense Settings */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h4 style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  💰 Tax Deduction Settings
                </h4>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Deductible Percentage */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={categorySettings[editingCategory]?.isDeductible !== false}
                        onChange={(e) => setCategorySettings(prev => ({
                          ...prev,
                          [editingCategory]: {
                            ...prev[editingCategory],
                            isDeductible: e.target.checked
                          }
                        }))}
                        style={{ margin: 0 }}
                      />
                      Tax Deductible
                    </label>

                    {(categorySettings[editingCategory]?.isDeductible !== false) && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          Deductible Percentage (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          placeholder="100"
                          value={categorySettings[editingCategory]?.deductiblePercent || '100'}
                          onChange={(e) => setCategorySettings(prev => ({
                            ...prev,
                            [editingCategory]: {
                              ...prev[editingCategory],
                              deductiblePercent: e.target.value
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expense Tracking */}
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      <input
                        type="checkbox"
                        checked={categorySettings[editingCategory]?.requiresReceipts || false}
                        onChange={(e) => setCategorySettings(prev => ({
                          ...prev,
                          [editingCategory]: {
                            ...prev[editingCategory],
                            requiresReceipts: e.target.checked
                          }
                        }))}
                        style={{ margin: 0 }}
                      />
                      Requires Receipt/Documentation
                    </label>
                  </div>

                  {/* Expense Type */}
                  <div>
                    <label style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem',
                      display: 'block'
                    }}>
                      Expense Type
                    </label>
                    <select
                      value={categorySettings[editingCategory]?.expenseType || 'operating'}
                      onChange={(e) => setCategorySettings(prev => ({
                        ...prev,
                        [editingCategory]: {
                          ...prev[editingCategory],
                          expenseType: e.target.value
                        }
                      }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="operating">Operating Expense</option>
                      <option value="capital">Capital Expense</option>
                      <option value="startup">Startup Cost</option>
                      <option value="depreciation">Depreciation</option>
                      <option value="personal">Personal (Non-deductible)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h4 style={{
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  ⚙️ Advanced Settings
                </h4>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Auto-Categorization Keywords */}
                  <div>
                    <label style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem',
                      display: 'block'
                    }}>
                      Auto-Categorization Keywords (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., adobe, photoshop, design, studio"
                      value={(editingCategory && categorySettings[editingCategory]?.keywords) || ''}
                      onChange={(e) => setCategorySettings(prev => ({
                        ...prev,
                        [editingCategory]: {
                          ...prev[editingCategory],
                          keywords: e.target.value
                        }
                      }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.9rem'
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      Transactions containing these keywords will auto-assign to this category
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem',
                      display: 'block'
                    }}>
                      Notes & Tax Strategy
                    </label>
                    <textarea
                      placeholder="e.g., Track monthly software expenses, save receipts for audit, consider quarterly payments..."
                      value={categorySettings[editingCategory]?.notes || ''}
                      onChange={(e) => setCategorySettings(prev => ({
                        ...prev,
                        [editingCategory]: {
                          ...prev[editingCategory],
                          notes: e.target.value
                        }
                      }))}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '0.9rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setEditingCategory(null)}
                  style={{
                    padding: '1rem 2rem',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save category settings
                    // Development only logging
                    if (process.env.NODE_ENV === 'development') {
                      console.log('Saving category settings:', {
                        category: editingCategory,
                        settings: categorySettings[editingCategory]
                      });
                    }
                    setEditingCategory(null);
                  }}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  💾 Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
              🏦 Smart CSV Import
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Upload a CSV file from any bank. Our AI will automatically detect the format and map columns.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
              {csvFile && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#059669' }}>
                  ✓ {csvFile.name} loaded ({csvData.rows?.length || 0} transactions)
                </div>
              )}
            </div>

            {csvData.headers && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Column Mapping
                </label>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {['description', 'amount', 'date', 'account'].map(field => (
                    <div key={field} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', alignItems: 'center' }}>
                      <label style={{ textTransform: 'capitalize' }}>{field}:</label>
                      <select
                        value={columnMapping[field] || ''}
                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        style={{
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px'
                        }}
                      >
                        <option value="">Select column...</option>
                        {csvData.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Import Options
              </label>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={importOptions.skipDuplicates}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
                  />
                  Skip duplicate transactions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={importOptions.autoCategorize}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, autoCategorize: e.target.checked }))}
                  />
                  Auto-categorize based on description
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={importOptions.createRecurring}
                    onChange={(e) => setImportOptions(prev => ({ ...prev, createRecurring: e.target.checked }))}
                  />
                  Create retroactive recurring transactions
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Date Range (Optional)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="date"
                  placeholder="Start Date"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
                <input
                  type="date"
                  placeholder="End Date"
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCSVImport(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={processCSVImport}
                disabled={!csvFile || !columnMapping.description || !columnMapping.amount}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: (!csvFile || !columnMapping.description || !columnMapping.amount) ? '#9ca3af' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!csvFile || !columnMapping.description || !columnMapping.amount) ? 'not-allowed' : 'pointer'
                }}
              >
                Import Transactions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Categorization Modal */}
      {showAutoCategorization && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
              🤖 Smart Auto-Categorization
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Review proposed categorizations based on your transaction history and similar vendors.
            </p>

            {/* Proposed Changes */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  Proposed Changes ({autoCategorizeProposals.reduce((sum, p) => sum + p.count, 0)} transactions)
                </h4>
                {autoCategorizeProposals.length > 0 && (
                  <button
                    onClick={toggleAllProposals}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {selectedProposals.size === autoCategorizeProposals.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {autoCategorizeProposals.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  padding: '2rem',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px'
                }}>
                  No uncategorized transactions found or no suggestions available.
                </div>
              ) : (
                autoCategorizeProposals.map((proposal) => (
                  <div key={proposal.id} style={{
                    border: selectedProposals.has(proposal.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: selectedProposals.has(proposal.id) ? '#f0f9ff' : '#f9fafb',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleProposal(proposal.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedProposals.has(proposal.id)}
                            onChange={() => toggleProposal(proposal.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ fontWeight: '600' }}>
                            {proposal.vendor} ({proposal.count} transaction{proposal.count !== 1 ? 's' : ''})
                          </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          "{proposal.originalDescription}"
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                          {proposal.currentCategory} → <span style={{ color: '#059669', fontWeight: '600' }}>{proposal.proposedCategory}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                          {proposal.confidence}% confidence • {fmt(proposal.totalAmount)} total
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={applyAutoCategorization}
                  disabled={selectedProposals.size === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: selectedProposals.size === 0 ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: selectedProposals.size === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Apply Selected ({selectedProposals.size})
                </button>
                <button
                  onClick={() => setSelectedProposals(new Set())}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Reject All
                </button>
              </div>
              <button
                onClick={() => {
                  setShowAutoCategorization(false);
                  setAutoCategorizeProposals([]);
                  setSelectedProposals(new Set());
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Assignment Modal */}
      {showSmartAssignment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
              🎯 Smart Transaction Assignment
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Automatically assign tax categories to uncategorized transactions based on keywords and patterns.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Assignment Rules
              </label>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" defaultChecked />
                  Assign based on merchant keywords
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" defaultChecked />
                  Use transaction amount patterns
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" defaultChecked />
                  Consider transaction frequency
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" />
                  Override existing categories
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Confidence Threshold
              </label>
              <input
                type="range"
                min="50"
                max="100"
                defaultValue="85"
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280' }}>
                <span>50% (More assignments)</span>
                <span>85%</span>
                <span>100% (Only certain)</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Target Transactions
              </label>
              <select style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}>
                <option>All uncategorized transactions</option>
                <option>Last 30 days only</option>
                <option>Last 90 days only</option>
                <option>Selected transactions only</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSmartAssignment(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement smart assignment
                  alert('Smart assignment will be implemented here');
                  setShowSmartAssignment(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Run Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionAnalysis;