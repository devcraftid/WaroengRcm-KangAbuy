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
import CashierLayout from './components/layouts/CashierLayout'
import CustomerLayout from './components/layouts/CustomerLayout'
import GuestLayout from './components/layouts/GuestLayout'

// ============================================
// ADMIN PAGES
// ============================================
import AdminDashboard from './pages/admin/Dashboard'
import ManageMenu from './pages/admin/ManageMenu'
import ManageCategories from './pages/admin/ManageCategories'
import ManagePromo from './pages/admin/ManagePromo'
import ManageVoucher from './pages/admin/ManageVoucher'
import ManageOrder from './pages/admin/ManageOrder'
import TableMonitoring from './pages/admin/TableMonitoring'
import QRTable from './pages/admin/QRTable'
import ManageCashier from './pages/admin/ManageCashier'
import ManageCustomer from './pages/admin/ManageCustomer'
import ReportsAnalytics from './pages/admin/ReportsAnalytics'
import Revenue from './pages/admin/Revenue'
import WebsiteCMS from './pages/admin/WebsiteCMS'
import WebsiteSettings from './pages/admin/WebsiteSettings'
import AdminNotifications from './pages/admin/Notifications'
import AdminActivityLog from './pages/admin/ActivityLog'

// ============================================
// CASHIER PAGES
// ============================================
import CashierDashboard from './pages/cashier/Dashboard'
import POS from './pages/cashier/POS'
import CashierOrders from './pages/cashier/Orders'
import CashierTableMonitoring from './pages/cashier/TableMonitoring'
import CashierQRTable from './pages/cashier/QRTable'
import CashierPayment from './pages/cashier/Payment'
import TakeawayQueue from './pages/cashier/TakeawayQueue'
import TransactionHistory from './pages/cashier/TransactionHistory'
import CashierClosing from './pages/cashier/CashierClosing'
import CashierNotifications from './pages/cashier/Notifications'
import CashierActivityLog from './pages/cashier/ActivityLog'

// ============================================
// CUSTOMER PAGES
// ============================================
import CustomerHome from './pages/customer/CustomerHome'
import CustomerMenu from './pages/customer/CustomerMenu'
import OrderHistory from './pages/customer/OrderHistory'
import Favorites from './pages/customer/Favorites'
import MyVouchers from './pages/customer/MyVouchers'
import Membership from './pages/customer/Membership'
import Contact from './pages/customer/Contact'

// ============================================
// PUBLIC PAGES
// ============================================
import Home from './pages/customer/Home'
import Menu from './pages/customer/Menu'
import Cart from './pages/customer/Cart'
import Checkout from './pages/customer/Checkout'
import OrderTracking from './pages/customer/OrderTracking'
import QRTableOrder from './pages/customer/QRTableOrder'

// ============================================
// AUTH PAGES
// ============================================
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AuthCallback from './pages/auth/AuthCallback'

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
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* QR Table Order - Public */}
        <Route path="/order" element={<QRTableOrder />} />

        {/* ============================================ */}
        {/* CUSTOMER DASHBOARD (Customer Layout) */}
        {/* ============================================ */}
        <Route element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerLayout />
          </ProtectedRoute>
        }>
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/menu" element={<CustomerMenu />} />
          <Route path="/customer/history" element={<OrderHistory />} />
          <Route path="/customer/favorites" element={<Favorites />} />
          <Route path="/customer/vouchers" element={<MyVouchers />} />
          <Route path="/customer/membership" element={<Membership />} />
          <Route path="/customer/profile" element={<Profile />} />
        </Route>

        {/* ============================================ */}
        {/* CASHIER DASHBOARD (Cashier Layout) */}
        {/* ============================================ */}
        <Route element={
          <ProtectedRoute allowedRoles={['cashier', 'admin']}>
            <CashierLayout />
          </ProtectedRoute>
        }>
          <Route path="/cashier" element={<CashierDashboard />} />
          <Route path="/cashier/pos" element={<POS />} />
          <Route path="/cashier/orders" element={<CashierOrders />} />
          <Route path="/cashier/tables" element={<CashierTableMonitoring />} />
          <Route path="/cashier/qr" element={<CashierQRTable />} />
          {/* Payment Routes */}
          <Route path="/cashier/payment" element={<CashierPayment />} />
          <Route path="/cashier/payment/:id" element={<CashierPayment />} />
          <Route path="/cashier/takeaway" element={<TakeawayQueue />} />
          <Route path="/cashier/history" element={<TransactionHistory />} />
          <Route path="/cashier/closing" element={<CashierClosing />} />
          <Route path="/cashier/notifications" element={<CashierNotifications />} />
          <Route path="/cashier/activity" element={<CashierActivityLog />} />
          <Route path="/cashier/profile" element={<Profile />} />
        </Route>

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
          <Route path="/admin/promo" element={<ManagePromo />} />
          <Route path="/admin/voucher" element={<ManageVoucher />} />
          <Route path="/admin/orders" element={<ManageOrder />} />
          <Route path="/admin/tables" element={<TableMonitoring />} />
          <Route path="/admin/qr" element={<QRTable />} />
          <Route path="/admin/cashiers" element={<ManageCashier />} />
          <Route path="/admin/customers" element={<ManageCustomer />} />
          <Route path="/admin/reports" element={<ReportsAnalytics />} />
          <Route path="/admin/revenue" element={<Revenue />} />
          <Route path="/admin/cms" element={<WebsiteCMS />} />
          <Route path="/admin/settings" element={<WebsiteSettings />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/activity" element={<AdminActivityLog />} />
          <Route path="/admin/profile" element={<Profile />} />
        </Route>

        {/* ============================================ */}
        {/* AUTH ROUTES */}
        {/* ============================================ */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

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
  return children
}

export default App