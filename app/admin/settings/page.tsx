'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  RefreshCw,
  Key,
  Mail,
  Server,
  Shield,
  Bell,
  Globe,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react'

interface AdminSettings {
  general: {
    platformName: string
    supportEmail: string
    maxClientsPerPlan: number
    defaultPlan: string
    maintenanceMode: boolean
  }
  notifications: {
    maxNotificationsPerDay: number
    maxSubscribersPerDomain: number
    defaultTtl: number
    enableScheduling: boolean
    enableAnalytics: boolean
  }
  security: {
    jwtExpirationHours: number
    maxLoginAttempts: number
    requireEmailVerification: boolean
    enableTwoFactor: boolean
    sessionTimeout: number
  }
  email: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    fromEmail: string
    fromName: string
    enableSsl: boolean
  }
  vapid: {
    publicKey: string
    privateKey: string
    subject: string
  }
  limits: {
    rateLimit: number
    maxFileSize: number
    maxDomains: number
    maxNotificationSize: number
  }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'email' | 'vapid' | 'limits'>('general')
  const [showPasswords, setShowPasswords] = useState(false)
  const [showVapidKeys, setShowVapidKeys] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        setError('Failed to load settings')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    setIsSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setSuccess('Settings saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to save settings')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const generateVapidKeys = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/settings/vapid/generate', {
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
          vapid: {
            ...prev.vapid,
            publicKey: data.publicKey,
            privateKey: data.privateKey
          }
        } : null)
        setSuccess('New VAPID keys generated')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to generate VAPID keys')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const updateSettings = (section: keyof AdminSettings, field: string, value: any) => {
    if (!settings) return
    
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    })
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
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-700">Failed to load settings</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Platform Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure platform settings and preferences
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={fetchSettings}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="-ml-1 mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
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

      {/* Settings Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'general', name: 'General', icon: Settings },
              { id: 'notifications', name: 'Notifications', icon: Bell },
              { id: 'security', name: 'Security', icon: Shield },
              { id: 'email', name: 'Email', icon: Mail },
              { id: 'vapid', name: 'VAPID Keys', icon: Key },
              { id: 'limits', name: 'Limits', icon: Server },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 ${
                  activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.platformName}
                    onChange={(e) => updateSettings('general', 'platformName', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => updateSettings('general', 'supportEmail', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Clients Per Plan
                  </label>
                  <input
                    type="number"
                    value={settings.general.maxClientsPerPlan}
                    onChange={(e) => updateSettings('general', 'maxClientsPerPlan', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Plan
                  </label>
                  <select
                    value={settings.general.defaultPlan}
                    onChange={(e) => updateSettings('general', 'defaultPlan', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  checked={settings.general.maintenanceMode}
                  onChange={(e) => updateSettings('general', 'maintenanceMode', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                  Enable Maintenance Mode
                </label>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Notifications Per Day
                  </label>
                  <input
                    type="number"
                    value={settings.notifications.maxNotificationsPerDay}
                    onChange={(e) => updateSettings('notifications', 'maxNotificationsPerDay', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Subscribers Per Domain
                  </label>
                  <input
                    type="number"
                    value={settings.notifications.maxSubscribersPerDomain}
                    onChange={(e) => updateSettings('notifications', 'maxSubscribersPerDomain', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default TTL (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.notifications.defaultTtl}
                    onChange={(e) => updateSettings('notifications', 'defaultTtl', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableScheduling"
                    checked={settings.notifications.enableScheduling}
                    onChange={(e) => updateSettings('notifications', 'enableScheduling', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableScheduling" className="ml-2 block text-sm text-gray-900">
                    Enable Notification Scheduling
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableAnalytics"
                    checked={settings.notifications.enableAnalytics}
                    onChange={(e) => updateSettings('notifications', 'enableAnalytics', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableAnalytics" className="ml-2 block text-sm text-gray-900">
                    Enable Analytics Tracking
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JWT Expiration (hours)
                  </label>
                  <input
                    type="number"
                    value={settings.security.jwtExpirationHours}
                    onChange={(e) => updateSettings('security', 'jwtExpirationHours', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireEmailVerification"
                    checked={settings.security.requireEmailVerification}
                    onChange={(e) => updateSettings('security', 'requireEmailVerification', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireEmailVerification" className="ml-2 block text-sm text-gray-900">
                    Require Email Verification
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableTwoFactor"
                    checked={settings.security.enableTwoFactor}
                    onChange={(e) => updateSettings('security', 'enableTwoFactor', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableTwoFactor" className="ml-2 block text-sm text-gray-900">
                    Enable Two-Factor Authentication
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtpHost}
                    onChange={(e) => updateSettings('email', 'smtpHost', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) => updateSettings('email', 'smtpPort', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    value={settings.email.smtpUser}
                    onChange={(e) => updateSettings('email', 'smtpUser', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={settings.email.smtpPassword}
                      onChange={(e) => updateSettings('email', 'smtpPassword', e.target.value)}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={settings.email.fromEmail}
                    onChange={(e) => updateSettings('email', 'fromEmail', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={settings.email.fromName}
                    onChange={(e) => updateSettings('email', 'fromName', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableSsl"
                  checked={settings.email.enableSsl}
                  onChange={(e) => updateSettings('email', 'enableSsl', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableSsl" className="ml-2 block text-sm text-gray-900">
                  Enable SSL/TLS
                </label>
              </div>
            </div>
          )}

          {/* VAPID Keys */}
          {activeTab === 'vapid' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      VAPID keys are used for web push notifications. Keep these keys secure and do not share them.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject (Contact Email)
                  </label>
                  <input
                    type="email"
                    value={settings.vapid.subject}
                    onChange={(e) => updateSettings('vapid', 'subject', e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Public Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVapidKeys(!showVapidKeys)}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      {showVapidKeys ? 'Hide' : 'Show'} Keys
                    </button>
                  </div>
                  <textarea
                    value={settings.vapid.publicKey}
                    onChange={(e) => updateSettings('vapid', 'publicKey', e.target.value)}
                    rows={3}
                    className={`block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${!showVapidKeys ? 'filter blur-sm' : ''}`}
                    readOnly={!showVapidKeys}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private Key
                  </label>
                  <textarea
                    value={settings.vapid.privateKey}
                    onChange={(e) => updateSettings('vapid', 'privateKey', e.target.value)}
                    rows={3}
                    className={`block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${!showVapidKeys ? 'filter blur-sm' : ''}`}
                    readOnly={!showVapidKeys}
                  />
                </div>
                
                <button
                  onClick={generateVapidKeys}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <Zap className="-ml-1 mr-2 h-4 w-4" />
                  Generate New Keys
                </button>
              </div>
            </div>
          )}

          {/* Limits Settings */}
          {activeTab === 'limits' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Limit (requests/minute)
                  </label>
                  <input
                    type="number"
                    value={settings.limits.rateLimit}
                    onChange={(e) => updateSettings('limits', 'rateLimit', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max File Size (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.limits.maxFileSize}
                    onChange={(e) => updateSettings('limits', 'maxFileSize', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Domains per Client
                  </label>
                  <input
                    type="number"
                    value={settings.limits.maxDomains}
                    onChange={(e) => updateSettings('limits', 'maxDomains', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Notification Size (KB)
                  </label>
                  <input
                    type="number"
                    value={settings.limits.maxNotificationSize}
                    onChange={(e) => updateSettings('limits', 'maxNotificationSize', parseInt(e.target.value))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}