'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Bell,
  MousePointer,
  Eye,
  Calendar,
  Download,
  RefreshCw,
  AlertTriangle,
  Globe,
  Clock,
  Target
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    total_domains: number
    total_subscribers: number
    total_notifications: number
    avg_click_rate: number
    total_clicks: number
    total_views: number
  }
  growth: {
    subscribers_growth: Array<{ date: string; count: number }>
    notifications_growth: Array<{ date: string; count: number }>
    clicks_growth: Array<{ date: string; count: number }>
  }
  performance: {
    click_rates: Array<{ date: string; rate: number }>
    delivery_rates: Array<{ date: string; rate: number }>
    engagement_rates: Array<{ date: string; rate: number }>
  }
  top_domains: Array<{
    domain: string
    subscribers: number
    notifications_sent: number
    click_rate: number
    total_clicks: number
  }>
  recent_activity: Array<{
    date: string
    notifications_sent: number
    clicks: number
    new_subscribers: number
  }>
}

export default function ClientAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('client_token')
      const response = await fetch(`/api/client/analytics?range=${dateRange}`, {
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
      const token = localStorage.getItem('client_token')
      const response = await fetch(`/api/client/analytics/export?range=${dateRange}`, {
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
        document.body.removeChild(a)
      } else {
        setError('Failed to export data')
      }
    } catch (error) {
      setError('Export failed')
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const StatCard = ({ title, value, icon: Icon, change, changeType }: {
    title: string
    value: string | number
    icon: any
    change?: string
    changeType?: 'positive' | 'negative' | 'neutral'
  }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {typeof value === 'number' ? formatNumber(value) : value}
                </div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    changeType === 'positive' ? 'text-green-600' :
                    changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
        <p className="mt-1 text-sm text-gray-500">Analytics data will appear here once you start sending notifications.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your notification performance and subscriber growth
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
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

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Domains"
          value={analyticsData.overview.total_domains}
          icon={Globe}
        />
        <StatCard
          title="Total Subscribers"
          value={analyticsData.overview.total_subscribers}
          icon={Users}
        />
        <StatCard
          title="Notifications Sent"
          value={analyticsData.overview.total_notifications}
          icon={Bell}
        />
        <StatCard
          title="Average Click Rate"
          value={`${analyticsData.overview.avg_click_rate.toFixed(1)}%`}
          icon={MousePointer}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Clicks"
          value={analyticsData.overview.total_clicks}
          icon={Target}
        />
        <StatCard
          title="Total Views"
          value={analyticsData.overview.total_views}
          icon={Eye}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'growth', name: 'Growth Trends', icon: TrendingUp },
              { id: 'performance', name: 'Performance', icon: Target },
              { id: 'domains', name: 'Top Domains', icon: Globe }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Notifications
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Clicks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          New Subscribers
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.recent_activity.map((activity, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(activity.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.notifications_sent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.clicks.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.new_subscribers.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Growth Trends Tab */}
          {activeTab === 'growth' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subscribers Growth */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Subscriber Growth</h4>
                  <div className="space-y-2">
                    {analyticsData.growth.subscribers_growth.slice(-7).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(item.date)}</span>
                        <span className="font-medium text-gray-900">+{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notifications Growth */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Notifications Sent</h4>
                  <div className="space-y-2">
                    {analyticsData.growth.notifications_growth.slice(-7).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(item.date)}</span>
                        <span className="font-medium text-gray-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clicks Growth */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Click Growth</h4>
                  <div className="space-y-2">
                    {analyticsData.growth.clicks_growth.slice(-7).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(item.date)}</span>
                        <span className="font-medium text-gray-900">+{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Growth Insights</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>• Chart visualizations will be implemented using Chart.js or Recharts</p>
                      <p>• Interactive trend lines showing growth patterns over time</p>
                      <p>• Comparative analysis between different metrics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Click Rates */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Click Rates</h4>
                  <div className="space-y-2">
                    {analyticsData.performance.click_rates.slice(-7).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(item.date)}</span>
                        <span className="font-medium text-gray-900">{item.rate.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Rates */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Rates</h4>
                  <div className="space-y-2">
                    {analyticsData.performance.delivery_rates.slice(-7).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(item.date)}</span>
                        <span className="font-medium text-gray-900">{item.rate.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engagement Rates */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Engagement Rates</h4>
                  <div className="space-y-2">
                    {analyticsData.performance.engagement_rates.slice(-7).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">{formatDate(item.date)}</span>
                        <span className="font-medium text-gray-900">{item.rate.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <Target className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Performance Metrics</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>• Interactive performance charts showing trends over time</p>
                      <p>• Benchmark comparisons with industry averages</p>
                      <p>• Performance optimization recommendations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Domains Tab */}
          {activeTab === 'domains' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Domains</h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Domain
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Subscribers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Notifications
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Click Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Total Clicks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.top_domains.map((domain, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{domain.domain}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {domain.subscribers.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {domain.notifications_sent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              domain.click_rate >= 5 ? 'bg-green-100 text-green-800' :
                              domain.click_rate >= 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {domain.click_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {domain.total_clicks.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {analyticsData.top_domains.length === 0 && (
                <div className="text-center py-8">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No domain data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Domain performance data will appear here once you have active domains.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}