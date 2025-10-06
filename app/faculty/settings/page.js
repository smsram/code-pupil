"use client";

import { useState } from 'react'

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      similarityAlerts: true,
      testReminders: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      autoLock: true
    },
    preferences: {
      theme: 'dark',
      language: 'english',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY'
    }
  })

  const handleNotificationChange = (key) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }))
  }

  const handleSecurityChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value
      }
    }))
  }

  const handlePreferenceChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }))
  }

  const handleSaveSettings = () => {
    console.log('Saving settings:', settings)
    alert('Settings saved successfully!')
  }

  return (
    <div className="fade-in">
      <div className="grid-2">
        {/* Notification Settings */}
        <div className="dashboard-card">
          <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
            Notification Settings
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Email Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.notifications.emailNotifications}
                onChange={() => handleNotificationChange('emailNotifications')}
              />
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Push Notifications</span>
              <input 
                type="checkbox" 
                checked={settings.notifications.pushNotifications}
                onChange={() => handleNotificationChange('pushNotifications')}
              />
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Similarity Alerts</span>
              <input 
                type="checkbox" 
                checked={settings.notifications.similarityAlerts}
                onChange={() => handleNotificationChange('similarityAlerts')}
              />
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Test Reminders</span>
              <input 
                type="checkbox" 
                checked={settings.notifications.testReminders}
                onChange={() => handleNotificationChange('testReminders')}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="dashboard-card">
          <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
            Security Settings
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Two-Factor Authentication</span>
              <input 
                type="checkbox" 
                checked={settings.security.twoFactorAuth}
                onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                Session Timeout (minutes)
              </label>
              <input 
                type="number" 
                className="search-input" 
                style={{width: '100%'}}
                min="15"
                max="120"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Auto-lock Account</span>
              <input 
                type="checkbox" 
                checked={settings.security.autoLock}
                onChange={(e) => handleSecurityChange('autoLock', e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Preference Settings */}
        <div className="dashboard-card">
          <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
            Preferences
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                Theme
              </label>
              <select 
                className="filter-select" 
                style={{width: '100%'}}
                value={settings.preferences.theme}
                onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              >
                <option value="dark">Dark Mode</option>
                <option value="light">Light Mode</option>
                <option value="auto">System Default</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                Language
              </label>
              <select 
                className="filter-select" 
                style={{width: '100%'}}
                value={settings.preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
              >
                <option value="english">English</option>
                <option value="hindi">Hindi</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#e2e8f0'}}>
                Timezone
              </label>
              <select 
                className="filter-select" 
                style={{width: '100%'}}
                value={settings.preferences.timezone}
                onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="dashboard-card">
          <h3 style={{color: '#06b6d4', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem'}}>
            Account Information
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#94a3b8'}}>Name:</span>
              <span style={{fontWeight: 600}}>Prof. Faculty</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#94a3b8'}}>Email:</span>
              <span style={{fontWeight: 600}}>faculty@university.edu</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#94a3b8'}}>Department:</span>
              <span style={{fontWeight: 600}}>Computer Science</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#94a3b8'}}>Role:</span>
              <span style={{fontWeight: 600}}>Senior Faculty</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: '#94a3b8'}}>Last Login:</span>
              <span style={{fontWeight: 600}}>Today, 10:00 AM</span>
            </div>
          </div>
          
          <div style={{marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(71, 85, 105, 0.3)'}}>
            <button className="action-btn secondary" style={{width: '100%'}}>
              <svg className="icon" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{marginTop: '2rem', textAlign: 'center'}}>
        <button className="action-btn primary" onClick={handleSaveSettings} style={{minWidth: '200px'}}>
          <svg className="icon" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Save All Settings
        </button>
      </div>
    </div>
  )
}

export default Settings
