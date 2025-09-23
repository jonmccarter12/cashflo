import { yyyyMm, getNextOccurrence, fmt } from './utils';

// Email template generators
export function generateBillReminderEmail(bill, account, daysUntil) {
  const isOverdue = daysUntil < 0;
  const urgency = isOverdue ? 'OVERDUE' : daysUntil === 0 ? 'DUE TODAY' : daysUntil === 1 ? 'DUE TOMORROW' : `DUE IN ${daysUntil} DAYS`;
  const urgencyColor = isOverdue ? '#dc2626' : daysUntil <= 1 ? '#f59e0b' : '#8b5cf6';

  const subject = isOverdue
    ? `💸 OVERDUE: ${bill.name} - ${fmt(bill.amount)}`
    : daysUntil === 0
    ? `💰 Due Today: ${bill.name} - ${fmt(bill.amount)}`
    : daysUntil === 1
    ? `⏰ Due Tomorrow: ${bill.name} - ${fmt(bill.amount)}`
    : `📅 Upcoming: ${bill.name} due in ${daysUntil} days`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bill Reminder - Cashflo</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
          <div style="color: white; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
            💰 Cashflo
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 16px;">
            Bill Reminder
          </div>
        </div>

        <!-- Urgency Banner -->
        <div style="background-color: ${urgencyColor}; color: white; padding: 15px 20px; text-align: center; font-weight: bold; font-size: 18px;">
          ${urgency}
        </div>

        <!-- Bill Details -->
        <div style="padding: 30px 20px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h2 style="margin: 0; color: #1f2937; font-size: 24px;">${bill.name}</h2>
              <div style="font-size: 28px; font-weight: bold; color: ${urgencyColor};">${fmt(bill.amount)}</div>
            </div>

            <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
              <strong>Account:</strong> ${account?.name || 'Unknown Account'}
            </div>

            <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
              <strong>Frequency:</strong> ${bill.frequency}
            </div>

            <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
              <strong>Due Date:</strong> ${getNextOccurrence(bill).toLocaleDateString()}
            </div>

            ${bill.notes ? `
            <div style="color: #6b7280; font-size: 14px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <strong>Notes:</strong> ${bill.notes}
            </div>
            ` : ''}
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="https://cashflo.app" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 0 10px;">
              Open Cashflo
            </a>
            <a href="https://cashflo.app/?action=mark-paid&bill=${bill.id}" style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin: 0 10px;">
              Mark as Paid
            </a>
          </div>

          <!-- Tips -->
          ${daysUntil > 0 ? `
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #1e40af;">💡 Pro Tip</h4>
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              Set up autopay for this bill to never miss a payment! You can manage all your bills easily in Cashflo.
            </p>
          </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            You're receiving this because you have bill notifications enabled in Cashflo.
            <br>
            <a href="https://cashflo.app/settings" style="color: #8b5cf6; text-decoration: none;">Manage notification preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generateWeeklySummaryEmail(upcomingBills, totalAmount, user) {
  const subject = `📊 Your weekly summary - ${upcomingBills.length} bills, ${fmt(totalAmount)} due`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Summary - Cashflo</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px 20px; text-align: center;">
          <div style="color: white; font-size: 24px; font-weight: bold; margin-bottom: 10px;">
            💰 Cashflo
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 16px;">
            Weekly Summary
          </div>
        </div>

        <!-- Summary Stats -->
        <div style="padding: 30px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0; color: #1f2937;">This Week's Bills</h2>
            <div style="font-size: 36px; font-weight: bold; color: #8b5cf6; margin-bottom: 5px;">${fmt(totalAmount)}</div>
            <div style="color: #6b7280;">${upcomingBills.length} bills due</div>
          </div>

          <!-- Bills List -->
          ${upcomingBills.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Upcoming Bills</h3>
            ${upcomingBills.map(item => {
              const daysUntil = Math.ceil((item.due - new Date()) / (1000 * 60 * 60 * 24));
              const urgencyColor = daysUntil < 0 ? '#dc2626' : daysUntil <= 1 ? '#f59e0b' : '#6b7280';

              return `
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid ${urgencyColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: bold; color: #1f2937;">${item.bill?.name || item.otc?.name}</div>
                    <div style="color: #6b7280; font-size: 14px;">
                      ${daysUntil < 0 ? 'OVERDUE' : daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`}
                    </div>
                  </div>
                  <div style="font-weight: bold; color: ${urgencyColor};">
                    ${fmt(item.bill?.amount || item.otc?.amount)}
                  </div>
                </div>
              </div>
              `;
            }).join('')}
          </div>
          ` : ''}

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="https://cashflo.app" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Dashboard
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            Weekly summaries help you stay on top of your finances.
            <br>
            <a href="https://cashflo.app/settings" style="color: #8b5cf6; text-decoration: none;">Manage notification preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

// Send email notification
export async function sendEmailNotification(emailData) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    const result = await response.json();
    console.log('✅ Email notification sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
    throw error;
  }
}

// Check for bills that need reminders
export function getBillsNeedingReminders(bills, accounts, userSettings = {}) {
  const now = new Date();
  const reminders = [];

  // Default reminder settings
  const settings = {
    enabled: true,
    reminderDays: [3, 1, 0], // 3 days before, 1 day before, day of
    weeklyDigest: true,
    ...userSettings
  };

  if (!settings.enabled) {
    return reminders;
  }

  bills.forEach(bill => {
    if (bill.ignored) return;

    const currentMonth = yyyyMm();
    const isPaid = bill.paidMonths?.includes(currentMonth);

    if (isPaid) return; // Don't remind for paid bills

    const nextDue = getNextOccurrence(bill);
    const daysUntil = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));
    const account = accounts.find(a => a.id === bill.accountId);

    // Check if this bill needs a reminder
    if (settings.reminderDays.includes(daysUntil) || daysUntil < 0) {
      reminders.push({
        bill,
        account,
        daysUntil,
        dueDate: nextDue,
        type: daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'due_today' : 'upcoming'
      });
    }
  });

  return reminders;
}

// Auto-notification system (call this periodically)
export async function processNotifications(bills, accounts, oneTimeCosts, userEmail, userSettings) {
  if (!userEmail || !userSettings?.notifications?.enabled) {
    return { sent: 0, skipped: 'disabled' };
  }

  const reminders = getBillsNeedingReminders(bills, accounts, userSettings.notifications);
  let sentCount = 0;

  // Send individual bill reminders
  for (const reminder of reminders) {
    try {
      const emailTemplate = generateBillReminderEmail(reminder.bill, reminder.account, reminder.daysUntil);

      await sendEmailNotification({
        to: userEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        type: 'bill_reminder',
        billData: {
          id: reminder.bill.id,
          name: reminder.bill.name,
          amount: reminder.bill.amount,
          daysUntil: reminder.daysUntil
        }
      });

      sentCount++;
    } catch (error) {
      console.error(`Failed to send reminder for bill ${reminder.bill.name}:`, error);
    }
  }

  // Send weekly digest if enabled and it's Monday
  const today = new Date();
  if (userSettings.notifications?.weeklyDigest && today.getDay() === 1) { // Monday
    try {
      const upcomingItems = [...bills, ...oneTimeCosts]
        .filter(item => {
          if (item.ignored) return false;

          const currentMonth = yyyyMm();
          if (item.paidMonths) {
            // It's a bill
            return !item.paidMonths.includes(currentMonth);
          } else {
            // It's a one-time cost
            return !item.paid;
          }
        })
        .map(item => {
          const due = item.dueDate ? new Date(item.dueDate) : getNextOccurrence(item);
          return {
            bill: item.paidMonths ? item : null,
            otc: item.paidMonths ? null : item,
            due
          };
        })
        .filter(item => {
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return item.due <= weekFromNow;
        })
        .sort((a, b) => a.due - b.due);

      if (upcomingItems.length > 0) {
        const totalAmount = upcomingItems.reduce((sum, item) =>
          sum + (item.bill?.amount || item.otc?.amount || 0), 0);

        const emailTemplate = generateWeeklySummaryEmail(upcomingItems, totalAmount, { email: userEmail });

        await sendEmailNotification({
          to: userEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          type: 'weekly_digest',
          billData: {
            count: upcomingItems.length,
            totalAmount
          }
        });

        sentCount++;
      }
    } catch (error) {
      console.error('Failed to send weekly digest:', error);
    }
  }

  return { sent: sentCount };
}