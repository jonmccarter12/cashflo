import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  BellRing,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PiggyBank,
  Target,
  Gift,
  Zap,
  Settings,
  Filter,
  Archive,
  Star,
  Clock,
  X
} from 'lucide-react';

const SMART_NOTIFICATIONS_ENGINE = {
  generateNotifications: (data) => {
    const notifications = [];
    const { transactions, bills, accounts, creditData, budgetData } = data;
    const now = new Date();

    // Bill reminders (3 days before due)
    bills?.forEach(bill => {
      const nextDue = new Date(bill.nextDue);
      const daysUntilDue = Math.ceil((nextDue - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        notifications.push({
          id: `bill-${bill.id}`,
          type: 'bill_reminder',
          priority: daysUntilDue <= 1 ? 'high' : 'medium',
          title: `${bill.name} due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`,
          message: `$${bill.amount} payment due ${nextDue.toLocaleDateString()}`,
          timestamp: now,
          icon: Calendar,
          actionable: true,
          action: 'Mark as Paid',
          category: 'Bills'
        });
      }
    });

    // Budget alerts
    if (budgetData) {
      Object.entries(budgetData.categorySpending || {}).forEach(([category, data]) => {
        const percentage = (data.spent / data.budget) * 100;

        if (percentage >= 90) {
          notifications.push({
            id: `budget-${category}`,
            type: 'budget_exceeded',
            priority: 'high',
            title: `${category} budget exceeded`,
            message: `You've spent $${data.spent.toFixed(2)} of $${data.budget} budget (${percentage.toFixed(1)}%)`,
            timestamp: now,
            icon: AlertTriangle,
            category: 'Budget'
          });
        } else if (percentage >= 75) {
          notifications.push({
            id: `budget-warning-${category}`,
            type: 'budget_warning',
            priority: 'medium',
            title: `${category} budget at ${percentage.toFixed(1)}%`,
            message: `$${(data.budget - data.spent).toFixed(2)} remaining this month`,
            timestamp: now,
            icon: TrendingUp,
            category: 'Budget'
          });
        }
      });
    }

    // Credit score changes
    if (creditData?.scoreHistory) {
      const recent = creditData.scoreHistory.slice(-2);
      if (recent.length === 2) {
        const change = recent[1].score - recent[0].score;
        if (Math.abs(change) >= 5) {
          notifications.push({
            id: 'credit-change',
            type: 'credit_update',
            priority: change > 0 ? 'low' : 'medium',
            title: `Credit score ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} points`,
            message: `Your score is now ${recent[1].score}`,
            timestamp: now,
            icon: change > 0 ? TrendingUp : TrendingDown,
            category: 'Credit'
          });
        }
      }
    }

    // Low account balance warnings
    accounts?.forEach(account => {
      if (account.balance < 100 && account.type === 'checking') {
        notifications.push({
          id: `low-balance-${account.id}`,
          type: 'low_balance',
          priority: 'high',
          title: 'Low account balance',
          message: `${account.name} has only $${account.balance.toFixed(2)} remaining`,
          timestamp: now,
          icon: AlertTriangle,
          category: 'Accounts'
        });
      }
    });

    // Savings goals progress
    if (budgetData?.savingsGoals) {
      budgetData.savingsGoals.forEach(goal => {
        const progress = (goal.current / goal.target) * 100;

        if (progress >= 100 && !goal.completed) {
          notifications.push({
            id: `goal-completed-${goal.id}`,
            type: 'goal_achieved',
            priority: 'low',
            title: `🎉 Goal achieved: ${goal.name}`,
            message: `Congratulations! You've reached your $${goal.target.toLocaleString()} goal`,
            timestamp: now,
            icon: Gift,
            category: 'Goals'
          });
        } else if (progress >= 75 && progress < 90) {
          notifications.push({
            id: `goal-progress-${goal.id}`,
            type: 'goal_progress',
            priority: 'low',
            title: `Almost there! ${goal.name} at ${progress.toFixed(1)}%`,
            message: `Only $${(goal.target - goal.current).toLocaleString()} to go`,
            timestamp: now,
            icon: Target,
            category: 'Goals'
          });
        }
      });
    }

    // Unusual spending patterns
    const recentTransactions = transactions?.filter(tx => {
      const txDate = new Date(tx.date);
      const daysAgo = (now - txDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7 && tx.amount < 0; // Expenses in last 7 days
    }) || [];

    const totalWeeklySpending = recentTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    if (totalWeeklySpending > 1000) {
      notifications.push({
        id: 'high-spending',
        type: 'spending_alert',
        priority: 'medium',
        title: 'Higher spending than usual',
        message: `You've spent $${totalWeeklySpending.toFixed(2)} this week`,
        timestamp: now,
        icon: TrendingUp,
        category: 'Spending'
      });
    }

    return notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },

  getNotificationSettings: () => {
    const saved = localStorage.getItem('notificationSettings');
    return saved ? JSON.parse(saved) : {
      bills: { enabled: true, advance: 3 },
      budget: { enabled: true, threshold: 75 },
      credit: { enabled: true },
      balance: { enabled: true, minimum: 100 },
      goals: { enabled: true },
      spending: { enabled: true, threshold: 1000 },
      email: { enabled: false },
      push: { enabled: true },
      sms: { enabled: false }
    };
  },

  saveNotificationSettings: (settings) => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }
};

const NotificationsSection = ({ transactions, bills, accounts, creditData, budgetData }) => {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(SMART_NOTIFICATIONS_ENGINE.getNotificationSettings());
  const [filter, setFilter] = useState('all');
  const [archivedNotifications, setArchivedNotifications] = useState(() => {
    const saved = localStorage.getItem('archivedNotifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const data = { transactions, bills, accounts, creditData, budgetData };
    const newNotifications = SMART_NOTIFICATIONS_ENGINE.generateNotifications(data);
    setNotifications(newNotifications);
  }, [transactions, bills, accounts, creditData, budgetData]);

  useEffect(() => {
    localStorage.setItem('archivedNotifications', JSON.stringify(archivedNotifications));
  }, [archivedNotifications]);

  const updateSettings = (category, key, value) => {
    const newSettings = {
      ...settings,
      [category]: { ...settings[category], [key]: value }
    };
    setSettings(newSettings);
    SMART_NOTIFICATIONS_ENGINE.saveNotificationSettings(newSettings);
  };

  const archiveNotification = (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      setArchivedNotifications(prev => [{ ...notification, archivedAt: new Date() }, ...prev]);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return notification.category.toLowerCase() === filter;
  });

  const NotificationCard = ({ notification, showArchive = true }) => {
    const Icon = notification.icon;
    const priorityColors = {
      high: 'border-red-200 bg-red-50',
      medium: 'border-yellow-200 bg-yellow-50',
      low: 'border-green-200 bg-green-50'
    };

    const priorityBadgeColors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    return (
      <div className={`p-4 rounded-lg border ${priorityColors[notification.priority]} mb-3`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Icon className="w-5 h-5 mt-1 text-gray-600" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                <Badge className={`text-xs ${priorityBadgeColors[notification.priority]}`}>
                  {notification.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {notification.category}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {notification.actionable && (
                    <Button variant="outline" size="sm" className="text-xs">
                      {notification.action}
                    </Button>
                  )}
                  {showArchive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => archiveNotification(notification.id)}
                      className="text-xs"
                    >
                      <Archive className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SettingsPanel = () => (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Bill Reminders</div>
              <div className="text-sm text-gray-600">Get notified before bills are due</div>
            </div>
            <Switch
              checked={settings.bills.enabled}
              onCheckedChange={(checked) => updateSettings('bills', 'enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Budget Alerts</div>
              <div className="text-sm text-gray-600">Warnings when approaching budget limits</div>
            </div>
            <Switch
              checked={settings.budget.enabled}
              onCheckedChange={(checked) => updateSettings('budget', 'enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Credit Updates</div>
              <div className="text-sm text-gray-600">Changes to your credit score</div>
            </div>
            <Switch
              checked={settings.credit.enabled}
              onCheckedChange={(checked) => updateSettings('credit', 'enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Low Balance Alerts</div>
              <div className="text-sm text-gray-600">When account balances are low</div>
            </div>
            <Switch
              checked={settings.balance.enabled}
              onCheckedChange={(checked) => updateSettings('balance', 'enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Goals Progress</div>
              <div className="text-sm text-gray-600">Updates on savings goals</div>
            </div>
            <Switch
              checked={settings.goals.enabled}
              onCheckedChange={(checked) => updateSettings('goals', 'enabled', checked)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-4">Delivery Methods</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-gray-600">Browser notifications</div>
            </div>
            <Switch
              checked={settings.push.enabled}
              onCheckedChange={(checked) => updateSettings('push', 'enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-gray-600">Send to your email address</div>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(checked) => updateSettings('email', 'enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">SMS Alerts</div>
              <div className="text-sm text-gray-600">Text message notifications</div>
            </div>
            <Switch
              checked={settings.sms.enabled}
              onCheckedChange={(checked) => updateSettings('sms', 'enabled', checked)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-4">Advanced Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Bill reminder advance (days)</label>
            <input
              type="number"
              min="1"
              max="7"
              value={settings.bills.advance}
              onChange={(e) => updateSettings('bills', 'advance', parseInt(e.target.value))}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Budget warning threshold (%)</label>
            <input
              type="number"
              min="50"
              max="95"
              value={settings.budget.threshold}
              onChange={(e) => updateSettings('budget', 'threshold', parseInt(e.target.value))}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Low balance threshold ($)</label>
            <input
              type="number"
              min="0"
              value={settings.balance.minimum}
              onChange={(e) => updateSettings('balance', 'minimum', parseFloat(e.target.value))}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Bell className="w-5 h-5 mr-2 text-blue-600" />
          Smart Notifications & Alerts
        </h2>
        <Badge className="bg-blue-500 text-white px-3 py-1">
          {notifications.length} active
        </Badge>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">Active Notifications</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              <option value="bills">Bills</option>
              <option value="budget">Budget</option>
              <option value="credit">Credit</option>
              <option value="accounts">Accounts</option>
              <option value="goals">Goals</option>
              <option value="spending">Spending</option>
            </select>
          </div>

          {filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-medium">All caught up!</h3>
              <p className="text-sm">No notifications match your current filter.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {archivedNotifications.length > 0 ? (
            <div className="space-y-3">
              {archivedNotifications.slice(0, 10).map((notification) => (
                <NotificationCard
                  key={`archived-${notification.id}`}
                  notification={notification}
                  showArchive={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-medium">No archived notifications</h3>
              <p className="text-sm">Notifications you dismiss will appear here.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default NotificationsSection;