import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DollarSign,
  ShoppingBag,
  Users,
  UserPlus,
  CreditCard,
  QrCode,
  TrendingUp,
  Star,
  Activity,
  Monitor,
  Plus,        // ← TAMBAHKAN INI
  ArrowUp,
  ArrowDown,
  RefreshCw,
  UtensilsCrossed
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { useRealtimeOrders, useRealtimePayments } from '../../hooks/useRealtime'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    revenueToday: 0,
    revenueMonth: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalMembers: 0,
    totalCashiers: 0,
    activeTables: 0,
    cashTransactions: 0,
    qrisTransactions: 0
  })
  const [bestSellers, setBestSellers] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

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

    return () => {
      supabase.removeChannel(ordersChannel).catch(console.error)
      supabase.removeChannel(paymentsChannel).catch(console.error)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      // Get today's revenue
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', today)
        .eq('status', 'completed')

      // Get monthly revenue
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', monthStart)
        .eq('status', 'completed')

      // Get counts
      const [
        { count: ordersCount },
        { count: customersCount },
        { count: membersCount },
        { count: cashiersCount },
        { count: tablesCount },
        { count: cashCount },
        { count: qrisCount }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer').not('membership_level', 'is', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'cashier'),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('status', 'occupied'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('method', 'cash').eq('status', 'completed'),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('method', 'qris').eq('status', 'completed')
      ])

      // Get best sellers
      const { data: bestSellersData } = await supabase
        .from('menus')
        .select('name, price, total_sold')
        .order('total_sold', { ascending: false })
        .limit(5)

      // Get top customers
      const { data: topCustomersData } = await supabase
        .from('profiles')
        .select('full_name, total_spent, total_orders')
        .eq('role', 'customer')
        .order('total_spent', { ascending: false })
        .limit(5)

      // Get recent activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('description, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      setStats({
        revenueToday: todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        revenueMonth: monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        totalOrders: ordersCount || 0,
        totalCustomers: customersCount || 0,
        totalMembers: membersCount || 0,
        totalCashiers: cashiersCount || 0,
        activeTables: tablesCount || 0,
        cashTransactions: cashCount || 0,
        qrisTransactions: qrisCount || 0
      })
      setBestSellers(bestSellersData || [])
      setTopCustomers(topCustomersData || [])
      setActivities(activitiesData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Revenue Hari Ini',
      value: formatCurrency(stats.revenueToday),
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      change: '+12.5%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Revenue Bulan Ini',
      value: formatCurrency(stats.revenueMonth),
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-600',
      change: '+8.2%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Total Order',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'from-orange-500 to-red-600',
      change: '+5.1%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Total Customer',
      value: stats.totalCustomers,
      icon: Users,
      color: 'from-purple-500 to-pink-600',
      change: '+15.3%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Total Member',
      value: stats.totalMembers,
      icon: UserPlus,
      color: 'from-yellow-500 to-orange-600',
      change: '+3.7%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Total Kasir',
      value: stats.totalCashiers,
      icon: Users,
      color: 'from-teal-500 to-cyan-600',
      change: '0%',
      changeColor: 'text-gray-600'
    },
    {
      title: 'Meja Aktif',
      value: stats.activeTables,
      icon: Monitor,
      color: 'from-pink-500 to-rose-600',
      change: 'Real-time',
      changeColor: 'text-blue-600'
    },
    {
      title: 'Cash / QRIS',
      value: `${stats.cashTransactions} / ${stats.qrisTransactions}`,
      icon: CreditCard,
      color: 'from-gray-600 to-gray-800',
      change: 'Today',
      changeColor: 'text-gray-600'
    }
  ]

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse">
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Selamat datang kembali, Owner! 🎉
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-500 bg-green-50 px-3 py-1.5 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Realtime</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className={`text-xs mt-1 ${stat.changeColor}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts & Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Sellers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Best Seller
          </h2>
          {bestSellers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-4">
              {bestSellers.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">Terjual {item.total_sold || 0}x</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Top Customer
          </h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Belum ada data</p>
          ) : (
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {customer.full_name?.[0] || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{customer.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{customer.total_orders || 0} orders</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(customer.total_spent || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/menu"
              className="flex items-center space-x-3 w-full p-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Tambah Menu Baru</span>
            </Link>
            <Link
              to="/admin/qr"
              className="flex items-center space-x-3 w-full p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
            >
              <QrCode className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Generate QR Meja</span>
            </Link>
            <Link
              to="/admin/cashiers"
              className="flex items-center space-x-3 w-full p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
            >
              <UserPlus className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Tambah Kasir</span>
            </Link>
            <Link
              to="/admin/reports"
              className="flex items-center space-x-3 w-full p-4 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
            >
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Lihat Laporan</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}