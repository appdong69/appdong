'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  Bell,
  TrendingUp,
  Globe,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface DashboardStats {
  totalClients: number
  activeClients: number
  totalNotifications: number
  totalSubscribers: number
  notificationsToday: number
  subscribersToday: number
  clickThroughRate: number
  deliveryRate: number
  growthRate: number
}

interface RecentNotification {
  id: string
  title: string
  clientName: string
  sentAt: string
  delivered: number
  clicked: number
  status: 'sent' | 'pending' | 'failed'
}

interface TopClient {
  id: string
  name: string
  domain: string
  subscribers: number
  notifications: number
  clickRate: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        const data = result.data || {}
        setStats(data.overview || null)
        setRecentNotifications(data.recentNotifications || [])
        
        // Process topClients to calculate clickRate and add missing fields
        const processedTopClients = (data.topClients || []).map((client: any) => ({
          ...client,
          clickRate: client.total_sends > 0 ? (client.total_clicks / client.total_sends) * 100 : 0,
          domain: client.email || 'N/A',
          subscribers: client.subscriber_count || 0
        }))
        setTopClients(processedTopClients)
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
        <span className="text-sm text-red-700">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your platform performance and client activity
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={fetchDashboardData}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Activity className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={stats?.totalClients || 0}
          change={stats?.growthRate || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Subscribers"
          value={stats?.totalSubscribers || 0}
          change={stats?.subscribersToday || 0}
          icon={Globe}
          color="green"
          subtitle="subscribers"
        />
        <StatCard
          title="Notifications Sent"
          value={stats?.totalNotifications || 0}
          change={stats?.notificationsToday || 0}
          icon={Bell}
          color="purple"
          subtitle="today"
        />
        <StatCard
          title="Click-Through Rate"
          value={`${(stats?.clickThroughRate || 0).toFixed(1)}%`}
          change={stats?.deliveryRate || 0}
          icon={BarChart3}
          color="orange"
          subtitle="delivery rate"
        />
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Notifications</h3>
            <p className="mt-1 text-sm text-gray-500">Latest push notifications sent across all clients</p>
          </div>
          <div className="overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {recentNotifications && recentNotifications.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentNotifications.map((notification) => (
                    <li key={notification.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {notification.clientName} • {new Date(notification.sentAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                            notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {notification.status === 'sent' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {notification.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {notification.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {notification.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                        <span>Delivered: {notification.delivered}</span>
                        <span>Clicked: {notification.clicked}</span>
                        <span>CTR: {notification.delivered > 0 ? ((notification.clicked / notification.delivered) * 100).toFixed(1) : 0}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                  <p className="mt-1 text-sm text-gray-500">No recent notifications to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Performing Clients */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Performing Clients</h3>
            <p className="mt-1 text-sm text-gray-500">Clients with highest engagement rates</p>
          </div>
          <div className="overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {topClients && topClients.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {topClients.map((client, index) => (
                    <li key={client.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                              index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                              index === 2 ? 'bg-orange-600' :
                              'bg-blue-500'
                            }`}>
                              #{index + 1}
                            </div>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.domain || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{client.clickRate.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">{client.subscribers} subscribers</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No clients</h3>
                  <p className="mt-1 text-sm text-gray-500">No client data to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          <p className="mt-1 text-sm text-gray-500">Current system status and performance metrics</p>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-900">API Status: Operational</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-900">Database: Connected</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-900">Push Service: Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, icon: Icon, color, subtitle }: {
  title: string
  value: string | number
  change: number
  icon: any
  color: string
  subtitle?: string
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  }[color]

  const isPositive = change >= 0

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-8 w-8 rounded-md ${colorClasses} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositive ? (
                    <ArrowUpRight className="self-center flex-shrink-0 h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="self-center flex-shrink-0 h-4 w-4" />
                  )}
                  <span className="sr-only">{isPositive ? 'Increased' : 'Decreased'} by</span>
                  {Math.abs(change)}{subtitle ? ` ${subtitle}` : '%'}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}