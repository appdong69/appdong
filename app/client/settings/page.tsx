'use client'

import { useState, useEffect } from 'react'
import {
  User,
  Bell,
  Key,
  Shield,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Copy,
  Settings,
  Mail,
  Globe,
  Clock
} from 'lucide-react'

interface ClientSettings {
  profile: {
    company_name: string
    email: string
    contact_person: string
    phone: string
    website: string
    timezone: string
  }
  notifications: {
    email_notifications: boolean
    daily_reports: boolean
    weekly_reports: boolean
    performance_alerts: boolean
    system_updates: boolean
  }
  api: {
    api_key: string
    webhook_url: string
    webhook_secret: string
  }
  limits: {
    max_domains: number
    max_subscribers_per_domain: number
    max_notifications_per_day: number
    max_notifications_per_month: number
  }
}

export default function ClientSettingsPage() {
  const [settings, setSettings] = useState<ClientSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [copiedText, setCopiedText] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        setError('Failed to load settings')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async (section: keyof ClientSettings, data: any) => {
    setIsSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch(`/api/client/settings/${section}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const updatedData = await response.json()
        setSettings(prev => prev ? { ...prev, [section]: updatedData[section] } : null)
        setSuccess('Settings saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save settings')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const generateApiKey = async () => {
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/settings/api/regenerate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(prev => prev ? {
          ...prev,
          api: { ...prev.api, api_key: data.api_key }
        } : null)
        setSuccess('New API key generated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to generate new API key')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(''), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (settings) {
      saveSettings('profile', settings.profile)
    }
  }

  const handleNotificationsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (settings) {
      saveSettings('notifications', settings.notifications)
    }
  }

  const handleApiSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (settings) {
      saveSettings('api', {
        webhook_url: settings.api.webhook_url,
        webhook_secret: settings.api.webhook_secret
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <Settings className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Settings not available</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load your settings at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'profile', name: 'Profile', icon: User },
              { id: 'notifications', name: 'Notifications', icon: Bell },
              { id: 'api', name: 'API & Webhooks', icon: Key },
              { id: 'limits', name: 'Account Limits', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.profile.company_name}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, company_name: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, email: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={settings.profile.contact_person}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, contact_person: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.profile.phone}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, phone: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={settings.profile.website}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, website: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.profile.timezone}
                    onChange={(e) => setSettings({
                      ...settings,
                      profile: { ...settings.profile, timezone: e.target.value }
                    })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Shanghai">Shanghai</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleNotificationsSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email_notifications}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, email_notifications: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Daily Reports</h4>
                    <p className="text-sm text-gray-500">Receive daily performance reports</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.daily_reports}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, daily_reports: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Weekly Reports</h4>
                    <p className="text-sm text-gray-500">Receive weekly performance summaries</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.weekly_reports}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, weekly_reports: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Performance Alerts</h4>
                    <p className="text-sm text-gray-500">Get notified about performance issues</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.performance_alerts}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, performance_alerts: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">System Updates</h4>
                    <p className="text-sm text-gray-500">Receive notifications about system updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.system_updates}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, system_updates: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}

          {/* API & Webhooks Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {/* API Key Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">API Key</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.api.api_key}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings.api.api_key, 'apikey')}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedText === 'apikey' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Use this API key to authenticate your requests to the PW88 API.
                    </p>
                    <button
                      type="button"
                      onClick={generateApiKey}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>

              {/* Webhook Settings */}
              <form onSubmit={handleApiSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={settings.api.webhook_url}
                    onChange={(e) => setSettings({
                      ...settings,
                      api: { ...settings.api, webhook_url: e.target.value }
                    })}
                    placeholder="https://your-domain.com/webhook"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    URL where webhook notifications will be sent
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Secret
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <input
                        type={showWebhookSecret ? 'text' : 'password'}
                        value={settings.api.webhook_secret}
                        onChange={(e) => setSettings({
                          ...settings,
                          api: { ...settings.api, webhook_secret: e.target.value }
                        })}
                        placeholder="Enter webhook secret"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Secret key used to verify webhook authenticity
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="-ml-1 mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Webhook Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Account Limits Tab */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Account Limits</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>These limits are set based on your current plan. Contact support to upgrade your plan for higher limits.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Maximum Domains</h4>
                      <p className="text-sm text-gray-500">Number of domains you can add</p>
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {settings.limits.max_domains}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Subscribers per Domain</h4>
                      <p className="text-sm text-gray-500">Maximum subscribers per domain</p>
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {settings.limits.max_subscribers_per_domain.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Daily Notifications</h4>
                      <p className="text-sm text-gray-500">Notifications you can send per day</p>
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {settings.limits.max_notifications_per_day.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Monthly Notifications</h4>
                      <p className="text-sm text-gray-500">Notifications you can send per month</p>
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {settings.limits.max_notifications_per_month.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Need higher limits? Upgrade your plan or contact our support team.
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Mail className="-ml-1 mr-2 h-4 w-4" />
                  Contact Support
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}