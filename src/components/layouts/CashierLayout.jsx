import { useState, useEffect } from 'react' // ← TAMBAHKAN useEffect
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Monitor,
  QrCode,
  CreditCard,
  ClipboardList,
  History,
  Bell,
  Activity,
  User,
  Menu,
  X,
  LogOut,
  Store,
  Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { playNotificationByType } from '../../utils/sound'

const menuItems = [
  { path: '/cashier', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cashier/pos', icon: ShoppingCart, label: 'POS' },
  { path: '/cashier/orders', icon: ShoppingBag, label: 'Kelola Order' },
  { path: '/cashier/tables', icon: Monitor, label: 'Monitoring Meja' },
  { path: '/cashier/qr', icon: QrCode, label: 'QR Meja' },
  { path: '/cashier/payment', icon: CreditCard, label: 'Pembayaran' },
  { path: '/cashier/takeaway', icon: ClipboardList, label: 'Takeaway Queue' },
  { path: '/cashier/history', icon: History, label: 'Riwayat Transaksi' },
  { path: '/cashier/notifications', icon: Bell, label: 'Notifikasi' },
  { path: '/cashier/activity', icon: Activity, label: 'Activity Log' },
  { path: '/cashier/profile', icon: User, label: 'Profile' },
]

export default function CashierLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <Link to="/cashier" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                 style={{ background: 'linear-gradient(135deg, #f05a28, #d44d1f)' }}>
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 leading-tight block">WAROENG RCM</span>
              <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: '#f05a28' }}>Kasir Panel</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #f05a28, #d44d1f)',
                  boxShadow: '0 8px 16px rgba(240, 90, 40, 0.25)'
                } : {}}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex items-center space-x-3 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                 style={{ background: 'linear-gradient(135deg, #f05a28, #d44d1f)' }}>
              {profile?.full_name?.[0]?.toUpperCase() || 'K'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {profile?.full_name || 'Kasir'}
              </p>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Cashier</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Clock */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <CurrentTime />
            </div>

            {/* Notifications */}
            <Link to="/cashier/notifications" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              <NotificationBadge />
            </Link>

            {/* Quick Close Register */}
            <Link
              to="/cashier/closing"
              className="hidden sm:flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
            >
              Closing
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ============================================
// CurrentTime Component
// ============================================
function CurrentTime() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return <span>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
}

// ============================================
// NotificationBadge Component
// ============================================
function NotificationBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    loadUnreadCount()
    
    // Subscribe to new notifications — play sound on INSERT
    const channel = supabase
      .channel('cashier-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        loadUnreadCount()
        // Play sound sesuai tipe notifikasi baru
        if (payload?.new?.type) {
          playNotificationByType(payload.new.type)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      
      setCount(count || 0)
    } catch (error) {
      // Silently ignore
    }
  }

  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
      {count > 99 ? '99+' : count}
    </span>
  )
}