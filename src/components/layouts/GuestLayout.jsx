import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, UtensilsCrossed, ShoppingCart, Phone, Menu, X, LogIn, User, ChevronRight } from 'lucide-react'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'

export default function GuestLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { getItemCount } = useCartStore()
  const { user } = useAuthStore()
  const cartItemCount = getItemCount()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  const navLinks = [
    { path: '/',        label: 'Home',    icon: Home },
    { path: '/menu',   label: 'Menu',     icon: UtensilsCrossed },
    { path: '/contact',label: 'Kontak',   icon: Phone },
  ]
  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ─── App Content terpusat ─── */}
      <div className="app-wrapper" style={{ position: 'relative' }}>

        {/* ─── HEADER ─── */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between h-14 px-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: '#f05a28' }}>
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-none">WAROENG RCM</p>
                <p className="text-[10px] leading-none mt-0.5" style={{ color: '#f05a28' }}>Kang Abuy</p>
              </div>
            </Link>

            {/* Right: Cart + Masuk + Menu */}
            <div className="flex items-center gap-1">
              {/* Cart */}
              <Link to="/cart" className="relative p-2 rounded-full hover:bg-gray-50 transition-colors">
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                <AnimatePresence>
                  {cartItemCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center
                                 text-white text-[10px] font-bold"
                      style={{ background: '#f05a28' }}
                    >
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Masuk / Dashboard */}
              {!user ? (
                <Link to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: '#f05a28' }}>
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk
                </Link>
              ) : (
                <Link to="/customer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  <User className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              )}

              {/* Hamburger */}
              <button onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-full hover:bg-gray-50 transition-colors">
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </header>

        {/* ─── MAIN ─── */}
        <main>
          <Outlet />
        </main>
      </div>


      {/* ─── MOBILE MENU ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f05a28' }}>
                    <UtensilsCrossed className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">WAROENG RCM</p>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-50">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navLinks.map(({ path, label, icon: Icon }) => (
                  <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive(path) ? 'text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={isActive(path) ? { background: '#f05a28' } : {}}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-40" />
                  </Link>
                ))}
                <Link to="/cart" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Keranjang</span>
                  {cartItemCount > 0 && (
                    <span className="ml-auto text-white text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#f05a28' }}>
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              </nav>

              {/* Footer */}
              <div className="px-4 pb-6 border-t border-gray-100 pt-4">
                {user ? (
                  <Link to="/customer" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                         style={{ background: '#f05a28' }}>
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      <p className="text-xs" style={{ color: '#f05a28' }}>Lihat Dashboard →</p>
                    </div>
                  </Link>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm"
                    style={{ background: '#f05a28' }}>
                    <LogIn className="w-4 h-4" />
                    Masuk / Daftar
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}