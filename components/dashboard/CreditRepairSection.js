import React from 'react';
import { fmt } from '../../lib/utils';
import { notify } from '../Notify';
import {
  MOCK_CREDIT_DATA,
  analyzeCreditReport,
  connectToCreditBureau,
  fetchLiveCreditScore,
  setupCreditMonitoring,
  simulateCreditImprovement,
  CREDIT_BUREAU_APIS
} from '../../lib/creditApis';

// AI-powered credit analysis engine
const AI_CREDIT_ANALYZER = {
  analyzeAccount: (account) => {
    const issues = [];
    const utilization = account.creditLimit > 0 ? (account.balance / account.creditLimit) * 100 : 0;

    if (utilization > 90) issues.push({ type: 'critical', message: 'Extremely high utilization - immediate action required' });
    else if (utilization > 50) issues.push({ type: 'warning', message: 'High utilization affecting credit score' });

    if (account.latePayments > 0) issues.push({ type: 'negative', message: `${account.latePayments} late payment(s) detected` });
    if (account.status === 'closed') issues.push({ type: 'info', message: 'Closed account - consider keeping for credit history' });

    return issues;
  },

  generateDisputes: (accounts) => {
    const disputes = [];
    accounts.forEach(account => {
      if (account.errorType) {
        disputes.push({
          account: account.name,
          type: account.errorType,
          priority: account.errorSeverity || 'medium',
          template: AI_CREDIT_ANALYZER.selectTemplate(account.errorType)
        });
      }
    });
    return disputes;
  },

  selectTemplate: (errorType) => {
    const templates = {
      'inaccurate_balance': 'inaccurate_info',
      'wrong_payment_history': 'inaccurate_info',
      'not_mine': 'identity_theft',
      'collection_error': 'debt_validation',
      'late_payment': 'goodwill_letter'
    };
    return templates[errorType] || 'inaccurate_info';
  },

  scoreImpactCalculator: (accounts) => {
    let impact = 0;
    accounts.forEach(account => {
      const utilization = account.creditLimit > 0 ? (account.balance / account.creditLimit) * 100 : 0;
      if (utilization > 30) impact -= (utilization - 30) * 2;
      if (account.latePayments > 0) impact -= account.latePayments * 15;
    });
    return Math.max(-200, Math.min(0, impact));
  }
};

// Advanced credit optimization recommendations
const CREDIT_OPTIMIZER = {
  getRecommendations: (accounts, transactions) => {
    const recommendations = [];
    const totalUtilization = AI_CREDIT_ANALYZER.scoreImpactCalculator(accounts);

    if (totalUtilization < -50) {
      recommendations.push({
        priority: 'high',
        action: 'Pay down credit cards immediately',
        impact: '+50-100 points',
        timeframe: '1-2 months'
      });
    }

    recommendations.push({
      priority: 'medium',
      action: 'Request credit limit increases',
      impact: '+20-40 points',
      timeframe: '1 month'
    });

    return recommendations;
  }
};

// Professional dispute letter templates that actually work
const DISPUTE_TEMPLATES = {
  inaccurate_info: {
    title: 'Inaccurate Information Dispute',
    template: `Re: Dispute of Inaccurate Information - [ACCOUNT_NUMBER]

Dear [BUREAU_NAME],

I am writing to dispute the following information in my file:

Account Name: [CREDITOR_NAME]
Account Number: [ACCOUNT_NUMBER]
Dispute Reason: [DISPUTE_REASON]

This item is inaccurate because [SPECIFIC_REASON]. I have never had this account/This information is incorrect/This debt is not mine.

Under the Fair Credit Reporting Act (FCRA), I have the right to dispute inaccurate information. Please investigate this matter and remove or correct this information within 30 days.

Enclosed are supporting documents that verify my claim:
[DOCUMENT_LIST]

Please send me written confirmation of the results of your investigation.

Sincerely,
[FULL_NAME]
[ADDRESS]
[PHONE]
Date: [DATE]`
  },
  debt_validation: {
    title: 'Debt Validation Request',
    template: `Re: Debt Validation Request - Account [ACCOUNT_NUMBER]

Dear [COLLECTOR_NAME],

This letter is being sent to you in response to a notice I received indicating that I allegedly owe a debt to you. This is not a refusal to pay, but a notice sent pursuant to the Fair Debt Collection Practices Act, 15 USC 1692g Sec. 809 (b).

I am requesting validation of this debt. Please provide:

1. Proof that you own this debt or have been assigned this debt
2. Copy of the original signed agreement/contract
3. Complete payment history from the original creditor
4. Proof that the statute of limitations has not expired
5. Copy of your license to collect debts in my state

Until you provide proper validation, you must:
- Cease all collection activities
- Report nothing to credit bureaus
- Not contact me except to provide the requested validation

Failure to comply with this request within 30 days will be considered acceptance that this debt is invalid.

Sincerely,
[FULL_NAME]
[ADDRESS]
Date: [DATE]

IMPORTANT: This communication is from a consumer. This request is made pursuant to 15 USC 1692g.`
  },
  goodwill_letter: {
    title: 'Goodwill Letter for Late Payment',
    template: `Re: Goodwill Request - Account [ACCOUNT_NUMBER]

Dear [CREDITOR_NAME],

I am writing to request your consideration in removing a late payment notation on my credit report for account [ACCOUNT_NUMBER].

I have been a loyal customer for [RELATIONSHIP_LENGTH] and have maintained a positive payment history except for this isolated incident. The late payment occurred due to [REASON] and does not reflect my typical payment behavior.

Since this incident, I have:
- Made all payments on time
- [ADDITIONAL_POSITIVE_ACTIONS]

I would be extremely grateful if you would consider removing this negative mark as a gesture of goodwill. I value our relationship and plan to continue being a responsible customer.

Please consider this request favorably. I can be reached at [PHONE] if you need any additional information.

Thank you for your time and consideration.

Sincerely,
[FULL_NAME]
[ADDRESS]
Date: [DATE]`
  },
  identity_theft: {
    title: 'Identity Theft Dispute',
    template: `Re: Identity Theft Dispute - [ACCOUNT_NUMBER]

Dear [BUREAU_NAME],

I am a victim of identity theft and am disputing the following fraudulent account(s) on my credit report:

Account Name: [CREDITOR_NAME]
Account Number: [ACCOUNT_NUMBER]

This account was opened fraudulently and is not mine. I have filed a police report (Report #[POLICE_REPORT_NUMBER]) and have enclosed a copy.

Under the Fair Credit Reporting Act, I request that you:
1. Block this fraudulent information immediately
2. Investigate and remove all related information
3. Provide written confirmation of removal

Enclosed documents:
- Copy of police report
- FTC Identity Theft Report
- Copy of ID

This is a serious matter involving identity theft. Please handle this dispute with urgency.

Sincerely,
[FULL_NAME]
[ADDRESS]
[PHONE]
Date: [DATE]`
  },
  method_of_verification: {
    title: 'Method of Verification Request',
    template: `Re: Method of Verification Request - [ACCOUNT_NUMBER]

Dear [BUREAU_NAME],

I recently received your response to my dispute dated [DISPUTE_DATE]. You indicated that the information was "verified" but failed to provide the method of verification as required by law.

Under FCRA Section 611(a)(7), I have the right to know the specific method used to verify this information. Please provide:

1. The specific method of verification used
2. Name and address of the source that verified the information
3. Copy of all documents received during verification

Account in question:
- Creditor: [CREDITOR_NAME]
- Account Number: [ACCOUNT_NUMBER]

Please provide this information within 15 days as required by law.

Sincerely,
[FULL_NAME]
[ADDRESS]
Date: [DATE]`
  },
  cease_and_desist: {
    title: 'Cease and Desist Letter',
    template: `CEASE AND DESIST NOTICE
Re: Account [ACCOUNT_NUMBER] - [CREDITOR_NAME]

TO: [DEBT_COLLECTOR_NAME]
[COLLECTOR_ADDRESS]

This letter serves as your formal notice under the Fair Debt Collection Practices Act (FDCPA) 15 USC 1692c that your services are no longer desired.

You are hereby notified that I am invoking my right under 15 USC 1692c Sec. 805(c) to cease and desist all communication with me and my family regarding this alleged debt.

This includes but is not limited to:
• Phone calls to my home, work, or mobile phone
• Text messages
• Emails
• Letters or postcards
• Contact with third parties about this debt
• Any reporting to credit bureaus

The only acceptable communications are:
1. Notification that your efforts are being terminated
2. Notification of specific legal action you intend to take

Any continued communication will be considered harassment and reported to:
- Federal Trade Commission
- Consumer Financial Protection Bureau
- State Attorney General
- State licensing board

This letter does not constitute acknowledgment of any debt.

Date: [DATE]
[FULL_NAME]
[ADDRESS]

CERTIFIED MAIL REQUESTED`
  },
  pay_for_delete: {
    title: 'Pay for Delete Agreement',
    template: `Re: Pay for Delete Agreement - Account [ACCOUNT_NUMBER]

Dear [COLLECTOR_NAME],

I am writing to propose a "pay for delete" agreement regarding the above-referenced account.

I am willing to pay $[SETTLEMENT_AMOUNT] (XX% of the reported balance) in full settlement of this account in exchange for your agreement to delete all references to this account from my credit reports with all three major credit bureaus.

Terms of Agreement:
• Payment amount: $[SETTLEMENT_AMOUNT]
• Payment method: [PAYMENT_METHOD]
• Payment due date: [PAYMENT_DATE]
• Complete deletion from Experian, Equifax, and TransUnion within 30 days

This offer is contingent upon:
1. Written agreement to delete before payment
2. No future collection attempts
3. Account reported as "paid in full" if deletion is not possible

Please respond in writing within 10 days if you accept these terms. This offer expires on [EXPIRATION_DATE].

This communication is an attempt to collect on a debt and any information obtained will be used for that purpose.

Sincerely,
[FULL_NAME]
[ADDRESS]
Date: [DATE]`
  },
  medical_debt_dispute: {
    title: 'Medical Debt Dispute',
    template: `Re: Medical Debt Dispute - Account [ACCOUNT_NUMBER]

Dear [BUREAU_NAME],

I am disputing the medical debt listed on my credit report for the following reasons:

Account: [MEDICAL_PROVIDER]
Account Number: [ACCOUNT_NUMBER]
Amount: $[AMOUNT]

Dispute Reason: [SELECT_REASON]
☐ Insurance should have covered this bill
☐ Bill was paid in full
☐ Services were not received
☐ Billing error by medical provider
☐ Duplicate billing
☐ Amount is incorrect

Medical debts have special protections under the FCRA. This debt should not be reported because:
• It was not provided in the proper format
• The 180-day waiting period was not observed
• Insurance processing was incomplete

I request immediate removal of this item as it violates medical debt reporting requirements.

Enclosed: [SUPPORTING_DOCUMENTS]

Please provide written confirmation of deletion within 30 days.

Sincerely,
[FULL_NAME]
[ADDRESS]
Date: [DATE]`
  },
  statute_of_limitations: {
    title: 'Statute of Limitations Defense',
    template: `Re: Time-Barred Debt - Account [ACCOUNT_NUMBER]

Dear [COLLECTOR_NAME],

Your recent communication regarding the above account is acknowledged. However, I believe this debt is beyond the statute of limitations for collection in [STATE].

According to [STATE] law, the statute of limitations for [DEBT_TYPE] is [YEARS] years. The last payment or activity on this account was [LAST_ACTIVITY_DATE], making this debt time-barred.

Under the Fair Debt Collection Practices Act, it is unlawful to:
• Sue or threaten to sue on a time-barred debt
• Use deceptive means to collect a time-barred debt
• Report time-barred debt to credit bureaus

I am not waiving the statute of limitations defense. Any continued collection efforts may constitute violations of the FDCPA.

If you believe this debt is not time-barred, please provide:
1. Legal proof that the statute has not expired
2. Documentation of any payments that would restart the clock
3. Copy of the original signed agreement

This is not an acknowledgment of the debt or a promise to pay.

Sincerely,
[FULL_NAME]
[ADDRESS]
Date: [DATE]`
  },
  credit_mix_optimization: {
    title: 'Credit Mix Enhancement Request',
    template: `Re: Credit Portfolio Enhancement - [CUSTOMER_NUMBER]

Dear [CREDITOR_NAME],

I am writing to request assistance in optimizing my credit profile. As a valued customer with [RELATIONSHIP_LENGTH] of positive history, I would like to explore options to enhance my credit mix.

Current Request: [SELECT_REQUEST]
☐ Convert secured card to unsecured
☐ Product change to different card type
☐ Add installment loan option
☐ Credit limit increase
☐ Additional credit line

My credit goals include:
• Improving credit score through diverse account types
• Demonstrating responsible credit management
• Building long-term financial relationship

Recent positive changes:
• Consistent on-time payments for [PAYMENT_HISTORY]
• Reduced utilization to [UTILIZATION]%
• Increased income to $[INCOME]

I believe these improvements warrant consideration for the requested enhancement. Please review my account and contact me to discuss available options.

Thank you for your consideration.

Sincerely,
[FULL_NAME]
[PHONE]
Date: [DATE]`
  }
};

// Credit bureau contact information
const CREDIT_BUREAUS = {
  experian: {
    name: 'Experian',
    address: 'P.O. Box 4500\nAllen, TX 75013',
    online: 'https://www.experian.com/disputes',
    phone: '1-888-397-3742'
  },
  equifax: {
    name: 'Equifax',
    address: 'P.O. Box 740256\nAtlanta, GA 30374',
    online: 'https://www.equifax.com/personal/credit-report-services',
    phone: '1-800-685-1111'
  },
  transunion: {
    name: 'TransUnion',
    address: 'P.O. Box 2000\nChester, PA 19016',
    online: 'https://www.transunion.com/credit-disputes',
    phone: '1-800-916-8800'
  }
};

export default function CreditRepairSection({ isMobile, accounts, transactions, user }) {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [selectedDispute, setSelectedDispute] = React.useState(null);
  const [disputeForm, setDisputeForm] = React.useState({
    bureaus: [],
    creditorName: '',
    accountNumber: '',
    disputeReason: '',
    specificReason: '',
    documentList: '',
    fullName: '',
    address: '',
    phone: '',
    relationshipLength: '',
    reason: '',
    additionalActions: '',
    policeReportNumber: ''
  });
  const [creditGoals, setCreditGoals] = React.useState({
    targetScore: '',
    timeframe: '',
    primaryGoal: ''
  });
  const [userProfile, setUserProfile] = React.useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    ssn: '', // Last 4 digits only for security
    dateOfBirth: ''
  });
  const [creditReportData, setCreditReportData] = React.useState(null);
  const [realCreditData, setRealCreditData] = React.useState(null);
  const [aiAnalysis, setAiAnalysis] = React.useState(null);
  const [autoDisputes, setAutoDisputes] = React.useState([]);
  const [creditPlan, setCreditPlan] = React.useState(null);
  const [creditConnection, setCreditConnection] = React.useState({
    experian: { connected: false, loading: false },
    equifax: { connected: false, loading: false },
    transunion: { connected: false, loading: false }
  });
  const [liveScores, setLiveScores] = React.useState({});
  const [creditMonitoring, setCreditMonitoring] = React.useState(false);

  // Load saved profile data
  React.useEffect(() => {
    const savedProfile = localStorage.getItem('creditRepairProfile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error('Error loading saved profile:', error);
      }
    }

    // Load real credit data (for demo, we'll use mock data)
    // In production, this would check for saved API credentials and fetch real data
    const loadCreditData = async () => {
      try {
        setRealCreditData(MOCK_CREDIT_DATA);
        const analysis = analyzeCreditReport(MOCK_CREDIT_DATA);
        setAiAnalysis(analysis);
      } catch (error) {
        console.error('Error loading credit data:', error);
      }
    };

    loadCreditData();
  }, []);

  // Real credit bureau connection function
  const connectToBureau = async (bureau) => {
    setCreditConnection(prev => ({
      ...prev,
      [bureau]: { ...prev[bureau], loading: true }
    }));

    try {
      // Check if user profile is complete
      if (!userProfile.ssn || !userProfile.dateOfBirth || !userProfile.fullName) {
        notify('Please complete your profile information first (SSN, DOB, Full Name required)', 'error');
        setCreditConnection(prev => ({
          ...prev,
          [bureau]: { connected: false, loading: false }
        }));
        return;
      }

      const result = await connectToCreditBureau(bureau, userProfile);

      setCreditConnection(prev => ({
        ...prev,
        [bureau]: { connected: result.success, loading: false }
      }));

      if (result.success) {
        // Update credit data with real information
        setCreditData(result.data);

        // Fetch live score
        const scoreData = await fetchLiveCreditScore(bureau, userProfile);
        setLiveScores(prev => ({
          ...prev,
          [bureau]: scoreData
        }));

        notify(`Successfully connected to ${bureau}! ${result.source === 'sample' ? 'Using sample data.' : 'Live credit data loaded.'}`, result.source === 'sample' ? 'warning' : 'success');
      } else {
        notify(`Unable to connect to ${bureau}: ${result.message}`, 'warning');
      }
    } catch (error) {
      setCreditConnection(prev => ({
        ...prev,
        [bureau]: { connected: false, loading: false }
      }));
      notify(`Failed to connect to ${bureau}. Please check your credentials.`, 'error');
    }
  };

  // Credit Karma style multi-bureau pull (2 of 3 bureaus)
  const pullMultiBureauCredit = async () => {
    // Check if user profile is complete
    if (!userProfile.ssn || !userProfile.dateOfBirth || !userProfile.fullName) {
      notify('Please complete your profile information first (SSN, DOB, Full Name required)', 'error');
      return;
    }

    const bureaus = ['experian', 'equifax', 'transunion'];
    const pullPromises = [];
    let successfulPulls = 0;

    notify('Connecting to credit bureaus... This may take a moment.', 'info');

    // Set all bureaus to loading
    bureaus.forEach(bureau => {
      setCreditConnection(prev => ({
        ...prev,
        [bureau]: { ...prev[bureau], loading: true }
      }));
    });

    // Try to connect to all 3 bureaus (Credit Karma style)
    for (const bureau of bureaus) {
      try {
        const result = await connectToCreditBureau(bureau, userProfile);

        setCreditConnection(prev => ({
          ...prev,
          [bureau]: { connected: result.success, loading: false }
        }));

        if (result.success) {
          successfulPulls++;
          // Merge credit data from multiple sources
          setCreditData(prevData => ({
            ...prevData,
            ...result.data,
            creditScores: {
              ...prevData.creditScores,
              ...result.data.creditScores
            },
            accounts: [...(prevData.accounts || []), ...(result.data.accounts || [])],
            inquiries: [...(prevData.inquiries || []), ...(result.data.inquiries || [])]
          }));

          // Fetch live score for this bureau
          const scoreData = await fetchLiveCreditScore(bureau, userProfile);
          setLiveScores(prev => ({
            ...prev,
            [bureau]: scoreData
          }));
        }
      } catch (error) {
        console.error(`Failed to connect to ${bureau}:`, error);
        setCreditConnection(prev => ({
          ...prev,
          [bureau]: { connected: false, loading: false }
        }));
      }
    }

    // Report results
    if (successfulPulls >= 2) {
      notify(`Successfully connected to ${successfulPulls} credit bureaus! Your credit profile has been updated.`, 'success');
    } else if (successfulPulls === 1) {
      notify(`Connected to 1 credit bureau. Some data may be limited.`, 'warning');
    } else {
      notify(`Unable to connect to credit bureaus at this time. Using sample data for demonstration.`, 'error');
    }
  };

  // Setup credit monitoring
  const enableCreditMonitoring = async () => {
    try {
      const result = await setupCreditMonitoring({
        frequency: 'daily',
        alertTypes: ['score_changes', 'new_accounts', 'inquiries', 'new_collections'],
        bureaus: ['experian', 'equifax', 'transunion']
      });

      if (result.success) {
        setCreditMonitoring(true);
        notify('Credit monitoring activated! You\'ll receive alerts for any changes.', 'success');
      }
    } catch (error) {
      notify('Failed to setup credit monitoring. Please try again.', 'error');
    }
  };

  // AI-powered analysis and recommendations
  React.useEffect(() => {
    if (accounts.length > 0) {
      const analysis = {
        scoreImpact: AI_CREDIT_ANALYZER.scoreImpactCalculator(accounts),
        issues: accounts.flatMap(acc => AI_CREDIT_ANALYZER.analyzeAccount(acc)),
        disputes: AI_CREDIT_ANALYZER.generateDisputes(accounts),
        recommendations: CREDIT_OPTIMIZER.getRecommendations(accounts, transactions)
      };
      setAiAnalysis(analysis);
      setAutoDisputes(analysis.disputes);

      // Generate personalized credit plan
      const plan = {
        currentScore: 650 + Math.max(0, analysis.scoreImpact),
        potentialScore: 750,
        timeToTarget: Math.max(3, Math.abs(analysis.scoreImpact / 20)),
        keyActions: analysis.recommendations.slice(0, 3)
      };
      setCreditPlan(plan);
    }
  }, [accounts, transactions]);

  // Simulate credit report data (in real app, this would come from bureau APIs)
  const sampleCreditData = {
    currentScore: 650,
    previousScore: 630,
    accounts: [
      {
        id: 1,
        creditor: 'Capital One',
        accountNumber: '****1234',
        type: 'Credit Card',
        status: 'Open',
        balance: 2500,
        limit: 5000,
        paymentHistory: 'Current',
        dateOpened: '2019-05',
        issues: []
      },
      {
        id: 2,
        creditor: 'Chase Bank',
        accountNumber: '****5678',
        type: 'Auto Loan',
        status: 'Closed',
        balance: 0,
        originalAmount: 25000,
        paymentHistory: '1 Late Payment',
        dateOpened: '2018-03',
        issues: ['Late payment reported incorrectly']
      },
      {
        id: 3,
        creditor: 'Collections Agency ABC',
        accountNumber: '****9999',
        type: 'Collection',
        status: 'Open',
        balance: 1200,
        originalAmount: 800,
        paymentHistory: 'Collection',
        dateOpened: '2021-08',
        issues: ['Debt not validated', 'Incorrect balance']
      }
    ],
    inquiries: [
      { creditor: 'Credit One', date: '2024-01-15', type: 'Hard' },
      { creditor: 'Discover', date: '2024-02-20', type: 'Hard' }
    ],
    negativeItems: 3,
    positiveItems: 8
  };

  const generateDisputeLetter = () => {
    if (!selectedDispute) return '';

    let template = DISPUTE_TEMPLATES[selectedDispute].template;

    // Replace placeholders with actual data
    const fullAddress = `${userProfile.address}\n${userProfile.city}, ${userProfile.state} ${userProfile.zipCode}`;
    const replacements = {
      '[BUREAU_NAME]': disputeForm.bureaus.join(', '),
      '[CREDITOR_NAME]': disputeForm.creditorName,
      '[ACCOUNT_NUMBER]': disputeForm.accountNumber,
      '[DISPUTE_REASON]': disputeForm.disputeReason,
      '[SPECIFIC_REASON]': disputeForm.specificReason,
      '[DOCUMENT_LIST]': disputeForm.documentList,
      '[FULL_NAME]': userProfile.fullName || disputeForm.fullName,
      '[ADDRESS]': fullAddress || disputeForm.address,
      '[PHONE]': userProfile.phone || disputeForm.phone,
      '[EMAIL]': userProfile.email,
      '[DATE]': new Date().toLocaleDateString(),
      '[COLLECTOR_NAME]': disputeForm.creditorName,
      '[DEBT_COLLECTOR_NAME]': disputeForm.creditorName,
      '[COLLECTOR_ADDRESS]': '', // To be filled manually
      '[RELATIONSHIP_LENGTH]': disputeForm.relationshipLength,
      '[REASON]': disputeForm.reason,
      '[ADDITIONAL_POSITIVE_ACTIONS]': disputeForm.additionalActions,
      '[POLICE_REPORT_NUMBER]': disputeForm.policeReportNumber,
      '[DISPUTE_DATE]': new Date().toLocaleDateString(),
      '[STATE]': userProfile.state,
      '[SSN_LAST_4]': userProfile.ssn,
      '[DATE_OF_BIRTH]': userProfile.dateOfBirth
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      template = template.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || placeholder);
    });

    return template;
  };

  const downloadLetter = () => {
    const letter = generateDisputeLetter();
    const blob = new Blob([letter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${DISPUTE_TEMPLATES[selectedDispute].title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Dispute letter downloaded successfully!', 'success');
  };

  const ScoreGauge = ({ score, previousScore }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const scorePercentage = (score - 300) / (850 - 300); // Credit scores range 300-850
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (scorePercentage * circumference);

    const getScoreColor = (score) => {
      if (score >= 740) return '#059669'; // Excellent
      if (score >= 670) return '#16a34a'; // Good
      if (score >= 580) return '#ca8a04'; // Fair
      if (score >= 500) return '#ea580c'; // Poor
      return '#dc2626'; // Very Poor
    };

    const getScoreLabel = (score) => {
      if (score >= 740) return 'Excellent';
      if (score >= 670) return 'Good';
      if (score >= 580) return 'Fair';
      if (score >= 500) return 'Poor';
      return 'Very Poor';
    };

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke={getScoreColor(score)}
              strokeWidth="8"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: getScoreColor(score) }}>
              {score}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {getScoreLabel(score)}
            </div>
            {previousScore && (
              <div style={{ fontSize: '0.75rem', color: score > previousScore ? '#059669' : '#dc2626' }}>
                {score > previousScore ? '↗' : '↘'} {Math.abs(score - previousScore)} pts
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const creditData = realCreditData || creditReportData || sampleCreditData;

  return (
    <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <h3 style={{ fontSize: isMobile ? '1rem' : '1.125rem', fontWeight: '600', color: '#000', marginBottom: '1rem' }}>
        🏆 Credit Repair Center - Professional Grade
      </h3>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'profile', label: '👤 Profile Setup', icon: '👤' },
          { id: 'disputes', label: '⚖️ Dispute Center', icon: '⚖️' },
          { id: 'monitoring', label: '📈 Monitoring', icon: '📈' },
          { id: 'builder', label: '🏗️ Credit Builder', icon: '🏗️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1rem',
              background: activeTab === tab.id ? '#8b5cf6' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              flex: 1,
              textAlign: 'center'
            }}
          >
            {isMobile ? tab.icon : tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <ScoreGauge score={creditData.currentScore} previousScore={creditData.previousScore} />

            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Credit Health Summary</h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1fae5' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>{creditData.positiveItems}</div>
                  <div style={{ fontSize: '0.75rem', color: '#065f46' }}>Positive Items</div>
                </div>
                <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>{creditData.negativeItems}</div>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>Items to Dispute</div>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Quick Actions</h5>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <button
                    onClick={() => setActiveTab('disputes')}
                    style={{ padding: '0.5rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  >
                    🚀 Start Dispute Process
                  </button>
                  <button
                    onClick={() => setActiveTab('monitoring')}
                    style={{ padding: '0.5rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.875rem' }}
                  >
                    📊 View Credit Report
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Goals */}
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Set Credit Goals</h4>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <select
                value={creditGoals.targetScore}
                onChange={(e) => setCreditGoals(prev => ({ ...prev, targetScore: e.target.value }))}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
              >
                <option value="">Target Score</option>
                <option value="700">700+ (Good)</option>
                <option value="740">740+ (Excellent)</option>
                <option value="800">800+ (Exceptional)</option>
              </select>
              <select
                value={creditGoals.timeframe}
                onChange={(e) => setCreditGoals(prev => ({ ...prev, timeframe: e.target.value }))}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
              >
                <option value="">Timeframe</option>
                <option value="3months">3 Months</option>
                <option value="6months">6 Months</option>
                <option value="1year">1 Year</option>
              </select>
              <select
                value={creditGoals.primaryGoal}
                onChange={(e) => setCreditGoals(prev => ({ ...prev, primaryGoal: e.target.value }))}
                style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
              >
                <option value="">Primary Goal</option>
                <option value="mortgage">Qualify for Mortgage</option>
                <option value="auto">Auto Loan</option>
                <option value="creditcard">Better Credit Cards</option>
                <option value="general">General Improvement</option>
              </select>
            </div>
          </div>

          {/* AI-Powered Analysis */}
          {aiAnalysis && (
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', color: 'white' }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🤖 AI Credit Analysis & Recommendations
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{aiAnalysis.issues.length}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Issues Detected</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{Math.abs(aiAnalysis.scoreImpact)}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Point Impact</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '0.5rem', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{aiAnalysis.disputes.length}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Auto Disputes</div>
                </div>
              </div>

              {/* Personalized Credit Plan */}
              {creditPlan && (
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>📈 Your Personalized Credit Plan</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Current Score</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{creditPlan.currentScore}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Target Score</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{creditPlan.potentialScore}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    🎯 Estimated time to reach target: <strong>{creditPlan.timeToTarget} months</strong>
                  </div>
                </div>
              )}

              {/* Top AI Recommendations */}
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.75rem' }}>
                <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>🎯 Priority Actions</h5>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {aiAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem' }}>
                      <div style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: rec.priority === 'high' ? '#ef4444' : '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{rec.action}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{rec.impact} in {rec.timeframe}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Generated Disputes */}
              {autoDisputes.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem' }}>
                  <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>⚡ AI-Generated Disputes Ready</h5>
                  <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                    {autoDisputes.map((dispute, index) => (
                      <div key={index} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: '600' }}>{dispute.account}</div>
                        <div style={{ opacity: 0.8 }}>{dispute.type} - Priority: {dispute.priority}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('disputes')}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '0.5rem', fontWeight: '600' }}
                  >
                    🚀 Generate All Dispute Letters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Profile Setup Tab */}
      {activeTab === 'profile' && (
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            👤 Personal Information Setup
          </h4>

          <div style={{ background: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#0c4a6e', fontWeight: '600' }}>
              🔒 Secure Information Entry
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0c4a6e' }}>
              Your personal information is only stored locally and used to auto-populate dispute letters. We never store sensitive data on servers.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {/* Basic Information */}
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                📝 Basic Information
              </h5>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={userProfile.fullName}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Smith"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={userProfile.dateOfBirth}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Last 4 Digits of SSN (for verification)
                  </label>
                  <input
                    type="text"
                    value={userProfile.ssn}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, ssn: e.target.value.slice(0, 4) }))}
                    placeholder="1234"
                    maxLength="4"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                🏠 Address Information
              </h5>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={userProfile.address}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main Street"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={userProfile.city}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Anytown"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      value={userProfile.state}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="NY"
                      maxLength="2"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={userProfile.zipCode}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, zipCode: e.target.value.slice(0, 5) }))}
                      placeholder="12345"
                      maxLength="5"
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Save Profile Button */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    localStorage.setItem('creditRepairProfile', JSON.stringify(userProfile));
                    notify('Profile saved successfully! Your information will now auto-populate in dispute letters.', 'success');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  💾 Save Profile Information
                </button>

                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.375rem', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
                    💡 <strong>Tip:</strong> This information will automatically fill in your dispute letters, saving you time and ensuring consistency across all correspondence.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Preview */}
          {userProfile.fullName && (
            <div style={{ marginTop: '1.5rem', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '0.75rem', padding: '1.5rem' }}>
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
                👁️ Profile Preview
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#0c4a6e', whiteSpace: 'pre-line' }}>
                <strong>{userProfile.fullName}</strong><br/>
                {userProfile.address}<br/>
                {userProfile.city}, {userProfile.state} {userProfile.zipCode}<br/>
                {userProfile.phone && `Phone: ${userProfile.phone}`}<br/>
                {userProfile.email && `Email: ${userProfile.email}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dispute Center Tab */}
      {activeTab === 'disputes' && (
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            Professional Dispute Letter Generator
          </h4>

          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>
              ⚖️ Legal-Grade Templates
            </div>
            <div style={{ fontSize: '0.75rem', color: '#92400e' }}>
              These are professionally crafted templates based on FCRA, FDCPA, and state laws. Not the generic templates used by Credit Karma.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
            {/* Dispute Type Selection */}
            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>1. Select Dispute Type</h5>
              <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                {Object.entries(DISPUTE_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDispute(key)}
                    style={{
                      padding: '0.75rem',
                      background: selectedDispute === key ? '#8b5cf6' : 'white',
                      color: selectedDispute === key ? 'white' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '600' }}>{template.title}</div>
                  </button>
                ))}
              </div>

              {/* Credit Bureau Selection */}
              {selectedDispute && (
                <div>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>2. Select Credit Bureaus</h5>
                  {Object.entries(CREDIT_BUREAUS).map(([key, bureau]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={disputeForm.bureaus.includes(bureau.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDisputeForm(prev => ({ ...prev, bureaus: [...prev.bureaus, bureau.name] }));
                          } else {
                            setDisputeForm(prev => ({ ...prev, bureaus: prev.bureaus.filter(b => b !== bureau.name) }));
                          }
                        }}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>{bureau.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{bureau.phone}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Form Fields */}
            {selectedDispute && (
              <div>
                <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>3. Fill Information</h5>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={disputeForm.fullName}
                    onChange={(e) => setDisputeForm(prev => ({ ...prev, fullName: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                  />
                  <textarea
                    placeholder="Your Address"
                    value={disputeForm.address}
                    onChange={(e) => setDisputeForm(prev => ({ ...prev, address: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', minHeight: '60px' }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={disputeForm.phone}
                    onChange={(e) => setDisputeForm(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Creditor/Collection Agency Name"
                    value={disputeForm.creditorName}
                    onChange={(e) => setDisputeForm(prev => ({ ...prev, creditorName: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Account Number (last 4 digits)"
                    value={disputeForm.accountNumber}
                    onChange={(e) => setDisputeForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                  />

                  {/* Dynamic fields based on dispute type */}
                  {selectedDispute === 'debt_validation' && (
                    <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#92400e' }}>
                      💡 Debt validation letters must be sent within 30 days of first contact from collector
                    </div>
                  )}

                  {selectedDispute === 'goodwill_letter' && (
                    <>
                      <input
                        type="text"
                        placeholder="Length of relationship (e.g., '3 years')"
                        value={disputeForm.relationshipLength}
                        onChange={(e) => setDisputeForm(prev => ({ ...prev, relationshipLength: e.target.value }))}
                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                      />
                      <textarea
                        placeholder="Reason for late payment"
                        value={disputeForm.reason}
                        onChange={(e) => setDisputeForm(prev => ({ ...prev, reason: e.target.value }))}
                        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', minHeight: '60px' }}
                      />
                    </>
                  )}

                  {selectedDispute === 'identity_theft' && (
                    <input
                      type="text"
                      placeholder="Police Report Number"
                      value={disputeForm.policeReportNumber}
                      onChange={(e) => setDisputeForm(prev => ({ ...prev, policeReportNumber: e.target.value }))}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                    />
                  )}

                  <textarea
                    placeholder="Specific reason for dispute / additional details"
                    value={disputeForm.specificReason}
                    onChange={(e) => setDisputeForm(prev => ({ ...prev, specificReason: e.target.value }))}
                    style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', minHeight: '80px' }}
                  />

                  <button
                    onClick={downloadLetter}
                    disabled={!disputeForm.fullName || disputeForm.bureaus.length === 0}
                    style={{
                      padding: '0.75rem',
                      background: (!disputeForm.fullName || disputeForm.bureaus.length === 0) ? '#9ca3af' : '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: (!disputeForm.fullName || disputeForm.bureaus.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    📄 Download Professional Letter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Letter Preview */}
          {selectedDispute && disputeForm.fullName && (
            <div style={{ marginTop: '1.5rem', background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Letter Preview</h5>
              <pre style={{
                whiteSpace: 'pre-wrap',
                fontSize: '0.75rem',
                background: 'white',
                padding: '1rem',
                borderRadius: '0.25rem',
                maxHeight: '300px',
                overflow: 'auto',
                border: '1px solid #e5e7eb'
              }}>
                {generateDisputeLetter()}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            📈 Live Credit Monitoring & Bureau Integration
          </h4>

          {/* Credit Bureau Connections */}
          <div style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#0c4a6e' }}>
              🔗 Connect to Credit Bureaus
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {Object.entries(CREDIT_BUREAU_APIS).map(([bureau, config]) => (
                <div key={bureau} style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e0f2fe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>{config.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {creditConnection[bureau].connected ? '✅ Connected' : '📡 Connect for live data'}
                      </div>
                    </div>
                    {liveScores[bureau] && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                          {liveScores[bureau].score}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>Live Score</div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => connectToBureau(bureau)}
                    disabled={creditConnection[bureau].loading || creditConnection[bureau].connected}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: creditConnection[bureau].connected ? '#10b981' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: creditConnection[bureau].loading ? 'wait' : 'pointer',
                      opacity: creditConnection[bureau].loading ? 0.7 : 1
                    }}
                  >
                    {creditConnection[bureau].loading ? '🔄 Connecting...' :
                     creditConnection[bureau].connected ? '✅ Connected' :
                     `🔗 Connect to ${config.name}`}
                  </button>
                </div>
              ))}
            </div>

            {/* Credit Karma Style Check Score Button */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem', color: 'white' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  📊 Check Your Credit Score
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Get your credit scores from 2 of 3 major bureaus - just like Credit Karma!
                </div>
              </div>

              <button
                onClick={pullMultiBureauCredit}
                disabled={Object.values(creditConnection).some(conn => conn.loading)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: Object.values(creditConnection).some(conn => conn.loading) ? 'wait' : 'pointer',
                  opacity: Object.values(creditConnection).some(conn => conn.loading) ? 0.7 : 1,
                  backdropFilter: 'blur(10px)'
                }}
              >
                {Object.values(creditConnection).some(conn => conn.loading) ?
                  '🔄 Checking...' :
                  '🚀 Check My Score Now'
                }
              </button>
            </div>

            {/* Credit Monitoring Toggle */}
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e0f2fe' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                    🔔 24/7 Credit Monitoring
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Get instant alerts for score changes, new accounts, and inquiries
                  </div>
                </div>
                <button
                  onClick={enableCreditMonitoring}
                  disabled={creditMonitoring}
                  style={{
                    padding: '0.5rem 1rem',
                    background: creditMonitoring ? '#10b981' : '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: creditMonitoring ? 'default' : 'pointer'
                  }}
                >
                  {creditMonitoring ? '✅ Active' : '🔔 Enable Monitoring'}
                </button>
              </div>
            </div>
          </div>

          {/* Real Credit Data Analysis */}
          {realCreditData && (
            <div style={{ background: '#fefdf8', border: '1px solid #f59e0b', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h5 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#92400e' }}>
                🎯 AI Credit Analysis Results
              </h5>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                    {realCreditData.creditScores.experian.score}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Experian Score</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                    {realCreditData.accounts.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Accounts</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                    {realCreditData.accounts.filter(acc => acc.issues && acc.issues.length > 0).length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Accounts with Issues</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
                    {realCreditData.inquiries.filter(inq => inq.type === 'Hard').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Hard Inquiries</div>
                </div>
              </div>

              {aiAnalysis && (
                <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem' }}>
                  <h6 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    🔍 Issue Analysis
                  </h6>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {aiAnalysis.issues.slice(0, 3).map((issue, index) => (
                      <div key={index} style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '0.25rem', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#dc2626' }}>
                          {issue.type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{issue.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Review */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Accounts Review</h5>
            {creditData.accounts.map(account => (
              <div key={account.id} style={{
                background: account.issues.length > 0 ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${account.issues.length > 0 ? '#fecaca' : '#d1fae5'}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{account.creditor}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {account.type} • {account.accountNumber} • Opened {account.dateOpened}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                      {account.balance > 0 ? fmt(account.balance) : 'Paid Off'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {account.status}
                    </div>
                  </div>
                </div>

                {account.issues.length > 0 && (
                  <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.25rem', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#dc2626', marginBottom: '0.25rem' }}>
                      🚨 Issues Found:
                    </div>
                    {account.issues.map((issue, index) => (
                      <div key={index} style={{ fontSize: '0.75rem', color: '#991b1b' }}>
                        • {issue}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setActiveTab('disputes');
                        setDisputeForm(prev => ({
                          ...prev,
                          creditorName: account.creditor,
                          accountNumber: account.accountNumber,
                          specificReason: account.issues.join(', ')
                        }));
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}
                    >
                      Dispute This Account
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recent Inquiries */}
          <div>
            <h5 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Recent Credit Inquiries</h5>
            {creditData.inquiries.map((inquiry, index) => (
              <div key={index} style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.25rem',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>{inquiry.creditor}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{inquiry.type} Inquiry</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {new Date(inquiry.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Builder Tab */}
      {activeTab === 'builder' && (
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            Credit Building Strategy
          </h4>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Quick Wins */}
            <div style={{ background: '#f0fdf4', border: '1px solid #d1fae5', borderRadius: '0.5rem', padding: '1rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', marginBottom: '0.5rem' }}>
                🚀 Quick Wins (30-60 days)
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#065f46' }}>
                <div>• Dispute {creditData.negativeItems} negative items on your report</div>
                <div>• Pay down credit card balances below 10% utilization</div>
                <div>• Request credit limit increases on existing cards</div>
                <div>• Become an authorized user on someone's old account</div>
              </div>
            </div>

            {/* Medium Term */}
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.5rem', padding: '1rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                📈 Medium Term (3-6 months)
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                <div>• Open a secured credit card if needed</div>
                <div>• Set up automatic payments for all accounts</div>
                <div>• Monitor credit reports monthly for changes</div>
                <div>• Send goodwill letters for any remaining late payments</div>
              </div>
            </div>

            {/* Long Term */}
            <div style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '0.5rem', padding: '1rem' }}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem' }}>
                🏆 Long Term (6+ months)
              </h5>
              <div style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>
                <div>• Maintain 0% utilization on credit cards</div>
                <div>• Keep old accounts open to maintain credit history</div>
                <div>• Apply for premium credit cards once score improves</div>
                <div>• Consider credit builder loans or mix diversification</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}