import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Clock,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Star,
  UtensilsCrossed
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function ReportsAnalytics() {
  const [activeReport, setActiveReport] = useState('sales')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [analytics, setAnalytics] = useState({
    sales: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrder: 0,
      peakHours: [],
      dailySales: []
    },
    customers: {
      total: 0,
      newThisMonth: 0,
      returning: 0,
      topCustomers: []
    },
    menu: {
      bestSellers: [],
      worstSellers: [],
      byCategory: []
    },
    performance: {
      averagePrepTime: 0,
      completionRate: 0,
      cancellationRate: 0,
      cashierPerformance: []
    }
  })

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadSalesAnalytics(),
        loadCustomerAnalytics(),
        loadMenuAnalytics(),
        loadPerformanceAnalytics()
      ])
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Gagal memuat analytics')
    } finally {
      setLoading(false)
    }
  }

  const getPeriodRange = () => {
    const now = new Date()
    let start

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return { start, end: new Date() }
  }

  const loadSalesAnalytics = async () => {
    const { start, end } = getPeriodRange()

    const { data: payments } = await supabase
      .from('payments')
      .select('*, orders(*)')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .eq('status', 'completed')

    const paymentsData = payments || []
    const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0)
    const totalOrders = paymentsData.length

    setAnalytics(prev => ({
      ...prev,
      sales: {
        totalRevenue,
        totalOrders,
        averageOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        peakHours: [],
        dailySales: []
      }
    }))
  }

  const loadCustomerAnalytics = async () => {
    const { start } = getPeriodRange()

    const { count: total } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')

    const { count: newThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', start.toISOString())

    const { data: topCustomers } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('total_spent', { ascending: false })
      .limit(10)

    setAnalytics(prev => ({
      ...prev,
      customers: {
        total: total || 0,
        newThisMonth: newThisMonth || 0,
        returning: (total || 0) - (newThisMonth || 0),
        topCustomers: topCustomers || []
      }
    }))
  }

  const loadMenuAnalytics = async () => {
    const { data: bestSellers } = await supabase
      .from('menus')
      .select('*, categories(name)')
      .order('total_sold', { ascending: false })
      .limit(10)

    const { data: worstSellers } = await supabase
      .from('menus')
      .select('*, categories(name)')
      .order('total_sold', { ascending: true })
      .limit(5)

    // Group by category
    const { data: categories } = await supabase
      .from('categories')
      .select('*, menus(total_sold)')

    setAnalytics(prev => ({
      ...prev,
      menu: {
        bestSellers: bestSellers || [],
        worstSellers: worstSellers || [],
        byCategory: categories || []
      }
    }))
  }

  const loadPerformanceAnalytics = async () => {
    const { start, end } = getPeriodRange()

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())

    const ordersData = orders || []
    const completed = ordersData.filter(o => o.status === 'completed').length
    const cancelled = ordersData.filter(o => o.status === 'cancelled').length

    setAnalytics(prev => ({
      ...prev,
      performance: {
        averagePrepTime: 15, // minutes
        completionRate: ordersData.length > 0 ? (completed / ordersData.length) * 100 : 0,
        cancellationRate: ordersData.length > 0 ? (cancelled / ordersData.length) * 100 : 0,
        cashierPerformance: []
      }
    }))
  }

  const reports = [
    { id: 'sales', label: 'Sales Report', icon: DollarSign },
    { id: 'customers', label: 'Customer Analytics', icon: Users },
    { id: 'menu', label: 'Menu Performance', icon: UtensilsCrossed },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Insight bisnis restoran Anda</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200"
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex space-x-1 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 mb-8">
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeReport === report.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <report.icon className="w-4 h-4" />
            <span>{report.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Sales Report */}
          {activeReport === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {formatCurrency(analytics.sales.totalRevenue)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analytics.sales.totalOrders}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Average Order Value</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {formatCurrency(analytics.sales.averageOrder)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Analytics */}
          {activeReport === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Customers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.customers.total}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">New This Month</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{analytics.customers.newThisMonth}</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Returning Customers</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{analytics.customers.returning}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
                <div className="space-y-3">
                  {analytics.customers.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customer.full_name}</p>
                          <p className="text-xs text-gray-500">{customer.total_orders} orders</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(customer.total_spent)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Menu Performance */}
          {activeReport === 'menu' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Sellers</h3>
                <div className="space-y-3">
                  {analytics.menu.bestSellers.slice(0, 10).map((menu, index) => (
                    <div key={menu.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{menu.name}</p>
                          <p className="text-xs text-gray-500">{menu.categories?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{menu.total_sold} terjual</p>
                        <p className="text-xs text-gray-500">{formatCurrency(menu.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Needs Improvement</h3>
                <div className="space-y-3">
                  {analytics.menu.worstSellers.map((menu) => (
                    <div key={menu.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{menu.name}</p>
                          <p className="text-xs text-gray-500">{menu.total_sold} terjual</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(menu.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance */}
          {activeReport === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Avg. Preparation Time</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.performance.averagePrepTime} min</p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Completion Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {analytics.performance.completionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Cancellation Rate</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {analytics.performance.cancellationRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500">Total Cashiers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analytics.performance.cashierPerformance.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}