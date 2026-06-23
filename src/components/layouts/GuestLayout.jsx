import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, UtensilsCrossed, ShoppingCart, Phone, Menu, X, LogIn, User, ChevronRight, Camera, Store } from 'lucide-react'
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
    { path: '/gallery',label: 'Galeri',   icon: Camera },
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
              <img src="/logo.png" alt="Logo Waroeng RCM" className="w-16 h-16 object-contain drop-shadow-sm scale-110 transform origin-left" />
              <div>
                <p className="font-bold text-gray-900 text-sm leading-none">WAROENG RCM</p>
                <p className="text-[10px] leading-none mt-0.5" style={{ color: '#f05a28' }}>Kang Abuy</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex flex-1 justify-center items-center gap-6">
              <Link to="/" className="text-sm font-semibold text-gray-700 hover:text-[#f05a28] transition-colors">Beranda</Link>
              <Link to="/menu" className="text-sm font-semibold text-gray-700 hover:text-[#f05a28] transition-colors">Menu</Link>
              <Link to="/gallery" className="text-sm font-semibold text-gray-700 hover:text-[#f05a28] transition-colors">Galeri</Link>
              <Link to="/contact" className="text-sm font-semibold text-gray-700 hover:text-[#f05a28] transition-colors">Kontak</Link>
            </nav>

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
              {user ? (
                <Link to="/admin" className="hidden md:flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-full hover:shadow-lg transition-all" style={{ background: '#f05a28' }}>
                  <User className="w-4 h-4" /> Dashboard
                </Link>
              ) : (
                <Link to="/login" className="hidden md:flex items-center gap-2 text-sm font-semibold text-[#f05a28] px-4 py-2 rounded-full border border-[#f05a28] hover:bg-[#f05a28] hover:text-white transition-all">
                  <LogIn className="w-4 h-4" /> Masuk
                </Link>
              )}
              {/* Hamburger */}
              <button onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-full hover:bg-gray-50 transition-colors md:hidden">
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
                  <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-sm scale-110 transform origin-left" />
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

              {/* Mobile Login / Dashboard */}
              <div className="p-4 border-t border-gray-100 mt-auto">
                {user ? (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-3 w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all"
                    style={{ background: '#f05a28' }}>
                    <User className="w-4 h-4" />
                    <span>Dashboard Admin</span>
                  </Link>
                ) : (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-3 w-full py-3 rounded-xl text-sm font-bold text-[#f05a28] border border-[#f05a28] hover:bg-[#f05a28] hover:text-white transition-all">
                    <LogIn className="w-4 h-4" />
                    <span>Masuk (Admin)</span>
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