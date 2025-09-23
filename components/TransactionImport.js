import React from 'react';
import { fmt, logTransaction } from '../lib/utils';
import { notify } from './Notify';
import { IRS_TAX_CATEGORIES } from './dashboard/TaxSection';

export default function TransactionImport({ onClose, user, supabase, accounts }) {
  const [csvFile, setCsvFile] = React.useState(null);
  const [csvData, setCsvData] = React.useState([]);
  const [headers, setHeaders] = React.useState([]);
  const [fieldMapping, setFieldMapping] = React.useState({
    date: '',
    description: '',
    amount: '',
    category: '',
    account: ''
  });
  const [processingTransactions, setProcessingTransactions] = React.useState([]);
  const [importStats, setImportStats] = React.useState(null);
  const [step, setStep] = React.useState(1); // 1: Upload, 2: Map Fields, 3: Categorize, 4: Import

  // Smart categorization patterns
  const CATEGORY_PATTERNS = {
    'Groceries': ['grocery', 'supermarket', 'food', 'walmart', 'target', 'kroger', 'safeway', 'whole foods'],
    'Gas': ['gas', 'fuel', 'exxon', 'shell', 'bp', 'chevron', 'mobil'],
    'Restaurants': ['restaurant', 'cafe', 'pizza', 'mcdonalds', 'starbucks', 'subway', 'chipotle'],
    'Utilities': ['electric', 'gas company', 'water', 'internet', 'phone', 'cable', 'comcast', 'verizon'],
    'Transportation': ['uber', 'lyft', 'taxi', 'metro', 'bus', 'train', 'parking'],
    'Entertainment': ['netflix', 'spotify', 'movie', 'theater', 'concert', 'game'],
    'Healthcare': ['pharmacy', 'doctor', 'hospital', 'medical', 'cvs', 'walgreens'],
    'Shopping': ['amazon', 'ebay', 'mall', 'store', 'shop'],
    'Income': ['salary', 'paycheck', 'wage', 'payment received', 'deposit', 'income'],
    'Business Equipment': ['office', 'computer', 'software', 'equipment', 'supplies'],
    'Professional Services': ['legal', 'accounting', 'consulting', 'professional'],
    'Travel': ['hotel', 'airline', 'flight', 'airbnb', 'rental car', 'travel']
  };

  const TAX_CATEGORY_PATTERNS = {
    'Business Equipment': ['office', 'computer', 'equipment', 'supplies', 'desk', 'chair'],
    'Office Supplies': ['staples', 'office', 'supplies', 'paper', 'ink'],
    'Travel': ['hotel', 'airline', 'flight', 'airbnb', 'rental car', 'travel', 'uber', 'taxi'],
    'Meals & Entertainment': ['restaurant', 'cafe', 'lunch', 'dinner', 'client meal'],
    'Professional Services': ['legal', 'accounting', 'consulting', 'lawyer', 'accountant'],
    'Vehicle Expenses': ['gas', 'fuel', 'car', 'auto', 'maintenance', 'repair'],
    'Phone & Internet': ['phone', 'internet', 'cell', 'mobile', 'verizon', 'at&t'],
    'Software & Subscriptions': ['software', 'subscription', 'saas', 'adobe', 'microsoft'],
    'Medical Expenses': ['doctor', 'hospital', 'pharmacy', 'medical', 'health'],
    'Charitable Donations': ['donation', 'charity', 'church', 'nonprofit']
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {});
    });
    return { headers, data };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      notify('Please select a CSV file', 'error');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers, data } = parseCSV(e.target.result);
        setHeaders(headers);
        setCsvData(data);
        setStep(2);
        notify(`Loaded ${data.length} transactions from CSV`, 'success');
      } catch (error) {
        notify('Error parsing CSV file', 'error');
        console.error('CSV parse error:', error);
      }
    };
    reader.readAsText(file);
  };

  const smartCategorize = (description, amount) => {
    const desc = description.toLowerCase();
    const isExpense = amount < 0;

    // Check for income patterns first
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (patterns.some(pattern => desc.includes(pattern))) {
        return { category, taxCategory: 'None/Personal' };
      }
    }

    // For expenses, try to match tax categories
    if (isExpense) {
      for (const [taxCategory, patterns] of Object.entries(TAX_CATEGORY_PATTERNS)) {
        if (patterns.some(pattern => desc.includes(pattern))) {
          return { category: 'Business', taxCategory };
        }
      }
    }

    return { category: 'Other', taxCategory: 'None/Personal' };
  };

  const processTransactions = () => {
    const processed = csvData.map((row, index) => {
      const date = row[fieldMapping.date];
      const description = row[fieldMapping.description];
      const amount = parseFloat(row[fieldMapping.amount]);
      const category = row[fieldMapping.category];

      const { category: suggestedCategory, taxCategory } = smartCategorize(description, amount);

      return {
        id: `import-${index}`,
        date: new Date(date),
        description,
        amount,
        category: category || suggestedCategory,
        taxCategory,
        account: row[fieldMapping.account] || accounts[0]?.name || 'Unknown',
        isIncome: amount > 0,
        confirmed: false
      };
    }).filter(tx => !isNaN(tx.amount) && tx.description);

    setProcessingTransactions(processed);
    setStep(3);
  };

  const updateTransaction = (index, field, value) => {
    setProcessingTransactions(prev =>
      prev.map((tx, i) => i === index ? { ...tx, [field]: value } : tx)
    );
  };

  const confirmTransaction = (index) => {
    setProcessingTransactions(prev =>
      prev.map((tx, i) => i === index ? { ...tx, confirmed: !tx.confirmed } : tx)
    );
  };

  const importTransactions = async () => {
    const confirmedTransactions = processingTransactions.filter(tx => tx.confirmed);

    if (confirmedTransactions.length === 0) {
      notify('Please confirm at least one transaction to import', 'error');
      return;
    }

    setStep(4);
    let successCount = 0;
    let errorCount = 0;

    for (const tx of confirmedTransactions) {
      try {
        const transactionId = crypto.randomUUID();
        await logTransaction(
          supabase,
          user.id,
          tx.isIncome ? 'income_received' : 'expense_paid',
          transactionId,
          {
            description: tx.description,
            amount: Math.abs(tx.amount),
            category: tx.category,
            taxCategory: tx.taxCategory,
            account: tx.account,
            importedFrom: 'csv'
          },
          `Imported: ${tx.description} - ${fmt(tx.amount)}`
        );
        successCount++;
      } catch (error) {
        console.error('Import error:', error);
        errorCount++;
      }
    }

    setImportStats({ successCount, errorCount, total: confirmedTransactions.length });

    if (successCount > 0) {
      notify(`Successfully imported ${successCount} transactions!`, 'success');
    }
    if (errorCount > 0) {
      notify(`Failed to import ${errorCount} transactions`, 'error');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '1rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', padding: '1.5rem', borderRadius: '1rem 1rem 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
              📊 Import Transactions
            </h2>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.375rem', color: 'white', padding: '0.5rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
            Step {step} of 4: {
              step === 1 ? 'Upload CSV File' :
              step === 2 ? 'Map CSV Fields' :
              step === 3 ? 'Review & Categorize' :
              'Import Complete'
            }
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Step 1: File Upload */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Upload CSV File</h3>
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center' }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ marginBottom: '1rem' }}
                />
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Upload a CSV file with your transaction data. Supports exports from banks, Wave, QuickBooks, and other financial platforms.
                </p>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                  Expected columns: Date, Description, Amount, Category (optional)
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Field Mapping */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Map CSV Fields</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Map your CSV columns to the required fields:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {Object.entries({
                  date: 'Date *',
                  description: 'Description *',
                  amount: 'Amount *',
                  category: 'Category',
                  account: 'Account'
                }).map(([field, label]) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      {label}
                    </label>
                    <select
                      value={fieldMapping[field]}
                      onChange={(e) => setFieldMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                    >
                      <option value="">Select column</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                >
                  Back
                </button>
                <button
                  onClick={processTransactions}
                  disabled={!fieldMapping.date || !fieldMapping.description || !fieldMapping.amount}
                  style={{
                    padding: '0.5rem 1rem',
                    background: (!fieldMapping.date || !fieldMapping.description || !fieldMapping.amount) ? '#9ca3af' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: (!fieldMapping.date || !fieldMapping.description || !fieldMapping.amount) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Process Transactions
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Categorize */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                Review & Categorize Transactions ({processingTransactions.length} found)
              </h3>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  ✨ Smart categorization applied! Review and adjust categories and tax classifications as needed.
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                {processingTransactions.map((tx, index) => (
                  <div key={tx.id} style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e5e7eb',
                    background: tx.confirmed ? '#f0fdf4' : 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={tx.confirmed}
                        onChange={() => confirmTransaction(index)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{tx.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {tx.date.toLocaleDateString()} • {fmt(tx.amount)} • {tx.isIncome ? 'Income' : 'Expense'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Category</label>
                        <select
                          value={tx.category}
                          onChange={(e) => updateTransaction(index, 'category', e.target.value)}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        >
                          <option value="Groceries">Groceries</option>
                          <option value="Gas">Gas</option>
                          <option value="Restaurants">Restaurants</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Income">Income</option>
                          <option value="Business">Business</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Tax Category</label>
                        <select
                          value={tx.taxCategory}
                          onChange={(e) => updateTransaction(index, 'taxCategory', e.target.value)}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                        >
                          {IRS_TAX_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    const allConfirmed = processingTransactions.map((_, i) => {
                      confirmTransaction(i);
                      return true;
                    });
                  }}
                  style={{ padding: '0.5rem 1rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                >
                  Select All
                </button>
                <button
                  onClick={importTransactions}
                  style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.375rem' }}
                >
                  Import Selected ({processingTransactions.filter(tx => tx.confirmed).length})
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Import Complete */}
          {step === 4 && importStats && (
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#059669' }}>
                ✅ Import Complete!
              </h3>

              <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#059669', marginBottom: '0.5rem' }}>
                  {importStats.successCount} / {importStats.total} transactions imported
                </div>
                {importStats.errorCount > 0 && (
                  <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                    {importStats.errorCount} transactions failed to import
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                style={{ padding: '0.75rem 1.5rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}