import React from 'react';
import {
  yyyyMm,
  fmt,
  logTransaction,
  loadData,
  getNextOccurrence,
  getNextIncomeOccurrence,
} from '../lib/utils';
import { notify } from './Notify';
import ErrorBoundary from './ErrorBoundary';
import { useIsMobile } from '../hooks/useIsMobile';
import { useCloudState } from '../hooks/useCloudState';
import { useCloudTransactions } from '../hooks/useCloudTransactions';
// Lazy loaded for performance
import { useAuth } from '../hooks/useAuth'; // NEW
import AccountsSection from './dashboard/AccountsSection';
import IncomeSection from './dashboard/IncomeSection';
import BillsSection from './dashboard/BillsSection';
import OneTimeCostsSection from './dashboard/OneTimeCostsSection';
import TaxSection from './dashboard/TaxSection';
import CreditSection from './dashboard/CreditSection';
import TransactionImport from './TransactionImport';
// Lazy load for performance

// ===================== MAIN DASHBOARD COMPONENT =====================
// Version: 2.0 - Fixed showAddBill error completely
function DashboardContent() {
  const monthKey = yyyyMm();

  // Performance optimization: Progressive feature loading
  const [featuresLoaded, setFeaturesLoaded] = React.useState({
    core: true,
    advanced: false,
    sync: false
  });

  // Load advanced features after initial render for Vercel performance
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFeaturesLoaded(prev => ({ ...prev, advanced: true }));
      setTimeout(() => {
        setFeaturesLoaded(prev => ({ ...prev, sync: true }));
      }, 100);
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  const isMobile = useIsMobile();
  
  // Auth state from useAuth hook
  const {
    user,
    email,
    setEmail,
    password,
    setPassword,
    authLoading,
    showAuth,
    setShowAuth,
    isSignUp,
    setIsSignUp,
    handleAuth,
    handleLogout,
    supabase
  } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = React.useState('dashboard');

  // Transaction log view state
  const [transactionFilter, setTransactionFilter] = React.useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = React.useState('all'); // 'all', 'credits', 'debits'
  const [sortConfig, setSortConfig] = React.useState({ key: 'timestamp', direction: 'descending' });
  
  // Supabase client and user state are now managed by useAuth hook

  // Fast performance: Use basic sync first, enhance later
  const [transactions, setTransactions] = useCloudTransactions(user?.id, supabase);
  const [enhancedFeatures, setEnhancedFeatures] = React.useState({
    transactionsSyncing: false,
    transactionsLastSync: null,
    transactionsSyncError: false,
    transactionsRetryCount: 0,
    transactionsBackup: null,
    transactionsConflicts: [],
    forceTransactionsSync: () => {},
    hasTransactionsBackup: false,
    transactionsSyncHealth: { retryCount: 0 }
  });

  // Safely destructure for clean code
  const {
    transactionsSyncing,
    transactionsLastSync,
    transactionsSyncError,
    transactionsRetryCount,
    transactionsBackup,
    transactionsConflicts,
    forceTransactionsSync,
    hasTransactionsBackup,
    transactionsSyncHealth
  } = enhancedFeatures;

  // Lightweight nw_history for performance
  const [nwHistory, setNwHistory] = React.useState([]);
  const nwHistorySyncing = false;
  const nwHistoryLastSync = null;
  const nwHistorySyncError = false;
  const forceNwHistorySync = () => {};
  const nwHistorySyncHealth = { retryCount: 0 };

  // Derived state from transactions
  const masterState = React.useMemo(() => {
    // This function will process the immutable transaction log
    // and derive the current, mutable state of the application.
    // This is where the core logic of your event-sourced system lives.

    const accounts = new Map();
    const bills = new Map();
    const oneTimeCosts = new Map();
    const categories = new Map();
    const upcomingCredits = new Map();
    const recurringIncome = new Map();
    const incomeHistory = []; // Income history is also derived or logged as separate transactions
    
    // Default categories (initial state if no category transactions exist)
    const initialCategories = [
      { id: crypto.randomUUID(), name: 'Personal', order: 0, budget: 500, ignored: false },
      { id: crypto.randomUUID(), name: 'Studio', order: 1, budget: 1200, ignored: false },
      { id: crypto.randomUUID(), name: 'Smoke Shop', order: 2, budget: 800, ignored: false },
      { id: crypto.randomUUID(), name: 'Botting', order: 3, budget: 300, ignored: false },
    ];
    initialCategories.forEach(cat => categories.set(cat.id, cat));

    // Default accounts with proper UUIDs
    const initialAccounts = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: '550e8400-e29b-41d4-a716-446655440002', name:'BOA – Business', type:'Bank', balance:0 },
      { id: '550e8400-e29b-41d4-a716-446655440003', name:'Personal Checking', type:'Bank', balance:0 },
    ];
    initialAccounts.forEach(acc => accounts.set(acc.id, acc));


    // Process transactions in chronological order
    transactions.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (const tx of transactions) {
      switch (tx.type) {
        case 'account_created':
          accounts.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            type: tx.payload.type,
            balance: tx.payload.initial_balance || 0,
            accountType: tx.payload.accountType || 'debit',
            apr: tx.payload.apr || null,
            creditLimit: tx.payload.creditLimit || null,
            ignored: tx.payload.ignored || false,
            updatedAt: tx.timestamp // Track for potential individual item merge if needed, though collection is primary
          });
          break;
        case 'account_balance_adjustment':
          if (accounts.has(tx.item_id)) {
            const currentAccount = accounts.get(tx.item_id);
            accounts.set(tx.item_id, {
              ...currentAccount,
              balance: tx.payload.new_balance,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'account_renamed':
          if (accounts.has(tx.item_id)) {
            const currentAccount = accounts.get(tx.item_id);
            accounts.set(tx.item_id, {
              ...currentAccount,
              name: tx.payload.new_name,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'account_deleted':
            accounts.delete(tx.item_id);
            // Also need to remove associated bills, otc, income, credits
            bills.forEach((bill, id) => { if (bill.accountId === tx.item_id) bills.delete(id); });
            oneTimeCosts.forEach((otc, id) => { if (otc.accountId === tx.item_id) oneTimeCosts.delete(id); });
            recurringIncome.forEach((inc, id) => { if (inc.accountId === tx.item_id) recurringIncome.delete(id); });
            upcomingCredits.forEach((cred, id) => { if (cred.accountId === tx.item_id) upcomingCredits.delete(id); });
            break;
        case 'account_updated':
          if (accounts.has(tx.item_id)) {
            const currentAccount = accounts.get(tx.item_id);
            accounts.set(tx.item_id, {
              ...currentAccount,
              ...tx.payload,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'account_ignored_toggled':
          if (accounts.has(tx.item_id)) {
            const currentAccount = accounts.get(tx.item_id);
            accounts.set(tx.item_id, {
                ...currentAccount,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'bill_created':
          bills.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            category: tx.payload.category,
            amount: tx.payload.amount,
            frequency: tx.payload.frequency,
            dueDay: tx.payload.dueDay,
            accountId: tx.payload.accountId,
            notes: tx.payload.notes || '',
            paidMonths: tx.payload.paidMonths || [], // For retroactive history
            skipMonths: [],
            ignored: false,
            updatedAt: tx.timestamp
          });
          break;
        case 'bill_payment':
          if (bills.has(tx.item_id)) {
            const currentBill = bills.get(tx.item_id);
            const month = tx.payload.month;
            const newPaidMonths = tx.payload.is_paid
                ? [...(currentBill.paidMonths || []), month]
                : (currentBill.paidMonths || []).filter(m => m !== month);
            bills.set(tx.item_id, {
                ...currentBill,
                paidMonths: [...new Set(newPaidMonths)], // Ensure unique
                updatedAt: tx.timestamp
            });
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + (tx.payload.is_paid ? -tx.payload.amount : tx.payload.amount)
              });
            }
          }
          break;
        case 'bill_modification':
          if (bills.has(tx.item_id)) {
            const currentBill = bills.get(tx.item_id);
            bills.set(tx.item_id, {
              ...currentBill,
              ...tx.payload.changes, // Apply specific changes
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'bill_ignored_toggled':
          if (bills.has(tx.item_id)) {
            const currentBill = bills.get(tx.item_id);
            bills.set(tx.item_id, {
                ...currentBill,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'bill_deleted':
          bills.delete(tx.item_id);
          break;
        case 'one_time_cost_created':
          oneTimeCosts.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            category: tx.payload.category,
            amount: tx.payload.amount,
            dueDate: tx.payload.dueDate,
            accountId: tx.payload.accountId,
            notes: tx.payload.notes || '',
            paid: false,
            ignored: false,
            updatedAt: tx.timestamp
          });
          break;
        case 'one_time_cost_payment':
          if (oneTimeCosts.has(tx.item_id)) {
            const currentOTC = oneTimeCosts.get(tx.item_id);
            oneTimeCosts.set(tx.item_id, {
                ...currentOTC,
                paid: tx.payload.is_paid,
                updatedAt: tx.timestamp
            });
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + (tx.payload.is_paid ? -tx.payload.amount : tx.payload.amount)
              });
            }
          }
          break;
        case 'one_time_cost_modification':
          if (oneTimeCosts.has(tx.item_id)) {
            const currentOTC = oneTimeCosts.get(tx.item_id);
            oneTimeCosts.set(tx.item_id, {
              ...currentOTC,
              ...tx.payload.changes,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'one_time_cost_ignored_toggled':
          if (oneTimeCosts.has(tx.item_id)) {
            const currentOTC = oneTimeCosts.get(tx.item_id);
            oneTimeCosts.set(tx.item_id, {
                ...currentOTC,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'one_time_cost_deleted':
          oneTimeCosts.delete(tx.item_id);
          break;
        case 'recurring_income_created':
          recurringIncome.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            amount: tx.payload.amount,
            frequency: tx.payload.frequency,
            payDay: tx.payload.payDay,
            weeklyDay: tx.payload.weeklyDay,
            biweeklyStart: tx.payload.biweeklyStart,
            yearlyMonth: tx.payload.yearlyMonth,
            accountId: tx.payload.accountId,
            notes: tx.payload.notes || '',
            ignored: false,
            receivedMonths: [],
            updatedAt: tx.timestamp
          });
          break;
        case 'recurring_income_received':
          if (recurringIncome.has(tx.item_id)) {
            const currentIncome = recurringIncome.get(tx.item_id);
            const month = tx.payload.month;
            const newReceivedMonths = tx.payload.is_received
              ? [...(currentIncome.receivedMonths || []), month]
              : (currentIncome.receivedMonths || []).filter(m => m !== month);
            recurringIncome.set(tx.item_id, {
              ...currentIncome,
              receivedMonths: [...new Set(newReceivedMonths)],
              updatedAt: tx.timestamp
            });
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + (tx.payload.is_received ? tx.payload.amount : -tx.payload.amount)
              });
            }
            if (tx.payload.is_received) {
              incomeHistory.push({
                id: tx.id, // Use transaction ID for history
                date: tx.timestamp,
                source: tx.payload.name,
                amount: tx.payload.amount,
                accountId: tx.payload.accountId,
                type: 'recurring'
              });
            }
          }
          break;
        case 'recurring_income_modification':
          if (recurringIncome.has(tx.item_id)) {
            const currentIncome = recurringIncome.get(tx.item_id);
            recurringIncome.set(tx.item_id, {
              ...currentIncome,
              ...tx.payload.changes,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'recurring_income_ignored_toggled':
          if (recurringIncome.has(tx.item_id)) {
            const currentIncome = recurringIncome.get(tx.item_id);
            recurringIncome.set(tx.item_id, {
                ...currentIncome,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'recurring_income_deleted':
          recurringIncome.delete(tx.item_id);
          break;
        case 'credit_created':
          upcomingCredits.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            amount: tx.payload.amount,
            expectedDate: tx.payload.expectedDate,
            accountId: tx.payload.accountId,
            guaranteed: tx.payload.guaranteed,
            notes: tx.payload.notes || '',
            ignored: false,
            received: false, // This will be set to true when 'credit_received' transaction comes
            updatedAt: tx.timestamp
          });
          break;
        case 'credit_received':
          if (upcomingCredits.has(tx.item_id)) {
            upcomingCredits.delete(tx.item_id); // Credit is consumed
            if (accounts.has(tx.payload.accountId)) {
              const account = accounts.get(tx.payload.accountId);
              accounts.set(tx.payload.accountId, {
                ...account,
                balance: account.balance + tx.payload.amount
              });
            }
            incomeHistory.push({
              id: tx.id,
              date: tx.timestamp,
              source: tx.payload.name,
              amount: tx.payload.amount,
              accountId: tx.payload.accountId,
              type: 'credit'
            });
          }
          break;
        case 'credit_guaranteed_toggled':
          if (upcomingCredits.has(tx.item_id)) {
            const currentCredit = upcomingCredits.get(tx.item_id);
            upcomingCredits.set(tx.item_id, {
                ...currentCredit,
                guaranteed: tx.payload.guaranteed,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'credit_ignored_toggled':
          if (upcomingCredits.has(tx.item_id)) {
            const currentCredit = upcomingCredits.get(tx.item_id);
            upcomingCredits.set(tx.item_id, {
                ...currentCredit,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'credit_deleted':
          upcomingCredits.delete(tx.item_id);
          break;
        case 'credit_modification':
          if (upcomingCredits.has(tx.item_id)) {
            const currentCredit = upcomingCredits.get(tx.item_id);
            upcomingCredits.set(tx.item_id, {
              ...currentCredit,
              ...tx.payload.changes,
              updatedAt: tx.timestamp
            });
          }
          break;
        case 'category_created':
          categories.set(tx.item_id, {
            id: tx.item_id,
            name: tx.payload.name,
            order: tx.payload.order,
            budget: tx.payload.budget || 0,
            ignored: false,
            updatedAt: tx.timestamp
          });
          break;
        case 'category_deleted':
            categories.delete(tx.item_id);
            // Move associated items to 'Uncategorized' - this is a bit complex for a derived state
            // For now, if category is deleted, items will effectively become "uncategorized" or filter out if logic handles it.
            // A 'category_assigned' transaction would be needed to explicitly re-categorize items.
            // For now, items will just show their old category or be filtered out.
            // Better: when a category is deleted, a new transaction type like `item_re_categorized` for each affected item could be logged.
            // For initial implementation, just deleting the category is sufficient.
            break;
        case 'category_renamed':
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
                ...currentCategory,
                name: tx.payload.new_name,
                updatedAt: tx.timestamp
            });
            // Also update bills/otc that used the old name
            bills.forEach(bill => {
                if (bill.category === tx.payload.old_name) bill.category = tx.payload.new_name;
            });
            oneTimeCosts.forEach(otc => {
                if (otc.category === tx.payload.old_name) otc.category = tx.payload.new_name;
            });
          }
          break;
        case 'category_budget_updated':
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
                ...currentCategory,
                budget: tx.payload.budget,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'category_ignored_toggled':
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
                ...currentCategory,
                ignored: tx.payload.ignored,
                updatedAt: tx.timestamp
            });
          }
          break;
        case 'category_order_changed': // New transaction type for reordering
          if (categories.has(tx.item_id)) {
            const currentCategory = categories.get(tx.item_id);
            categories.set(tx.item_id, {
              ...currentCategory,
              order: tx.payload.new_order,
              updatedAt: tx.timestamp
            });
          }
          break;
        default:
          console.warn(`Unknown transaction type: ${tx.type}`);
      }
    }
    
    // Convert Maps back to sorted arrays
    const sortedCategories = Array.from(categories.values()).sort((a,b) => (a.order || 0) - (b.order || 0));

    // No automatic Uncategorized category - user manages all categories

    const result = {
      accounts: Array.from(accounts.values()),
      bills: Array.from(bills.values()),
      oneTimeCosts: Array.from(oneTimeCosts.values()),
      categories: sortedCategories,
      upcomingCredits: Array.from(upcomingCredits.values()),
      recurringIncome: Array.from(recurringIncome.values()),
      incomeHistory: incomeHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100) // Keep last 100 entries
    };

    console.log('masterState - upcomingCredits count:', result.upcomingCredits.length);
    if (result.upcomingCredits.length > 0) {
      console.log('masterState - upcomingCredits:', result.upcomingCredits);
    }

    return result;
  }, [transactions]); // Depend on transactions

  // OLD: Master state -> NOW derived from transactions
  const { accounts, bills, oneTimeCosts, categories, upcomingCredits, recurringIncome, incomeHistory } = masterState;

  // Sync initial dummy data to transactions if no transactions exist and old local storage has data
  // This is a one-time migration for existing users.
  React.useEffect(() => {
    if (!user?.id || !supabase) return;

    // Check if migration has already been attempted for this user
    const migrationKey = `migration_attempted_${user.id}`;
    const migrationAttempted = localStorage.getItem(migrationKey);

    if (migrationAttempted) {
      return; // Skip migration if already attempted
    }

    const migrateOldData = async () => {
      let initialTransactions = [];

      // Load data from potential old local storage keys
      const oldAccountData = loadData('bills_balance_dashboard_v3.1:accounts', null);
      const oldBillsData = loadData('bills_balance_dashboard_v3.1:bills', null);
      const oldCategoriesData = loadData('bills_balance_dashboard_v3.1:categories', null);
      const oldCreditsData = loadData('bills_balance_dashboard_v3.1:credits', null);
      const oldIncomeData = loadData('bills_balance_dashboard_v3.1:income', null);
      const oldOtcData = loadData('bills_balance_dashboard_v3.1:otc', null);

      // Mark migration as attempted regardless of whether there's data to migrate
      localStorage.setItem(migrationKey, 'true');

      if (oldAccountData.data && oldAccountData.data.length > 0) {
        oldAccountData.data.forEach(acc => {
          initialTransactions.push({
            user_id: user.id,
            type: 'account_created',
            item_id: acc.id,
            payload: { name: acc.name, type: acc.type, initial_balance: acc.balance },
            description: `Account "${acc.name}" created with initial balance ${fmt(acc.balance)}`,
            timestamp: new Date().toISOString()
          });
        });
      }
      // Add similar migration logic for bills, categories, etc.
      // This part would be expanded to migrate all existing data types into transactions.
      // For brevity, only accounts are shown as example.

      if (initialTransactions.length > 0) {
        console.log("Migrating old local data to transactions:", initialTransactions);
        const { error } = await supabase.from('transaction_log').insert(initialTransactions);
        if (error) {
          console.error('Error migrating old data:', error);
          notify('Failed to migrate old local data to transactions.', 'error');
        } else {
          notify('Successfully migrated old local data to transactions. Please verify.', 'success');
          // Optionally, clear old local storage keys after successful migration
          // localStorage.removeItem('bills_balance_dashboard_v3.1:accounts'); etc.
        }
      }
    };
    migrateOldData();
  }, [user?.id, supabase]); // Removed transactions.length dependency to prevent repeated attempts

  // Settings/UI with cloud sync - still use useCloudState for UI settings
  const [autoDeductCash, setAutoDeductCash] = useCloudState('autoDeductCash', true, user?.id, supabase);
  const [autoDeductBank, setAutoDeductBank] = useCloudState('autoDeductBank', false, user?.id, supabase);
  const [includeGuaranteedInNetWorth, setIncludeGuaranteedInNetWorth] = useCloudState('includeGuaranteedInNetWorth', false, user?.id, supabase);
  const [showIgnored, setShowIgnored] = useCloudState('showIgnored', false, user?.id, supabase);
  const [selectedCat, setSelectedCat] = useCloudState('selectedCat', 'All', user?.id, supabase);

  // Ensure first-time users or users without data start with "All" category
  React.useEffect(() => {
    if (user?.id && accounts.length === 0 && bills.length === 0 && oneTimeCosts.length === 0 && selectedCat !== 'All') {
      // This looks like a new user with no data, force category to "All"
      setSelectedCat('All');
    }
  }, [user?.id, accounts.length, bills.length, oneTimeCosts.length, selectedCat, setSelectedCat]);

  // Helper function to get the default account for auto-deduct
  const getDefaultAutoDeductAccount = React.useCallback(() => {
    if (autoDeductBank) {
      // Find first bank account
      const bankAccount = accounts.find(a => a.type === 'Bank' && !a.ignored);
      if (bankAccount) return bankAccount.id;
    }
    if (autoDeductCash) {
      // Find cash account
      const cashAccount = accounts.find(a => a.type === 'Cash' && !a.ignored);
      if (cashAccount) return cashAccount.id;
    }
    // Fallback to first non-ignored account
    const fallbackAccount = accounts.find(a => !a.ignored);
    return fallbackAccount?.id || accounts[0]?.id;
  }, [accounts, autoDeductBank, autoDeductCash]);

  const [showIncomeHistory, setShowIncomeHistory] = React.useState(false); // Managed locally for UI toggle

  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  const [editingCategoryId, setEditingCategoryId] = React.useState(null);
  const [editingCategoryName, setEditingCategoryName] = React.useState(null);
  const [tempCategoryName, setTempCategoryName] = React.useState('');
  const [confirmDialog, setConfirmDialog] = React.useState(null); // { title, message, onConfirm, onCancel }
  const [billsOtcView, setBillsOtcView] = React.useState('bills'); // 'bills' or 'otc'
  const [accountsView, setAccountsView] = React.useState('debit'); // 'debit' or 'credit'

  // Dialog states for various modals
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState(null);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false); // This will be replaced with transaction history UI
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);
  const [editingTransaction, setEditingTransaction] = React.useState(null);
  const [showTransactionEdit, setShowTransactionEdit] = React.useState(false);
  const [showTransactionImport, setShowTransactionImport] = React.useState(false);
  const [categoryFilterSticky, setCategoryFilterSticky] = React.useState(false);
  const categoryFilterRef = React.useRef(null);
  const billsSectionRef = React.useRef(null);

  // One-time cost form state - these states are kept in DashboardContent
  // because they are used for calculations (e.g., upcoming.items, timeline)
  // and passed down to OneTimeCostsSection for the input form.
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0,10);
  });
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || '550e8400-e29b-41d4-a716-446655440001');
  const [otcNotes, setOtcNotes] = React.useState("");
  const [otcTaxCategory, setOtcTaxCategory] = React.useState('None/Personal');
  const [otcMarkAsPaid, setOtcMarkAsPaid] = React.useState(false);
  const [otcAutoDeduct, setOtcAutoDeduct] = React.useState(false);

  // Autopay processing function
  async function processAutopayBills() {
    if (!user?.id || !supabase) return;

    const currentMonth = yyyyMm();
    const today = new Date();

    for (const bill of bills) {
      if (!bill.autopay) continue;

      // Check if bill is already paid this month
      if (bill.paidMonths.includes(currentMonth)) continue;

      // Check if bill is due this month
      const nextDue = getNextOccurrence(bill);
      const billMonth = nextDue.toISOString().slice(0, 7);

      // If the bill is due this month and we're at or past the due date
      if (billMonth === currentMonth && today >= nextDue) {
        try {
          await logTransaction(
            supabase,
            user.id,
            'bill_payment',
            bill.id,
            { paid: true, autopay: true },
            `Autopay: Marked "${bill.name}" as paid for ${currentMonth}`
          );
          console.log(`Autopay processed: ${bill.name}`);
        } catch (error) {
          console.error(`Autopay failed for ${bill.name}:`, error);
        }
      }
    }
  }

  // Run autopay processing when bills or month changes
  React.useEffect(() => {
    if (bills.length > 0) {
      processAutopayBills();
    }
  }, [bills, user?.id, supabase]);

  // Enhanced sync status tracking
  const isSyncing = transactionsSyncing || nwHistorySyncing;
  const lastSyncTime = Math.max(transactionsLastSync || 0, nwHistoryLastSync || 0);
  const hasErrors = transactionsSyncError || nwHistorySyncError;
  const totalRetries = transactionsRetryCount + (nwHistorySyncHealth?.retryCount || 0);
  const overallSyncHealth = transactionsSyncHealth?.isHealthy && nwHistorySyncHealth?.isHealthy;

  // Update form state when categories/accounts change
  React.useEffect(() => {
    if(activeCats.length && !activeCats.includes(otcCategory)) setOtcCategory(activeCats[0]);
  }, [activeCats, otcCategory]);

  React.useEffect(() => {
    if(accounts.length && !accounts.find(a => a.id === otcAccountId)) setOtcAccountId(accounts[0].id);
  }, [accounts, otcAccountId]);

  // Sticky category filter scroll effect
  React.useEffect(() => {
    let originalTop = null;

    const handleScroll = () => {
      if (!categoryFilterRef.current) return;

      // Store original position on first measurement when not sticky
      if (originalTop === null && !categoryFilterSticky) {
        const rect = categoryFilterRef.current.getBoundingClientRect();
        originalTop = rect.top + window.scrollY;
      }

      if (originalTop === null) return;

      // Different offset for mobile vs desktop
      const offset = isMobile ? -2 : 60;

      // Simple logic: sticky when scrolled past trigger point, not sticky when before it
      const triggerPoint = originalTop - offset;
      const shouldBeSticky = window.scrollY > triggerPoint;

      setCategoryFilterSticky(shouldBeSticky);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run once to set initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Calculate monthly recurring income total
  const monthlyRecurringIncomeTotal = React.useMemo(() => {
    try {
      const currentMonth = yyyyMm();
      let total = 0;
      
      for (const income of recurringIncome) {
        if (income.ignored) continue;
        
        if (income.frequency === 'monthly') {
          total += Number(income.amount) || 0;
        } else if (income.frequency === 'biweekly') {
          // Biweekly = 26 payments per year, so ~2.17 per month
          total += (Number(income.amount) || 0) * 2.17;
        } else if (income.frequency === 'weekly') {
          // Weekly = 52 payments per year, so ~4.33 per month
          total += (Number(income.amount) || 0) * 4.33;
        } else if (income.frequency === 'yearly') {
          // Yearly = 1 payment per year, so /12 per month
          total += (Number(income.amount) || 0) / 12;
        }
      }
      
      return total;
    } catch (error) {
      console.error('Error calculating monthly recurring income:', error);
      return 0;
    }
  }, [recurringIncome]);

  // Calculate liquid including guaranteed credits (excluding savings accounts)
  const currentLiquidWithGuaranteed = React.useMemo(() => {
    try {
      // Exclude savings accounts and credit accounts from liquid calculations for "Need This Week"
      const baseBalance = accounts
        .filter(a => a.type !== 'Savings' && a.accountType !== 'credit')
        .reduce((s,a)=> s+(Number(a.balance) || 0), 0);
      const guaranteedCredits = upcomingCredits
        .filter(c => c.guaranteed && !c.ignored)
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
      return baseBalance + guaranteedCredits;
    } catch (error) {
      console.error('Error calculating liquid with guaranteed:', error);
      return accounts
        .filter(a => a.type !== 'Savings' && a.accountType !== 'credit')
        .reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    }
  }, [accounts, upcomingCredits]);

  // Calculate liquid with all expected income (including recurring)
  const projectedWithIncome = React.useMemo(() => {
    return currentLiquidWithGuaranteed + monthlyRecurringIncomeTotal;
  }, [currentLiquidWithGuaranteed, monthlyRecurringIncomeTotal]);

  // Derived calculations with error handling (excluding savings and credit accounts)
  const currentLiquid = React.useMemo(()=> {
    try {
      // Exclude savings accounts and credit accounts from liquid calculations
      return accounts
        .filter(a => a.type !== 'Savings' && a.accountType !== 'credit')
        .reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    } catch (error) {
      console.error('Error calculating current liquid:', error);
      return 0;
    }
  }, [accounts]);

  // Total net worth including savings accounts (for display purposes)
  // Credit accounts (debt) are subtracted from net worth
  const totalNetWorth = React.useMemo(() => {
    try {
      let accountsTotal = accounts.reduce((total, account) => {
        const balance = Number(account.balance) || 0;
        if (account.accountType === 'credit') {
          // Credit cards represent debt - subtract from net worth
          return total - balance;
        } else {
          // Regular accounts (assets) - add to net worth
          return total + balance;
        }
      }, 0);

      // Optionally include guaranteed credits based on user setting
      if (includeGuaranteedInNetWorth) {
        const guaranteedCredits = upcomingCredits
          .filter(c => c.guaranteed && !c.ignored)
          .reduce((s, c) => s + (Number(c.amount) || 0), 0);
        accountsTotal += guaranteedCredits;
      }

      return accountsTotal;
    } catch (error) {
      console.error('Error calculating total net worth:', error);
      return 0;
    }
  }, [accounts, includeGuaranteedInNetWorth, upcomingCredits]);

  const upcoming = React.useMemo(()=>{
    try {
      const now = new Date();
      const horizon = new Date(now); 
      horizon.setDate(now.getDate()+7);
      const items = [];
      const currentMonth = yyyyMm();

      for(const b of bills){
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue;
        
        const nextDate = getNextOccurrence(b, now);
        const paid = b.paidMonths.includes(currentMonth) && (b.frequency === 'monthly' || b.frequency === 'yearly');
        const overdue = nextDate < now && !paid;
        const withinWeek = nextDate <= horizon && !paid;
        
        if(overdue || withinWeek) {
          items.push({ bill:b, due: nextDate, overdue });
        }
      }
      
      for(const o of oneTimeCosts){
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue;
        if(o.paid) continue;
        const due = new Date(o.dueDate);
        const overdue = due < new Date();
        const withinWeek = due <= horizon;
        if(overdue || withinWeek) items.push({ otc:o, due, overdue });
      }
      
      items.sort((a,b)=> (a.overdue===b.overdue? a.due.getTime()-b.due.getTime() : a.overdue? -1: 1));

      const byAcc = {};
      const ensure = (id)=> (byAcc[id] ||= { account: accounts.find(a=>a.id===id), total:0, items:[] });
      for(const it of items){
        const amt = it.bill? it.bill.amount : it.otc.amount;
        const accId = it.bill? it.bill.accountId : it.otc.accountId;
        const g = ensure(accId); 
        g.total += amt; 
        g.items.push(it);
      }
      const byAccount = Object.values(byAcc).map(g=> ({ 
        account: g.account, 
        totalDue: g.total, 
        balance: g.account.balance, 
        deficit: Math.max(0, g.total - g.account.balance), 
        items: g.items 
      }));

      return { 
        items, 
        byAccount, 
        totalDeficit: byAccount.reduce((s,d)=> s+d.deficit, 0), 
        weekDueTotal: items.reduce((s,it)=> s + (it.bill? it.bill.amount : it.otc.amount), 0) 
      };
    } catch (error) {
      console.error('Error calculating upcoming:', error);
      return { items: [], byAccount: [], totalDeficit: 0, weekDueTotal: 0 };
    }
  }, [accounts, bills, oneTimeCosts, activeCats]);

  const monthUnpaidTotal = React.useMemo(()=>{
    try {
      const currentMonth = yyyyMm();
      let sum = 0;
      for(const b of bills){ 
        if(b.ignored) continue;
        if(!activeCats.includes(b.category)) continue; 
        if(!b.paidMonths.includes(currentMonth)) sum += Number(b.amount) || 0; 
      }
      for(const o of oneTimeCosts){ 
        if(o.ignored) continue;
        if(!activeCats.includes(o.category)) continue; 
        if(o.dueDate.slice(0,7)===currentMonth && !o.paid) sum += Number(o.amount) || 0; 
      }
      return sum;
    } catch (error) {
      console.error('Error calculating month unpaid total:', error);
      return 0;
    }
  },[bills, oneTimeCosts, activeCats]);

  const afterWeek = projectedWithIncome - upcoming.weekDueTotal;
  const afterMonth = projectedWithIncome - monthUnpaidTotal;
  const netWorthValue = totalNetWorth; // Include savings accounts in net worth display

  const weekNeedWithoutSavings = upcoming.weekDueTotal;
  const weekNeedWithSavings = Math.max(0, upcoming.weekDueTotal - currentLiquidWithGuaranteed);

  const selectedCats = selectedCat==='All' ? 
    [...activeCats, ...bills.map(b => b.category).filter(cat => !activeCats.includes(cat))] : 
    activeCats.filter(c=> c===selectedCat);

  const totalBillsForSelectedCategory = React.useMemo(() => {
    let total = 0;
    bills
      .filter(b => selectedCats.includes(b.category) && (!showIgnored ? !b.ignored : true))
      .forEach(bill => {
        total += Number(bill.amount) || 0;
      });
    return total;
  }, [bills, selectedCats, showIgnored]);

  // Category spending calculations for budgets
  const categorySpending = React.useMemo(() => {
    const spending = {};
    const currentMonth = yyyyMm();
    
    categories.forEach(cat => {
      spending[cat.name] = 0;
    });
    
    bills.forEach(bill => {
      if (!bill.ignored && bill.paidMonths.includes(currentMonth)) {
        spending[bill.category] = (spending[bill.category] || 0) + Number(bill.amount);
      }
    });
    
    oneTimeCosts.forEach(otc => {
      if (!otc.ignored && otc.paid && otc.dueDate.slice(0, 7) === currentMonth) {
        spending[otc.category] = (spending[otc.category] || 0) + Number(otc.amount);
      }
    });
    
    return spending;
  }, [bills, oneTimeCosts, categories]);

  // Analytics data calculations
  const accountBalanceData = React.useMemo(() => {
    return accounts
      .filter(a => a.balance > 0)
      .map(a => ({
        name: a.name,
        value: a.balance,
        type: a.type
      }));
  }, [accounts]);

  const categorySpendingData = React.useMemo(() => {
    const categoryTotals = {};
    
    bills.forEach(bill => {
      if (!bill.ignored && activeCats.includes(bill.category)) {
        categoryTotals[bill.category] = (categoryTotals[bill.category] || 0) + bill.amount;
      }
    });
    
    oneTimeCosts.forEach(otc => {
      if (!otc.ignored && !otc.paid && activeCats.includes(otc.category)) {
        categoryTotals[otc.category] = (categoryTotals[otc.category] || 0) + otc.amount;
      }
    });
    
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [bills, oneTimeCosts, activeCats]);

  // Net worth trend data
  const netWorthTrend = React.useMemo(() => {
    const trend = [...nwHistory];
    trend.push({
      ts: Date.now(),
      current: currentLiquid,
      afterWeek,
      afterMonth,
      reason: 'current'
    });
    
    return trend
      .sort((a, b) => a.ts - b.ts)
      .slice(-10)
      .map(snap => ({
        date: new Date(snap.ts).toLocaleDateString(),
        current: snap.current,
        afterWeek: snap.afterWeek,
        afterMonth: snap.afterMonth
      }));
  }, [nwHistory, currentLiquid, afterWeek, afterMonth]);

  // Generate 30-day timeline
  const timeline = React.useMemo(() => {
    try {
      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let runningBalance = currentLiquidWithGuaranteed;
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        const income = [];
        const expenses = [];
        
        // Check recurring income
        recurringIncome.forEach(inc => {
          if (inc.ignored) return;
          const nextDate = getNextIncomeOccurrence(inc, date);
          if (nextDate.toDateString() === date.toDateString()) {
            income.push({ type: 'income', name: inc.name, amount: inc.amount });
            runningBalance += Number(inc.amount);
          }
        });
        
        // Check upcoming credits
        upcomingCredits.forEach(credit => {
          if (credit.ignored) return;
          const creditDate = new Date(credit.expectedDate);
          if (creditDate.toDateString() === date.toDateString()) {
            income.push({ type: 'credit', name: credit.name, amount: credit.amount });
            if (credit.guaranteed) {
              // Already counted in initial balance
            } else {
              runningBalance += Number(credit.amount);
            }
          }
        });
        
        // Check bills
        bills.forEach(bill => {
          if (bill.ignored || !activeCats.includes(bill.category)) return;
          const nextDate = getNextOccurrence(bill, date);
          if (nextDate.toDateString() === date.toDateString()) {
            const currentMonth = yyyyMm(date);
            const isPaid = bill.paidMonths.includes(currentMonth);
            if (!isPaid) {
              expenses.push({ type: 'bill', name: bill.name, amount: bill.amount });
              runningBalance -= Number(bill.amount);
            }
          }
        });
        
        // Check one-time costs
        oneTimeCosts.forEach(otc => {
          if (otc.ignored || otc.paid || !activeCats.includes(otc.category)) return;
          const otcDate = new Date(otc.dueDate);
          if (otcDate.toDateString() === date.toDateString()) {
            expenses.push({ type: 'otc', name: otc.name, amount: otc.amount });
            runningBalance -= Number(otc.amount);
          }
        });
        
        days.push({
          date,
          income,
          expenses,
          balance: runningBalance,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNumber: date.getDate()
        });
      }
      
      return days;
    } catch (error) {
      console.error('Error generating timeline:', error);
      return [];
    }
  }, [currentLiquidWithGuaranteed, recurringIncome, upcomingCredits, bills, oneTimeCosts, activeCats]);

  // Transaction Log filtering and sorting
  const sortedTransactions = React.useMemo(() => {
    let sortableItems = [...transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA, valB;

        // Handle different sort keys
        switch (sortConfig.key) {
          case 'category':
            valA = a.payload?.category || '';
            valB = b.payload?.category || '';
            break;
          case 'amount':
            valA = a.payload?.amount || 0;
            valB = b.payload?.amount || 0;
            break;
          case 'description':
            valA = a.description || '';
            valB = b.description || '';
            break;
          case 'timestamp':
            valA = new Date(a.timestamp).getTime();
            valB = new Date(b.timestamp).getTime();
            break;
          default:
            valA = a[sortConfig.key] || '';
            valB = b[sortConfig.key] || '';
        }

        // Compare values
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        } else {
          const aStr = String(valA).toLowerCase();
          const bStr = String(valB).toLowerCase();
          if (aStr < bStr) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aStr > bStr) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  const filteredTransactions = React.useMemo(() => {
    return sortedTransactions.filter(tx => {
      // Text filter
      const textMatch = (tx.description?.toLowerCase() || '').includes(transactionFilter.toLowerCase()) ||
        (tx.type?.toLowerCase() || '').includes(transactionFilter.toLowerCase());

      // Category filter
      const categoryMatch = selectedCat === 'All' ||
        (tx.payload?.category && selectedCats.includes(tx.payload.category));

      // Transaction type filter (only actual financial transactions - credits/debits)
      // Credits: money coming in
      const isCredit = tx.type === 'credit_received' ||
                      tx.type === 'recurring_income_received';

      // Debits: money going out
      const isDebit = tx.type === 'bill_payment' ||
                     tx.type === 'one_time_cost_payment';

      // Only show financial transactions (actual money movement)
      const isFinancialTransaction = isCredit || isDebit;

      const typeMatch = transactionTypeFilter === 'all' ? isFinancialTransaction :
        (transactionTypeFilter === 'credits' && isCredit) ||
        (transactionTypeFilter === 'debits' && isDebit);

      return textMatch && categoryMatch && typeMatch;
    });
  }, [sortedTransactions, transactionFilter, selectedCat, selectedCats, transactionTypeFilter]);

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleExport = () => {
    if (filteredTransactions.length === 0) {
        notify('No transactions to export.', 'warning');
        return;
    }

    const headers = ['id', 'timestamp', 'type', 'item_id', 'description', 'payload'];
    const csvRows = [headers.join(',')];

    for (const tx of filteredTransactions) {
        const row = [
            tx.id,
            tx.timestamp,
            tx.type,
            tx.item_id,
            `"${(tx.description || '').replace(/"/g, '""')}"`, // Escape double quotes
            `"${JSON.stringify(tx.payload).replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    notify('Transactions exported successfully!', 'success');
  };

  // RECURRING INCOME FUNCTIONS
  async function addRecurringIncome(name, amount, frequency, payDay, accountId, notes, source, incomeType, hourlyRate, hoursPerPeriod, federalTaxRate, stateTaxRate, socialSecurityRate, medicareRate, otherDeductions) {
    try {
      if (!user?.id) {
        notify('Please log in to add income', 'error');
        return;
      }

      if (!name || !payDay || !accountId || !source) {
        notify('Please fill in all required fields', 'error');
        return;
      }

      // Calculate gross amount based on income type
      let grossAmount;
      if (incomeType === 'hourly') {
        if (!hourlyRate || !hoursPerPeriod) {
          notify('Please fill in hourly rate and hours per period', 'error');
          return;
        }
        grossAmount = Number(hourlyRate) * Number(hoursPerPeriod);
      } else {
        if (!amount) {
          notify('Please fill in the salary amount', 'error');
          return;
        }
        grossAmount = Number(amount);
      }

      // Calculate tax withholdings and net amount
      let netAmount = grossAmount;
      let taxDetails = {};

      if (federalTaxRate || stateTaxRate || socialSecurityRate || medicareRate || otherDeductions) {
        const federalTax = grossAmount * (Number(federalTaxRate) || 0) / 100;
        const stateTax = grossAmount * (Number(stateTaxRate) || 0) / 100;
        const socialSecurity = grossAmount * (Number(socialSecurityRate) || 6.2) / 100;
        const medicare = grossAmount * (Number(medicareRate) || 1.45) / 100;
        const otherDed = Number(otherDeductions) || 0;

        const totalTaxes = federalTax + stateTax + socialSecurity + medicare + otherDed;
        netAmount = grossAmount - totalTaxes;

        taxDetails = {
          federalTax: federalTax.toFixed(2),
          stateTax: stateTax.toFixed(2),
          socialSecurity: socialSecurity.toFixed(2),
          medicare: medicare.toFixed(2),
          otherDeductions: otherDed.toFixed(2),
          totalTaxes: totalTaxes.toFixed(2),
          taxRate: ((totalTaxes / grossAmount) * 100).toFixed(1)
        };
      }

      const newIncomeId = crypto.randomUUID();
      const payload = {
        name: name.trim(),
        amount: netAmount, // Store net amount as the main amount
        grossAmount: grossAmount,
        frequency,
        payDay: Number(payDay),
        accountId,
        notes: notes || '',
        source: source.trim(),
        incomeType: incomeType || 'salary',
        hourlyRate: incomeType === 'hourly' ? Number(hourlyRate) : null,
        hoursPerPeriod: incomeType === 'hourly' ? Number(hoursPerPeriod) : null,
        taxDetails: Object.keys(taxDetails).length > 0 ? taxDetails : null
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'recurring_income_created',
        newIncomeId,
        payload,
        `Created recurring income "${payload.name}" for ${fmt(payload.amount)}`
      );

      if (transaction) {
        notify('Recurring income added successfully!');
      }
    } catch (error) {
      console.error('Error adding recurring income:', error);
      notify('Failed to add recurring income', 'error');
    }
  }

  async function toggleIncomeReceived(income) {
    try {
      const currentMonth = yyyyMm();
      const isReceived = income.receivedMonths?.includes(currentMonth);

      const transaction = await logTransaction(
        supabase,
        user.id,
        'recurring_income_received',
        income.id,
        {
          month: currentMonth,
          is_received: !isReceived,
          accountId: income.accountId,
          amount: income.amount,
          name: income.name,
          source: income.source || income.name // Use source if available, fallback to name for backward compatibility
        },
        `Income "${income.name}" from ${income.source || income.name} marked as ${!isReceived ? 'received' : 'not received'} for ${currentMonth}`
      );

      if (transaction) {
        notify(`${income.name} marked as ${!isReceived ? 'received' : 'not received'}`, 'success');
      }
    } catch (error) {
      console.error('Error toggling income received:', error);
      notify('Failed to update income status', 'error');
    }
  }

  async function deleteIncome(incomeId) {
    const income = recurringIncome.find(i => i.id === incomeId);
    if (!income) return;
    if (confirm('Delete this recurring income?')) {
      try {
        const transaction = await logTransaction(
          supabase,
          user.id,
          'recurring_income_deleted',
          incomeId,
          {},
          `Deleted recurring income "${income.name}"`
        );
        if (transaction) {
          notify('Recurring income deleted');
        }
      } catch (error) {
        console.error('Error deleting recurring income:', error);
        notify('Failed to delete recurring income', 'error');
      }
    }
  }

  async function receiveCredit(creditId) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;

      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_received',
        creditId,
        {
          accountId: credit.accountId,
          amount: credit.amount,
          name: credit.name,
          source: credit.name // Use credit name as source for backward compatibility
        },
        `Credit "${credit.name}" received for ${fmt(credit.amount)}`
      );

      if (transaction) {
        notify(`Credit "${credit.name}" received!`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error receiving credit:', error);
      notify('Failed to receive credit', 'error');
    }
  }

  async function toggleCreditGuaranteed(creditId) {
    try {
      const credit = upcomingCredits.find(c => c.id === creditId);
      if (!credit) return;

      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_guaranteed_toggled',
        creditId,
        { guaranteed: !credit.guaranteed },
        `Credit "${credit.name}" guaranteed status set to ${!credit.guaranteed}`
      );

      if (transaction) {
        notify(`Credit "${credit.name}" is now ${!credit.guaranteed ? 'guaranteed' : 'not guaranteed'}`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error toggling credit guaranteed:', error);
      notify('Failed to update credit status', 'error');
    }
  }

  async function deleteCredit(creditId) {
    const credit = upcomingCredits.find(c => c.id === creditId);
    if (!credit) return;
    if (confirm('Delete this upcoming credit?')) {
      try {
        // Optimistic update: Remove from UI immediately
        setUpcomingCredits(prev => prev.filter(c => c.id !== creditId));

        const transaction = await logTransaction(
          supabase,
          user.id,
          'credit_deleted',
          creditId,
          {},
          `Deleted credit "${credit.name}"`
        );
        if (transaction) {
          notify('Credit deleted');
        }
      } catch (error) {
        console.error('Error deleting credit:', error);
        notify('Failed to delete credit', 'error');

        // Revert optimistic update on error
        setUpcomingCredits(prev => [...prev, credit]);
      }
    }
  }

  // UPCOMING CREDITS FUNCTIONS
  async function addUpcomingCredit(name, amount, expectedDate, accountId, guaranteed, notes) {
    try {
      if (!user?.id) {
        notify('Please log in to add credits', 'error');
        return;
      }

      if (!name || !amount || !expectedDate) {
        notify('Please fill in all required fields', 'error');
        return;
      }

      if (!accountId) {
        notify('Please select an account', 'error');
        return;
      }

      const newCreditId = crypto.randomUUID();
      const payload = {
        name: name.trim(),
        amount: Number(amount),
        expectedDate,
        accountId,
        guaranteed: !!guaranteed,
        notes: notes || ''
      };

      console.log('Adding credit with payload:', payload); // Debug log

      const transaction = await logTransaction(
        supabase,
        user.id,
        'credit_created',
        newCreditId,
        payload,
        `Created upcoming credit "${payload.name}" for ${fmt(payload.amount)}`
      );

      if (transaction) {
        setShowAddCredit(false);
        notify('Upcoming credit added successfully!');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      } else {
        notify('Failed to save credit - transaction failed', 'error');
      }
    } catch (error) {
      console.error('Error adding upcoming credit:', error);
      notify(`Failed to add upcoming credit: ${error.message}`, 'error');
    }
  }

  // ONE-TIME COST FUNCTIONS
  async function addOneTimeCost() {
    try {
      if (!otcName || !otcAmount || !otcDueDate) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      const newOtcId = crypto.randomUUID();
      const payload = {
        name: otcName,
        category: otcCategory,
        amount: Number(otcAmount),
        dueDate: otcDueDate,
        accountId: otcAccountId,
        notes: otcNotes
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_created',
        newOtcId,
        payload,
        `Created one-time cost "${payload.name}" for ${fmt(payload.amount)}`
      );

      if (transaction) {
        // Clear form
        setOtcName('');
        setOtcAmount(0);
        setOtcDueDate(new Date().toISOString().slice(0,10));
        setOtcNotes('');
        notify('One-time cost added successfully!');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error adding one-time cost:', error);
      notify('Failed to add one-time cost', 'error');
    }
  }

  async function updateOTC(otcId, formData) {
    try {
      const changes = {
        name: formData.get('name'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        dueDate: formData.get('dueDate'),
        accountId: formData.get('accountId'),
        notes: formData.get('notes')
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_modification',
        otcId,
        { changes },
        `Update one-time cost "${changes.name}"`
      );

      if (transaction) {
        setEditingOTC(null);
        notify('One-time cost updated successfully!');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error updating one-time cost:', error);
      notify('Failed to update one-time cost', 'error');
    }
  }

  async function toggleOneTimePaid(otc) {
    try {
      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_payment',
        otc.id,
        {
          is_paid: !otc.paid,
          accountId: otc.accountId,
          amount: otc.amount
        },
        `One-time cost "${otc.name}" marked as ${!otc.paid ? 'paid' : 'unpaid'}`
      );

      if (transaction) {
        notify(`${otc.name} marked as ${!otc.paid ? 'paid' : 'unpaid'}`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error toggling one-time cost paid status:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  async function toggleOTCIgnored(o) {
    try {
      const transaction = await logTransaction(
        supabase,
        user.id,
        'one_time_cost_ignored_toggled',
        o.id,
        { ignored: !o.ignored },
        `One-time cost "${o.name}" ignored status set to ${!o.ignored}`
      );

      if (transaction) {
        notify(`One-time cost "${o.name}" is now ${o.ignored ? 'shown' : 'hidden'}.`);
      }
    } catch (error) {
      console.error('Error toggling one-time cost ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  async function deleteOneTimeCost(otcId) {
    const otc = oneTimeCosts.find(o => o.id === otcId);
    if (!otc) return;

    setConfirmDialog({
      title: 'Delete One-Time Cost',
      message: `Are you sure you want to delete "${otc.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const transaction = await logTransaction(
            supabase,
            user.id,
            'one_time_cost_deleted',
            otcId,
            {},
            `Deleted one-time cost "${otc.name}"`
          );
          if (transaction) {
            notify('One-time cost deleted');
          }
        } catch (error) {
          console.error('Error deleting one-time cost:', error);
          notify('Failed to delete one-time cost', 'error');
        }
      },
      onCancel: () => {}
    });
  }

  // BILL FUNCTIONS
  async function addBill(formData) {
    try {
      if (!user?.id) {
        notify('Please log in to add bills', 'error');
        return;
      }

      const name = formData.get('name');
      const amount = formData.get('amount');
      const accountId = formData.get('accountId');

      if (!name || !amount || !accountId) {
        notify('Please fill in all required fields', 'error');
        return;
      }

      const newBillId = crypto.randomUUID();
      const frequency = formData.get('frequency');

      const payload = {
        name: name.trim(),
        category: formData.get('category'),
        amount: Number(amount),
        frequency,
        accountId,
        notes: formData.get('notes') || '',
        autopay: formData.get('autopay') === 'on'
      };

      // Add frequency-specific fields
      if (frequency === 'monthly' || frequency === 'yearly') {
        payload.dueDay = Number(formData.get('dueDay'));
      }

      if (frequency === 'yearly') {
        payload.yearlyMonth = Number(formData.get('yearlyMonth'));
      }

      if (frequency === 'weekly') {
        payload.weeklyDay = Number(formData.get('weeklyDay'));
        payload.weeklySchedule = formData.get('weeklySchedule');
      }

      if (frequency === 'biweekly') {
        payload.biweeklyStart = formData.get('biweeklyStart');
      }

      console.log('Adding bill with payload:', payload); // Debug log

      const transaction = await logTransaction(
        supabase,
        user.id,
        'bill_created',
        newBillId,
        payload,
        `Created bill "${payload.name}" for ${fmt(payload.amount)}`
      );

      if (transaction) {
        notify('Bill added successfully!');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      } else {
        notify('Failed to save bill - transaction failed', 'error');
      }
    } catch (error) {
      console.error('Error adding bill:', error);
      notify(`Failed to add bill: ${error.message}`, 'error');
    }
  }

  async function updateBill(billId, formData) {
    try {
      if (!user?.id) {
        notify('Please log in to update bills', 'error');
        return;
      }

      const originalBill = bills.find(b => b.id === billId);
      if (!originalBill) {
        notify('Bill not found', 'error');
        return;
      }

      const frequency = formData.get('frequency');

      const newData = {
        name: formData.get('name'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        frequency,
        accountId: formData.get('accountId'),
        notes: formData.get('notes') || '',
        autopay: formData.get('autopay') === 'on'
      };

      // Add frequency-specific fields
      if (frequency === 'monthly' || frequency === 'yearly') {
        newData.dueDay = Number(formData.get('dueDay'));
      }

      if (frequency === 'yearly') {
        newData.yearlyMonth = Number(formData.get('yearlyMonth'));
      }

      if (frequency === 'weekly') {
        newData.weeklyDay = Number(formData.get('weeklyDay'));
        newData.weeklySchedule = formData.get('weeklySchedule');
      }

      if (frequency === 'biweekly') {
        newData.biweeklyStart = formData.get('biweeklyStart');
      }

      // Smart change tracking - detect what actually changed
      const changedFields = {};
      const significantChanges = [];

      Object.keys(newData).forEach(key => {
        if (originalBill[key] !== newData[key]) {
          changedFields[key] = {
            from: originalBill[key],
            to: newData[key]
          };

          // Track significant changes for notification
          if (key === 'amount') {
            const diff = newData[key] - originalBill[key];
            significantChanges.push(
              `Amount changed from ${fmt(originalBill[key])} to ${fmt(newData[key])} (${diff > 0 ? '+' : ''}${fmt(diff)})`
            );
          } else if (key === 'name') {
            significantChanges.push(`Name changed from "${originalBill[key]}" to "${newData[key]}"`);
          } else if (key === 'category') {
            significantChanges.push(`Category changed from "${originalBill[key]}" to "${newData[key]}"`);
          } else if (key === 'frequency') {
            significantChanges.push(`Frequency changed from ${originalBill[key]} to ${newData[key]}`);
          } else if (key === 'accountId') {
            const oldAccount = accounts.find(a => a.id === originalBill[key])?.name || 'Unknown';
            const newAccount = accounts.find(a => a.id === newData[key])?.name || 'Unknown';
            significantChanges.push(`Account changed from ${oldAccount} to ${newAccount}`);
          }
        }
      });

      if (Object.keys(changedFields).length === 0) {
        notify('No changes detected', 'warning');
        setEditingBill(null);
        return;
      }

      // Create detailed description of changes
      const changeDescription = significantChanges.length > 0
        ? `Updated bill "${newData.name}": ${significantChanges.join(', ')}`
        : `Updated bill "${newData.name}"`;

      const transaction = await logTransaction(
        supabase,
        user.id,
        'bill_modification',
        billId,
        {
          changes: newData,
          changedFields,
          previousValues: Object.keys(changedFields).reduce((prev, key) => {
            prev[key] = originalBill[key];
            return prev;
          }, {}),
          changeTimestamp: new Date().toISOString(),
          changeContext: 'user_edit'
        },
        changeDescription
      );

      if (transaction) {
        setEditingBill(null);
        notify(`Bill updated! Changes: ${significantChanges.join(', ')}`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      notify('Failed to update bill', 'error');
    }
  }

  async function togglePaid(b){
    try {
      if (!user?.id) {
        notify('Please log in to update payment status', 'error');
        return;
      }

      const currentMonth = yyyyMm();
      const isPaid = b.paidMonths.includes(currentMonth);

      // Smart transaction handling - check for recent opposing transaction
      const recentOpposingTransaction = transactions
        .filter(tx =>
          tx.type === 'bill_payment' &&
          tx.item_id === b.id &&
          tx.payload.month === currentMonth &&
          tx.payload.is_paid === isPaid // Find the opposite of what we want to set
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]; // Most recent first

      if (recentOpposingTransaction) {
        // Remove the opposing transaction instead of adding a new one
        try {
          const { error } = await supabase
            .from('transaction_log')
            .delete()
            .eq('id', recentOpposingTransaction.id);

          if (error) throw error;

          // Update local state by removing the transaction
          setTransactions(prev => prev.filter(tx => tx.id !== recentOpposingTransaction.id));

          notify(`${b.name} payment status reverted`, 'success');
        } catch (deleteError) {
          console.error('Error removing opposing transaction:', deleteError);
          // Fallback to creating new transaction if delete fails
          await createNewPaymentTransaction();
        }
      } else {
        // No recent opposing transaction, create a new one
        await createNewPaymentTransaction();
      }

      async function createNewPaymentTransaction() {
        const transaction = await logTransaction(
          supabase,
          user.id,
          'bill_payment',
          b.id,
          {
            month: currentMonth,
            is_paid: !isPaid,
            accountId: b.accountId,
            amount: b.amount
          },
          `Bill "${b.name}" marked as ${!isPaid ? 'paid' : 'unpaid'} for ${currentMonth}`
        );

        if (transaction) {
          notify(`${b.name} marked as ${!isPaid ? 'paid' : 'not paid'}`, 'success');
          // Optimistic update - add transaction to local state immediately
          setTransactions(prev => [...prev, transaction]);
        }
      }
    } catch (error) {
      console.error('Error toggling paid status:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  async function toggleBillIgnored(b){
    try {
      if (!user?.id) {
        notify('Please log in to update bill status', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'bill_ignored_toggled',
        b.id,
        { ignored: !b.ignored },
        `Bill "${b.name}" ignored status set to ${!b.ignored}`
      );

      if (transaction) {
        notify(`Bill "${b.name}" is now ${b.ignored ? 'shown' : 'hidden'}.`);

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error toggling bill ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  async function toggleAccountIgnored(account){
    try {
      if (!user?.id) {
        notify('Please log in to update account status', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_ignored_toggled',
        account.id,
        { ignored: !account.ignored },
        `Account "${account.name}" ignored status set to ${!account.ignored}`
      );

      if (transaction) {
        notify(`Account "${account.name}" is now ${account.ignored ? 'shown' : 'hidden'}.`);

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error toggling account ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  async function deleteBill(billId){
    try {
      if (!user?.id) {
        notify('Please log in to delete bills', 'error');
        return;
      }

      const bill = bills.find(b => b.id === billId);
      if (!bill) {
        notify('Bill not found', 'error');
        return;
      }

      setConfirmDialog({
        title: 'Delete Bill',
        message: `Are you sure you want to delete "${bill.name}"? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            const transaction = await logTransaction(
              supabase,
              user.id,
              'bill_deleted',
              billId,
              {},
              `Deleted bill "${bill.name}"`
            );
            if (transaction) {
              notify('Bill deleted');
            }
          } catch (error) {
            console.error('Error deleting bill:', error);
            notify('Failed to delete bill', 'error');
          }
        },
        onCancel: () => {}
      });
    } catch (error) {
      console.error('Error deleting bill:', error);
      notify('Failed to delete bill', 'error');
    }
  }

  // ACCOUNT FUNCTIONS
  async function addAccount(name, type, balance = 0, accountType = 'debit', apr = null, creditLimit = null) {
    try {
      if (!user?.id) {
        notify('Please log in to add accounts', 'error');
        return;
      }

      if (!name || !type) {
        notify('Please fill in all required fields', 'error');
        return;
      }

      const newAccountId = crypto.randomUUID();
      const balanceValue = Number(balance) || 0;
      const aprValue = accountType === 'credit' ? (Number(apr) || 0) : null;
      const creditLimitValue = accountType === 'credit' ? (Number(creditLimit) || 0) : null;

      console.log('Adding account:', { name, type, balance: balanceValue, accountType, apr: aprValue, creditLimit: creditLimitValue }); // Debug log

      const accountData = {
        name: name.trim(),
        type,
        initial_balance: balanceValue,
        accountType
      };

      if (accountType === 'credit') {
        accountData.apr = aprValue;
        accountData.creditLimit = creditLimitValue;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_created',
        newAccountId,
        accountData,
        `Created ${accountType} account "${name}" with initial balance ${fmt(balanceValue)}`
      );

      if (transaction) {
        notify(`Account "${name}" added`, 'success');
        setShowAddAccount(false); // Close dialog on success

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      } else {
        notify('Failed to save account - transaction failed', 'error');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      notify(`Failed to add account: ${error.message}`, 'error');
    }
  }

  async function updateAccountBalance(accountId, newBalance) {
    try {
      if (!user?.id) {
        notify('Please log in to update account balance', 'error');
        return;
      }

      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        notify('Account not found', 'error');
        return;
      }

      const balanceValue = Number(newBalance);
      if (isNaN(balanceValue)) {
        notify('Please enter a valid number', 'error');
        return;
      }

      console.log('Updating account balance:', { accountId, newBalance, balanceValue }); // Debug log

      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_balance_adjustment',
        accountId,
        { new_balance: balanceValue },
        `Adjusted balance for account "${account.name}" to ${fmt(balanceValue)}`
      );

      if (transaction) {
        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      } else {
        notify('Failed to save balance update', 'error');
      }
      // No success notification needed for this frequent action, UI will update reactively.
    } catch (error) {
      console.error('Error updating account balance:', error);
      notify(`Failed to update account balance: ${error.message}`, 'error');
    }
  }

  async function deleteAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    // Show confirmation dialog
    setConfirmDialog({
      title: 'Delete Account',
      message: `Are you sure you want to delete the account "${account.name}"? This action cannot be undone and will delete all associated bills, one-time costs, recurring income, and credits.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await performAccountDeletion(accountId, account);
      },
      onCancel: () => setConfirmDialog(null)
    });
  }

  async function performAccountDeletion(accountId, account) {
      try {
        const transaction = await logTransaction(
          supabase,
          user.id,
          'account_deleted',
          accountId,
          {},
          `Deleted account "${account.name}"`
        );

        if(transaction) {
          notify(`Account "${account.name}" and its associated items deleted`, 'success');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        notify('Failed to delete account', 'error');
      }
  }

  async function renameAccount(accountId, newName) {
    const account = accounts.find(a => a.id === accountId);
    if (!account || !newName.trim() || newName === account.name) return;

    try {
      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_renamed',
        accountId,
        { old_name: account.name, new_name: newName.trim() },
        `Renamed account from "${account.name}" to "${newName.trim()}"`
      );

      if (transaction) {
        notify(`Account renamed to "${newName.trim()}"`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error renaming account:', error);
      notify('Failed to rename account', 'error');
    }
  }

  async function updateAccount(accountId, updates) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    try {
      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_updated',
        accountId,
        updates,
        `Updated account "${account.name}"`
      );

      if (transaction) {
        notify(`Account "${account.name}" updated successfully`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error updating account:', error);
      notify('Failed to update account', 'error');
    }
  }

  const selectAllOnFocus = (e) => {
    e.target.select();
  };

  // Remaining functions not yet moved
  async function toggleSkipThisMonth(b){
    try {
      const currentMonth = yyyyMm();
      const isSkipped = b.skipMonths?.includes(currentMonth);
      const newSkipMonths = isSkipped
        ? (b.skipMonths || []).filter(m => m !== currentMonth)
        : [...(b.skipMonths || []), currentMonth];

      const transaction = await logTransaction(
        supabase,
        user.id,
        'bill_modification',
        b.id,
        { changes: { skipMonths: newSkipMonths } },
        `Bill "${b.name}" marked as ${!isSkipped ? 'skipped' : 'un-skipped'} for ${currentMonth}`
      );
      if (transaction) {
        notify(`Bill "${b.name}" marked as ${!isSkipped ? 'skipped' : 'un-skipped'} for this month.`);
      }
    } catch (error) {
      console.error('Error toggling skip month:', error);
      notify('Failed to update skip status', 'error');
    }
  }

  // CATEGORY FUNCTIONS
  async function addCategory(name, budget = 500){
    try {
      const nm = name.trim();
      if(!nm) {
        notify('Category name cannot be empty', 'error');
        return;
      }
      if(categories.some(c=>c.name===nm)) {
        notify('Category already exists', 'error');
        return;
      }
      const maxOrder = Math.max(...categories.map(c => c.order || 0), -1);
      const newCategoryId = crypto.randomUUID();
      const payload = {
        name: nm,
        order: maxOrder + 1,
        budget: Number(budget) || 500
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'category_created',
        newCategoryId,
        payload,
        `Created category "${nm}"`
      );

      if (transaction) {
        notify('Category added');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      notify('Failed to add category', 'error');
    }
  }

  async function toggleIgnoreCategory(name){ 
    try {
      const category = categories.find(c => c.name === name);
      if (!category) {
        notify('Category not found', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'category_ignored_toggled',
        category.id,
        { ignored: !category.ignored },
        `Category "${name}" ignored status set to ${!category.ignored}`
      );
      
      if (transaction) {
        notify(`Category "${name}" is now ${!category.ignored ? 'shown' : 'hidden'}.`);
      }
    } catch (error) {
      console.error('Error toggling category ignore:', error);
      notify('Failed to update category', 'error');
    }
  }

  async function removeCategory(name){ 
    try {
      const category = categories.find(c => c.name === name);
      if (!category) return;

      const billsInCategory = bills.filter(b => b.category === name);
      const otcsInCategory = oneTimeCosts.filter(o => o.category === name);
      const hasItems = billsInCategory.length > 0 || otcsInCategory.length > 0;

      let confirmationMessage = `Are you sure you want to delete the category "${name}"?`;
      if (hasItems) {
        confirmationMessage += ` There are ${billsInCategory.length + otcsInCategory.length} items (bills/one-time costs) currently assigned to this category. You cannot delete categories that have items assigned to them. Please reassign the items to another category first.`;
        setConfirmDialog({
          title: 'Cannot Delete Category',
          message: confirmationMessage,
          onConfirm: () => setConfirmDialog(null),
          showCancel: false
        });
        return;
      } else {
        confirmationMessage += ` This action cannot be undone.`;
      }

      // Show confirmation dialog
      setConfirmDialog({
        title: 'Delete Category',
        message: confirmationMessage,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            // Delete category (we already checked it has no items)
            const transaction = await logTransaction(
              supabase, user.id, 'category_deleted', category.id, {}, `Deleted category "${name}"`
            );

            if (transaction) {
              notify(`Category "${name}" deleted successfully.`, 'success');
            }
          } catch (error) {
            console.error('Error removing category:', error);
            notify('Failed to remove category', 'error');
          }
        },
        onCancel: () => setConfirmDialog(null)
      });
      return;
    } catch (error) {
      console.error('Error removing category:', error);
      notify('Failed to remove category', 'error');
    }
  }

  async function moveCategoryUp(id) {
    try {
      const cats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
      const index = cats.findIndex(c => c.id === id);
      if (index <= 0) return;
      
      const cat1 = cats[index];
      const cat2 = cats[index - 1];
      
      const order1 = cat1.order;
      const order2 = cat2.order;

      await logTransaction(
        supabase, user.id, 'category_order_changed', cat1.id, { new_order: order2 }, `Category "${cat1.name}" moved up`
      );
      await logTransaction(
        supabase, user.id, 'category_order_changed', cat2.id, { new_order: order1 }, `Category "${cat2.name}" moved down`
      );

      notify('Category moved up', 'success');
    } catch (error) {
      console.error('Error moving category up:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  async function moveCategoryDown(id) {
    try {
      const cats = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
      const index = cats.findIndex(c => c.id === id);
      if (index < 0 || index >= cats.length - 1) return;
      
      const cat1 =cats[index];
      const cat2 = cats[index + 1];
      
      const order1 = cat1.order;
      const order2 = cat2.order;

      await logTransaction(
        supabase, user.id, 'category_order_changed', cat1.id, { new_order: order2 }, `Category "${cat1.name}" moved down`
      );
      await logTransaction(
        supabase, user.id, 'category_order_changed', cat2.id, { new_order: order1 }, `Category "${cat2.name}" moved up`
      );

      notify('Category moved down', 'success');
    } catch (error) {
      console.error('Error moving category down:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  // Smart Data Merging and Conflict Resolution Functions
  async function resolveTransactionConflict() {
    try {
      if (transactionsConflicts.length === 0) return;

      const resolvedConflicts = [];

      for (const conflict of transactionsConflicts) {
        // Use latest timestamp as the winner
        const winner = conflict.versions.reduce((latest, current) =>
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
        );

        await logTransaction(
          supabase,
          user.id,
          'conflict_resolved',
          conflict.item_id,
          {
            conflict_type: conflict.type,
            resolved_with: winner.id,
            versions_count: conflict.versions.length,
            resolution_strategy: 'latest_timestamp'
          },
          `Resolved conflict for ${conflict.type} - chose latest version`
        );

        resolvedConflicts.push(conflict.item_id);
      }

      notify(`Resolved ${resolvedConflicts.length} conflicts using latest timestamp strategy`, 'success');
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      notify('Failed to resolve conflicts', 'error');
    }
  }

  async function forceSync() {
    try {
      // Clear any existing sync state
      if (hasTransactionsBackup) {
        const backupData = localStorage.getItem('cashflo_transactions_backup');
        if (backupData) {
          const parsed = JSON.parse(backupData);

          // Apply backup data by creating sync transactions
          await logTransaction(
            supabase,
            user.id,
            'backup_restore',
            'force_sync',
            {
              backup_timestamp: parsed.timestamp,
              items_count: parsed.data.length,
              checksum: parsed.checksum
            },
            'Force sync: Applied backup data'
          );
        }

        localStorage.removeItem('cashflo_transactions_backup');
        localStorage.removeItem('cashflo_transactions_checksum');
      }

      // Clear conflicts by accepting all current versions
      if (transactionsConflicts.length > 0) {
        await resolveTransactionConflict();
      }

      // Trigger a fresh sync
      await logTransaction(
        supabase,
        user.id,
        'force_sync_requested',
        'system',
        { timestamp: new Date().toISOString() },
        'User requested force sync'
      );

      notify('Force sync completed - all conflicts resolved', 'success');
    } catch (error) {
      console.error('Error during force sync:', error);
      notify('Force sync failed', 'error');
    }
  }

  // CATEGORY MANAGEMENT FUNCTIONS
  async function updateCategoryBudget(categoryName, newBudget) {
    try {
      if (!user?.id) {
        notify('Please log in to update budgets', 'error');
        return;
      }

      const budgetValue = Number(newBudget) || 0;

      const category = categories.find(c => c.name === categoryName);
      if (!category) {
        notify('Category not found', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'category_budget_updated',
        category.id,
        { category: categoryName, budget: budgetValue },
        `Updated budget for ${categoryName} to ${fmt(budgetValue)}`
      );

      if (transaction) {
        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error updating category budget:', error);
      notify('Failed to update budget', 'error');
    }
  }

  async function moveCategoryUp(categoryName) {
    try {
      if (!user?.id) {
        notify('Please log in to reorder categories', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'category_order_changed',
        crypto.randomUUID(),
        { category: categoryName, direction: 'up' },
        `Moved ${categoryName} up in order`
      );

      if (transaction) {
        notify(`Moved ${categoryName} up`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error moving category up:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  async function moveCategoryDown(categoryName) {
    try {
      if (!user?.id) {
        notify('Please log in to reorder categories', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'category_order_changed',
        crypto.randomUUID(),
        { category: categoryName, direction: 'down' },
        `Moved ${categoryName} down in order`
      );

      if (transaction) {
        notify(`Moved ${categoryName} down`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error moving category down:', error);
      notify('Failed to reorder category', 'error');
    }
  }

  async function renameCategory(oldName, newName) {
    try {
      if (!user?.id) {
        notify('Please log in to rename categories', 'error');
        return;
      }

      const trimmedName = newName.trim();
      if (!trimmedName) {
        notify('Category name cannot be empty', 'error');
        return;
      }

      if (trimmedName === oldName) {
        return; // No change
      }

      if (categories.some(c => c.name === trimmedName)) {
        notify('Category name already exists', 'error');
        return;
      }

      const category = categories.find(c => c.name === oldName);
      if (!category) {
        notify('Category not found', 'error');
        return;
      }

      const transaction = await logTransaction(
        supabase,
        user.id,
        'category_renamed',
        category.id,
        { old_name: oldName, new_name: trimmedName },
        `Renamed category from "${oldName}" to "${trimmedName}"`
      );

      if (transaction) {
        notify(`Category renamed to "${trimmedName}"`, 'success');

        // Optimistic update - add transaction to local state immediately
        setTransactions(prev => [...prev, transaction]);
      }
    } catch (error) {
      console.error('Error renaming category:', error);
      notify('Failed to rename category', 'error');
    }
  }

  // Transaction management functions
  async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      // Optimistic update: Remove from UI immediately
      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));

      const { error } = await supabase
        .from('transaction_log')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      notify('Transaction deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      notify('Failed to delete transaction', 'error');

      // Revert optimistic update on error by triggering a re-sync
      // The useCloudTransactions hook should automatically refetch on error
    }
  }

  async function editTransaction(transactionId, newDescription) {
    if (!newDescription || !newDescription.trim()) {
      notify('Description cannot be empty', 'error');
      return;
    }

    try {
      // Optimistic update: Update UI immediately
      setTransactions(prev => prev.map(tx =>
        tx.id === transactionId
          ? { ...tx, description: newDescription.trim() }
          : tx
      ));

      const { error } = await supabase
        .from('transaction_log')
        .update({ description: newDescription.trim() })
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      notify('Transaction updated successfully', 'success');
      setEditingTransaction(null);
      setShowTransactionEdit(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      notify('Failed to update transaction', 'error');

      // Revert optimistic update on error by triggering a re-sync
      // The useCloudTransactions hook should automatically refetch on error
      setEditingTransaction(null);
      setShowTransactionEdit(false);
    }
  }

  // Render the dashboard UI
  return (
    <div style={{
      padding: isMobile ? '1rem' : '2rem',
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        padding: isMobile ? '0.25rem' : '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 20px 40px rgba(139, 92, 246, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}>
        {isMobile ? (
          /* Mobile Layout - Logo first, then buttons below */
          <div style={{ textAlign: 'center' }}>
            {/* Logo */}
            <div>
              <img
                src="/logo.png"
                alt="Cashfl0.io Logo"
                style={{
                  height: '120px',
                  width: '100%',
                  maxWidth: '400px',
                  objectFit: 'cover',
                  objectPosition: 'center 48%',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            </div>

            {/* Login/Logout Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', paddingBottom: '1rem' }}>
              {user ? (
                <button
                  onClick={() => supabase.auth.signOut()}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Logout
                </button>
              ) : (
                <>
                  {/* Google OAuth Button */}
                  <button
                    onClick={() => supabase?.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: window.location.origin,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent',
                          hd: 'cashfl0.io'
                        }
                      }
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#4285f4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    🚀 Google
                  </button>

                  {/* Email Login Button */}
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Desktop Layout - Flexbox with positioned elements */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            position: 'relative',
            minHeight: '80px',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem'
          }}>

            {/* Login/Logout Button - Left on desktop */}
            <div style={{ position: 'absolute', left: 0 }}>
              {user ? (
                <button
                  onClick={() => supabase.auth.signOut()}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Logout
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {/* Google OAuth Button */}
                  <button
                    onClick={() => supabase?.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: window.location.origin,
                        queryParams: {
                          access_type: 'offline',
                          prompt: 'consent',
                          hd: 'cashfl0.io'
                        }
                      }
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#4285f4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    🚀 Google
                  </button>

                  {/* Email Login Button */}
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Login
                  </button>
                </div>
              )}
            </div>

            {/* Centered App Title */}
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src="/logo.png"
                  alt="Cashfl0.io Logo"
                  style={{
                    height: '200px',
                    width: 'auto',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
          gap: '1rem',
          marginBottom: '1rem',
          margin: isMobile ? '0 1rem 1rem 1rem' : '0 0 1rem 0'
        }}>
          <div style={{
            background: '#f0fdf4',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #bbf7d0',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
              {fmt(currentLiquidWithGuaranteed)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Available Now</div>
          </div>
          <div style={{
            background: currentLiquidWithGuaranteed >= upcoming.weekDueTotal ? '#f0fdf4' : (currentLiquidWithGuaranteed >= upcoming.weekDueTotal - 300 ? '#fffbeb' : '#fef2f2'),
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: `1px solid ${currentLiquidWithGuaranteed >= upcoming.weekDueTotal ? '#bbf7d0' : (currentLiquidWithGuaranteed >= upcoming.weekDueTotal - 300 ? '#fed7aa' : '#fecaca')}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: currentLiquidWithGuaranteed >= upcoming.weekDueTotal ? '#16a34a' : (currentLiquidWithGuaranteed >= upcoming.weekDueTotal - 300 ? '#d97706' : '#dc2626') }}>
              {fmt(weekNeedWithSavings)}
            </div>
            <div style={{ fontSize: '0.75rem', color: currentLiquidWithGuaranteed >= upcoming.weekDueTotal ? '#15803d' : (currentLiquidWithGuaranteed >= upcoming.weekDueTotal - 300 ? '#92400e' : '#991b1b') }}>Need This Week</div>
          </div>
          <div style={{
            background: '#f0f9ff',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #38bdf8',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0284c7' }}>
              {fmt(afterWeek)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0369a1' }}>After This Week</div>
          </div>
          <div style={{
            background: '#faf5ff',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #c084fc',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#9333ea' }}>
              {fmt(upcoming.weekDueTotal)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7c3aed' }}>Due This Week</div>
          </div>
          <div style={{
            background: '#fffbeb',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #fbbf24',
            textAlign: 'center',
            gridColumn: isMobile ? 'span 2' : 'auto'
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706' }}>
              {fmt(netWorthValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Net Worth</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        marginBottom: '1.5rem',
        background: 'white',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          background: '#f9fafb'
        }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              background: currentView === 'dashboard' ? '#8b5cf6' : 'transparent',
              color: currentView === 'dashboard' ? 'white' : '#6b7280',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setCurrentView('history')}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              background: currentView === 'history' ? '#8b5cf6' : 'transparent',
              color: currentView === 'history' ? 'white' : '#6b7280',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Transaction History
          </button>
          <button
            onClick={() => setCurrentView('tax')}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              background: currentView === 'tax' ? '#8b5cf6' : 'transparent',
              color: currentView === 'tax' ? 'white' : '#6b7280',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💰 Tax Estimator
          </button>
          <button
            onClick={() => setCurrentView('credit')}
            style={{
              flex: 1,
              padding: '1rem 1.5rem',
              background: currentView === 'credit' ? '#8b5cf6' : 'transparent',
              color: currentView === 'credit' ? 'white' : '#6b7280',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💳 Credit Accounts
          </button>
        </div>
      </div>

      {/* Summary Charts Section */}
      {(currentView === 'dashboard' || currentView === 'history') && (
        <div style={{
          marginBottom: '1.5rem',
          background: 'white',
          padding: '1rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            Summary
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            {currentView === 'dashboard' ? (
              <>
                {/* Accounts Pie Chart */}
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
                    Accounts Distribution
                  </h4>
                  <div style={{ display: 'inline-block', position: 'relative' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        const total = accounts.reduce((sum, acc) => {
                          if (acc.accountType === 'credit') {
                            // For credit cards, show available credit (limit - balance)
                            const availableCredit = Math.max(0, (acc.creditLimit || 0) - (acc.balance || 0));
                            return sum + availableCredit;
                          } else {
                            // For regular accounts, show positive balances
                            return sum + Math.max(0, acc.balance);
                          }
                        }, 0);
                        if (total === 0) return <circle cx="70" cy="70" r="60" fill="#f3f4f6" />;

                        let currentAngle = 0;
                        const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

                        return accounts.map((account, index) => {
                          let displayValue;
                          if (account.accountType === 'credit') {
                            // For credit cards, show available credit
                            displayValue = Math.max(0, (account.creditLimit || 0) - (account.balance || 0));
                          } else {
                            // For regular accounts, show positive balances
                            displayValue = Math.max(0, account.balance);
                          }
                          const percentage = displayValue / total;
                          const angle = percentage * 360;

                          if (percentage < 0.01) return null;

                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;

                          const startRadians = (startAngle * Math.PI) / 180;
                          const endRadians = (endAngle * Math.PI) / 180;

                          const x1 = 70 + 60 * Math.cos(startRadians);
                          const y1 = 70 + 60 * Math.sin(startRadians);
                          const x2 = 70 + 60 * Math.cos(endRadians);
                          const y2 = 70 + 60 * Math.sin(endRadians);

                          const largeArc = angle > 180 ? 1 : 0;

                          return (
                            <path
                              key={account.id}
                              d={`M 70 70 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[index % colors.length]}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                    {accounts.filter(acc => {
                      if (acc.accountType === 'credit') {
                        // Show credit cards with available credit
                        return (acc.creditLimit || 0) - (acc.balance || 0) > 0;
                      } else {
                        // Show regular accounts with positive balances
                        return acc.balance > 0;
                      }
                    }).map((account, index) => {
                      let displayValue, displayLabel;
                      if (account.accountType === 'credit') {
                        displayValue = (account.creditLimit || 0) - (account.balance || 0);
                        displayLabel = `${account.name} (Available)`;
                      } else {
                        displayValue = account.balance;
                        displayLabel = account.name;
                      }

                      return (
                        <div key={account.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'][index % 6]
                            }} />
                            <span style={{ color: '#374151' }}>{displayLabel}</span>
                          </div>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{fmt(displayValue)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bills Pie Chart */}
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
                    Bills by Category
                  </h4>
                  <div style={{ display: 'inline-block', position: 'relative' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        const billsByCategory = {};
                        bills.filter(b => !b.ignored).forEach(bill => {
                          billsByCategory[bill.category] = (billsByCategory[bill.category] || 0) + bill.amount;
                        });

                        const total = Object.values(billsByCategory).reduce((sum, amount) => sum + amount, 0);
                        if (total === 0) return <circle cx="70" cy="70" r="60" fill="#f3f4f6" />;

                        let currentAngle = 0;
                        const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

                        return Object.entries(billsByCategory).map(([category, amount], index) => {
                          const percentage = amount / total;
                          const angle = percentage * 360;

                          if (percentage < 0.01) return null;

                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;

                          const startRadians = (startAngle * Math.PI) / 180;
                          const endRadians = (endAngle * Math.PI) / 180;

                          const x1 = 70 + 60 * Math.cos(startRadians);
                          const y1 = 70 + 60 * Math.sin(startRadians);
                          const x2 = 70 + 60 * Math.cos(endRadians);
                          const y2 = 70 + 60 * Math.sin(endRadians);

                          const largeArc = angle > 180 ? 1 : 0;

                          return (
                            <path
                              key={category}
                              d={`M 70 70 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[index % colors.length]}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                    {(() => {
                      const billsByCategory = {};
                      bills.filter(b => !b.ignored).forEach(bill => {
                        billsByCategory[bill.category] = (billsByCategory[bill.category] || 0) + bill.amount;
                      });
                      return Object.entries(billsByCategory).map(([category, amount], index) => (
                        <div key={category} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'][index % 8]
                            }} />
                            <span style={{ color: '#374151' }}>{category}</span>
                          </div>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{fmt(amount)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Credits Pie Chart */}
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
                    Credits by Category
                  </h4>
                  <div style={{ display: 'inline-block', position: 'relative' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        const creditsByCategory = {};
                        transactions.filter(tx => tx.action_type?.includes('payment') && tx.details?.amount > 0).forEach(tx => {
                          const category = tx.details?.category || 'Other';
                          creditsByCategory[category] = (creditsByCategory[category] || 0) + tx.details.amount;
                        });

                        const total = Object.values(creditsByCategory).reduce((sum, amount) => sum + amount, 0);
                        if (total === 0) return <circle cx="70" cy="70" r="60" fill="#f3f4f6" />;

                        let currentAngle = 0;
                        const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];

                        return Object.entries(creditsByCategory).map(([category, amount], index) => {
                          const percentage = amount / total;
                          const angle = percentage * 360;

                          if (percentage < 0.01) return null;

                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;

                          const startRadians = (startAngle * Math.PI) / 180;
                          const endRadians = (endAngle * Math.PI) / 180;

                          const x1 = 70 + 60 * Math.cos(startRadians);
                          const y1 = 70 + 60 * Math.sin(startRadians);
                          const x2 = 70 + 60 * Math.cos(endRadians);
                          const y2 = 70 + 60 * Math.sin(endRadians);

                          const largeArc = angle > 180 ? 1 : 0;

                          return (
                            <path
                              key={category}
                              d={`M 70 70 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[index % colors.length]}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                    {(() => {
                      const creditsByCategory = {};
                      transactions.filter(tx => tx.action_type?.includes('payment') && tx.details?.amount > 0).forEach(tx => {
                        const category = tx.details?.category || 'Other';
                        creditsByCategory[category] = (creditsByCategory[category] || 0) + tx.details.amount;
                      });
                      return Object.entries(creditsByCategory).map(([category, amount], index) => (
                        <div key={category} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'][index % 6]
                            }} />
                            <span style={{ color: '#374151' }}>{category}</span>
                          </div>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{fmt(amount)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Debits Pie Chart */}
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
                    Debits by Category
                  </h4>
                  <div style={{ display: 'inline-block', position: 'relative' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        const debitsByCategory = {};
                        transactions.filter(tx => !tx.action_type?.includes('payment') && tx.details?.amount > 0).forEach(tx => {
                          const category = tx.details?.category || 'Other';
                          debitsByCategory[category] = (debitsByCategory[category] || 0) + tx.details.amount;
                        });

                        const total = Object.values(debitsByCategory).reduce((sum, amount) => sum + amount, 0);
                        if (total === 0) return <circle cx="70" cy="70" r="60" fill="#f3f4f6" />;

                        let currentAngle = 0;
                        const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

                        return Object.entries(debitsByCategory).map(([category, amount], index) => {
                          const percentage = amount / total;
                          const angle = percentage * 360;

                          if (percentage < 0.01) return null;

                          const startAngle = currentAngle;
                          const endAngle = currentAngle + angle;
                          currentAngle = endAngle;

                          const startRadians = (startAngle * Math.PI) / 180;
                          const endRadians = (endAngle * Math.PI) / 180;

                          const x1 = 70 + 60 * Math.cos(startRadians);
                          const y1 = 70 + 60 * Math.sin(startRadians);
                          const x2 = 70 + 60 * Math.cos(endRadians);
                          const y2 = 70 + 60 * Math.sin(endRadians);

                          const largeArc = angle > 180 ? 1 : 0;

                          return (
                            <path
                              key={category}
                              d={`M 70 70 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={colors[index % colors.length]}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                    {(() => {
                      const debitsByCategory = {};
                      transactions.filter(tx => !tx.action_type?.includes('payment') && tx.details?.amount > 0).forEach(tx => {
                        const category = tx.details?.category || 'Other';
                        debitsByCategory[category] = (debitsByCategory[category] || 0) + tx.details.amount;
                      });
                      return Object.entries(debitsByCategory).map(([category, amount], index) => (
                        <div key={category} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'][index % 8]
                            }} />
                            <span style={{ color: '#374151' }}>{category}</span>
                          </div>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{fmt(amount)}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Filter - Show on both dashboard and transaction history */}
      {(currentView === 'dashboard' || currentView === 'history') && (
        <div
          ref={categoryFilterRef}
          style={{
            marginBottom: '2rem',
            background: 'white',
            padding: '0.5rem',
            borderRadius: '1rem',
            boxShadow: categoryFilterSticky ? '0 8px 16px rgba(0, 0, 0, 0.15)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            position: categoryFilterSticky ? 'fixed' : 'static',
            top: categoryFilterSticky ? (isMobile ? '10px' : '15px') : 'auto',
            left: categoryFilterSticky ? (isMobile ? '1rem' : '50%') : 'auto',
            right: categoryFilterSticky && isMobile ? '1rem' : 'auto',
            transform: categoryFilterSticky && !isMobile ? 'translateX(-50%)' : 'none',
            width: categoryFilterSticky && !isMobile ? 'calc(100% - 4rem)' : 'auto',
            maxWidth: categoryFilterSticky ? (isMobile ? 'none' : '1200px') : 'none',
            zIndex: categoryFilterSticky ? 1000 : 'auto',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: categoryFilterSticky ? 'blur(8px)' : 'none',
            background: categoryFilterSticky ? 'rgba(255, 255, 255, 0.95)' : 'white'
          }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: isMobile ? 'auto' : 'visible',
            padding: '0.25rem 0',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: isMobile ? 'nowrap' : 'wrap'
          }}>
            <button
              onClick={() => setSelectedCat('All')}
              style={{
                padding: '0.5rem 1rem',
                background: selectedCat === 'All' ? '#8b5cf6' : '#f3f4f6',
                color: selectedCat === 'All' ? 'white' : '#6b7280',
                border: '2px solid',
                borderColor: selectedCat === 'All' ? '#8b5cf6' : '#e5e7eb',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              All
            </button>
            {activeCats.map(cat => {
              const categoryData = categories.find(c => c.name === cat);
              const spending = categorySpending[cat] || 0;
              const budget = categoryData?.budget || 0;

              // Determine budget status color
              let budgetColor = '#e5e7eb'; // Default gray
              if (budget > 0) {
                const percentage = (spending / budget) * 100;
                if (percentage >= 100) {
                  budgetColor = '#ef4444'; // Red for over budget
                } else if (percentage >= 80) {
                  budgetColor = '#f59e0b'; // Orange for near budget
                } else if (percentage >= 50) {
                  budgetColor = '#10b981'; // Green for good
                }
              }

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: selectedCat === cat ? '#8b5cf6' : '#f3f4f6',
                    color: selectedCat === cat ? 'white' : '#6b7280',
                    border: '2px solid',
                    borderColor: selectedCat === cat ? '#8b5cf6' : budgetColor,
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {budget > 0 && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: budgetColor,
                      flexShrink: 0
                    }} />
                  )}
                  {cat}
                </button>
              );
            })}

            {/* Show Ignored Button */}
            <button
              onClick={() => setShowIgnored(!showIgnored)}
              style={{
                padding: '0.5rem 0.75rem',
                background: showIgnored ? '#f59e0b' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {showIgnored ? '👁️ Hide Ignored Bills' : '👁️‍🗨️ Show Ignored Bills'}
            </button>
          </div>
        </div>
      )}

      {/* Placeholder div to maintain layout when category filter is sticky */}
      {categoryFilterSticky && (currentView === 'dashboard' || currentView === 'history') && (
        <div style={{ height: '76px', marginBottom: '2rem' }} />
      )}

      {/* Dashboard Content */}
      {currentView === 'dashboard' && (
        <>
      {/* Top Row: Accounts, Credits, and Due This Week - Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Accounts Section */}
        <AccountsSection
          isMobile={isMobile}
          accounts={accounts}
          setShowAddAccount={setShowAddAccount}
          deleteAccount={deleteAccount}
          updateAccountBalance={updateAccountBalance}
          currentLiquidWithGuaranteed={currentLiquidWithGuaranteed}
          renameAccount={renameAccount}
          accountsView={accountsView}
          setAccountsView={setAccountsView}
          updateAccount={updateAccount}
          setEditingAccount={setEditingAccount}
          toggleAccountIgnored={toggleAccountIgnored}
          supabase={supabase}
          user={user}
        />

        {/* Income & Credits */}
        <div style={{
          background: 'white',
          padding: '0.75rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Income</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowAddIncome(true)}
                style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                + Income
              </button>
              <button
                onClick={() => setShowAddCredit(true)}
                style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                + Credit
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
            {/* Recurring Income */}
            {recurringIncome.map(income => {
              const account = accounts.find(a => a.id === income.accountId);
              const nextDate = getNextIncomeOccurrence(income);
              const isReceived = income.receivedThisMonth;

              return (
                <div key={income.id} style={{
                  background: isReceived ? '#f0fdf4' : '#fef3c7',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${isReceived ? '#bbf7d0' : '#fde68a'}`,
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: '#10b981',
                    color: 'white',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.625rem',
                    fontWeight: '600'
                  }}>
                    RECURRING
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div style={{ paddingRight: '4rem' }}>
                      <div style={{ fontWeight: '500', fontSize: '1rem' }}>{income.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {income.frequency} • Next: {nextDate.toLocaleDateString()} • {account?.name}
                      </div>
                      {income.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{income.notes}</div>}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>
                      +{fmt(income.amount)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleIncomeReceived(income)}
                      style={{ padding: '0.25rem 0.5rem', background: isReceived ? '#f59e0b' : '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      {isReceived ? 'Mark Pending' : 'Mark Received'}
                    </button>
                    <button
                      onClick={() => deleteIncome(income.id)}
                      style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Upcoming Credits */}
            {upcomingCredits
              .filter(c => !c.ignored)
              .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))
              .map(credit => {
                const account = accounts.find(a => a.id === credit.accountId);
                const isOverdue = new Date(credit.expectedDate) < new Date();

                return (
                  <div key={credit.id} style={{
                    background: credit.guaranteed ? '#f0fdf4' : '#f8fafc',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${credit.guaranteed ? '#16a34a' : '#e2e8f0'}`,
                    position: 'relative'
                  }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '1rem' }}>{credit.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          Expected: {new Date(credit.expectedDate).toLocaleDateString()} • {account?.name}
                          {isOverdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                          {credit.guaranteed && <span style={{ color: '#16a34a', fontWeight: '600' }}> • GUARANTEED</span>}
                        </div>
                        {credit.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem' }}>{credit.notes}</div>}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                        +{fmt(credit.amount)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => receiveCredit(credit.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Receive
                      </button>
                      <button
                        onClick={() => toggleCreditGuaranteed(credit.id)}
                        style={{ padding: '0.25rem 0.5rem', background: credit.guaranteed ? '#f59e0b' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {credit.guaranteed ? 'Make Expected' : 'Make Guaranteed'}
                      </button>
                      <button
                        onClick={() => deleteCredit(credit.id)}
                        style={{ padding: '0.25rem 0.5rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Empty state */}
            {recurringIncome.length === 0 && upcomingCredits.filter(c => !c.ignored).length === 0 && (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                No income or credits yet. Add your first recurring income or expected credit!
              </div>
            )}
          </div>
        </div>

        {/* Due This Week */}
        <div style={{
          background: 'white',
          padding: '0.75rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#000' }}>Due This Week</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: isMobile ? '400px' : '500px', overflowY: 'auto' }}>
            {upcoming.items.map((item, index) => {
              const account = accounts.find(a => a.id === (item.bill?.accountId || item.otc?.accountId));
              const amount = item.bill?.amount || item.otc?.amount;
              const name = item.bill?.name || item.otc?.name;

              return (
                <div key={index} style={{
                  background: item.overdue ? '#fef2f2' : '#f9fafb',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${item.overdue ? '#fca5a5' : '#e5e7eb'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '1rem', color: '#000' }}>{name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Due: {item.due.toLocaleDateString()} • {account?.name}
                        {item.overdue && <span style={{ color: '#dc2626', fontWeight: '600' }}> • OVERDUE</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: item.overdue ? '#dc2626' : '#374151' }}>
                      {fmt(amount)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {item.bill && (
                      <button
                        onClick={() => togglePaid(item.bill)}
                        style={{ padding: '0.25rem 0.5rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Mark Paid
                      </button>
                    )}
                    {item.otc && (
                      <button
                        onClick={() => toggleOneTimePaid(item.otc)}
                        style={{ padding: '0.25rem 0.5rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {upcoming.items.length === 0 && (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                Nothing due this week! 🎉
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Third Row: Bills & One-Time Costs Section with Toggle */}
      <div ref={billsSectionRef} style={{ marginBottom: '1.5rem' }}>
        <div style={{ background: 'white', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {/* Toggle Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '0.5rem', padding: '0.25rem' }}>
              <button
                onClick={() => setBillsOtcView('bills')}
                style={{
                  padding: '0.5rem 1rem',
                  background: billsOtcView === 'bills' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                  color: billsOtcView === 'bills' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📋 Bills
              </button>
              <button
                onClick={() => setBillsOtcView('otc')}
                style={{
                  padding: '0.5rem 1rem',
                  background: billsOtcView === 'otc' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'transparent',
                  color: billsOtcView === 'otc' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                💸 One-Time Costs
              </button>
            </div>
          </div>

          {/* Conditional Content */}
          {billsOtcView === 'bills' ? (
            <BillsSection
              isMobile={isMobile}
              bills={bills}
              accounts={accounts}
              activeCats={activeCats}
              showIgnored={showIgnored}
              selectedCats={selectedCats}
              totalBillsForSelectedCategory={totalBillsForSelectedCategory}
              togglePaid={togglePaid}
              toggleBillIgnored={toggleBillIgnored}
              deleteBill={deleteBill}
              setEditingBill={setEditingBill}
              editingBill={editingBill}
              updateBill={updateBill}
              addBill={addBill}
              getDefaultAutoDeductAccount={getDefaultAutoDeductAccount}
              user={user}
              supabase={supabase}
            />
          ) : (
            <OneTimeCostsSection
              isMobile={isMobile}
              user={user}
              supabase={supabase}
              accounts={accounts}
              activeCats={activeCats}
              oneTimeCosts={oneTimeCosts}
              otcName={otcName}
              setOtcName={setOtcName}
              otcCategory={otcCategory}
              setOtcCategory={setOtcCategory}
              otcAmount={otcAmount}
              setOtcAmount={setOtcAmount}
              otcDueDate={otcDueDate}
              setOtcDueDate={setOtcDueDate}
              otcAccountId={otcAccountId}
              setOtcAccountId={setOtcAccountId}
              otcNotes={otcNotes}
              setOtcNotes={setOtcNotes}
              otcTaxCategory={otcTaxCategory}
              setOtcTaxCategory={setOtcTaxCategory}
              otcMarkAsPaid={otcMarkAsPaid}
              setOtcMarkAsPaid={setOtcMarkAsPaid}
              otcAutoDeduct={otcAutoDeduct}
              setOtcAutoDeduct={setOtcAutoDeduct}
              selectedCats={selectedCats}
              showIgnored={showIgnored}
              editingOTC={editingOTC}
              setEditingOTC={setEditingOTC}
              toggleOneTimePaid={toggleOneTimePaid}
              selectAllOnFocus={selectAllOnFocus}
              deleteOneTimeCost={deleteOneTimeCost}
              autoDeductCash={autoDeductCash}
              autoDeductBank={autoDeductBank}
              getDefaultAutoDeductAccount={getDefaultAutoDeductAccount}
            />
          )}
        </div>
      </div>


        {/* Settings Section at bottom of dashboard */}
        <div style={{
          marginBottom: '2rem',
          background: 'white',
          padding: '1rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#1f2937'
          }}>
            <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>Settings</span>
            <button
              onClick={() => { forceTransactionsSync(); }}
              style={{
                marginLeft: 'auto',
                padding: '0.25rem 0.75rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              🔄 Force Sync
            </button>
          </div>

          {/* Settings Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              background: '#f9fafb',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={autoDeductCash}
                onChange={(e) => setAutoDeductCash(e.target.checked)}
                style={{ accentColor: '#8b5cf6' }}
              />
              💰 Auto-deduct from cash
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              background: '#f9fafb',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={autoDeductBank}
                onChange={(e) => setAutoDeductBank(e.target.checked)}
                style={{ accentColor: '#8b5cf6' }}
              />
              🏦 Auto-deduct from bank account
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              background: '#f9fafb',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="checkbox"
                checked={includeGuaranteedInNetWorth}
                onChange={(e) => setIncludeGuaranteedInNetWorth(e.target.checked)}
                style={{ accentColor: '#8b5cf6' }}
              />
              💎 Include guaranteed income in net worth
            </label>
          </div>

          {/* Sync Status */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            fontSize: '0.875rem',
            color: '#6b7280',
            flexWrap: 'wrap'
          }}>
            {isSyncing && (
              <span style={{
                background: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}>
                ⏳ Syncing...
              </span>
            )}
            {hasTransactionsBackup && (
              <span style={{
                background: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem',
                color: '#0369a1',
                border: '1px solid #bae6fd'
              }}>
                💾 Backup available
              </span>
            )}
            {transactionsConflicts.length > 0 && (
              <button
                onClick={() => resolveTransactionConflict()}
                style={{
                  background: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                ⚠️ Resolve {transactionsConflicts.length} conflict{transactionsConflicts.length === 1 ? '' : 's'}
              </button>
            )}
          </div>

          {/* Category Budget Management */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '600' }}>Category Budget Management</span>
              <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>🟢 Under Budget</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>🟡 Close to Budget</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>🔴 Over Budget</span>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '0.75rem'
            }}>
              {activeCats.map((cat, index) => {
                const categoryData = categories.find(c => c.name === cat);
                const spending = categorySpending[cat] || 0;
                const budget = categoryData?.budget || 0;

                // Determine budget status color
                let budgetColor = '#e5e7eb';
                let bgColor = '#f9fafb';
                let borderColor = '#e5e7eb';
                if (budget > 0) {
                  const percentage = (spending / budget) * 100;
                  if (percentage >= 100) {
                    budgetColor = '#ef4444';
                    bgColor = '#fef2f2';
                    borderColor = '#fecaca';
                  } else if (percentage >= 80) {
                    budgetColor = '#f59e0b';
                    bgColor = '#fffbeb';
                    borderColor = '#fed7aa';
                  } else {
                    budgetColor = '#10b981';
                    bgColor = '#f0fdf4';
                    borderColor = '#bbf7d0';
                  }
                }

                return (
                  <div
                    key={cat}
                    style={{
                      padding: '0.75rem',
                      background: bgColor,
                      borderRadius: '0.5rem',
                      border: `2px solid ${borderColor}`,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {/* Color indicator */}
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: budgetColor,
                        flexShrink: 0
                      }} />

                      {/* Category name and reorder buttons */}
                      <div style={{ flex: 1 }}>
                        {editingCategoryName === cat ? (
                          <input
                            type="text"
                            value={tempCategoryName}
                            onChange={(e) => setTempCategoryName(e.target.value)}
                            onBlur={() => {
                              if (tempCategoryName.trim() && tempCategoryName !== cat) {
                                renameCategory(cat, tempCategoryName.trim());
                              }
                              setEditingCategoryName(null);
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                if (tempCategoryName.trim() && tempCategoryName !== cat) {
                                  renameCategory(cat, tempCategoryName.trim());
                                }
                                setEditingCategoryName(null);
                              } else if (e.key === 'Escape') {
                                setEditingCategoryName(null);
                              }
                            }}
                            autoFocus={true}
                            style={{
                              fontWeight: '600',
                              fontSize: '1rem',
                              background: 'white',
                              border: '2px solid #2563eb',
                              borderRadius: '0.375rem',
                              padding: '0.25rem 0.5rem',
                              width: '100%',
                              maxWidth: '200px'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.375rem',
                              transition: 'all 0.2s ease',
                              display: 'inline-block'
                            }}
                            onClick={() => {
                              setEditingCategoryName(cat);
                              setTempCategoryName(cat);
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f3f4f6';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            {cat}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {index > 0 && (
                          <button
                            onClick={() => moveCategoryUp(cat)}
                            style={{
                              padding: '0.125rem 0.25rem',
                              background: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              cursor: 'pointer'
                            }}
                          >
                            ↑
                          </button>
                        )}
                        {index < activeCats.length - 1 && (
                          <button
                            onClick={() => moveCategoryDown(cat)}
                            style={{
                              padding: '0.125rem 0.25rem',
                              background: '#8b5cf6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              cursor: 'pointer'
                            }}
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Budget info and edit */}
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      Spent: {fmt(spending)} / Budget: {fmt(budget)}
                      {budget > 0 && (
                        <span style={{ marginLeft: '0.5rem', fontWeight: '600', color: budgetColor }}>
                          ({Math.round((spending / budget) * 100)}%)
                        </span>
                      )}
                    </div>

                    {/* Edit budget and delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {editingCategoryId === categoryData?.id ? (
                        <>
                          <input
                            ref={(input) => {
                              if (input) {
                                input.budgetValue = budget;
                              }
                            }}
                            type="number"
                            defaultValue={budget}
                            onChange={(e) => {
                              e.target.budgetValue = Number(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateCategoryBudget(cat, Number(e.target.value));
                                setEditingCategoryId(null);
                              } else if (e.key === 'Escape') {
                                setEditingCategoryId(null);
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '0.25rem 0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem'
                            }}
                            autoFocus={true}
                          />
                          <button
                            onClick={(e) => {
                              const input = e.target.parentElement.querySelector('input');
                              updateCategoryBudget(cat, Number(input.value));
                              setEditingCategoryId(null);
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingCategoryId(categoryData?.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              cursor: 'pointer'
                            }}
                          >
                            Edit Budget
                          </button>
                          <button
                            onClick={() => removeCategory(cat)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#dc2626';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#ef4444';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Category Section */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '0.5rem',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#6b21a8',
                margin: '0 0 1rem 0'
              }}>
                Add New Category
              </h4>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setShowAddCategory(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 8px rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 12px rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  + Add New Category
                </button>
              </div>
            </div>
          </div>
        </div>

        </>
      )}

      {/* Transaction History Tab */}
      {currentView === 'history' && featuresLoaded.advanced && (
        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#000' }}>Transaction History</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => setShowTransactionImport(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                📊 Import
              </button>
              <button
                onClick={handleExport}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                📄 Export
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search transactions..."
              value={transactionFilter}
              onChange={(e) => setTransactionFilter(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                minWidth: '200px'
              }}
            />

            {/* Credits/Debits Toggle */}
            <div style={{ display: 'flex', gap: '0.25rem', background: '#f3f4f6', borderRadius: '0.5rem', padding: '0.25rem' }}>
              <button
                onClick={() => setTransactionTypeFilter('all')}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: transactionTypeFilter === 'all' ? '#8b5cf6' : 'transparent',
                  color: transactionTypeFilter === 'all' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                All
              </button>
              <button
                onClick={() => setTransactionTypeFilter('credits')}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: transactionTypeFilter === 'credits' ? '#10b981' : 'transparent',
                  color: transactionTypeFilter === 'credits' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                💰 Credits
              </button>
              <button
                onClick={() => setTransactionTypeFilter('debits')}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: transactionTypeFilter === 'debits' ? '#ef4444' : 'transparent',
                  color: transactionTypeFilter === 'debits' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                💸 Debits
              </button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No transactions found. Start using the app to see your transaction history!
            </div>
          ) : (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <div style={{
                background: '#f9fafb',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 80px' : '1fr 1fr 120px 120px 100px 120px',
                gap: '1rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                <button
                  onClick={() => requestSort('description')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  Name {sortConfig.key === 'description' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                </button>
                {!isMobile && (
                  <button
                    onClick={() => requestSort('category')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    Category {sortConfig.key === 'category' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                  </button>
                )}
                {!isMobile && (
                  <button
                    onClick={() => requestSort('timestamp')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    Date {sortConfig.key === 'timestamp' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                  </button>
                )}
                {!isMobile && (
                  <button
                    onClick={() => requestSort('amount')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      cursor: 'pointer',
                      textAlign: 'right',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '0.25rem'
                    }}
                  >
                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
                  </button>
                )}
                <div>Type</div>
                {!isMobile && <div>Actions</div>}
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredTransactions
                  .slice(0, 100)
                  .map((tx, index) => {
                    // Extract transaction data
                    const transactionName = tx.description || 'No description';
                    const category = tx.payload?.category || '';
                    const amount = tx.payload?.amount || 0;

                    // Proper credit/debit detection based on transaction types
                    const isCredit = tx.type === 'credit_received' ||
                                    tx.type === 'recurring_income_received';

                    const isDebit = tx.type === 'bill_payment' ||
                                   tx.type === 'one_time_cost_payment';

                    return (
                      <div
                        key={tx.id || index}
                        style={{
                          padding: '0.75rem 1rem',
                          borderBottom: index < 99 ? '1px solid #f3f4f6' : 'none',
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr 80px' : '1fr 1fr 120px 120px 100px 120px',
                          gap: '1rem',
                          fontSize: '0.875rem',
                          alignItems: 'center'
                        }}
                      >
                        {/* Name Column */}
                        <div>
                          <div style={{ fontWeight: '500' }}>{transactionName}</div>
                          {isMobile && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {new Date(tx.timestamp).toLocaleDateString()} • {category} • {amount ? (isDebit ? '-' : '+') + fmt(amount) : 'N/A'}
                              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                                <button
                                  onClick={() => {
                                    setEditingTransaction(tx);
                                    setShowTransactionEdit(true);
                                  }}
                                  style={{
                                    padding: '0.125rem 0.25rem',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.625rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteTransaction(tx.id)}
                                  style={{
                                    padding: '0.125rem 0.25rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.625rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Category Column */}
                        {!isMobile && (
                          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                            {category}
                          </div>
                        )}

                        {/* Date Column */}
                        {!isMobile && (
                          <div style={{ color: '#6b7280' }}>
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        )}

                        {/* Amount Column */}
                        {!isMobile && (
                          <div style={{
                            fontWeight: '600',
                            color: isDebit ? '#dc2626' : '#059669',
                            textAlign: 'right'
                          }}>
                            {amount ? (isDebit ? '-' : '+') + fmt(amount) : 'N/A'}
                          </div>
                        )}

                        {/* Type Column */}
                        <div>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.625rem',
                            fontWeight: '600',
                            background: isDebit ? '#fef3c7' : '#dbeafe',
                            color: isDebit ? '#92400e' : '#1e40af'
                          }}>
                            {tx.type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>

                        {/* Actions Column */}
                        {!isMobile && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => {
                                setEditingTransaction(tx);
                                setShowTransactionEdit(true);
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                fontSize: '0.625rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteTransaction(tx.id)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                fontSize: '0.625rem',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tax Estimator Tab */}
      {currentView === 'tax' && (
        <TaxSection
          isMobile={isMobile}
          transactions={transactions}
          bills={bills}
          oneTimeCosts={oneTimeCosts}
        />
      )}

      {/* Credit Accounts Tab */}
      {currentView === 'credit' && (
        <CreditSection
          isMobile={isMobile}
          accounts={accounts}
          transactions={transactions}
        />
      )}

      {/* Add Credit Dialog */}
      {showAddCredit && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Upcoming Credit</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addUpcomingCredit(
                formData.get('name'),
                formData.get('amount'),
                formData.get('expectedDate'),
                formData.get('accountId'),
                formData.get('guaranteed') === 'on',
                formData.get('notes')
              );
            }}>
              <input name="name" placeholder="Credit name (e.g., Tax Refund)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 2500.00)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <input name="expectedDate" type="date" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="accountId" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input name="guaranteed" type="checkbox" />
                <span>Guaranteed (include in liquid calculation)</span>
              </label>
              <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Add Credit
                </button>
                <button type="button" onClick={() => setShowAddCredit(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Income Dialog */}
      {showAddIncome && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Recurring Income</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addRecurringIncome(
                formData.get('name'),
                formData.get('amount'),
                formData.get('frequency'),
                formData.get('payDay'),
                formData.get('accountId'),
                formData.get('notes'),
                formData.get('source'),
                formData.get('incomeType'),
                formData.get('hourlyRate'),
                formData.get('hoursPerPeriod'),
                formData.get('federalTaxRate'),
                formData.get('stateTaxRate'),
                formData.get('socialSecurityRate'),
                formData.get('medicareRate'),
                formData.get('otherDeductions')
              );
              setShowAddIncome(false);
            }}>
              <input name="name" placeholder="Income name (e.g., Salary)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              {(() => {
                // Extract unique sources from income history for autocomplete
                const previousSources = [...new Set(incomeHistory.map(entry => entry.source).filter(Boolean))];
                const [sourceInput, setSourceInput] = React.useState('');
                const [showSuggestions, setShowSuggestions] = React.useState(false);
                const filteredSuggestions = previousSources.filter(source =>
                  source.toLowerCase().includes(sourceInput.toLowerCase())
                );

                return (
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <input
                      name="source"
                      placeholder="Income source (e.g., ABC Company, Freelance)"
                      required
                      value={sourceInput}
                      onChange={(e) => setSourceInput(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        backgroundColor: previousSources.length > 0 ? '#f8fafc' : 'white'
                      }}
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 10,
                        maxHeight: '150px',
                        overflowY: 'auto'
                      }}>
                        {filteredSuggestions.map((source, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setSourceInput(source);
                              setShowSuggestions(false);
                            }}
                            style={{
                              padding: '0.5rem',
                              cursor: 'pointer',
                              borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
                              fontSize: '0.875rem'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          >
                            💼 {source}
                          </div>
                        ))}
                      </div>
                    )}
                    {previousSources.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        💡 Start typing to see previous sources
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Income Type Selection */}
              <select name="incomeType" id="incomeType" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} onChange={(e) => {
                const hourlyFields = document.getElementById('hourlyFields');
                const amountField = document.querySelector('input[name="amount"]');
                if (e.target.value === 'hourly') {
                  hourlyFields.style.display = 'block';
                  amountField.placeholder = 'Hourly rate (e.g., 25.00)';
                  amountField.required = false;
                } else {
                  hourlyFields.style.display = 'none';
                  amountField.placeholder = 'Amount (e.g., 3500.00)';
                  amountField.required = true;
                }
              }}>
                <option value="salary">💰 Salary/Fixed Amount</option>
                <option value="hourly">⏰ Hourly Rate</option>
              </select>

              {/* Amount or Hourly Rate */}
              <input name="amount" type="number" step="0.01" placeholder="Amount (e.g., 3500.00)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />

              {/* Hourly Fields (Hidden by default) */}
              <div id="hourlyFields" style={{ display: 'none', marginBottom: '0.5rem' }}>
                <input name="hourlyRate" type="number" step="0.01" placeholder="Hourly rate (e.g., 25.00)" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="hoursPerPeriod" type="number" step="0.5" placeholder="Expected hours per pay period (e.g., 80)" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              </div>

              {/* Tax Withholding Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>💸 Tax Withholding (Optional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input name="federalTaxRate" type="number" step="0.1" min="0" max="50" placeholder="Federal tax %" style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }} />
                  <input name="stateTaxRate" type="number" step="0.1" min="0" max="20" placeholder="State tax %" style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input name="socialSecurityRate" type="number" step="0.1" min="0" max="10" placeholder="Social Security %" defaultValue="6.2" style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }} />
                  <input name="medicareRate" type="number" step="0.01" min="0" max="5" placeholder="Medicare %" defaultValue="1.45" style={{ padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }} />
                </div>
                <input name="otherDeductions" type="number" step="0.01" min="0" placeholder="Other deductions ($ amount)" style={{ width: '100%', padding: '0.375rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.875rem' }} />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  💡 Leave blank to use gross amounts. Fill in to see your take-home pay.
                </div>
              </div>
              <select name="frequency" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                <option value="monthly">Monthly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input name="payDay" type="number" min="1" max="31" placeholder="Pay day of month (e.g., 15)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="accountId" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <textarea name="notes" placeholder="Notes (optional)" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical', minHeight: '60px' }} />
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Add Income
                </button>
                <button type="button" onClick={() => setShowAddIncome(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Dialog */}
      {showAddAccount && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add Account</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addAccount(
                formData.get('name'),
                formData.get('type'),
                formData.get('balance'),
                formData.get('accountType'),
                formData.get('apr'),
                formData.get('creditLimit')
              );
            }}>
              <input name="name" placeholder="Account name (e.g., Checking Account)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="accountType" defaultValue={accountsView} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} onChange={(e) => {
                const creditFields = document.getElementById('creditCardFields');
                const typeSelect = document.querySelector('select[name="type"]');

                if (e.target.value === 'credit') {
                  creditFields.style.display = 'block';
                  typeSelect.innerHTML = `
                    <option value="Credit Card">Credit Card</option>
                    <option value="Store Card">Store Credit Card</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Auto Loan">Auto Loan</option>
                    <option value="Student Loan">Student Loan</option>
                    <option value="Line of Credit">Line of Credit</option>
                    <option value="Business Credit">Business Credit Card</option>
                  `;
                  typeSelect.value = 'Credit Card'; // Set default value
                } else {
                  creditFields.style.display = 'none';
                  typeSelect.innerHTML = `
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash</option>
                    <option value="Investment">Investment</option>
                    <option value="Savings">Savings</option>
                  `;
                  typeSelect.value = 'Bank'; // Set default value
                }
              }}>
                <option value="debit">Debit Account</option>
                <option value="credit">Credit Card</option>
              </select>
              <select name="type" required defaultValue={accountsView === 'credit' ? 'Credit Card' : 'Bank'} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {accountsView === 'credit' ? (
                  <>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Store Card">Store Credit Card</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Auto Loan">Auto Loan</option>
                    <option value="Student Loan">Student Loan</option>
                    <option value="Line of Credit">Line of Credit</option>
                    <option value="Business Credit">Business Credit Card</option>
                  </>
                ) : (
                  <>
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash</option>
                    <option value="Investment">Investment</option>
                    <option value="Savings">Savings</option>
                  </>
                )}
              </select>
              <input name="balance" type="number" step="0.01" placeholder="Current balance (e.g., 1500.00)" required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <div id="creditCardFields" style={{ display: accountsView === 'credit' ? 'block' : 'none', marginBottom: '0.5rem' }}>
                <input name="apr" type="number" step="0.01" placeholder="APR % (e.g., 18.99)" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="creditLimit" type="number" step="0.01" placeholder="Credit Limit (e.g., 5000)" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Add Account
                </button>
                <button type="button" onClick={() => setShowAddAccount(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Dialog */}
      {editingAccount && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit Account</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const updates = {
                name: formData.get('name'),
                type: formData.get('type'),
                accountType: formData.get('accountType')
              };

              if (editingAccount.accountType === 'credit') {
                updates.apr = Number(formData.get('apr')) || 0;
                updates.creditLimit = Number(formData.get('creditLimit')) || 0;
              }

              updateAccount(editingAccount.id, updates);
              setEditingAccount(null);
            }}>
              <input name="name" placeholder="Account name" defaultValue={editingAccount.name} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              <select name="accountType" defaultValue={editingAccount.accountType || 'debit'} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} onChange={(e) => {
                const creditFields = document.getElementById('editCreditCardFields');
                const typeSelect = e.target.closest('form').querySelector('select[name="type"]');

                if (e.target.value === 'credit') {
                  creditFields.style.display = 'block';
                  typeSelect.innerHTML = `
                    <option value="Credit Card">Credit Card</option>
                    <option value="Store Card">Store Credit Card</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Auto Loan">Auto Loan</option>
                    <option value="Student Loan">Student Loan</option>
                    <option value="Line of Credit">Line of Credit</option>
                    <option value="Business Credit">Business Credit Card</option>
                  `;
                } else {
                  creditFields.style.display = 'none';
                  typeSelect.innerHTML = `
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash</option>
                    <option value="Investment">Investment</option>
                    <option value="Savings">Savings</option>
                  `;
                }
              }}>
                <option value="debit">Debit Account</option>
                <option value="credit">Credit Card</option>
              </select>
              <select name="type" defaultValue={editingAccount.type} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
                {editingAccount.accountType === 'credit' ? (
                  <>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Store Card">Store Credit Card</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Auto Loan">Auto Loan</option>
                    <option value="Student Loan">Student Loan</option>
                    <option value="Line of Credit">Line of Credit</option>
                    <option value="Business Credit">Business Credit Card</option>
                  </>
                ) : (
                  <>
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash</option>
                    <option value="Investment">Investment</option>
                    <option value="Savings">Savings</option>
                  </>
                )}
              </select>
              <div id="editCreditCardFields" style={{ display: editingAccount.accountType === 'credit' ? 'block' : 'none', marginBottom: '0.5rem' }}>
                <input name="apr" type="number" step="0.01" placeholder="APR %" defaultValue={editingAccount.apr || ''} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
                <input name="creditLimit" type="number" step="0.01" placeholder="Credit Limit" defaultValue={editingAccount.creditLimit || ''} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Update Account
                </button>
                <button type="button" onClick={() => setEditingAccount(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Dialog */}
      {showAddCategory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Add New Category</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const categoryName = formData.get('categoryName');
              const budget = formData.get('budget');
              if (categoryName?.trim()) {
                addCategory(categoryName.trim(), budget);
              }
            }}>
              <input
                name="categoryName"
                placeholder="Category name (e.g., Food, Entertainment)"
                required
                style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
              <input
                name="budget"
                type="number"
                placeholder="Monthly budget (e.g., 500)"
                defaultValue="500"
                required
                style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button type="submit" style={{ flex: 1, padding: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  Add Category
                </button>
                <button type="button" onClick={() => setShowAddCategory(false)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '0.375rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                {confirmDialog.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showAuth && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              margin: '-2rem -2rem 1.5rem -2rem',
              padding: '1.5rem 2rem',
              borderRadius: '1rem 1rem 0 0',
              color: 'white',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                {isSignUp ? '📝 Create Account' : '🔐 Welcome Back'}
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                {isSignUp ? 'Join Cashflo to manage your finances' : 'Sign in to your Cashflo account'}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleAuth}
                disabled={authLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: authLoading ? '#9ca3af' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  boxShadow: authLoading ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                {authLoading ? '⏳ Please wait...' : (isSignUp ? '🚀 Create Account' : '🔐 Sign In')}
              </button>

              <button
                onClick={() => setIsSignUp(!isSignUp)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b5cf6',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>

              <button
                onClick={() => setShowAuth(false)}
                style={{
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Dialog */}
      {showTransactionEdit && editingTransaction && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '90%', maxWidth: isMobile ? '400px' : '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', margin: '-2rem -2rem 1rem -2rem', padding: '1rem 2rem', borderRadius: '0.5rem 0.5rem 0 0' }}>
              <h2 style={{ color: 'white', fontSize: '1.25rem' }}>Edit Transaction</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              editTransaction(editingTransaction.id, formData.get('description'));
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Transaction Type:
                </label>
                <div style={{
                  padding: '0.5rem',
                  background: '#f3f4f6',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {editingTransaction.type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Date:
                </label>
                <div style={{
                  padding: '0.5rem',
                  background: '#f3f4f6',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {new Date(editingTransaction.timestamp).toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Description:
                </label>
                <textarea
                  name="description"
                  defaultValue={editingTransaction.description || ''}
                  placeholder="Enter transaction description..."
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    resize: 'vertical',
                    minHeight: '80px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setShowTransactionEdit(false);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Import Dialog */}
      {showTransactionImport && (
        <TransactionImport
          onClose={() => setShowTransactionImport(false)}
          user={user}
          supabase={supabase}
          accounts={accounts}
        />
      )}

    </div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
