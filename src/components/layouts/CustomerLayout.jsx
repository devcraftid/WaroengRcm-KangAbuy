import { useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ShoppingBag, Clock, Heart, Ticket, Award,
  User, Menu, X, LogOut, UtensilsCrossed, ChevronRight
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import useCartStore from '../../stores/cartStore'

const PRIMARY = '#f05a28'

const menuItems = [
  { path: '/customer',            icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/customer/menu',       icon: UtensilsCrossed, label: 'Pesan Menu' },
  { path: '/customer/history',    icon: Clock,           label: 'Riwayat Order' },
  { path: '/customer/favorites',  icon: Heart,           label: 'Favorit Saya' },
  { path: '/customer/vouchers',   icon: Ticket,          label: 'Voucher' },
  { path: '/customer/membership', icon: Award,           label: 'Membership' },
  { path: '/customer/profile',    icon: User,            label: 'Profile' },
]

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { getItemCount } = useCartStore()
  const cartCount = getItemCount()

  const handleSignOut = async () => { await signOut(); navigate('/') }
  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="app-wrapper">

        {/* ─── HEADER ─── */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center h-14 px-4 gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 rounded-full hover:bg-gray-50 lg:hidden">
              <Menu className="w-5 h-5 text-gray-700" />
            </button>

            <Link to="/customer" className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: PRIMARY }}>
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm">WAROENG RCM</span>
            </Link>

            <div className="flex items-center gap-1">
              <Link to="/customer/menu"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: PRIMARY }}>
                <UtensilsCrossed className="w-3.5 h-3.5" /> Pesan
              </Link>
              <Link to="/cart" className="relative p-2 rounded-full hover:bg-gray-50">
                <ShoppingBag className="w-5 h-5 text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{ background: PRIMARY }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
              <button onClick={handleSignOut}
                className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ─── CONTENT ─── */}
        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-white border-r border-gray-100
                            min-h-[calc(100vh-3.5rem)] sticky top-14 p-3">

            {/* User Card */}
            <div className="p-3 rounded-xl bg-gray-50 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                     style={{ background: PRIMARY }}>
                  {profile?.full_name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name || 'Customer'}</p>
                  <p className="text-xs text-gray-400 capitalize truncate">
                    {profile?.membership_level?.replace('_', ' ') || 'Member'}
                  </p>
                </div>
              </div>
            </div>

            <Link to="/customer/menu"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg mb-3 text-sm font-semibold text-white"
              style={{ background: PRIMARY }}>
              <UtensilsCrossed className="w-4 h-4" /> Pesan Menu
            </Link>

            <nav className="space-y-0.5 flex-1">
              {menuItems.map(item => {
                const active = isActive(item.path)
                return (
                  <Link key={item.path} to={item.path}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={active ? { background: PRIMARY } : {}}>
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <button onClick={handleSignOut}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500
                         hover:bg-red-50 transition-colors mt-2 border-t border-gray-100 pt-3">
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </aside>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ─── MOBILE SIDEBAR ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-xl flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: PRIMARY }}>
                    <UtensilsCrossed className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-sm text-gray-900">WAROENG RCM</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-full hover:bg-gray-50">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-3 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                       style={{ background: PRIMARY }}>
                    {profile?.full_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name || 'Customer'}</p>
                    <p className="text-xs text-gray-400">{profile?.membership_level?.replace('_', ' ') || 'Member'}</p>
                  </div>
                </div>
                <Link to="/customer/menu" onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg mt-2 text-sm font-semibold text-white"
                  style={{ background: PRIMARY }}>
                  <UtensilsCrossed className="w-4 h-4" /> Pesan Menu
                </Link>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                {menuItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive(item.path) ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={isActive(item.path) ? { background: PRIMARY } : {}}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="px-3 pb-6 border-t border-gray-100 pt-3">
                <button onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-50 text-red-500 text-sm font-medium">
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}