import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, Users, ShoppingBag, DollarSign,
  RefreshCw, Star, UtensilsCrossed
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function ReportsAnalytics() {
  const [activeReport, setActiveReport] = useState('sales')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [analytics, setAnalytics] = useState({
    sales: { totalRevenue: 0, totalOrders: 0, averageOrder: 0 },
    customers: { total: 0, newThisMonth: 0, returning: 0, topCustomers: [] },
    menu: { bestSellers: [], worstSellers: [] },
    performance: { completionRate: 0, cancellationRate: 0 }
  })

  useEffect(() => { loadAnalytics() }, [period])

  const getPeriodRange = () => {
    const now = new Date()
    let start
    switch (period) {
      case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
      case 'week': start = new Date(now.setDate(now.getDate() - 7)); break
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break
      default: start = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    return { start, end: new Date() }
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { start, end } = getPeriodRange()

      // Sales
      const { data: payments } = await supabase.from('payments').select('amount')
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).eq('status', 'completed')
      const pData = payments || []
      const totalRevenue = pData.reduce((s, p) => s + p.amount, 0)
      const totalOrders = pData.length

      // Customers
      const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer')
      const { count: newMonth } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', start.toISOString())
      const { data: topCust } = await supabase.from('profiles').select('full_name, total_spent, total_orders').eq('role', 'customer').order('total_spent', { ascending: false }).limit(5)

      // Menu
      const { data: best } = await supabase.from('menus').select('name, total_sold, price').order('total_sold', { ascending: false }).limit(5)
      const { data: worst } = await supabase.from('menus').select('name, total_sold, price').order('total_sold', { ascending: true }).limit(5)

      // Performance
      const { data: orders } = await supabase.from('orders').select('status').gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
      const oData = orders || []
      const completed = oData.filter(o => o.status === 'completed').length
      const cancelled = oData.filter(o => o.status === 'cancelled').length

      setAnalytics({
        sales: { totalRevenue, totalOrders, averageOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0 },
        customers: { total: total || 0, newThisMonth: newMonth || 0, returning: (total || 0) - (newMonth || 0), topCustomers: topCust || [] },
        menu: { bestSellers: best || [], worstSellers: worst || [] },
        performance: { completionRate: oData.length > 0 ? (completed / oData.length) * 100 : 0, cancellationRate: oData.length > 0 ? (cancelled / oData.length) * 100 : 0 }
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    { id: 'sales', label: 'Sales', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ]

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Laporan & Analytics</h1>
          <p className="text-xs sm:text-sm text-gray-500">Insight bisnis restoran</p>
        </div>
        <div className="flex items-center space-x-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 rounded-xl border text-sm">
            <option value="today">Hari Ini</option><option value="week">Minggu Ini</option><option value="month">Bulan Ini</option>
          </select>
          <button onClick={loadAnalytics} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Report Tabs - Horizontal Scroll Mobile */}
      <div className="flex space-x-1 overflow-x-auto mb-6 hide-scrollbar">
        {reports.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeReport === r.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            <r.icon className="w-3 h-3 sm:w-4 sm:h-4" /><span>{r.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_,i)=><div key={i} className="h-24 bg-white rounded-xl animate-pulse"></div>)}
        </div>
      ) : (
        <>
          {activeReport === 'sales' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total Revenue', value: formatCurrency(analytics.sales.totalRevenue), color: 'text-orange-600' },
                { label: 'Total Orders', value: analytics.sales.totalOrders, color: 'text-blue-600' },
                { label: 'Avg Order', value: formatCurrency(analytics.sales.averageOrder), color: 'text-green-600' }
              ].map((s,i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-4 shadow-sm border">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeReport === 'customers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total', value: analytics.customers.total },
                  { label: 'Baru', value: analytics.customers.newThisMonth },
                  { label: 'Returning', value: analytics.customers.returning }
                ].map((s,i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-sm border text-center">
                    <p className="text-lg sm:text-2xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="font-semibold text-sm mb-3">Top Customers</h3>
                {analytics.customers.topCustomers.map((c,i) => (
                  <div key={i} className="flex justify-between py-2 border-b text-sm">
                    <span>{c.full_name} <span className="text-xs text-gray-400">({c.total_orders} orders)</span></span>
                    <span className="font-medium">{formatCurrency(c.total_spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'menu' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="font-semibold text-sm mb-3">Best Sellers</h3>
                {analytics.menu.bestSellers.map((m,i) => (
                  <div key={i} className="flex justify-between py-2 border-b text-sm">
                    <span><Star className="w-3 h-3 text-yellow-500 inline mr-1" />{m.name}</span>
                    <span className="text-xs text-gray-500">{m.total_sold} terjual</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <h3 className="font-semibold text-sm mb-3">Perlu Improvement</h3>
                {analytics.menu.worstSellers.map((m,i) => (
                  <div key={i} className="flex justify-between py-2 border-b text-sm">
                    <span>{m.name}</span><span className="text-xs text-gray-500">{m.total_sold} terjual</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReport === 'performance' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
                <p className="text-2xl font-bold text-green-600">{analytics.performance.completionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Completion Rate</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border text-center">
                <p className="text-2xl font-bold text-red-600">{analytics.performance.cancellationRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Cancellation Rate</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}