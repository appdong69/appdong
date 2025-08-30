'use client'

import { useState, useEffect } from 'react'
import {
  Globe,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Users,
  Bell,
  MousePointer,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
  Copy,
  Code,
  Settings,
  ExternalLink
} from 'lucide-react'

interface Domain {
  id: string
  domain: string
  status: 'active' | 'inactive' | 'pending' | 'verified'
  subscribers: number
  notifications_sent: number
  click_rate: number
  verification_token: string
  ssl_enabled: boolean
  created_at: string
  last_notification: string | null
}

export default function ClientDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showIntegrationModal, setShowIntegrationModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [copiedText, setCopiedText] = useState('')

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
        setDomains(data.domains || [])
      } else {
        setError('Failed to load domains')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const addDomain = async () => {
    if (!newDomain.trim()) return
    
    setIsAdding(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setDomains(prev => [data.domain, ...prev])
        setShowAddModal(false)
        setNewDomain('')
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to add domain')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsAdding(false)
    }
  }

  const deleteDomain = async (id: string) => {
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch(`/api/client/domains/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setDomains(prev => prev.filter(d => d.id !== id))
        setShowDeleteModal(false)
        setDeleteId(null)
      } else {
        setError('Failed to delete domain')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleDomainStatus = async (id: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('client_token')
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      
      const response = await fetch(`/api/client/domains/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setDomains(prev => prev.map(d => 
          d.id === id ? { ...d, status: newStatus as any } : d
        ))
      } else {
        setError('Failed to update domain status')
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

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'
      }`}>
        {status}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredDomains = domains.filter(domain =>
    domain.domain.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const generateIntegrationCode = (domain: Domain) => {
    return `<!-- PW88 Push Notification Integration -->
<script>
(function() {
  // Configuration
  const config = {
    domain: '${domain.domain}',
    apiUrl: '${window.location.origin}/api',
    verificationToken: '${domain.verification_token}'
  };

  // Load service worker
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('Service Worker registered:', registration);
        
        // Request notification permission
        return Notification.requestPermission();
      })
      .then(function(permission) {
        if (permission === 'granted') {
          subscribeUser();
        }
      })
      .catch(function(error) {
        console.error('Service Worker registration failed:', error);
      });
  }

  function subscribeUser() {
    navigator.serviceWorker.ready
      .then(function(registration) {
        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array('${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY'}')
        });
      })
      .then(function(subscription) {
        // Send subscription to server
        return fetch(config.apiUrl + '/client/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription,
            domain: config.domain,
            verificationToken: config.verificationToken
          })
        });
      })
      .then(function(response) {
        if (response.ok) {
          console.log('User subscribed successfully');
        }
      })
      .catch(function(error) {
        console.error('Subscription failed:', error);
      });
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
})();
</script>`
  }

  const serviceWorkerCode = `// PW88 Service Worker
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.message,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      image: data.image,
      data: {
        url: data.url,
        notificationId: data.notificationId
      },
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || 'pw88-notification'
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const url = event.notification.data.url || '/';
  const notificationId = event.notification.data.notificationId;

  // Track click
  if (notificationId) {
    fetch('/api/client/notifications/' + notificationId + '/click', {
      method: 'POST'
    }).catch(console.error);
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  // Track notification close if needed
  console.log('Notification closed:', event.notification.tag);
});`

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
            Domains
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your domains and integration settings
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
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Add Domain
          </button>
        </div>
      </div>

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
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Domains List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredDomains.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredDomains.map((domain) => (
              <div key={domain.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(domain.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {domain.domain}
                        </h3>
                        {getStatusBadge(domain.status)}
                        {domain.ssl_enabled && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            SSL
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {domain.subscribers.toLocaleString()} subscribers
                        </div>
                        <div className="flex items-center">
                          <Bell className="h-4 w-4 mr-1" />
                          {domain.notifications_sent.toLocaleString()} sent
                        </div>
                        <div className="flex items-center">
                          <MousePointer className="h-4 w-4 mr-1" />
                          {domain.click_rate.toFixed(1)}% CTR
                        </div>
                        <div>
                          Added {formatDate(domain.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDomain(domain)
                        setShowIntegrationModal(true)
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Code className="h-4 w-4 mr-1" />
                      Integration
                    </button>
                    <button
                      onClick={() => setSelectedDomain(domain)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => toggleDomainStatus(domain.id, domain.status)}
                      className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        domain.status === 'active'
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      }`}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {domain.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteId(domain.id)
                        setShowDeleteModal(true)
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No domains</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first domain to start collecting subscribers.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Add Domain
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Domain</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewDomain('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter your domain without http:// or https://
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setNewDomain('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addDomain}
                    disabled={isAdding || !newDomain.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? 'Adding...' : 'Add Domain'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Modal */}
      {showIntegrationModal && selectedDomain && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Integration Code for {selectedDomain.domain}
              </h3>
              <button
                onClick={() => {
                  setShowIntegrationModal(false)
                  setSelectedDomain(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Integration Steps:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Add the JavaScript code to your website's HTML</li>
                  <li>Create and upload the service worker file (sw.js) to your domain root</li>
                  <li>Test the integration by visiting your website</li>
                  <li>Users will be prompted to allow notifications</li>
                </ol>
              </div>

              {/* JavaScript Integration Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">JavaScript Integration Code</h4>
                  <button
                    onClick={() => copyToClipboard(generateIntegrationCode(selectedDomain), 'integration')}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copiedText === 'integration' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                    {generateIntegrationCode(selectedDomain)}
                  </pre>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Add this code to your website's HTML, preferably before the closing &lt;/body&gt; tag.
                </p>
              </div>

              {/* Service Worker Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">Service Worker Code (sw.js)</h4>
                  <button
                    onClick={() => copyToClipboard(serviceWorkerCode, 'serviceworker')}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {copiedText === 'serviceworker' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-900 rounded-md p-4 overflow-x-auto max-h-64">
                  <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                    {serviceWorkerCode}
                  </pre>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Create a file named 'sw.js' in your domain's root directory with this content.
                </p>
              </div>

              {/* Domain Info */}
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Domain Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Domain:</span>
                    <span className="ml-2 font-medium">{selectedDomain.domain}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2">{getStatusBadge(selectedDomain.status)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Subscribers:</span>
                    <span className="ml-2 font-medium">{selectedDomain.subscribers.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Verification Token:</span>
                    <span className="ml-2 font-mono text-xs">{selectedDomain.verification_token}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain Detail Modal */}
      {selectedDomain && !showIntegrationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Domain Details</h3>
              <button
                onClick={() => setSelectedDomain(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Domain</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDomain.domain}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedDomain.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subscribers</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDomain.subscribers.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notifications Sent</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDomain.notifications_sent.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Click Rate</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDomain.click_rate.toFixed(2)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SSL Enabled</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDomain.ssl_enabled ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedDomain.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Notification</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedDomain.last_notification ? formatDate(selectedDomain.last_notification) : 'Never'}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Verification Token</label>
                <div className="mt-1 flex items-center space-x-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono">
                    {selectedDomain.verification_token}
                  </code>
                  <button
                    onClick={() => copyToClipboard(selectedDomain.verification_token, 'token')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
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
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Domain</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this domain? This will remove all subscribers and cannot be undone.
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
                  onClick={() => deleteId && deleteDomain(deleteId)}
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