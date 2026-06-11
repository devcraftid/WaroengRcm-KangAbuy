import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShoppingBag,
  DollarSign,
  CreditCard,
  Banknote,
  Clock,
  Users,
  TrendingUp,
  Activity,
  Monitor,
  QrCode,
  ArrowRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { useRealtimeOrders, useRealtimePayments } from '../../hooks/useRealtime'
import { toast } from 'sonner'

export default function CashierDashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    readyOrders: 0,
    cashPayments: 0,
    qrisPayments: 0,
    activeTables: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  useRealtimeOrders(() => loadDashboardData())
  useRealtimePayments(() => loadDashboardData())

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const [
        { count: todayOrdersCount },
        { data: todayPayments },
        { data: recentOrdersData },
        { data: recentPaymentsData },
        { count: activeTablesCount },
        { data: pendingOrdersData }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('payments').select('amount, method').gte('created_at', today).eq('status', 'completed'),
        supabase.from('orders').select('*, customer:profiles!customer_id(full_name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('payments').select('*, orders(total_amount)').order('created_at', { ascending: false }).limit(5),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('status', 'occupied'),
        supabase.from('orders').select('*').in('status', ['pending', 'processing', 'ready'])
      ])

      const todayPaymentsData = todayPayments || []
      const cashPayments = todayPaymentsData.filter(p => p.method === 'cash')
      const qrisPayments = todayPaymentsData.filter(p => p.method === 'qris')

      setStats({
        todayOrders: todayOrdersCount || 0,
        todayRevenue: todayPaymentsData.reduce((sum, p) => sum + p.amount, 0),
        pendingOrders: pendingOrdersData?.filter(o => o.status === 'pending').length || 0,
        processingOrders: pendingOrdersData?.filter(o => o.status === 'processing').length || 0,
        readyOrders: pendingOrdersData?.filter(o => o.status === 'ready').length || 0,
        cashPayments: cashPayments.length,
        qrisPayments: qrisPayments.length,
        activeTables: activeTablesCount || 0
      })

      setRecentOrders(recentOrdersData || [])
      setRecentPayments(recentPaymentsData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { title: 'Order Hari Ini', value: stats.todayOrders, icon: ShoppingBag, color: 'from-orange-400 to-orange-600', link: '/cashier/orders' },
    { title: 'Revenue Hari Ini', value: formatCurrency(stats.todayRevenue), icon: DollarSign, color: 'from-emerald-400 to-emerald-600', link: '/cashier/history' },
    { title: 'Pending', value: stats.pendingOrders, icon: Clock, color: 'from-amber-400 to-orange-500', link: '/cashier/orders' },
    { title: 'Processing', value: stats.processingOrders, icon: Activity, color: 'from-orange-500 to-red-500', link: '/cashier/orders' },
    { title: 'Ready', value: stats.readyOrders, icon: TrendingUp, color: 'from-rose-400 to-rose-600', link: '/cashier/orders' },
    { title: 'Cash', value: stats.cashPayments, icon: Banknote, color: 'from-slate-600 to-slate-800', link: '/cashier/history' },
    { title: 'QRIS', value: stats.qrisPayments, icon: CreditCard, color: 'from-blue-500 to-indigo-600', link: '/cashier/history' },
    { title: 'Meja Aktif', value: stats.activeTables, icon: Monitor, color: 'from-pink-500 to-rose-600', link: '/cashier/tables' }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat Datang, {profile?.full_name || 'Kasir'}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          to="/cashier/pos"
          className="p-5 bg-gradient-to-br from-[#f05a28] to-[#d44d1f] text-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-orange-500/30 transition-all flex flex-col items-center justify-center transform hover:-translate-y-1"
        >
          <ShoppingBag className="w-8 h-8 mb-3 opacity-90" />
          <span className="text-sm font-bold tracking-wide">Buka POS</span>
        </Link>
        <Link
          to="/cashier/tables"
          className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all flex flex-col items-center justify-center group transform hover:-translate-y-1"
        >
          <Monitor className="w-8 h-8 text-gray-400 group-hover:text-orange-500 transition-colors mb-3" />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">Meja</span>
        </Link>
        <Link
          to="/cashier/qr"
          className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all flex flex-col items-center justify-center group transform hover:-translate-y-1"
        >
          <QrCode className="w-8 h-8 text-gray-400 group-hover:text-orange-500 transition-colors mb-3" />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">QR Table</span>
        </Link>
        <Link
          to="/cashier/closing"
          className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all flex flex-col items-center justify-center group transform hover:-translate-y-1"
        >
          <DollarSign className="w-8 h-8 text-gray-400 group-hover:text-orange-500 transition-colors mb-3" />
          <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">Closing</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <Link key={index} to={stat.link}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Recent Orders & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Order Terbaru</h3>
            <Link to="/cashier/orders" className="text-sm text-orange-600 hover:text-orange-700 flex items-center">
              Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.customer?.full_name || 'Guest'} · {order.order_type}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <span className="text-xs text-gray-500 capitalize">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pembayaran Terbaru</h3>
            <Link to="/cashier/history" className="text-sm text-orange-600 hover:text-orange-700 flex items-center">
              Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentPayments.slice(0, 5).map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {payment.method} · {payment.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatDateTime(payment.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}