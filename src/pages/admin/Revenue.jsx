import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, Download,
  CreditCard, Banknote, BarChart3, ArrowUp, ArrowDown,
  RefreshCw, Filter
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function Revenue() {
  const [period, setPeriod] = useState('today')
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0, totalOrders: 0, averageOrder: 0,
    cashRevenue: 0, qrisRevenue: 0, cashCount: 0, qrisCount: 0,
    revenueByDay: [], revenueByCategory: [], growth: 0
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => { loadRevenueData() }, [period, dateRange])

  const getDateRange = () => {
    const now = new Date()
    let start, end
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7))
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
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    }
    return { start, end }
  }

  const loadRevenueData = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()

      // Get payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*, orders!inner(total_amount)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed')

      const pData = payments || []
      const totalRevenue = pData.reduce((sum, p) => sum + p.amount, 0)
      const cashPayments = pData.filter(p => p.method === 'cash')
      const qrisPayments = pData.filter(p => p.method === 'qris')
      const totalOrders = pData.length

      // Previous period for growth
      const prevDuration = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - prevDuration)
      const { data: prevPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', start.toISOString())
        .eq('status', 'completed')

      const prevRevenue = (prevPayments || []).reduce((sum, p) => sum + p.amount, 0)
      const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

      // Revenue by day
      const dayMap = {}
      pData.forEach(p => {
        const day = new Date(p.created_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
        if (!dayMap[day]) dayMap[day] = 0
        dayMap[day] += p.amount
      })
      const revenueByDay = Object.entries(dayMap).map(([day, amount]) => ({ day, amount }))

      // Revenue by category (dari order items)
      const orderIds = pData.map(p => p.order_id).filter(Boolean)
      let revenueByCategory = []
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('subtotal, menus!inner(category_id, categories!inner(name))')
          .in('order_id', orderIds)

        const catMap = {}
        ;(items || []).forEach(item => {
          const catName = item.menus?.categories?.name || 'Uncategorized'
          if (!catMap[catName]) catMap[catName] = 0
          catMap[catName] += item.subtotal
        })
        revenueByCategory = Object.entries(catMap).map(([category, amount]) => ({ category, amount }))
      }

      setRevenueData({
        totalRevenue, totalOrders,
        averageOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        cashRevenue: cashPayments.reduce((s, p) => s + p.amount, 0),
        qrisRevenue: qrisPayments.reduce((s, p) => s + p.amount, 0),
        cashCount: cashPayments.length, qrisCount: qrisPayments.length,
        revenueByDay, revenueByCategory, growth
      })
    } catch (error) {
      console.error('Error loading revenue:', error)
      toast.error('Gagal memuat data revenue')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const data = {
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
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `revenue-${period}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Report diexport!')
  }

  const periods = [
    { id: 'today', label: 'Hari Ini' },
    { id: 'yesterday', label: 'Kemarin' },
    { id: 'week', label: '7 Hari' },
    { id: 'month', label: 'Bulan Ini' },
    { id: 'year', label: 'Tahun Ini' },
    { id: 'custom', label: 'Custom' }
  ]

  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(revenueData.totalRevenue), icon: DollarSign, color: 'from-green-500 to-emerald-600', change: revenueData.growth, changeLabel: 'vs periode lalu' },
    { label: 'Total Orders', value: revenueData.totalOrders, icon: BarChart3, color: 'from-blue-500 to-indigo-600' },
    { label: 'Avg Order', value: formatCurrency(revenueData.averageOrder), icon: TrendingUp, color: 'from-purple-500 to-pink-600' },
    { label: 'Cash', value: formatCurrency(revenueData.cashRevenue), icon: Banknote, color: 'from-yellow-500 to-orange-600', sub: `${revenueData.cashCount} transaksi` },
    { label: 'QRIS', value: formatCurrency(revenueData.qrisRevenue), icon: CreditCard, color: 'from-teal-500 to-cyan-600', sub: `${revenueData.qrisCount} transaksi` }
  ]

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Analisis pendapatan restoran</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={loadRevenueData} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExport} className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-green-600">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-sm border border-gray-100 mb-4 sm:mb-6">
        <div className="flex space-x-0.5 sm:space-x-1 overflow-x-auto hide-scrollbar">
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setPeriod(p.id)
                if (p.id === 'custom') setShowDatePicker(true)
              }}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                period === p.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.id === 'custom' ? (
                <><Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />{p.label}</>
              ) : p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range */}
        {period === 'custom' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-500">Dari</label>
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})}
                className="px-2 py-1.5 rounded-lg border text-xs sm:text-sm flex-1" />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-500">Sampai</label>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})}
                className="px-2 py-1.5 rounded-lg border text-xs sm:text-sm flex-1" />
            </div>
            <button onClick={loadRevenueData} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs sm:text-sm">
              Filter
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 sm:h-28 bg-white rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between mb-1 sm:mb-2">
                  <p className="text-[10px] sm:text-xs text-gray-500">{stat.label}</p>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">{stat.value}</p>
                {stat.change !== undefined && (
                  <div className={`flex items-center mt-1 text-[10px] sm:text-xs ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change >= 0 ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                    <span>{Math.abs(stat.change).toFixed(1)}%</span>
                    {stat.changeLabel && <span className="text-gray-400 ml-1 hidden sm:inline">{stat.changeLabel}</span>}
                  </div>
                )}
                {stat.sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{stat.sub}</p>}
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Revenue by Day */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Revenue per Hari</h3>
              {revenueData.revenueByDay.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">Tidak ada data</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {revenueData.revenueByDay.map((day, i) => {
                    const maxAmount = Math.max(...revenueData.revenueByDay.map(d => d.amount), 1)
                    const percentage = (day.amount / maxAmount) * 100
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="text-gray-600">{day.day}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(day.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className="h-1.5 sm:h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Revenue by Category */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Revenue per Kategori</h3>
              {revenueData.revenueByCategory.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400">Tidak ada data</p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {revenueData.revenueByCategory.map((cat, i) => {
                    const total = revenueData.revenueByCategory.reduce((s, c) => s + c.amount, 0)
                    const percentage = total > 0 ? (cat.amount / total) * 100 : 0
                    const colors = ['from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-purple-500 to-pink-600', 'from-yellow-500 to-orange-600', 'from-teal-500 to-cyan-600']
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                          <span className="text-gray-600">{cat.category}</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(cat.amount)} <span className="text-gray-400">({percentage.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={`h-1.5 sm:h-2 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}