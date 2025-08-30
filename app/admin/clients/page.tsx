'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  Bell,
  Calendar,
  ExternalLink
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  company: string
  domains: number
  subscribers: number
  notifications: number
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
}

interface Filters {
  search: string
  status: 'all' | 'active' | 'inactive'
  plan: 'all' | 'free' | 'basic' | 'pro' | 'enterprise'
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    plan: 'all'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [isCreating, setIsCreating] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    domainLimit: 1,
    subscriptionPlan: 'basic'
  })

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    filterClients()
  }, [clients, filters])

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setError('') // Clear any previous errors
        const data = await response.json()
        // Map backend data to frontend format
        const mappedClients = data.data.clients.map((client: any) => ({
          id: client.id,
          name: client.name,
          email: client.email,
          company: client.company_name || '',
          domains: client.domain_count || 0,
          subscribers: client.subscriber_count || 0,
          notifications: client.total_sends || 0,
          isActive: client.is_active,
          createdAt: client.created_at,
          lastLoginAt: null, // This field is not provided by backend
          plan: client.subscription_plan || 'basic'
        }))
        setClients(mappedClients)
      } else {
        setError('Failed to load clients')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const filterClients = () => {
    let filtered = clients

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(client =>
        (client.name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (client.company || '').toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(client =>
        filters.status === 'active' ? client.isActive : !client.isActive
      )
    }

    // Plan filter
    if (filters.plan !== 'all') {
      filtered = filtered.filter(client => client.plan === filters.plan)
    }

    setFilteredClients(filtered)
    setCurrentPage(1)
  }

  const toggleClientStatus = async (clientId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/clients/${clientId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        setError('') // Clear any previous errors
        setClients(clients.map(client =>
          client.id === clientId ? { ...client, isActive: !isActive } : client
        ))
      } else {
        setError('Failed to update client status')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const createClient = async () => {
    try {
      setIsCreating(true)
      setError('')
      
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createFormData),
      })

      if (response.ok) {
        const data = await response.json()
        // Map backend data to frontend format
        const newClient = {
          id: data.data.client.id,
          name: data.data.client.name || '',
          email: data.data.client.email,
          company: data.data.client.company_name || '',
          domains: 0, // New client starts with 0 domains
          subscribers: 0, // New client starts with 0 subscribers
          notifications: 0, // New client starts with 0 notifications
          isActive: data.data.client.is_active,
          createdAt: data.data.client.created_at,
          lastLoginAt: null,
          plan: data.data.client.subscription_plan || 'basic'
        }
        setClients([newClient, ...clients])
        setShowClientModal(false)
        setCreateFormData({
          name: '',
          email: '',
          password: '',
          companyName: '',
          domainLimit: 1,
          subscriptionPlan: 'basic'
        })
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create client')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const deleteClient = async (clientId: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setError('') // Clear any previous errors
        setClients(clients.filter(client => client.id !== clientId))
        setShowDeleteModal(false)
        setSelectedClient(null)
      } else {
        setError('Failed to delete client')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'bg-gray-100 text-gray-800'
      case 'basic': return 'bg-blue-100 text-blue-800'
      case 'pro': return 'bg-purple-100 text-purple-800'
      case 'enterprise': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentClients = filteredClients.slice(startIndex, endIndex)

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Client Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all registered clients and their accounts
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setShowClientModal(true)}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value as any })}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{client.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{client.email || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{client.company || 'No company'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPlanBadgeColor(client.plan)}`}>
                      {client.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{client.domains}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{client.subscribers}</span>
                      </div>
                      <div className="flex items-center">
                        <Bell className="h-4 w-4 text-gray-400 mr-1" />
                        <span>{client.notifications}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleClientStatus(client.id, client.isActive)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } transition-colors`}
                    >
                      {client.isActive ? (
                        <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.lastLoginAt ? (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        {new Date(client.lastLoginAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedClient(client)
                          setShowClientModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClient(client)
                          setShowClientModal(true)
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedClient(client)
                          setShowDeleteModal(true)
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredClients.length)}</span> of{' '}
                  <span className="font-medium">{filteredClients.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      } ${i === 0 ? 'rounded-l-md' : ''} ${i === totalPages - 1 ? 'rounded-r-md' : ''}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Client</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={createFormData.companyName}
                    onChange={(e) => setCreateFormData({ ...createFormData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Company name (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={createFormData.domainLimit}
                    onChange={(e) => setCreateFormData({ ...createFormData, domainLimit: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                  <select
                    value={createFormData.subscriptionPlan}
                    onChange={(e) => setCreateFormData({ ...createFormData, subscriptionPlan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowClientModal(false)
                    setCreateFormData({
                      name: '',
                      email: '',
                      password: '',
                      companyName: '',
                      domainLimit: 1,
                      subscriptionPlan: 'basic'
                    })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  onClick={createClient}
                  disabled={isCreating || !createFormData.name || !createFormData.email || !createFormData.password}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Client</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <strong>{selectedClient.name}</strong>? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedClient(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteClient(selectedClient.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}