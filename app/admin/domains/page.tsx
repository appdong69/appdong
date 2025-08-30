'use client'

import { useState, useEffect } from 'react'
import {
  Globe,
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Bell,
  Calendar,
  ExternalLink,
  Shield,
  Activity
} from 'lucide-react'

interface Domain {
  id: string
  domain: string
  clientId: string
  clientName: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  isVerified: boolean
  subscriberCount: number
  notificationCount: number
  lastNotificationAt?: string
  createdAt: string
  updatedAt: string
  verificationToken?: string
  sslEnabled: boolean
  clickThroughRate: number
}

type DomainStatus = 'all' | 'active' | 'inactive' | 'pending' | 'suspended'
type SortField = 'domain' | 'createdAt' | 'subscriberCount' | 'notificationCount' | 'clickThroughRate'
type SortOrder = 'asc' | 'desc'

export default function AdminDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<DomainStatus>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [domainToUpdate, setDomainToUpdate] = useState<{ id: string; status: string } | null>(null)

  const itemsPerPage = 20

  useEffect(() => {
    fetchDomains()
  }, [currentPage, searchTerm, statusFilter, sortField, sortOrder])

  const fetchDomains = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
        sortBy: sortField,
        sortOrder: sortOrder
      })

      const response = await fetch(`/api/admin/domains?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDomains(data.domains)
        setTotalPages(Math.ceil(data.total / itemsPerPage))
      } else {
        setError('Failed to load domains')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateDomainStatus = async (domainId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/domains/${domainId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setDomains(domains.map(d => 
          d.id === domainId ? { ...d, status: newStatus as any } : d
        ))
        setShowStatusModal(false)
        setDomainToUpdate(null)
      } else {
        setError('Failed to update domain status')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const handleDeleteDomain = async (domainId: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/domains/${domainId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setDomains(domains.filter(d => d.id !== domainId))
        setShowDeleteModal(false)
        setDomainToDelete(null)
      } else {
        setError('Failed to delete domain')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const getStatusIcon = (status: string, isVerified: boolean) => {
    if (!isVerified) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
    
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Globe className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string, isVerified: boolean) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    
    if (!isVerified) {
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    }
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'suspended':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string, isVerified: boolean) => {
    if (!isVerified) {
      return 'Unverified'
    }
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Domain Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage all client domains
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Globe className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Domains</dt>
                  <dd className="text-lg font-medium text-gray-900">{domains.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Domains</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {domains.filter(d => d.status === 'active' && d.isVerified).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Subscribers</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {domains.reduce((sum, d) => sum + d.subscriberCount, 0).toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Unverified</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {domains.filter(d => !d.isVerified).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DomainStatus)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Sort Field */}
            <div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="domain">Domain Name</option>
                <option value="createdAt">Created Date</option>
                <option value="subscriberCount">Subscribers</option>
                <option value="notificationCount">Notifications</option>
                <option value="clickThroughRate">Click Rate</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Domains Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {domains.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <Globe className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No domains found</h3>
              <p className="mt-1 text-sm text-gray-500">No domains match your current filters.</p>
            </li>
          ) : (
            domains.map((domain) => (
              <li key={domain.id}>
                <div className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(domain.status, domain.isVerified)}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {domain.domain}
                              </p>
                              {domain.sslEnabled && (
                                <Shield className="h-4 w-4 text-green-500" />
                              )}
                              <a
                                href={`https://${domain.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600"
                                title="Visit Domain"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                            <p className="text-sm text-gray-500">
                              Client: {domain.clientName}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className={getStatusBadge(domain.status, domain.isVerified)}>
                              {getStatusText(domain.status, domain.isVerified)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-6">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {domain.subscriberCount} subscribers
                          </div>
                          <div className="flex items-center">
                            <Bell className="h-4 w-4 mr-1" />
                            {domain.notificationCount} notifications
                          </div>
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 mr-1" />
                            {domain.clickThroughRate.toFixed(1)}% CTR
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(domain.createdAt)}
                          </div>
                        </div>
                        {domain.lastNotificationAt && (
                          <div className="mt-1 text-xs text-gray-400">
                            Last notification: {formatDate(domain.lastNotificationAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDomain(domain)}
                        className="text-gray-400 hover:text-gray-600"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setDomainToUpdate({ id: domain.id, status: domain.status })
                          setShowStatusModal(true)
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="Update Status"
                      >
                        <Activity className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setDomainToDelete(domain.id)
                          setShowDeleteModal(true)
                        }}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
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
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Domain Details Modal */}
      {selectedDomain && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Domain Details</h3>
                <button
                  onClick={() => setSelectedDomain(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Domain</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDomain.domain}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDomain.clientName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`mt-1 ${getStatusBadge(selectedDomain.status, selectedDomain.isVerified)}`}>
                      {getStatusText(selectedDomain.status, selectedDomain.isVerified)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SSL Enabled</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDomain.sslEnabled ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subscribers</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDomain.subscriberCount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notifications</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDomain.notificationCount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Click Rate</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDomain.clickThroughRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedDomain.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Updated</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedDomain.updatedAt)}</p>
                  </div>
                </div>
                {selectedDomain.lastNotificationAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Notification</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedDomain.lastNotificationAt)}</p>
                  </div>
                )}
                {selectedDomain.verificationToken && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Verification Token</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {selectedDomain.verificationToken}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && domainToUpdate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Domain Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                  <select
                    value={domainToUpdate.status}
                    onChange={(e) => setDomainToUpdate({ ...domainToUpdate, status: e.target.value })}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowStatusModal(false)
                      setDomainToUpdate(null)
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateDomainStatus(domainToUpdate.id, domainToUpdate.status)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Update
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
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Domain</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this domain? This will also remove all associated subscribers and notifications. This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDomainToDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => domainToDelete && handleDeleteDomain(domainToDelete)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
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