'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Copy,
  Send,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Image,
  Link,
  Bell,
  Save,
  Globe
} from 'lucide-react'

interface NotificationTemplate {
  id: string
  name: string
  title: string
  message: string
  icon?: string
  image?: string
  badge?: string
  url?: string
  actions?: Array<{
    action: string
    title: string
    icon?: string
    url?: string
  }>
  require_interaction: boolean
  tag?: string
  ttl?: number
  created_at: string
  updated_at: string
  usage_count: number
}

interface Domain {
  id: string
  domain: string
  status: string
  subscribers: number
}

export default function ClientTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    message: '',
    icon: '',
    image: '',
    badge: '',
    url: '',
    require_interaction: false,
    tag: '',
    ttl: 86400,
    actions: [{ action: '', title: '' }]
  })

  useEffect(() => {
    fetchTemplates()
    fetchDomains()
  }, [])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        setError('Failed to load templates')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDomains = async () => {
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
        setDomains(data.domains || [])
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error)
    }
  }

  const createTemplate = async () => {
    setIsSaving(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(prev => [data.template, ...prev])
        setShowCreateModal(false)
        resetForm()
        setSuccess('Template created successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to create template')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const updateTemplate = async () => {
    if (!selectedTemplate) return
    
    setIsSaving(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch(`/api/client/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? data.template : t))
        setShowEditModal(false)
        setSelectedTemplate(null)
        resetForm()
        setSuccess('Template updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to update template')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch(`/api/client/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id))
        setShowDeleteModal(false)
        setDeleteId(null)
        setSuccess('Template deleted successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to delete template')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const sendNotification = async () => {
    if (!selectedTemplate || selectedDomains.length === 0) return
    
    setIsSending(true)
    try {
      const token = localStorage.getItem('client_token')
      const payload = {
        template_id: selectedTemplate.id,
        domain_ids: selectedDomains,
        schedule_at: scheduleDate && scheduleTime ? 
          new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null
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
        setShowSendModal(false)
        setSelectedTemplate(null)
        setSelectedDomains([])
        setScheduleDate('')
        setScheduleTime('')
        setSuccess('Notification sent successfully')
        setTimeout(() => setSuccess(''), 3000)
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

  const duplicateTemplate = async (template: NotificationTemplate) => {
    const duplicatedData = {
      name: `${template.name} (Copy)`,
      title: template.title,
      message: template.message,
      icon: template.icon || '',
      image: template.image || '',
      badge: template.badge || '',
      url: template.url || '',
      require_interaction: template.require_interaction,
      tag: template.tag || '',
      ttl: template.ttl || 86400,
      actions: template.actions || [{ action: '', title: '' }]
    }

    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedData),
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(prev => [data.template, ...prev])
        setSuccess('Template duplicated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to duplicate template')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      message: '',
      icon: '',
      image: '',
      badge: '',
      url: '',
      require_interaction: false,
      tag: '',
      ttl: 86400,
      actions: [{ action: '', title: '' }]
    })
  }

  const openEditModal = (template: NotificationTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      title: template.title,
      message: template.message,
      icon: template.icon || '',
      image: template.image || '',
      badge: template.badge || '',
      url: template.url || '',
      require_interaction: template.require_interaction,
      tag: template.tag || '',
      ttl: template.ttl || 86400,
      actions: template.actions || [{ action: '', title: '' }]
    })
    setShowEditModal(true)
  }

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { action: '', title: '' }]
    })
  }

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    })
  }

  const updateAction = (index: number, field: string, value: string) => {
    const updatedActions = formData.actions.map((action, i) => 
      i === index ? { ...action, [field]: value } : action
    )
    setFormData({ ...formData, actions: updatedActions })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            Notification Templates
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage reusable notification templates
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={fetchTemplates}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Create Template
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

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {template.name}
                </h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowSendModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                    title="Send notification"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => duplicateTemplate(template)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md"
                    title="Duplicate template"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md"
                    title="Edit template"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(template.id)
                      setShowDeleteModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{template.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{template.message}</p>
                </div>
                
                {template.url && (
                  <div className="flex items-center text-sm text-blue-600">
                    <Link className="h-4 w-4 mr-1" />
                    <span className="truncate">{template.url}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Used {template.usage_count} times</span>
                  </div>
                  <span>{formatDate(template.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first notification template to get started.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {showCreateModal ? 'Create New Template' : 'Edit Template'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  setSelectedTemplate(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              showCreateModal ? createTemplate() : updateTemplate()
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="My Notification Template"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notification Title"
                  />
                </div>
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
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tag
                  </label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="notification-tag"
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
              </div>
              
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
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    setSelectedTemplate(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : (showCreateModal ? 'Create Template' : 'Update Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showSendModal && selectedTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Send Notification: {selectedTemplate.name}
              </h3>
              <button
                onClick={() => {
                  setShowSendModal(false)
                  setSelectedTemplate(null)
                  setSelectedDomains([])
                  setScheduleDate('')
                  setScheduleTime('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Template Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
                <div className="bg-white border rounded-md p-3">
                  <div className="flex items-start space-x-3">
                    {selectedTemplate.icon && (
                      <img src={selectedTemplate.icon} alt="Icon" className="w-8 h-8 rounded" />
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{selectedTemplate.title}</h5>
                      <p className="text-sm text-gray-600">{selectedTemplate.message}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Domain Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Domains *
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {domains.map((domain) => (
                    <label key={domain.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDomains.includes(domain.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDomains([...selectedDomains, domain.id])
                          } else {
                            setSelectedDomains(selectedDomains.filter(id => id !== domain.id))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                          <span className="text-xs text-gray-500">{domain.subscribers} subscribers</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Schedule Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to send immediately
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSendModal(false)
                    setSelectedTemplate(null)
                    setSelectedDomains([])
                    setScheduleDate('')
                    setScheduleTime('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={sendNotification}
                  disabled={isSending || selectedDomains.length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="-ml-1 mr-2 h-4 w-4" />
                  {isSending ? 'Sending...' : (scheduleDate ? 'Schedule' : 'Send Now')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Template</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this template? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteId(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteId && deleteTemplate(deleteId)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}