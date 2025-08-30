'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Search,
  Filter,
  Eye,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Calendar,
  User,
  Globe
} from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  clientId: string
  clientName: string
  domainId: string
  domainName: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  scheduledAt?: string
  sentAt?: string
  deliveredCount: number
  clickedCount: number
  totalSubscribers: number
  createdAt: string
  updatedAt: string
}

type NotificationStatus = 'all' | 'pending' | 'sent' | 'delivered' | 'failed'
type SortField = 'createdAt' | 'sentAt' | 'deliveredCount' | 'clickedCount'
type SortOrder = 'asc' | 'desc'

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)

  const itemsPerPage = 20

  useEffect(() => {
    fetchNotifications()
  }, [currentPage, searchTerm, statusFilter, sortField, sortOrder])

  const fetchNotifications = async () => {
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

      const response = await fetch(`/api/admin/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
        setTotalPages(Math.ceil(data.total / itemsPerPage))
      } else {
        setError('Failed to load notifications')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId))
        setShowDeleteModal(false)
        setNotificationToDelete(null)
      } else {
        setError('Failed to delete notification')
      }
    } catch (error) {
      setError('Network error occurred')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'delivered':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const calculateClickRate = (clicked: number, delivered: number) => {
    if (delivered === 0) return '0.0'
    return ((clicked / delivered) * 100).toFixed(1)
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
            Notifications Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage all platform notifications
          </p>
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
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as NotificationStatus)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Sort Field */}
            <div>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="createdAt">Created Date</option>
                <option value="sentAt">Sent Date</option>
                <option value="deliveredCount">Delivered Count</option>
                <option value="clickedCount">Click Count</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
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

      {/* Notifications Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {notifications.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications found</h3>
              <p className="mt-1 text-sm text-gray-500">No notifications match your current filters.</p>
            </li>
          ) : (
            notifications.map((notification) => (
              <li key={notification.id}>
                <div className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(notification.status)}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {notification.message}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className={getStatusBadge(notification.status)}>
                              {notification.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {notification.clientName}
                          </div>
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 mr-1" />
                            {notification.domainName}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(notification.createdAt)}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-6">
                          <span>Delivered: {notification.deliveredCount}/{notification.totalSubscribers}</span>
                          <span>Clicked: {notification.clickedCount}</span>
                          <span>CTR: {calculateClickRate(notification.clickedCount, notification.deliveredCount)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedNotification(notification)}
                        className="text-gray-400 hover:text-gray-600"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setNotificationToDelete(notification.id)
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

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Notification Details</h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNotification.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedNotification.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNotification.clientName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Domain</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNotification.domainName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`mt-1 ${getStatusBadge(selectedNotification.status)}`}>
                      {selectedNotification.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedNotification.createdAt)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Subscribers</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNotification.totalSubscribers}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivered</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNotification.deliveredCount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Clicked</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedNotification.clickedCount}</p>
                  </div>
                </div>
                {selectedNotification.sentAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sent At</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedNotification.sentAt)}</p>
                  </div>
                )}
                {selectedNotification.scheduledAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Scheduled At</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedNotification.scheduledAt)}</p>
                  </div>
                )}
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
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Notification</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this notification? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setNotificationToDelete(null)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => notificationToDelete && handleDeleteNotification(notificationToDelete)}
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