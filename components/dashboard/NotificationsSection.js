import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Target,
  Archive,
  Settings,
  Filter
} from 'lucide-react';

const NotificationsSection = ({ transactions, bills, accounts, creditData, budgetData }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'bill_reminder',
      priority: 'high',
      title: 'Electric Bill due in 2 days',
      message: '$125.50 payment due March 15th',
      timestamp: new Date(),
      category: 'Bills'
    },
    {
      id: 2,
      type: 'budget_warning',
      priority: 'medium',
      title: 'Dining budget at 85%',
      message: '$45 remaining this month',
      timestamp: new Date(),
      category: 'Budget'
    },
    {
      id: 3,
      type: 'goal_progress',
      priority: 'low',
      title: 'Emergency Fund at 75%',
      message: 'Only $2,500 to go!',
      timestamp: new Date(),
      category: 'Goals'
    }
  ]);

  const [activeTab, setActiveTab] = useState('notifications');
  const [filter, setFilter] = useState('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return notification.category.toLowerCase() === filter;
  });

  const archiveNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const NotificationCard = ({ notification }) => {
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
      <div style={{
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        marginBottom: '0.75rem',
        background: priorityColors[notification.priority] || 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', flex: 1 }}>
            <Bell style={{ width: '1.25rem', height: '1.25rem', marginTop: '0.25rem', color: '#6b7280' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h4 style={{ fontWeight: '500', color: '#111827', margin: 0 }}>{notification.title}</h4>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  fontWeight: '500',
                  background: priorityBadgeColors[notification.priority].split(' ')[0].replace('bg-', '#'),
                  color: priorityBadgeColors[notification.priority].split(' ')[1].replace('text-', '#')
                }}>
                  {notification.priority}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', margin: 0 }}>
                {notification.message}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.375rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    background: 'white'
                  }}>
                    {notification.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => archiveNotification(notification.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Archive style={{ width: '0.75rem', height: '0.75rem' }} />
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', margin: 0 }}>
          <Bell style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: '#2563eb' }} />
          Smart Notifications & Alerts
        </h2>
        <span style={{
          background: '#2563eb',
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          {notifications.length} active
        </span>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
        {[
          { key: 'notifications', label: 'Active Notifications' },
          { key: 'archived', label: 'Archived' },
          { key: 'settings', label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === tab.key ? '#8b5cf6' : '#6b7280',
              fontWeight: activeTab === tab.key ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Filter style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="all">All Categories</option>
              <option value="bills">Bills</option>
              <option value="budget">Budget</option>
              <option value="credit">Credit</option>
              <option value="goals">Goals</option>
            </select>
          </div>

          {filteredNotifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
              <CheckCircle style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem auto', color: '#10b981' }} />
              <h3 style={{ fontWeight: '500', margin: 0 }}>All caught up!</h3>
              <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>No notifications match your current filter.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'archived' && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
          <Archive style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem auto', color: '#9ca3af' }} />
          <h3 style={{ fontWeight: '500', margin: 0 }}>No archived notifications</h3>
          <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Notifications you dismiss will appear here.</p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem', margin: 0 }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { name: 'Bill Reminders', description: 'Get notified before bills are due' },
                { name: 'Budget Alerts', description: 'Warnings when approaching budget limits' },
                { name: 'Credit Updates', description: 'Changes to your credit score' },
                { name: 'Goal Progress', description: 'Updates on savings goals' }
              ].map((setting, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{setting.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{setting.description}</div>
                  </div>
                  <input type="checkbox" defaultChecked style={{ marginLeft: '1rem' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontWeight: '500', marginBottom: '1rem', margin: 0 }}>Delivery Methods</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { name: 'Push Notifications', description: 'Browser notifications' },
                { name: 'Email Notifications', description: 'Send to your email address' },
                { name: 'SMS Alerts', description: 'Text message notifications' }
              ].map((method, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{method.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{method.description}</div>
                  </div>
                  <input type="checkbox" defaultChecked={index === 0} style={{ marginLeft: '1rem' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;