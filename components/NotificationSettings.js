import React from 'react';
import { notify } from './Notify';

export default function NotificationSettings({ user, supabase }) {
  const [settings, setSettings] = React.useState({
    email: user?.email || '',
    notifications: {
      enabled: true,
      reminderDays: [3, 1, 0], // 3 days before, 1 day before, day of
      weeklyDigest: true,
      overdueAlerts: true
    },
    pushNotifications: {
      enabled: false,
      permission: 'default'
    }
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const [testEmailSent, setTestEmailSent] = React.useState(false);

  // Load notification settings
  React.useEffect(() => {
    if (!user?.id || !supabase) return;

    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'notification_settings')
          .single();

        if (data && !error) {
          setSettings(prev => ({ ...prev, ...data.value }));
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    }

    loadSettings();
  }, [user?.id, supabase]);

  // Check push notification permission
  React.useEffect(() => {
    if ('Notification' in window) {
      setSettings(prev => ({
        ...prev,
        pushNotifications: {
          ...prev.pushNotifications,
          permission: Notification.permission
        }
      }));
    }
  }, []);

  const saveSettings = async () => {
    if (!user?.id || !supabase) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          key: 'notification_settings',
          value: settings
        }, { onConflict: 'user_id, key' });

      if (error) throw error;

      notify('Notification settings saved!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      notify('Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      notify('Push notifications not supported in this browser', 'error');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setSettings(prev => ({
        ...prev,
        pushNotifications: {
          ...prev.pushNotifications,
          permission,
          enabled: permission === 'granted'
        }
      }));

      if (permission === 'granted') {
        notify('Push notifications enabled!', 'success');
      } else {
        notify('Push notifications denied', 'warning');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      notify('Failed to enable push notifications', 'error');
    }
  };

  const sendTestEmail = async () => {
    setTestEmailSent(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: settings.email,
          subject: '🧪 Test Email from Cashflo',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border-radius: 8px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; text-align: center;">
              <h2>💰 Test Email Successful!</h2>
              <p>If you can see this email, your Cashflo notifications are working perfectly!</p>
              <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                <strong>✅ Email notifications are configured correctly</strong>
              </div>
            </div>
          `,
          type: 'test'
        })
      });

      if (response.ok) {
        notify('Test email sent! Check your inbox.', 'success');
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      notify('Failed to send test email', 'error');
    } finally {
      setTimeout(() => setTestEmailSent(false), 3000);
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '1rem',
      padding: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>
          🔔 Notification Settings
        </h2>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Stay on top of your bills with smart reminders
        </p>
      </div>

      {/* Email Settings */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
          📧 Email Notifications
        </h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
            Email Address
          </label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
            placeholder="your@email.com"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            id="email-enabled"
            checked={settings.notifications.enabled}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              notifications: { ...prev.notifications, enabled: e.target.checked }
            }))}
            style={{ marginRight: '0.5rem' }}
          />
          <label htmlFor="email-enabled" style={{ fontSize: '0.875rem', color: '#374151' }}>
            Enable email notifications
          </label>
        </div>

        {settings.notifications.enabled && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Send reminders
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { value: 7, label: '1 week before' },
                  { value: 3, label: '3 days before' },
                  { value: 1, label: '1 day before' },
                  { value: 0, label: 'Day of' }
                ].map(option => (
                  <label key={option.value} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: settings.notifications.reminderDays.includes(option.value) ? '#eff6ff' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={settings.notifications.reminderDays.includes(option.value)}
                      onChange={(e) => {
                        const days = settings.notifications.reminderDays;
                        const newDays = e.target.checked
                          ? [...days, option.value]
                          : days.filter(d => d !== option.value);
                        setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, reminderDays: newDays }
                        }));
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="weekly-digest"
                checked={settings.notifications.weeklyDigest}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, weeklyDigest: e.target.checked }
                }))}
                style={{ marginRight: '0.5rem' }}
              />
              <label htmlFor="weekly-digest" style={{ fontSize: '0.875rem', color: '#374151' }}>
                Weekly summary email (Mondays)
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="overdue-alerts"
                checked={settings.notifications.overdueAlerts}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, overdueAlerts: e.target.checked }
                }))}
                style={{ marginRight: '0.5rem' }}
              />
              <label htmlFor="overdue-alerts" style={{ fontSize: '0.875rem', color: '#374151' }}>
                Send alerts for overdue bills
              </label>
            </div>

            <button
              onClick={sendTestEmail}
              disabled={testEmailSent || !settings.email}
              style={{
                padding: '0.5rem 1rem',
                background: testEmailSent ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                cursor: testEmailSent ? 'default' : 'pointer',
                opacity: !settings.email ? 0.5 : 1
              }}
            >
              {testEmailSent ? '✅ Test Email Sent!' : '🧪 Send Test Email'}
            </button>
          </>
        )}
      </div>

      {/* Push Notifications */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
          📱 Push Notifications
        </h3>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            padding: '1rem',
            background: settings.pushNotifications.permission === 'granted' ? '#f0fdf4' : '#fefce8',
            border: `1px solid ${settings.pushNotifications.permission === 'granted' ? '#10b981' : '#f59e0b'}`,
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}>
            <strong>Status:</strong> {
              settings.pushNotifications.permission === 'granted' ? '✅ Enabled' :
              settings.pushNotifications.permission === 'denied' ? '❌ Blocked' :
              '⏳ Not enabled'
            }
          </div>
        </div>

        {settings.pushNotifications.permission !== 'granted' && (
          <button
            onClick={requestPushPermission}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔔 Enable Push Notifications
          </button>
        )}
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'right', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
        <button
          onClick={saveSettings}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            background: isLoading ? '#6b7280' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            cursor: isLoading ? 'default' : 'pointer',
            fontWeight: '600'
          }}
        >
          {isLoading ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}