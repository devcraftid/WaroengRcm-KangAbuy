import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Star,
  Monitor,
  Plus,
  RefreshCw,
  QrCode,
  Clock,
  ArrowRight,
  ChefHat,
  Banknote,
  UtensilsCrossed,
  Activity
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../utils/format'
import useAuthStore from '../../stores/authStore'

export default function AdminDashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({
    revenueToday: 0,
    totalOrdersToday: 0,
    activeOrders: 0,
    activeTables: 0,
    revenueMonth: 0
  })
  const [bestSellers, setBestSellers] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Time update for greeting
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadDashboardData()
    
    // Realtime subscriptions
    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => loadDashboardData()
      )
      .subscribe()

    const paymentsChannel = supabase
      .channel('dashboard-payments')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => loadDashboardData()
      )
      .subscribe()

    const tablesChannel = supabase
      .channel('dashboard-tables')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        () => loadDashboardData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel).catch(console.error)
      supabase.removeChannel(paymentsChannel).catch(console.error)
      supabase.removeChannel(tablesChannel).catch(console.error)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const today = new Date()
      today.setHours(0,0,0,0)
      const todayIso = today.toISOString()
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthIso = monthStart.toISOString()

      // Get today's payments
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', todayIso)
        .eq('status', 'completed')

      // Get monthly payments
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', monthIso)
        .eq('status', 'completed')

      // Get active orders and today's total orders
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('id, status')
        .gte('created_at', todayIso)
      
      const activeOrdersCount = todayOrders?.filter(o => ['pending', 'processing', 'ready'].includes(o.status)).length || 0
      const totalOrdersCount = todayOrders?.length || 0

      // Get active tables
      const { count: tablesCount } = await supabase
        .from('tables')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'occupied')

      // Get best sellers
      const { data: bestSellersData } = await supabase
        .from('menus')
        .select('name, price, total_sold')
        .order('total_sold', { ascending: false })
        .limit(5)

      // Get recent orders for mini list
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select('id, customer_name, order_type, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(4)

      setStats({
        revenueToday: todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        revenueMonth: monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        totalOrdersToday: totalOrdersCount,
        activeOrders: activeOrdersCount,
        activeTables: tablesCount || 0
      })
      setBestSellers(bestSellersData || [])
      setRecentOrders(recentOrdersData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const statCards = [
    {
      title: 'Pendapatan Hari Ini',
      value: formatCurrency(stats.revenueToday),
      icon: DollarSign,
      color: 'from-orange-500 to-red-600',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Total Pesanan (Harian)',
      value: stats.totalOrdersToday,
      icon: ShoppingBag,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pesanan Aktif (Dapur)',
      value: stats.activeOrders,
      icon: ChefHat,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Meja Terisi',
      value: stats.activeTables,
      icon: Monitor,
      color: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-500',
      bgColor: 'bg-purple-50'
    }
  ]

  const getOrderStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-orange-100 text-orange-700',
      ready: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const translateStatus = (status) => {
    const t = {
      pending: 'Menunggu',
      processing: 'Dimasak',
      ready: 'Siap',
      completed: 'Selesai',
      cancelled: 'Batal'
    }
    return t[status] || status
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="h-32 bg-gray-100 rounded-3xl animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-3xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Greeting Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500 opacity-20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black mb-1">
              {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Admin'}! 👋
            </h1>
            <p className="text-gray-300 font-medium text-sm sm:text-base">
              Berikut adalah ringkasan operasional restoran Anda saat ini.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 self-start sm:self-auto">
            <Clock className="w-5 h-5 text-orange-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-[10px] text-gray-300 mt-0.5">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110`}></div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1 pr-2">
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4 transition-colors`}>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                <p className="text-sm font-bold text-gray-500 mt-1">{stat.title}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-500" />
              Pesanan Terbaru
            </h2>
            <Link to="/admin/payment" className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center">
              Lihat Semua <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="flex-1 flex flex-col gap-3">
            {recentOrders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm font-medium text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 py-8">
                Belum ada pesanan hari ini.
              </div>
            ) : (
              recentOrders.map((order) => (
                <Link to={`/admin/payment/${order.id}`} key={order.id} className="p-3 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 truncate pr-2 group-hover:text-orange-600 transition-colors">
                      {order.customer_name || 'Pelanggan'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider whitespace-nowrap ${getOrderStatusColor(order.status)}`}>
                      {translateStatus(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="flex items-center">
                      {order.order_type === 'dine_in' ? <UtensilsCrossed className="w-3 h-3 mr-1" /> : <ShoppingBag className="w-3 h-3 mr-1" />}
                      {order.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'}
                    </span>
                    <span className="font-bold text-gray-700">{formatCurrency(order.total_amount)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Menu Paling Laris
          </h2>
          <div className="flex-1 flex flex-col gap-3">
            {bestSellers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm font-medium text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 py-8">
                Belum ada penjualan.
              </div>
            ) : (
              bestSellers.map((item, index) => (
                <div key={index} className="flex items-center p-2 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-black text-sm flex-shrink-0 mr-3 border border-orange-100">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs font-medium text-gray-500">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-sm font-black text-gray-700">{item.total_sold}</span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Terjual</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <Banknote className="w-5 h-5 mr-2 text-green-500" />
            Aksi Cepat
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              to="/admin/pos"
              className="flex items-center p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="block font-bold">POS Kasir</span>
                <span className="text-xs text-orange-100 font-medium">Buat pesanan baru</span>
              </div>
            </Link>
            
            <Link
              to="/admin/qr"
              className="flex items-center p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform group-hover:bg-blue-100 group-hover:text-blue-600">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="block font-bold text-gray-900">QR Meja</span>
                <span className="text-xs text-gray-500 font-medium">Cetak QR pelanggan</span>
              </div>
            </Link>

            <Link
              to="/admin/reports"
              className="flex items-center p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform group-hover:bg-purple-100 group-hover:text-purple-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="block font-bold text-gray-900">Analytics</span>
                <span className="text-xs text-gray-500 font-medium">Lihat ringkasan bisnis</span>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}