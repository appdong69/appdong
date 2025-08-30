'use client'

import { useState, useEffect } from 'react'
import {
  Send,
  Globe,
  Bell,
  Image,
  Link,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Eye,
  Calendar,
  RefreshCw
} from 'lucide-react'

interface Domain {
  id: string
  domain: string
  status: string
  subscribers: number
  verified: boolean
}

interface NotificationAction {
  action: string
  title: string
  icon?: string
  url?: string
}

export default function ClientSendPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    icon: '',
    image: '',
    badge: '',
    url: '',
    require_interaction: false,
    tag: '',
    ttl: 86400,
    actions: [] as NotificationAction[],
    schedule_at: '',
    schedule_date: '',
    schedule_time: ''
  })

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/domains', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains?.filter((d: Domain) => d.status === 'active' && d.verified) || [])
      } else {
        setError('Failed to load domains')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const sendNotification = async () => {
    if (!formData.title || !formData.message || selectedDomains.length === 0) {
      setError('Please fill in all required fields and select at least one domain')
      return
    }

    setIsSending(true)
    setError('')
    
    try {
      const token = localStorage.getItem('client_token')
      
      // Prepare schedule timestamp
      let scheduleAt = null
      if (formData.schedule_date && formData.schedule_time) {
        scheduleAt = new Date(`${formData.schedule_date}T${formData.schedule_time}`).toISOString()
      }
      
      const payload = {
        title: formData.title,
        message: formData.message,
        icon: formData.icon || undefined,
        image: formData.image || undefined,
        badge: formData.badge || undefined,
        url: formData.url || undefined,
        require_interaction: formData.require_interaction,
        tag: formData.tag || undefined,
        ttl: formData.ttl,
        actions: formData.actions.filter(action => action.action && action.title),
        domain_ids: selectedDomains,
        schedule_at: scheduleAt
      }

      const response = await fetch('/api/client/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(scheduleAt ? 'Notification scheduled successfully!' : 'Notification sent successfully!')
        resetForm()
        setTimeout(() => setSuccess(''), 5000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to send notification')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsSending(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      icon: '',
      image: '',
      badge: '',
      url: '',
      require_interaction: false,
      tag: '',
      ttl: 86400,
      actions: [],
      schedule_at: '',
      schedule_date: '',
      schedule_time: ''
    })
    setSelectedDomains([])
  }

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { action: '', title: '', icon: '', url: '' }]
    })
  }

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    })
  }

  const updateAction = (index: number, field: keyof NotificationAction, value: string) => {
    const updatedActions = formData.actions.map((action, i) => 
      i === index ? { ...action, [field]: value } : action
    )
    setFormData({ ...formData, actions: updatedActions })
  }

  const toggleDomain = (domainId: string) => {
    setSelectedDomains(prev => 
      prev.includes(domainId) 
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    )
  }

  const selectAllDomains = () => {
    setSelectedDomains(domains.map(d => d.id))
  }

  const deselectAllDomains = () => {
    setSelectedDomains([])
  }

  const getTotalSubscribers = () => {
    return domains
      .filter(d => selectedDomains.includes(d.id))
      .reduce((total, domain) => total + domain.subscribers, 0)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
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
            Send Notification
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Compose and send push notifications to your subscribers
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={fetchDomains}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Content</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notification title"
                  maxLength={100}
                />
                <p className="mt-1 text-sm text-gray-500">{formData.title.length}/100 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your notification message..."
                  maxLength={300}
                />
                <p className="mt-1 text-sm text-gray-500">{formData.message.length}/300 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Click URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon URL
                </label>
                <input
                  type="url"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/icon.png"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Badge URL
                </label>
                <input
                  type="url"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/badge.png"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/image.png"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TTL (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.ttl}
                  onChange={(e) => setFormData({ ...formData, ttl: parseInt(e.target.value) || 86400 })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag (optional)
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="notification-tag"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require_interaction"
                  checked={formData.require_interaction}
                  onChange={(e) => setFormData({ ...formData, require_interaction: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require_interaction" className="ml-2 block text-sm text-gray-900">
                  Require user interaction
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Action Buttons</h3>
              <button
                onClick={addAction}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="-ml-1 mr-1 h-4 w-4" />
                Add Action
              </button>
            </div>
            
            {formData.actions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No action buttons added. Click "Add Action" to create interactive buttons.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.actions.map((action, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Action {index + 1}</span>
                      <button
                        onClick={() => removeAction(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Action ID"
                        value={action.action}
                        onChange={(e) => updateAction(index, 'action', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Button Title"
                        value={action.title}
                        onChange={(e) => updateAction(index, 'title', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="url"
                        placeholder="Icon URL (optional)"
                        value={action.icon || ''}
                        onChange={(e) => updateAction(index, 'icon', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <input
                        type="url"
                        placeholder="Action URL (optional)"
                        value={action.url || ''}
                        onChange={(e) => updateAction(index, 'url', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Options */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule (Optional)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.schedule_date}
                  onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Leave empty to send immediately
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Domain Selection */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select Domains</h3>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllDomains}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-xs text-gray-400">|</span>
                <button
                  onClick={deselectAllDomains}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {domains.length === 0 ? (
              <div className="text-center py-4">
                <Globe className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  No active verified domains found.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {domains.map((domain) => (
                  <label key={domain.id} className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDomains.includes(domain.id)}
                      onChange={() => toggleDomain(domain.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                        <span className="text-xs text-gray-500">
                          {domain.subscribers.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Selected Domains:</span>
                <span className="text-sm font-medium text-gray-900">{selectedDomains.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Subscribers:</span>
                <span className="text-sm font-medium text-gray-900">
                  {getTotalSubscribers().toLocaleString()}
                </span>
              </div>
              {formData.schedule_date && formData.schedule_time && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Scheduled for:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(`${formData.schedule_date}T${formData.schedule_time}`).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Preview</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <Eye className="inline h-4 w-4 mr-1" />
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showPreview && formData.title && formData.message && (
              <div className="bg-gray-50 border rounded-md p-3">
                <div className="flex items-start space-x-3">
                  {formData.icon && (
                    <img src={formData.icon} alt="Icon" className="w-8 h-8 rounded" onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }} />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">{formData.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{formData.message}</p>
                    {formData.image && (
                      <img src={formData.image} alt="Notification" className="mt-2 max-w-full h-20 object-cover rounded" onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <div className="bg-white shadow rounded-lg p-6">
            <button
              onClick={sendNotification}
              disabled={isSending || !formData.title || !formData.message || selectedDomains.length === 0}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="-ml-1 mr-2 h-4 w-4" />
                  {formData.schedule_date && formData.schedule_time ? 'Schedule Notification' : 'Send Now'}
                </>
              )}
            </button>
            
            {selectedDomains.length === 0 && (
              <p className="mt-2 text-xs text-red-600 text-center">
                Please select at least one domain
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}