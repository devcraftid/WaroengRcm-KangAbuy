import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  CreditCard,
  Banknote,
  BarChart3,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function Revenue() {
  const [period, setPeriod] = useState('today') // today, week, month, year
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrder: 0,
    cashRevenue: 0,
    qrisRevenue: 0,
    cashCount: 0,
    qrisCount: 0,
    revenueByDay: [],
    revenueByCategory: [],
    growth: 0
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadRevenueData()
  }, [period, dateRange])

  const getDateRange = () => {
    const now = new Date()
    let start, end

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - now.getDay()))
        start.setHours(0, 0, 0, 0)
        end = new Date()
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date()
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date()
        break
      case 'custom':
        start = new Date(dateRange.start)
        end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date()
        end = new Date()
    }

    return { start, end }
  }

  const loadRevenueData = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()

      // Get payments in date range
      const { data: payments } = await supabase
        .from('payments')
        .select('*, orders(total_amount, created_at)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed')

      const paymentsData = payments || []

      // Calculate totals
      const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0)
      const cashPayments = paymentsData.filter(p => p.method === 'cash')
      const qrisPayments = paymentsData.filter(p => p.method === 'qris')
      const totalOrders = paymentsData.length

      // Calculate previous period for growth
      const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()))
      const { data: prevPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', start.toISOString())
        .eq('status', 'completed')

      const prevRevenue = (prevPayments || []).reduce((sum, p) => sum + p.amount, 0)
      const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

      // Group by day
      const revenueByDay = groupByDay(paymentsData)

      // Get revenue by category
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, menus(category_id, categories(name))')
        .in('order_id', paymentsData.map(p => p.order_id))

      const revenueByCategory = groupByCategory(orderItems || [])

      setRevenueData({
        totalRevenue,
        totalOrders,
        averageOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        cashRevenue: cashPayments.reduce((sum, p) => sum + p.amount, 0),
        qrisRevenue: qrisPayments.reduce((sum, p) => sum + p.amount, 0),
        cashCount: cashPayments.length,
        qrisCount: qrisPayments.length,
        revenueByDay,
        revenueByCategory,
        growth
      })
    } catch (error) {
      console.error('Error loading revenue:', error)
      toast.error('Gagal memuat data revenue')
    } finally {
      setLoading(false)
    }
  }

  const groupByDay = (payments) => {
    const grouped = {}
    payments.forEach(payment => {
      const day = new Date(payment.created_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      if (!grouped[day]) grouped[day] = 0
      grouped[day] += payment.amount
    })
    return Object.entries(grouped).map(([day, amount]) => ({ day, amount }))
  }

  const groupByCategory = (items) => {
    const grouped = {}
    items.forEach(item => {
      const category = item.menus?.categories?.name || 'Uncategorized'
      if (!grouped[category]) grouped[category] = 0
      grouped[category] += item.subtotal
    })
    return Object.entries(grouped).map(([category, amount]) => ({ category, amount }))
  }

  const handleExportReport = () => {
    const report = {
      period,
      dateRange: getDateRange(),
      summary: {
        totalRevenue: revenueData.totalRevenue,
        totalOrders: revenueData.totalOrders,
        averageOrder: revenueData.averageOrder,
        cashRevenue: revenueData.cashRevenue,
        qrisRevenue: revenueData.qrisRevenue,
        growth: revenueData.growth
      },
      revenueByDay: revenueData.revenueByDay,
      revenueByCategory: revenueData.revenueByCategory
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-report-${period}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Report berhasil diexport')
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">Analisis pendapatan restoran</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportReport}
            className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 mb-6 inline-flex space-x-1">
        {[
          { id: 'today', label: 'Hari Ini' },
          { id: 'week', label: 'Minggu Ini' },
          { id: 'month', label: 'Bulan Ini' },
          { id: 'year', label: 'Tahun Ini' },
          { id: 'custom', label: 'Custom' }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.id
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {period === 'custom' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm text-gray-600">Dari</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="ml-2 px-3 py-2 rounded-lg border border-gray-200"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Sampai</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="ml-2 px-3 py-2 rounded-lg border border-gray-200"
              />
            </div>
            <button
              onClick={loadRevenueData}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm"
            >
              Filter
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Revenue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(revenueData.totalRevenue)}</p>
                  <div className={`flex items-center mt-2 ${revenueData.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueData.growth >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                    <span className="text-xs font-medium">{Math.abs(revenueData.growth).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Order</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{revenueData.totalOrders}</p>
                  <p className="text-xs text-gray-500 mt-2">Avg: {formatCurrency(revenueData.averageOrder)}/order</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cash Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(revenueData.cashRevenue)}</p>
                  <p className="text-xs text-gray-500 mt-2">{revenueData.cashCount} transaksi</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">QRIS Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(revenueData.qrisRevenue)}</p>
                  <p className="text-xs text-gray-500 mt-2">{revenueData.qrisCount} transaksi</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Day */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue per Hari</h3>
              <div className="space-y-3">
                {revenueData.revenueByDay.map((day, index) => {
                  const maxAmount = Math.max(...revenueData.revenueByDay.map(d => d.amount))
                  const percentage = (day.amount / maxAmount) * 100
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{day.day}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(day.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Revenue by Category */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue per Kategori</h3>
              <div className="space-y-3">
                {revenueData.revenueByCategory.map((cat, index) => {
                  const total = revenueData.revenueByCategory.reduce((sum, c) => sum + c.amount, 0)
                  const percentage = total > 0 ? (cat.amount / total) * 100 : 0
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{cat.category}</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(cat.amount)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`h-2 rounded-full bg-gradient-to-r ${
                            index % 2 === 0
                              ? 'from-blue-500 to-indigo-600'
                              : 'from-purple-500 to-pink-600'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}