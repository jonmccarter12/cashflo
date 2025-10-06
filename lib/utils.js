import { notify } from '../components/Notify';

// Constants
export const currentAppVersion = "3.1";
export const TRANSACTION_LOG_KEY = 'transaction_log';

// Formatting & Date Helpers
export const yyyyMm = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
export const clampDue = (d) => Math.max(1, Math.min(28, Math.round(d||1))); // Legacy function for income
export const clampBillDue = (d) => Math.max(1, Math.min(31, Math.round(d||1))); // For bills, supports 1-31
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
export function getEffectiveDueDate(bill, fromDate = new Date()) {
  // If bill has a custom due date override, use that instead
  if (bill.customDueDate) {
    const customDate = new Date(bill.customDueDate);
    // Only use custom date if it's in the future or very recent (last 7 days)
    const sevenDaysAgo = new Date(fromDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (customDate >= sevenDaysAgo) {
      return customDate;
    }
  }

  // Fall back to automatic calculation
  return getNextOccurrence(bill, fromDate);
}

export function getNextOccurrence(bill, fromDate = new Date()) {
  try {
    const date = new Date(fromDate);
    if (bill.frequency === 'monthly') {
      // Smart month-end handling: 31st should fall on last day of month if month has fewer days
      const targetDay = Math.min(bill.dueDay || 1, 31);
      const year = date.getFullYear();
      const month = date.getMonth();

      // Get the last day of the current month
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(targetDay, lastDayOfMonth);

      date.setDate(actualDay);

      if (date <= fromDate) {
        // Move to next month and recalculate
        const nextMonth = month + 1;
        const nextYear = nextMonth === 12 ? year + 1 : year;
        const nextMonthIndex = nextMonth === 12 ? 0 : nextMonth;

        const lastDayOfNextMonth = new Date(nextYear, nextMonthIndex + 1, 0).getDate();
        const nextActualDay = Math.min(targetDay, lastDayOfNextMonth);

        date.setFullYear(nextYear);
        date.setMonth(nextMonthIndex);
        date.setDate(nextActualDay);
      }
      return date;
    }
    if (bill.frequency === 'yearly') {
      const dueMonth = bill.yearlyMonth || 0;
      const targetDay = Math.min(bill.dueDay || 1, 31);

      // Smart month-end handling for yearly bills too
      const year = date.getFullYear();
      const lastDayOfTargetMonth = new Date(year, dueMonth + 1, 0).getDate();
      const actualDay = Math.min(targetDay, lastDayOfTargetMonth);

      date.setMonth(dueMonth);
      date.setDate(actualDay);

      if (date <= fromDate) {
        const nextYear = year + 1;
        const lastDayOfNextTargetMonth = new Date(nextYear, dueMonth + 1, 0).getDate();
        const nextActualDay = Math.min(targetDay, lastDayOfNextTargetMonth);

        date.setFullYear(nextYear);
        date.setDate(nextActualDay);
      }
      return date;
    }
    if (bill.frequency === 'weekly') {
      const baseDate = new Date(bill.weeklyStart || Date.now());
      const schedule = bill.weeklySchedule || 'every';

      if (schedule === 'every') {
        // Simple weekly recurrence from start date - use the same day of week as start date
        if (baseDate > fromDate) {
          return baseDate; // Start date is in the future
        }

        // Find the next occurrence
        let nextDate = new Date(baseDate);

        // Keep adding weeks until we get a date after fromDate
        while (nextDate <= fromDate) {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        return nextDate;
      } else {
        // Monthly week scheduling (first week, last week, etc.)
        const dayOfWeek = baseDate.getDay(); // Use day of week from start date
        const today = new Date(fromDate);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Calculate the target date for this month
        let targetDate = new Date(currentYear, currentMonth, 1);

        // Find the first occurrence of the target day in the month
        const firstOfMonth = new Date(currentYear, currentMonth, 1);
        const daysToAdd = (dayOfWeek - firstOfMonth.getDay() + 7) % 7;
        targetDate.setDate(1 + daysToAdd);

        // Adjust for the specific week
        if (schedule === 'last') {
          // Find the last occurrence of the day in the month
          const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
          const lastDayOfWeek = lastOfMonth.getDay();
          const daysBack = (lastDayOfWeek - dayOfWeek + 7) % 7;
          targetDate = new Date(lastOfMonth);
          targetDate.setDate(lastOfMonth.getDate() - daysBack);
        } else {
          // Specific week number (first, second, third, fourth)
          const weekOffset = { first: 0, second: 1, third: 2, fourth: 3 }[schedule] || 0;
          targetDate.setDate(targetDate.getDate() + (weekOffset * 7));
        }

        // If this month's date has passed, move to next month
        if (targetDate <= fromDate) {
          return getNextOccurrence(bill, new Date(currentYear, currentMonth + 1, 1));
        }

        return targetDate;
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
