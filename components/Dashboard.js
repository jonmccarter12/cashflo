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
import { useAuth } from '../hooks/useAuth'; // NEW
import AccountsSection from './dashboard/AccountsSection';
import IncomeSection from './dashboard/IncomeSection';
import BillsSection from './dashboard/BillsSection';
import OneTimeCostsSection from './dashboard/OneTimeCostsSection'; // NEW

// ===================== MAIN DASHBOARD COMPONENT =====================
function DashboardContent() {
  const monthKey = yyyyMm();
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
  const [sortConfig, setSortConfig] = React.useState({ key: 'timestamp', direction: 'descending' });
  
  // Supabase client and user state are now managed by useAuth hook

  // NEW: Transaction log state management
  const [transactions, setTransactions, { syncing: transactionsSyncing, lastSync: transactionsLastSync, syncError: transactionsSyncError }] = useCloudTransactions(user?.id, supabase);
  const [nwHistory, setNwHistory] = useCloudState('nwHistory', [], user?.id, supabase);

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

    // Default accounts
    const initialAccounts = [
      { id: 'cash', name:'Cash on Hand', type:'Cash', balance:0 },
      { id: 'boabiz', name:'BOA – Business', type:'Bank', balance:0 },
      { id: 'pers', name:'Personal Checking', type:'Bank', balance:0 },
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
        case 'account_deleted':
            accounts.delete(tx.item_id);
            // Also need to remove associated bills, otc, income, credits
            bills.forEach((bill, id) => { if (bill.accountId === tx.item_id) bills.delete(id); });
            oneTimeCosts.forEach((otc, id) => { if (otc.accountId === tx.item_id) oneTimeCosts.delete(id); });
            recurringIncome.forEach((inc, id) => { if (inc.accountId === tx.item_id) recurringIncome.delete(id); });
            upcomingCredits.forEach((cred, id) => { if (cred.accountId === tx.item_id) upcomingCredits.delete(id); });
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
                budget: tx.payload.new_budget,
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

    // Ensure 'Uncategorized' exists if any items are without a category (due to deletion or initial load)
    // Add it dynamically if not found
    if (!sortedCategories.some(c => c.name === 'Uncategorized')) {
      sortedCategories.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        order: sortedCategories.length,
        budget: 0,
        ignored: false,
        updatedAt: new Date().toISOString()
      });
    }

    return {
      accounts: Array.from(accounts.values()),
      bills: Array.from(bills.values()),
      oneTimeCosts: Array.from(oneTimeCosts.values()),
      categories: sortedCategories,
      upcomingCredits: Array.from(upcomingCredits.values()),
      recurringIncome: Array.from(recurringIncome.values()),
      incomeHistory: incomeHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100) // Keep last 100 entries
    };
  }, [transactions]); // Depend on transactions

  // OLD: Master state -> NOW derived from transactions
  const { accounts, bills, oneTimeCosts, categories, upcomingCredits, recurringIncome, incomeHistory } = masterState;

  // Sync initial dummy data to transactions if no transactions exist and old local storage has data
  // This is a one-time migration for existing users.
  React.useEffect(() => {
    if (!user?.id || !supabase || transactions.length > 0) return; // Only run if logged in, no transactions yet

    const migrateOldData = async () => {
      let initialTransactions = [];

      // Load data from potential old local storage keys
      const oldAccountData = loadData('bills_balance_dashboard_v3.1:accounts', null);
      const oldBillsData = loadData('bills_balance_dashboard_v3.1:bills', null);
      const oldCategoriesData = loadData('bills_balance_dashboard_v3.1:categories', null);
      const oldCreditsData = loadData('bills_balance_dashboard_v3.1:credits', null);
      const oldIncomeData = loadData('bills_balance_dashboard_v3.1:income', null);
      const oldOtcData = loadData('bills_balance_dashboard_v3.1:otc', null);

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
  }, [user?.id, supabase, transactions.length]); // `transactions.length` ensures it only runs if transactions are empty

  // Settings/UI with cloud sync - still use useCloudState for UI settings
  const [autoDeductCash, setAutoDeductCash] = useCloudState('autoDeductCash', true, user?.id, supabase);
  const [showIgnored, setShowIgnored] = useCloudState('showIgnored', false, user?.id, supabase);
  const [selectedCat, setSelectedCat] = useCloudState('selectedCat', 'All', user?.id, supabase);
  
  const [showIncomeHistory, setShowIncomeHistory] = React.useState(false); // Managed locally for UI toggle

  const activeCats = React.useMemo(()=> categories.filter(c=>!c.ignored).sort((a,b) => (a.order || 0) - (b.order || 0)).map(c=>c.name), [categories]);

  const [netWorthMode, setNetWorthMode] = React.useState('current');
  const [editingCategoryId, setEditingCategoryId] = React.useState(null);

  // Dialog states
  const [showAddAccount, setShowAddAccount] = React.useState(false);
  const [showAddBill, setShowAddBill] = React.useState(false);
  const [showAddCredit, setShowAddCredit] = React.useState(false);
  const [showAddIncome, setShowAddIncome] = React.useState(false);
  const [showSnapshots, setShowSnapshots] = React.useState(false); // This will be replaced with transaction history UI
  const [editingBill, setEditingBill] = React.useState(null);
  const [editingOTC, setEditingOTC] = React.useState(null);

  // One-time cost form state - these states are kept in DashboardContent
  // because they are used for calculations (e.g., upcoming.items, timeline)
  // and passed down to OneTimeCostsSection for the input form.
  const [otcName, setOtcName] = React.useState("");
  const [otcCategory, setOtcCategory] = React.useState(activeCats[0] || 'Personal');
  const [otcAmount, setOtcAmount] = React.useState(0);
  const [otcDueDate, setOtcDueDate] = React.useState(new Date().toISOString().slice(0,10));
  const [otcAccountId, setOtcAccountId] = React.useState(accounts[0]?.id || 'cash');
  const [otcNotes, setOtcNotes] = React.useState("");

  // Check if any data is syncing (now only transaction log)
  const isSyncing = transactionsSyncing;
  const lastSyncTime = transactionsLastSync;

  // Update form state when categories/accounts change
  React.useEffect(() => {
    if(activeCats.length && !activeCats.includes(otcCategory)) setOtcCategory(activeCats[0]);
  }, [activeCats, otcCategory]);

  React.useEffect(() => {
    if(accounts.length && !accounts.find(a => a.id === otcAccountId)) setOtcAccountId(accounts[0].id);
  }, [accounts, otcAccountId]);

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

  // Calculate liquid including guaranteed credits
  const currentLiquidWithGuaranteed = React.useMemo(() => {
    try {
      const baseBalance = accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
      const guaranteedCredits = upcomingCredits
        .filter(c => c.guaranteed && !c.ignored)
        .reduce((s, c) => s + (Number(c.amount) || 0), 0);
      return baseBalance + guaranteedCredits;
    } catch (error) {
      console.error('Error calculating liquid with guaranteed:', error);
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    }
  }, [accounts, upcomingCredits]);

  // Calculate liquid with all expected income (including recurring)
  const projectedWithIncome = React.useMemo(() => {
    return currentLiquidWithGuaranteed + monthlyRecurringIncomeTotal;
  }, [currentLiquidWithGuaranteed, monthlyRecurringIncomeTotal]);

  // Derived calculations with error handling
  const currentLiquid = React.useMemo(()=> {
    try {
      return accounts.reduce((s,a)=> s+(Number(a.balance) || 0), 0);
    } catch (error) {
      console.error('Error calculating current liquid:', error);
      return 0;
    }
  }, [accounts]);
  
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
  const netWorthValue = netWorthMode==='current'? currentLiquidWithGuaranteed : netWorthMode==='afterWeek'? afterWeek : afterMonth;

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
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  const filteredTransactions = React.useMemo(() => {
    return sortedTransactions.filter(tx =>
        (tx.description?.toLowerCase() || '').includes(transactionFilter.toLowerCase()) ||
        (tx.type?.toLowerCase() || '').includes(transactionFilter.toLowerCase())
    );
  }, [sortedTransactions, transactionFilter]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
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
  async function addRecurringIncome(name, amount, frequency, payDay, accountId, notes) {
    try {
      if (!name || !amount || !payDay) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      const newIncomeId = crypto.randomUUID();
      const payload = {
        name: name.trim(),
        amount: Number(amount),
        frequency,
        payDay: Number(payDay),
        accountId,
        notes: notes || ''
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
          name: income.name
        },
        `Income "${income.name}" marked as ${!isReceived ? 'received' : 'not received'} for ${currentMonth}`
      );

      if (transaction) {
        notify(`${income.name} marked as ${!isReceived ? 'received' : 'not received'}`, 'success');
      }
    } catch (error) {
      console.error('Error toggling income received:', error);
      notify('Failed to update income status', 'error');
    }
  }

  // UPCOMING CREDITS FUNCTIONS
  async function addUpcomingCredit(name, amount, expectedDate, accountId, guaranteed, notes) {
    try {
      if (!name || !amount || !expectedDate) {
        notify('Please fill in all required fields', 'error');
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
      }
    } catch (error) {
      console.error('Error adding upcoming credit:', error);
      notify('Failed to add upcoming credit', 'error');
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
        `Updated one-time cost "${changes.name}"`
      );

      if (transaction) {
        setEditingOTC(null);
        notify('One-time cost updated successfully!');
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
    if (confirm('Delete this one-time cost?')) {
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
    }
  }

  // BILL FUNCTIONS
  async function addBill(formData) {
    try {
      const newBillId = crypto.randomUUID();
      const payload = {
        name: formData.get('name'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        frequency: formData.get('frequency'),
        dueDay: Number(formData.get('dueDay')),
        accountId: formData.get('accountId'),
        notes: formData.get('notes') || ''
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'bill_created',
        newBillId,
        payload,
        `Created bill "${payload.name}" for ${fmt(payload.amount)}`
      );

      if (transaction) {
        setShowAddBill(false);
        notify('Bill added successfully!');
      }
    } catch (error) {
      console.error('Error adding bill:', error);
      notify('Failed to add bill', 'error');
    }
  }

  async function updateBill(billId, formData) {
    try {
      const changes = {
        name: formData.get('name'),
        category: formData.get('category'),
        amount: Number(formData.get('amount')),
        frequency: formData.get('frequency'),
        dueDay: Number(formData.get('dueDay')),
        accountId: formData.get('accountId'),
        notes: formData.get('notes') || ''
      };

      const transaction = await logTransaction(
        supabase,
        user.id,
        'bill_modification',
        billId,
        { changes: changes },
        `Updated bill "${changes.name}"`
      );
      if (transaction) {
        setEditingBill(null);
        notify('Bill updated successfully!');
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      notify('Failed to update bill', 'error');
    }
  }

  async function togglePaid(b){
    try {
      const currentMonth = yyyyMm();
      const isPaid = b.paidMonths.includes(currentMonth);

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
        notify(`${b.name} marked as ${!isPaid ? 'not paid' : 'paid'}`, 'success');
      }
    } catch (error) {
      console.error('Error toggling paid status:', error);
      notify('Failed to update payment status', 'error');
    }
  }

  async function toggleBillIgnored(b){
    try {
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
      }
    } catch (error) {
      console.error('Error toggling bill ignored:', error);
      notify('Failed to update ignore status', 'error');
    }
  }

  async function deleteBill(billId){
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    if(confirm('Delete this bill?')){
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
    }
  }

  // ACCOUNT FUNCTIONS
  async function addAccount(name, type, balance = 0) {
    try {
      if (!name || !type) {
        notify('Please fill in all required fields', 'error');
        return;
      }
      const newAccountId = crypto.randomUUID();
      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_created',
        newAccountId,
        { name: name.trim(), type, initial_balance: Number(balance) || 0 },
        `Created account "${name}" with initial balance ${fmt(Number(balance) || 0)}`
      );
      if (transaction) {
        notify(`Account "${name}" added`, 'success');
        setShowAddAccount(false); // Close dialog on success
      }
    } catch (error) {
      console.error('Error adding account:', error);
      notify('Failed to add account', 'error');
    }
  }

  async function updateAccountBalance(accountId, newBalance) {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      const transaction = await logTransaction(
        supabase,
        user.id,
        'account_balance_adjustment',
        accountId,
        { new_balance: Number(newBalance) || 0 },
        `Adjusted balance for account "${account.name}" to ${fmt(Number(newBalance) || 0)}`
      );
      // No notification needed for this frequent action, UI will update reactively.
    } catch (error) {
      console.error('Error updating account balance:', error);
      notify('Failed to update account balance', 'error');
    }
  }

  async function deleteAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    if (confirm(`Are you sure you want to delete the account "${account.name}"? This action cannot be undone and will delete all associated bills, one-time costs, recurring income, and credits.`)) {
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
  async function addCategory(name){ 
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
        budget: 0
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
        confirmationMessage += ` There are ${billsInCategory.length + otcsInCategory.length} items (bills/one-time costs) currently assigned to this category. They will be moved to "Uncategorized" if you proceed.`;
      } else {
        confirmationMessage += ` This action cannot be undone.`;
      }

      if (!confirm(confirmationMessage)) return; 

      const fallback='Uncategorized'; 
      
      // Re-categorize items
      for (const bill of billsInCategory) {
        await logTransaction(
          supabase, user.id, 'bill_modification', bill.id,
          { changes: { category: fallback } },
          `Bill "${bill.name}" moved to Uncategorized`
        );
      }
      for (const otc of otcsInCategory) {
        await logTransaction(
          supabase, user.id, 'one_time_cost_modification', otc.id,
          { changes: { category: fallback } },
          `OTC "${otc.name}" moved to Uncategorized`
        );
      }

      // Delete category
      const transaction = await logTransaction(
        supabase, user.id, 'category_deleted', category.id, {}, `Deleted category "${name}"`
      );

      if (transaction) {
        notify(`Category "${name}" removed. Items moved to "Uncategorized" if applicable.`, 'success');
      }
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
      if (index < 0