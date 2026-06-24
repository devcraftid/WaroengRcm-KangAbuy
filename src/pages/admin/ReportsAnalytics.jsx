import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, TrendingUp, Users, DollarSign,
  RefreshCw, Star, UtensilsCrossed, Calendar,
  CreditCard, Banknote, Clock, ShoppingBag,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
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
      byMethod: { cash: 0, qris: 0 },
      byType: { dine_in: 0, takeaway: 0 }
    },
    menu: { bestSellers: [], worstSellers: [] },
    performance: { completionRate: 0, cancellationRate: 0, avgPrepTimeMins: 0, activeOrders: 0 },
    trends: []
  })

  useEffect(() => { loadAnalytics() }, [period])

  const getPeriodRange = () => {
    const now = new Date()
    let start
    switch (period) {
      case 'today': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
      case 'week': start = new Date(now.setDate(now.getDate() - 6)); break
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break
      default: start = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    return { start, end: new Date() }
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { start, end } = getPeriodRange()
      const startIso = start.toISOString()
      const endIso = end.toISOString()

      // Fetch all payments for sales
      const { data: payments } = await supabase.from('payments').select('amount, method, created_at')
        .gte('created_at', startIso).lte('created_at', endIso).eq('status', 'completed')
      
      const pData = payments || []
      const totalRevenue = pData.reduce((s, p) => s + p.amount, 0)
      
      // Calculate by method
      const byMethod = { cash: 0, qris: 0 }
      pData.forEach(p => {
        if (p.method === 'cash') byMethod.cash += p.amount
        if (p.method === 'qris') byMethod.qris += p.amount
      })

      // Fetch all orders for counts, types, performance
      const { data: orders } = await supabase.from('orders').select('id, status, order_type, created_at, updated_at')
        .gte('created_at', startIso).lte('created_at', endIso)
      
      const oData = orders || []
      const totalOrders = oData.length
      
      // Calculate by order type
      const byType = { dine_in: 0, takeaway: 0 }
      oData.forEach(o => {
        if (o.status !== 'cancelled') {
          if (o.order_type === 'dine_in') byType.dine_in++
          if (o.order_type === 'takeaway') byType.takeaway++
        }
      })

      // Performance calculations
      const completed = oData.filter(o => o.status === 'completed')
      const cancelled = oData.filter(o => o.status === 'cancelled')
      const active = oData.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'ready')

      let totalPrepTimeMs = 0
      let prepTimeCount = 0
      completed.forEach(o => {
        if (o.created_at && o.updated_at) {
          const cTime = new Date(o.created_at).getTime()
          const uTime = new Date(o.updated_at).getTime()
          if (uTime > cTime) {
            totalPrepTimeMs += (uTime - cTime)
            prepTimeCount++
          }
        }
      })
      const avgPrepTimeMins = prepTimeCount > 0 ? (totalPrepTimeMs / prepTimeCount) / 60000 : 0

      // Trend generation (group by day)
      const trendMap = {}
      if (period === 'today') {
        for (let i = 0; i < 24; i++) {
          trendMap[`${i.toString().padStart(2, '0')}:00`] = 0
        }
        pData.forEach(p => {
          const d = new Date(p.created_at)
          const hour = `${d.getHours().toString().padStart(2, '0')}:00`
          trendMap[hour] += p.amount
        })
      } else {
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
        pData.forEach(p => {
          const d = new Date(p.created_at)
          const key = `${d.getDate()} ${dayNames[d.getDay()]}`
          if (!trendMap[key]) trendMap[key] = 0
          trendMap[key] += p.amount
        })
      }

      const trends = Object.entries(trendMap).map(([label, value]) => ({ label, value }))
      
      // Menu
      const { data: best } = await supabase.from('menus').select('name, total_sold, price').order('total_sold', { ascending: false }).limit(5)
      const { data: worst } = await supabase.from('menus').select('name, total_sold, price').order('total_sold', { ascending: true }).limit(5)

      setAnalytics({
        sales: { 
          totalRevenue, 
          totalOrders, 
          averageOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          byMethod,
          byType
        },
        menu: { bestSellers: best || [], worstSellers: worst || [] },
        performance: { 
          completionRate: oData.length > 0 ? (completed.length / oData.length) * 100 : 0, 
          cancellationRate: oData.length > 0 ? (cancelled.length / oData.length) * 100 : 0,
          avgPrepTimeMins: Math.round(avgPrepTimeMins),
          activeOrders: active.length
        },
        trends
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data analytics')
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    { id: 'sales', label: 'Penjualan', icon: DollarSign },
    { id: 'performance', label: 'Performa', icon: TrendingUp },
    { id: 'menu', label: 'Menu Favorit', icon: UtensilsCrossed }
  ]

  const maxTrendValue = useMemo(() => {
    return Math.max(...analytics.trends.map(t => t.value), 1)
  }, [analytics.trends])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Insight & performa bisnis restoran Anda</p>
        </div>
        <div className="flex items-center space-x-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select value={period} onChange={e => setPeriod(e.target.value)} className="pl-9 pr-8 py-2.5 rounded-xl border-none bg-transparent text-sm font-bold text-gray-700 focus:ring-0 outline-none cursor-pointer appearance-none">
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>
          <button onClick={loadAnalytics} disabled={loading} className="p-2.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto mb-8 hide-scrollbar p-1">
        {reports.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${
              activeReport === r.id 
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white scale-105 shadow-orange-500/30' 
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 border border-gray-100'
            }`}>
            <r.icon className={`w-4 h-4 mr-2 ${activeReport === r.id ? 'text-orange-100' : 'text-gray-400'}`} />
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_,i)=><div key={i} className="h-32 bg-gray-100 rounded-3xl animate-pulse"></div>)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeReport}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* SALES REPORT */}
            {activeReport === 'sales' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Total Revenue */}
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 shadow-xl shadow-orange-500/20 text-white relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <p className="text-orange-100 font-bold text-sm mb-1 opacity-90 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" /> Total Pendapatan
                    </p>
                    <p className="text-3xl sm:text-4xl font-black mb-2">{formatCurrency(analytics.sales.totalRevenue)}</p>
                    <div className="flex items-center text-xs font-medium bg-black/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm mt-4">
                      <span>Rata-rata: {formatCurrency(analytics.sales.averageOrder)} / order</span>
                    </div>
                  </div>

                  {/* Cash vs QRIS */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Metode Pembayaran</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1 font-bold">
                          <span className="flex items-center text-green-700"><Banknote className="w-4 h-4 mr-1" /> Tunai</span>
                          <span>{formatCurrency(analytics.sales.byMethod.cash)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics.sales.totalRevenue > 0 ? (analytics.sales.byMethod.cash / analytics.sales.totalRevenue) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1 font-bold">
                          <span className="flex items-center text-blue-700"><CreditCard className="w-4 h-4 mr-1" /> QRIS</span>
                          <span>{formatCurrency(analytics.sales.byMethod.qris)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analytics.sales.totalRevenue > 0 ? (analytics.sales.byMethod.qris / analytics.sales.totalRevenue) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Types */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">Tipe Pesanan</h3>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-gray-700 font-bold">
                        <UtensilsCrossed className="w-5 h-5 mr-2 text-orange-500" /> Makan di Tempat
                      </div>
                      <span className="text-xl font-black">{analytics.sales.byType.dine_in}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center text-gray-700 font-bold">
                        <ShoppingBag className="w-5 h-5 mr-2 text-teal-500" /> Bawa Pulang
                      </div>
                      <span className="text-xl font-black">{analytics.sales.byType.takeaway}</span>
                    </div>
                  </div>
                </div>

                {/* Trend Chart (CSS based) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-orange-500" /> Trend Pendapatan
                  </h3>
                  
                  {analytics.trends.length === 0 || analytics.sales.totalRevenue === 0 ? (
                    <div className="h-48 flex items-center justify-center text-gray-400 font-medium bg-gray-50 rounded-2xl">Belum ada data pendapatan</div>
                  ) : (
                    <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2">
                      {analytics.trends.map((t, i) => {
                        const heightPct = t.value > 0 ? Math.max((t.value / maxTrendValue) * 100, 5) : 0;
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 group">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 bg-gray-900 text-white text-[10px] sm:text-xs font-bold py-1 px-2 rounded absolute -translate-y-8 z-10 whitespace-nowrap pointer-events-none">
                              {formatCurrency(t.value)}
                            </div>
                            <div className="w-full max-w-[40px] bg-orange-50 rounded-t-xl relative overflow-hidden group-hover:bg-orange-100 transition-colors" style={{ height: '100%' }}>
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${heightPct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05, type: 'spring' }}
                                className="absolute bottom-0 w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-xl"
                              ></motion.div>
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold text-gray-500 mt-3 truncate w-full text-center">{t.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* PERFORMANCE REPORT */}
            {activeReport === 'performance' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-3xl font-black text-gray-900 mb-1">{analytics.performance.avgPrepTimeMins} <span className="text-lg text-gray-500">mnt</span></p>
                  <p className="text-sm font-bold text-gray-500">Rata-rata Waktu Masak</p>
                </div>
                
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-3xl font-black text-green-600 mb-1">{analytics.performance.completionRate.toFixed(1)}%</p>
                  <p className="text-sm font-bold text-gray-500">Tingkat Selesai (Sukses)</p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-3xl font-black text-red-600 mb-1">{analytics.performance.cancellationRate.toFixed(1)}%</p>
                  <p className="text-sm font-bold text-gray-500">Tingkat Pembatalan (Batal)</p>
                </div>
              </div>
            )}

            {/* MENU REPORT */}
            {activeReport === 'menu' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-500" /> Menu Paling Laris
                  </h3>
                  <div className="space-y-4">
                    {analytics.menu.bestSellers.length === 0 && <p className="text-gray-500 text-sm">Belum ada data penjualan.</p>}
                    {analytics.menu.bestSellers.map((m,i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black mr-3">{i+1}</div>
                          <div>
                            <p className="font-bold text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">{formatCurrency(m.price)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-black">{m.total_sold} terjual</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-red-500" /> Perlu Ditingkatkan
                  </h3>
                  <div className="space-y-4">
                    {analytics.menu.worstSellers.length === 0 && <p className="text-gray-500 text-sm">Belum ada data penjualan.</p>}
                    {analytics.menu.worstSellers.map((m,i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div>
                          <p className="font-bold text-gray-700">{m.name}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-black">{m.total_sold} terjual</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}