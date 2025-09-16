import { notify } from '../components/Notify';

// Constants
export const currentAppVersion = "3.1";
export const TRANSACTION_LOG_KEY = 'transaction_log';

// Formatting & Date Helpers
export const yyyyMm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
export const clampDue = (d) => Math.max(1, Math.min(28, Math.round(d||1)));
export const fmt = (n) => `$${(Math.round((n||0) * 100) / 100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
export const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

// Local Storage Helpers
function backupData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      const backup = {
        data,
        timestamp: new Date().toISOString(),
        version: currentAppVersion
      };
      localStorage.setItem(`${key}_backup`, JSON.stringify(backup));
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }
}

export function saveData(key, data) {
  if (typeof window !== 'undefined') {
    try {
      const dataToSave = {
        data: data,
        timestamp: new Date().toISOString(),
        version: currentAppVersion
      };
      const existingRawData = localStorage.getItem(key);
      if (existingRawData) {
        try {
          const parsedExisting = JSON.parse(existingRawData);
          backupData(key, parsedExisting.data !== undefined ? parsedExisting.data : parsedExisting);
        } catch (backupError) {
          console.error('Error parsing existing data for backup:', backupError);
          notify(`Warning: Existing data for '${key}' was corrupted and could not be backed up.`, 'warning');
        }
      }
      localStorage.setItem(key, JSON.stringify(dataToSave));
      return dataToSave;
    } catch (error) {
      console.error('Error saving data:', error);
      return null;
    }
  }
  return null;
}

export function loadData(key, defaultValue) {
  if (typeof window === 'undefined') return { data: defaultValue, timestamp: null, version: null };
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.data !== undefined && parsed.timestamp !== undefined) {
        return parsed;
      } else {
        console.warn(`Migrating raw local storage data for key: ${key}`);
        return { data: parsed, timestamp: null, version: null };
      }
    }
    const backup = localStorage.getItem(`${key}_backup`);
    if (backup) {
      const parsedBackup = JSON.parse(backup);
      if (!parsedBackup.version || parsedBackup.version !== currentAppVersion) {
        const backupVersion = parsedBackup.version || 'unknown/legacy';
        console.warn(`Recovered backup from an older/unknown version (${backupVersion}) for key: ${key}. Current version is ${currentAppVersion}.`);
        notify(`Recovered data for '${key}' from an older backup version (${backupVersion}). Please review.`, 'warning');
      }
      console.log('Recovered from backup data:', parsedBackup);
      return parsedBackup;
    }
    return { data: defaultValue, timestamp: null, version: null };
  } catch (error) {
    console.error('Error loading data:', error);
    return { data: defaultValue, timestamp: null, version: null };
  }
}

// Transaction Logging
export async function logTransaction(supabase, userId, type, itemId, payload, description) {
  if (!supabase || !userId) {
    console.error('Supabase client or user ID missing for transaction logging.');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('transaction_log')
      .insert({
        user_id: userId,
        type: type,
        item_id: itemId,
        payload: payload,
        description: description,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error logging transaction:', error);
    notify(`Failed to log transaction: ${error.message}`, 'error');
    return null;
  }
}

// Date Calculation Helpers
export function getNextOccurrence(bill, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    if (bill.frequency === 'monthly') {
      date.setDate(clampDue(bill.dueDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    if (bill.frequency === 'yearly') {
      const dueMonth = bill.yearlyMonth || 0;
      const dueDay = clampDue(bill.dueDay || 1);
      date.setMonth(dueMonth);
      date.setDate(dueDay);
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    if (bill.frequency === 'weekly') {
      const dayOfWeek = bill.weeklyDay || 0;
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      if (bill.weeklySchedule === 'every') {
        return date;
      } else {
        const targetWeek = bill.weeklySchedule;
        const month = date.getMonth();
        date.setDate(1);
        date.setDate(date.getDate() + ((dayOfWeek - date.getDay() + 7) % 7));
        if (targetWeek === 'last') {
          while (date.getMonth() === month) {
            const next = new Date(date);
            next.setDate(next.getDate() + 7);
            if (next.getMonth() !== month) break;
            date.setDate(date.getDate() + 7);
          }
        } else {
          const weekNum = { first: 0, second: 1, third: 2, fourth: 3 }[targetWeek] || 0;
          date.setDate(date.getDate() + (weekNum * 7));
        }
        if (date <= fromDate) {
          date.setMonth(date.getMonth() + 1);
          return getNextOccurrence(bill, date);
        }
        return date;
      }
    }
    if (bill.frequency === 'biweekly') {
      const baseDate = new Date(bill.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    return getNextOccurrence({ ...bill, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
    return new Date();
  }
}

export function getNextIncomeOccurrence(income, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    if (income.frequency === 'monthly') {
      date.setDate(clampDue(income.payDay));
      if (date <= fromDate) {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    }
    if (income.frequency === 'weekly') {
      const dayOfWeek = income.weeklyDay || 5;
      const daysUntil = (dayOfWeek - date.getDay() + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
      return date;
    }
    if (income.frequency === 'biweekly') {
      const baseDate = new Date(income.biweeklyStart || Date.now());
      const daysDiff = Math.floor((fromDate - baseDate) / (1000 * 60 * 60 * 24));
      const cyclesSince = Math.floor(daysDiff / 14);
      const nextCycle = cyclesSince + (daysDiff % 14 > 0 ? 1 : 0);
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (nextCycle * 14));
      return nextDate;
    }
    if (income.frequency === 'yearly') {
      const payMonth = income.yearlyMonth || 0;
      const payDay = clampDue(income.payDay || 1);
      date.setMonth(payMonth);
      date.setDate(payDay);
      if (date <= fromDate) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
    return getNextIncomeOccurrence({ ...income, frequency: 'monthly' }, fromDate);
  } catch (error) {
    console.error('Error calculating next income occurrence:', error);
    return new Date();
  }
}
