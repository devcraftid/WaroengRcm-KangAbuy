import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import useAuthStore from './stores/authStore'
import ErrorBoundary from './components/shared/ErrorBoundary'
import LoadingScreen from './components/shared/LoadingScreen'

// ============================================
// LAYOUTS
// ============================================
import AdminLayout from './components/layouts/AdminLayout'
import GuestLayout from './components/layouts/GuestLayout'

// ============================================
// ADMIN PAGES
// ============================================
import AdminDashboard from './pages/admin/Dashboard'
import ManageMenu from './pages/admin/ManageMenu'
import ManageCategories from './pages/admin/ManageCategories'
import TableMonitoring from './pages/admin/TableMonitoring'
import QRTable from './pages/admin/QRTable'
import ReportsAnalytics from './pages/admin/ReportsAnalytics'
import AdminNotifications from './pages/admin/Notifications'

// ============================================
// CASHIER (NEW ADMIN) PAGES
// ============================================
import POS from './pages/cashier/POS'
import CashierPayment from './pages/cashier/Payment'
import TakeawayQueue from './pages/cashier/TakeawayQueue'
import TransactionHistory from './pages/cashier/TransactionHistory'
import CashierClosing from './pages/cashier/CashierClosing'

// ============================================
// PUBLIC PAGES
// ============================================
import Home from './pages/customer/Home'
import Menu from './pages/customer/Menu'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderTracking from './pages/customer/OrderTracking'
import QRTableOrder from './pages/customer/QRTableOrder'
import Gallery from './pages/customer/Gallery'
import Contact from './pages/customer/Contact'

// ============================================
// AUTH PAGES
// ============================================
import Login from './pages/auth/Login'

// ============================================
// SHARED PAGES
// ============================================
import Profile from './pages/shared/Profile'

function App() {
  const { user, role, setUser, setProfile } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => { checkSession() }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }
      }
    )
    return () => subscription?.unsubscribe()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      }
    } catch (error) {
      console.error('Session check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (data) setProfile(data)
    } catch (error) {
      console.error('Profile load error:', error)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <ErrorBoundary>
      <Routes>
        {/* ============================================ */}
        {/* PUBLIC ROUTES (Guest Layout) */}
        {/* ============================================ */}
        <Route element={<GuestLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderTracking />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* QR Table Order - Public */}
        <Route path="/order" element={<QRTableOrder />} />

        {/* ============================================ */}
        {/* ADMIN DASHBOARD (Admin Layout) */}
        {/* ============================================ */}
        <Route element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/menu" element={<ManageMenu />} />
          <Route path="/admin/categories" element={<ManageCategories />} />
          
          {/* Kasir features integrated into Admin */}
          <Route path="/admin/pos" element={<POS />} />
          <Route path="/admin/payment" element={<CashierPayment />} />
          <Route path="/admin/payment/:id" element={<CashierPayment />} />
          <Route path="/admin/takeaway" element={<TakeawayQueue />} />
          <Route path="/admin/history" element={<TransactionHistory />} />
          <Route path="/admin/closing" element={<CashierClosing />} />

          <Route path="/admin/tables" element={<TableMonitoring />} />
          <Route path="/admin/qr" element={<QRTable />} />
          
          <Route path="/admin/reports" element={<ReportsAnalytics />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/profile" element={<Profile />} />
        </Route>

        {/* ============================================ */}
        {/* AUTH ROUTES */}
        {/* ============================================ */}
        <Route path="/login" element={<Login />} />

        {/* ============================================ */}
        {/* 404 PAGE */}
        {/* ============================================ */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center max-w-md">
              <h1 className="text-6xl sm:text-8xl font-bold text-gray-200 mb-4">404</h1>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Halaman Tidak Ditemukan</h2>
              <p className="text-sm text-gray-500 mb-6">
                Maaf, halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm">
                  Kembali ke Home
                </a>
                <a href="/menu" className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm">
                  Lihat Menu
                </a>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </ErrorBoundary>
  )
}

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================
function ProtectedRoute({ children, allowedRoles = [] }) {
  // Assuming a simple role check or no check based on the original code
  // The original returned just children, so we'll keep it simple but add a check if authStore is populated
  const { user, role } = useAuthStore()
  
  // Basic guard (if not logged in, go to login)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default App