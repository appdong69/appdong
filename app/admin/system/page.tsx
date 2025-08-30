'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  Server,
  Database,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Mail,
  Shield
} from 'lucide-react'

interface SystemHealth {
  overall: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    lastCheck: string
  }
  services: {
    api: { status: 'up' | 'down' | 'degraded'; responseTime: number; lastCheck: string }
    database: { status: 'up' | 'down' | 'degraded'; connections: number; maxConnections: number; lastCheck: string }
    redis: { status: 'up' | 'down' | 'degraded'; memory: number; maxMemory: number; lastCheck: string }
    webPush: { status: 'up' | 'down' | 'degraded'; queueSize: number; lastCheck: string }
    email: { status: 'up' | 'down' | 'degraded'; lastCheck: string }
  }
  performance: {
    cpu: { usage: number; cores: number }
    memory: { used: number; total: number; percentage: number }
    disk: { used: number; total: number; percentage: number }
    network: { inbound: number; outbound: number }
  }
  metrics: {
    requestsPerMinute: number
    errorRate: number
    averageResponseTime: number
    activeConnections: number
    queuedNotifications: number
    failedNotifications: number
  }
  alerts: Array<{
    id: string
    type: 'error' | 'warning' | 'info'
    message: string
    timestamp: string
    resolved: boolean
  }>
}

export default function AdminSystemPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  useEffect(() => {
    fetchSystemHealth()
    
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(fetchSystemHealth, refreshInterval * 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/system/health', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSystemHealth(data)
        setError('')
      } else {
        setError('Failed to load system health data')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'down':
      case 'critical':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
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
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
        <XCircle className="h-5 w-5 text-red-400 mr-3" />
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
            System Health
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor platform performance and system status
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Auto-refresh</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
          <button
            onClick={fetchSystemHealth}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {systemHealth && (
        <>
          {/* Overall Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(systemHealth.overall.status)}
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                  <p className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${getStatusColor(systemHealth.overall.status)}`}>
                    {systemHealth.overall.status.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="text-lg font-semibold text-gray-900">{formatUptime(systemHealth.overall.uptime)}</p>
                <p className="text-xs text-gray-400">Last check: {formatDate(systemHealth.overall.lastCheck)}</p>
              </div>
            </div>
          </div>

          {/* Services Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard
              title="API Server"
              status={systemHealth.services.api.status}
              icon={Server}
              details={[
                `Response Time: ${systemHealth.services.api.responseTime}ms`,
                `Last Check: ${formatDate(systemHealth.services.api.lastCheck)}`
              ]}
            />
            <ServiceCard
              title="Database"
              status={systemHealth.services.database.status}
              icon={Database}
              details={[
                `Connections: ${systemHealth.services.database.connections}/${systemHealth.services.database.maxConnections}`,
                `Last Check: ${formatDate(systemHealth.services.database.lastCheck)}`
              ]}
            />
            <ServiceCard
              title="Redis Cache"
              status={systemHealth.services.redis.status}
              icon={MemoryStick}
              details={[
                `Memory: ${formatBytes(systemHealth.services.redis.memory)}/${formatBytes(systemHealth.services.redis.maxMemory)}`,
                `Last Check: ${formatDate(systemHealth.services.redis.lastCheck)}`
              ]}
            />
            <ServiceCard
              title="Web Push"
              status={systemHealth.services.webPush.status}
              icon={Zap}
              details={[
                `Queue Size: ${systemHealth.services.webPush.queueSize}`,
                `Last Check: ${formatDate(systemHealth.services.webPush.lastCheck)}`
              ]}
            />
            <ServiceCard
              title="Email Service"
              status={systemHealth.services.email.status}
              icon={Mail}
              details={[
                `Last Check: ${formatDate(systemHealth.services.email.lastCheck)}`
              ]}
            />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="CPU Usage"
              value={`${systemHealth.performance.cpu.usage.toFixed(1)}%`}
              subtitle={`${systemHealth.performance.cpu.cores} cores`}
              icon={Cpu}
              percentage={systemHealth.performance.cpu.usage}
              color={systemHealth.performance.cpu.usage > 80 ? 'red' : systemHealth.performance.cpu.usage > 60 ? 'yellow' : 'green'}
            />
            <MetricCard
              title="Memory Usage"
              value={`${systemHealth.performance.memory.percentage.toFixed(1)}%`}
              subtitle={`${formatBytes(systemHealth.performance.memory.used)} / ${formatBytes(systemHealth.performance.memory.total)}`}
              icon={MemoryStick}
              percentage={systemHealth.performance.memory.percentage}
              color={systemHealth.performance.memory.percentage > 80 ? 'red' : systemHealth.performance.memory.percentage > 60 ? 'yellow' : 'green'}
            />
            <MetricCard
              title="Disk Usage"
              value={`${systemHealth.performance.disk.percentage.toFixed(1)}%`}
              subtitle={`${formatBytes(systemHealth.performance.disk.used)} / ${formatBytes(systemHealth.performance.disk.total)}`}
              icon={HardDrive}
              percentage={systemHealth.performance.disk.percentage}
              color={systemHealth.performance.disk.percentage > 80 ? 'red' : systemHealth.performance.disk.percentage > 60 ? 'yellow' : 'green'}
            />
            <MetricCard
              title="Network I/O"
              value={`${formatBytes(systemHealth.performance.network.inbound + systemHealth.performance.network.outbound)}/s`}
              subtitle={`↓${formatBytes(systemHealth.performance.network.inbound)}/s ↑${formatBytes(systemHealth.performance.network.outbound)}/s`}
              icon={Wifi}
              percentage={0}
              color="blue"
            />
          </div>

          {/* Application Metrics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Application Metrics</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{systemHealth.metrics.requestsPerMinute}</div>
                  <div className="text-sm text-gray-500">Requests/min</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{systemHealth.metrics.errorRate.toFixed(2)}%</div>
                  <div className="text-sm text-gray-500">Error Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{systemHealth.metrics.averageResponseTime}ms</div>
                  <div className="text-sm text-gray-500">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{systemHealth.metrics.activeConnections}</div>
                  <div className="text-sm text-gray-500">Active Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{systemHealth.metrics.queuedNotifications}</div>
                  <div className="text-sm text-gray-500">Queued Notifications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{systemHealth.metrics.failedNotifications}</div>
                  <div className="text-sm text-gray-500">Failed Notifications</div>
                </div>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">System Alerts</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {systemHealth.alerts.length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  No active alerts
                </div>
              ) : (
                systemHealth.alerts.map((alert) => (
                  <div key={alert.id} className={`px-6 py-4 ${alert.resolved ? 'opacity-50' : ''}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {alert.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                        {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {alert.type === 'info' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className={`text-sm ${alert.resolved ? 'line-through' : ''}`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(alert.timestamp)}
                          {alert.resolved && ' (Resolved)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ServiceCard({ title, status, icon: Icon, details }: {
  title: string
  status: string
  icon: any
  details: string[]
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
        return 'text-green-600 bg-green-100'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100'
      case 'down':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Icon className="h-6 w-6 text-gray-400 mr-2" />
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
        {getStatusIcon(status)}
      </div>
      <div className="mb-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
          {status.toUpperCase()}
        </span>
      </div>
      <div className="space-y-1">
        {details.map((detail, index) => (
          <p key={index} className="text-xs text-gray-500">{detail}</p>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtitle, icon: Icon, percentage, color }: {
  title: string
  value: string
  subtitle: string
  icon: any
  percentage: number
  color: string
}) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500'
      case 'yellow':
        return 'bg-yellow-500'
      case 'green':
        return 'bg-green-500'
      case 'blue':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <Icon className="h-6 w-6 text-gray-400" />
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{title}</span>
          {percentage > 0 && <span className="text-gray-500">{percentage.toFixed(1)}%</span>}
        </div>
      </div>
      {percentage > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getColorClasses(color)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}