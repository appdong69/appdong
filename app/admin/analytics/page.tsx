'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Bell,
  Globe,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalClients: number
    totalSubscribers: number
    totalNotifications: number
    totalDomains: number
    avgClickRate: number
    avgDeliveryRate: number
  }
  growth: {
    clientsGrowth: number
    subscribersGrowth: number
    notificationsGrowth: number
  }
  chartData: {
    subscriberGrowth: Array<{ date: string; subscribers: number; newSubscribers: number }>
    notificationPerformance: Array<{ date: string; sent: number; delivered: number; clicked: number }>
    clientActivity: Array<{ date: string; activeClients: number; totalClients: number }>
  }
  topPerformers: {
    clients: Array<{ id: string; name: string; subscribers: number; clickRate: number }>
    domains: Array<{ id: string; domain: string; subscribers: number; notifications: number }>
  }
}

type DateRange = '7d' | '30d' | '90d' | '1y'

export default function AdminAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'performance'>('overview')

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/analytics?period=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      } else {
        setError('Failed to load analytics data')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/analytics/export?period=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      setError('Failed to export data')
    }
  }

  const getDateRangeLabel = (range: DateRange) => {
    switch (range) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 90 days'
      case '1y': return 'Last year'
      default: return 'Last 30 days'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
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
            Analytics & Reports
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive platform analytics and performance metrics
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="-ml-1 mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Clients"
            value={analyticsData.overview.totalClients}
            change={analyticsData.growth.clientsGrowth}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Total Subscribers"
            value={analyticsData.overview.totalSubscribers.toLocaleString()}
            change={analyticsData.growth.subscribersGrowth}
            icon={Globe}
            color="green"
          />
          <StatCard
            title="Notifications Sent"
            value={analyticsData.overview.totalNotifications.toLocaleString()}
            change={analyticsData.growth.notificationsGrowth}
            icon={Bell}
            color="purple"
          />
          <StatCard
            title="Avg Click Rate"
            value={`${analyticsData.overview.avgClickRate.toFixed(1)}%`}
            change={analyticsData.overview.avgDeliveryRate}
            icon={BarChart3}
            color="orange"
            subtitle="delivery rate"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'growth', name: 'Growth Trends', icon: TrendingUp },
            { id: 'performance', name: 'Performance', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Tab Content */}
      {analyticsData && (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Clients */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Top Performing Clients</h3>
                  <p className="mt-1 text-sm text-gray-500">Clients with highest engagement rates</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {analyticsData.topPerformers.clients.map((client, index) => (
                      <div key={client.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-600' :
                            'bg-blue-500'
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            <p className="text-xs text-gray-500">{client.subscribers} subscribers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{client.clickRate.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500">click rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Domains */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Top Domains</h3>
                  <p className="mt-1 text-sm text-gray-500">Most active domains by notifications</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {analyticsData.topPerformers.domains.map((domain, index) => (
                      <div key={domain.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Globe className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{domain.domain}</p>
                            <p className="text-xs text-gray-500">{domain.subscribers} subscribers</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{domain.notifications}</p>
                          <p className="text-xs text-gray-500">notifications</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="space-y-6">
              {/* Subscriber Growth Chart */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Subscriber Growth</h3>
                  <p className="mt-1 text-sm text-gray-500">Total and new subscribers over time</p>
                </div>
                <div className="p-6">
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Chart visualization would be implemented here</p>
                      <p className="text-xs text-gray-400">Using a charting library like Chart.js or Recharts</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Activity Chart */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Client Activity</h3>
                  <p className="mt-1 text-sm text-gray-500">Active vs total clients over time</p>
                </div>
                <div className="p-6">
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <Activity className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Chart visualization would be implemented here</p>
                      <p className="text-xs text-gray-400">Showing active client trends</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Notification Performance Chart */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Notification Performance</h3>
                  <p className="mt-1 text-sm text-gray-500">Sent, delivered, and clicked notifications</p>
                </div>
                <div className="p-6">
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <Bell className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Performance chart would be implemented here</p>
                      <p className="text-xs text-gray-400">Showing delivery and click rates</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-green-500 rounded-md flex items-center justify-center">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Delivery Rate</dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {analyticsData.overview.avgDeliveryRate.toFixed(1)}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Click Rate</dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {analyticsData.overview.avgClickRate.toFixed(1)}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Engagement</dt>
                        <dd className="text-2xl font-semibold text-gray-900">
                          {((analyticsData.overview.avgClickRate / analyticsData.overview.avgDeliveryRate) * 100 || 0).toFixed(1)}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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