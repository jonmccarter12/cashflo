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

export default function TaxSection({ isMobile, transactions, bills, oneTimeCosts }) {
  const [annualIncome, setAnnualIncome] = React.useState('');
  const [filingStatus, setFilingStatus] = React.useState('single');
  const [totalWithholdings, setTotalWithholdings] = React.useState('');
  const [estimatedQuarterlyPaid, setEstimatedQuarterlyPaid] = React.useState('');

  // Calculate deductible expenses from tracked bills and one-time costs
  const calculateDeductibleExpenses = () => {
    let total = 0;

    // Add bills with categories (excluding 'None/Personal')
    bills.forEach(bill => {
      if (bill.taxCategory && bill.taxCategory !== 'None/Personal') {
        // Estimate annual amount based on frequency
        let annualAmount = 0;
        if (bill.frequency === 'monthly') annualAmount = bill.amount * 12;
        else if (bill.frequency === 'weekly') annualAmount = bill.amount * 52;
        else if (bill.frequency === 'biweekly') annualAmount = bill.amount * 26;
        else if (bill.frequency === 'yearly') annualAmount = bill.amount;
        total += annualAmount;
      }
    });

    // Add one-time costs with categories
    oneTimeCosts.forEach(cost => {
      if (cost.taxCategory && cost.taxCategory !== 'None/Personal') {
        total += cost.amount;
      }
    });

    return total;
  };

  // Tax brackets for 2024 (simplified)
  const calculateTax = () => {
    const income = Number(annualIncome) || 0;
    const deductions = calculateDeductibleExpenses();
    const standardDeduction = filingStatus === 'single' ? 14600 : 29200; // 2024 amounts

    const totalDeductions = Math.max(standardDeduction, deductions);
    const taxableIncome = Math.max(0, income - totalDeductions);

    let tax = 0;

    if (filingStatus === 'single') {
      // 2024 Single filer brackets (simplified)
      if (taxableIncome > 609350) tax += (taxableIncome - 609350) * 0.37;
      if (taxableIncome > 243725) tax += Math.min(taxableIncome - 243725, 609350 - 243725) * 0.35;
      if (taxableIncome > 191050) tax += Math.min(taxableIncome - 191050, 243725 - 191050) * 0.32;
      if (taxableIncome > 100525) tax += Math.min(taxableIncome - 100525, 191050 - 100525) * 0.24;
      if (taxableIncome > 47150) tax += Math.min(taxableIncome - 47150, 100525 - 47150) * 0.22;
      if (taxableIncome > 11000) tax += Math.min(taxableIncome - 11000, 47150 - 11000) * 0.12;
      if (taxableIncome > 0) tax += Math.min(taxableIncome, 11000) * 0.10;
    } else {
      // Married filing jointly (simplified)
      if (taxableIncome > 731200) tax += (taxableIncome - 731200) * 0.37;
      if (taxableIncome > 487450) tax += Math.min(taxableIncome - 487450, 731200 - 487450) * 0.35;
      if (taxableIncome > 383900) tax += Math.min(taxableIncome - 383900, 487450 - 383900) * 0.32;
      if (taxableIncome > 201050) tax += Math.min(taxableIncome - 201050, 383900 - 201050) * 0.24;
      if (taxableIncome > 94300) tax += Math.min(taxableIncome - 94300, 201050 - 94300) * 0.22;
      if (taxableIncome > 22000) tax += Math.min(taxableIncome - 22000, 94300 - 22000) * 0.12;
      if (taxableIncome > 0) tax += Math.min(taxableIncome, 22000) * 0.10;
    }

    const withholdings = Number(totalWithholdings) || 0;
    const quarterlyPaid = Number(estimatedQuarterlyPaid) || 0;
    const totalPaid = withholdings + quarterlyPaid;

    return {
      taxableIncome,
      totalDeductions,
      deductibleExpenses: deductions,
      standardDeduction,
      calculatedTax: tax,
      totalPaid,
      refundOrOwed: totalPaid - tax
    };
  };

  const taxCalc = calculateTax();
  const deductibleExpenses = calculateDeductibleExpenses();

  const selectAllOnFocus = (e) => e.target.select();

  return (
    <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', color: '#000', marginBottom: '1rem' }}>
        📊 Tax Estimator & Deductions
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        {/* Tax Calculator Section */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
            Tax Refund/Owed Estimator
          </h4>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Annual Income:
            </label>
            <input
              type="number"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder="Enter annual income"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

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
              <option value="married">Married Filing Jointly</option>
            </select>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              Total Tax Withholdings (W-2, 1099s):
            </label>
            <input
              type="number"
              value={totalWithholdings}
              onChange={(e) => setTotalWithholdings(e.target.value)}
              onFocus={selectAllOnFocus}
              placeholder="Enter total withholdings"
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
              placeholder="Enter quarterly payments"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>
        </div>

        {/* Tax Calculation Results */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
            Tax Calculation Results
          </h4>

          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Annual Income:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(Number(annualIncome) || 0)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tracked Deductible Expenses:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>{fmt(deductibleExpenses)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Standard Deduction:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.standardDeduction)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Deductions:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.totalDeductions)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Taxable Income:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.taxableIncome)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Calculated Tax:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.calculatedTax)}</span>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Paid:</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{fmt(taxCalc.totalPaid)}</span>
            </div>

            <hr style={{ margin: '0.75rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                {taxCalc.refundOrOwed >= 0 ? 'Estimated Refund:' : 'Estimated Owed:'}
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
            * This is a simplified estimate. Consult a tax professional for accurate calculations.
            {deductibleExpenses > taxCalc.standardDeduction && (
              <div style={{ marginTop: '0.25rem', color: '#059669' }}>
                💡 Your tracked deductible expenses exceed the standard deduction by {fmt(deductibleExpenses - taxCalc.standardDeduction)}!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}