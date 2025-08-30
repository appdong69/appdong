'use client'

import Link from 'next/link'
import { Bell, Users, BarChart3, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">PushNotify SaaS</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Admin Login
              </Link>
              <Link
                href="/client/login"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Client Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Multi-Tenant PWA
            <span className="text-primary-600"> Push Notification</span>
            <br />Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Empower your clients with seamless push notification integration. 
            Manage multiple tenants, track analytics, and boost engagement with our comprehensive SaaS solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin/login"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Master Admin Panel
            </Link>
            <Link
              href="/client/login"
              className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Client Dashboard
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-primary-100 rounded-lg p-3 w-fit mb-4">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Tenant Management</h3>
            <p className="text-gray-600">
              Manage multiple clients with individual dashboards, domain restrictions, and custom configurations.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-primary-100 rounded-lg p-3 w-fit mb-4">
              <Bell className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Push Notifications</h3>
            <p className="text-gray-600">
              Send targeted push notifications with templates, scheduling, and real-time delivery tracking.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-primary-100 rounded-lg p-3 w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
            <p className="text-gray-600">
              Track subscriber growth, click-through rates, and engagement metrics with detailed analytics.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="bg-primary-100 rounded-lg p-3 w-fit mb-4">
              <Shield className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Integration</h3>
            <p className="text-gray-600">
              Easy-to-implement JavaScript snippets with secure domain verification and authentication.
            </p>
          </div>
        </div>

        {/* Integration Preview */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Easy Integration</h2>
          <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
            <pre className="text-green-400 text-sm">
              <code>{`<!-- Add to your website's <head> -->
<script src="https://yourapp.com/js/push-notify.js"></script>
<script>
  PushNotify.init({
    clientId: 'your-client-id',
    domain: 'yourdomain.com'
  });
</script>`}</code>
            </pre>
          </div>
          <p className="text-gray-600 mt-4 text-center">
            Simple JavaScript integration that works with any website or landing page.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 PushNotify SaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}