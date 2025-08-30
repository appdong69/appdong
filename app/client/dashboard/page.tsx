'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Users,
  Globe,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  MousePointer,
  Eye,
  Plus
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalDomains: number
  totalSubscribers: number
  notificationsSent: number
  clickThroughRate: number
  subscribersToday: number
  notificationsToday: number
}

interface RecentNotification {
  id: string
  title: string
  message: string
  domain: string
  sent_at: string
  delivered: number
  clicked: number
  status: 'sent' | 'pending' | 'failed'
}

interface TopDomain {
  id: string
  domain: string
  subscribers: number
  notifications_sent: number
  click_rate: number
  status: 'active' | 'inactive' | 'pending'
}

interface ClientUser {
  id: string
  email: string
  company_name: string
  plan: string
  status: string
}

function StatCard({ title, value, change, icon: Icon, color = 'blue' }: {
  title: string
  value: string | number
  change?: string
  icon: any
  color?: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                {change && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    <TrendingUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                    <span className="ml-1">{change}</span>
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([])
  const [topDomains, setTopDomains] = useState<TopDomain[]>([])
  const [user, setUser] = useState<ClientUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('client_user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch('/api/client/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentNotifications(data.recentNotifications || [])
        setTopDomains(data.topDomains || [])
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      sent: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'
      }`}>
        {status}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
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
            Welcome back, {user?.company_name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your push notifications
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/client/notifications/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Send Notification
          </Link>
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Domains"
            value={stats.totalDomains}
            icon={Globe}
            color="blue"
          />
          <StatCard
            title="Total Subscribers"
            value={stats.totalSubscribers.toLocaleString()}
            change={`+${stats.subscribersToday} today`}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Notifications Sent"
            value={stats.notificationsSent.toLocaleString()}
            change={`+${stats.notificationsToday} today`}
            icon={Bell}
            color="purple"
          />
          <StatCard
            title="Click Rate"
            value={`${stats.clickThroughRate.toFixed(1)}%`}
            icon={MousePointer}
            color="yellow"
          />
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Notifications
              </h3>
              <Link
                href="/client/notifications"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {recentNotifications.length > 0 ? (
                recentNotifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.status === 'sent' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : notification.status === 'pending' ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {notification.domain}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-xs text-gray-500">
                          <Eye className="h-3 w-3 mr-1" />
                          {notification.delivered}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <MousePointer className="h-3 w-3 mr-1" />
                          {notification.clicked}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.sent_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(notification.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by sending your first notification.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/client/notifications/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="-ml-1 mr-2 h-4 w-4" />
                      Send Notification
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performing Domains */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Top Performing Domains
              </h3>
              <Link
                href="/client/domains"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {topDomains.length > 0 ? (
                topDomains.slice(0, 5).map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {domain.domain}
                        </p>
                        <p className="text-sm text-gray-500">
                          {domain.subscribers.toLocaleString()} subscribers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {domain.click_rate.toFixed(1)}% CTR
                      </span>
                      {getStatusBadge(domain.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No domains</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your first domain to start collecting subscribers.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/client/domains"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="-ml-1 mr-2 h-4 w-4" />
                      Add Domain
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/client/notifications/create"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Bell className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Send Notification</p>
                <p className="text-sm text-gray-500">Create and send a new push notification</p>
              </div>
            </Link>
            <Link
              href="/client/domains"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Globe className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Manage Domains</p>
                <p className="text-sm text-gray-500">Add or configure your domains</p>
              </div>
            </Link>
            <Link
              href="/client/analytics"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">Check your performance metrics</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}