import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, ChevronRight, X, ArrowLeft,
  Eye, EyeOff, Mail, Lock, LogIn, Phone, Sparkles
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import { toast } from 'sonner'

const PRIMARY = '#f05a28'

// ─── Ilustrasi Chat WhatsApp (inline SVG sederhana) ───────────────────────
function ChatIllustration() {
  return (
    <div className="relative w-full h-48 flex items-center justify-center select-none">
      {/* Lingkaran latar */}
      <div className="absolute w-44 h-44 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #fde8dc 0%, #ffd5c0 100%)' }} />

      {/* Bubble kiri (hijau — "Hai saya ingin login") */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute left-4 top-8 max-w-[170px] bg-green-500 text-white text-xs font-medium rounded-2xl rounded-tl-none px-3 py-2.5 shadow-md"
      >
        Hai! saya ingin login ke{' '}
        <span className="font-bold">Waroeng RCM</span>
        <span className="ml-1 inline-block w-4 h-4 bg-green-400 rounded-full text-center leading-4">✓</span>
        {/* Bintang sparkle */}
        <motion.div
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
          className="absolute -left-4 -top-3 text-yellow-400 text-lg"
        >✦</motion.div>
        <motion.div
          animate={{ rotate: [0, -20, 20, 0], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, delay: 1 }}
          className="absolute -left-6 top-4 text-yellow-300 text-sm"
        >✦</motion.div>
      </motion.div>

      {/* Bubble kanan (putih — "Yeay! Verifikasi berhasil.") */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute left-10 top-24 max-w-[140px] bg-white text-gray-800 text-xs rounded-2xl rounded-tl-none px-3 py-2.5 shadow-md border border-gray-100"
      >
        <p className="font-bold text-gray-900">Yeay!</p>
        <p className="text-gray-500">Verifikasi berhasil.</p>
      </motion.div>

      {/* Kartu menu kanan */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute right-4 top-6 w-24 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        {/* gambar placeholder makanan */}
        <div className="h-14 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #fff5f2, #fde8dc)' }}>
          <span className="text-3xl">🍗</span>
        </div>
        <div className="p-1.5">
          <div className="h-1.5 w-10 bg-gray-200 rounded mb-1" />
          <div className="h-1.5 w-7 bg-gray-100 rounded" />
        </div>
      </motion.div>

      {/* Badge diskon */}
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="absolute right-2 top-3 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
        style={{ background: '#e8173e' }}
      >%</motion.div>
    </div>
  )
}

// ─── Halaman Profile (seperti ESB: avatar guest + Sign In button) ──────────
function ProfileView({ onSignIn, user, profile, onSignOut }) {
  const navigate = useNavigate()

  if (user && profile) {
    // Sudah login → tampilkan profil user
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="font-bold text-base text-gray-900 flex-1 text-center pr-8">Profil</h1>
        </div>

        {/* User Info */}
        <div className="bg-white mx-3 mt-4 rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}>
            {(profile.full_name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{profile.full_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{profile.phone || profile.email || '-'}</p>
          </div>
        </div>

        {/* Menu items */}
        <div className="mx-3 mt-4 space-y-2">
          {[
            { label: 'Riwayat Pesanan', href: '/customer/history' },
            { label: 'Favorit', href: '/customer/favorites' },
            { label: 'Voucher Saya', href: '/customer/vouchers' },
          ].map(item => (
            <Link key={item.href} to={item.href}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-gray-100 shadow-sm">
              <span className="text-sm text-gray-700">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>

        {/* Sign Out */}
        <div className="mx-3 mt-4">
          <button onClick={onSignOut}
            className="w-full py-3.5 rounded-xl border-2 text-sm font-semibold transition-all"
            style={{ borderColor: PRIMARY, color: PRIMARY }}>
            Keluar
          </button>
        </div>
      </div>
    )
  }

  // Belum login → tampilan ESB "Log In as Guest"
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="font-bold text-base text-gray-900 flex-1 text-center pr-8">Profil</h1>
      </div>

      {/* Guest Banner */}
      <div className="bg-white mx-3 mt-4 rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700 mb-2">Masuk sebagai Tamu</p>
          <button
            onClick={onSignIn}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: PRIMARY }}
          >
            Masuk
          </button>
        </div>
      </div>

      {/* Info items */}
      <div className="mx-3 mt-4 space-y-2">
        <Link to="/customer/history"
          className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-gray-100 shadow-sm">
          <span className="text-sm text-gray-700">Riwayat Pesanan</span>
        </Link>
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-gray-100 shadow-sm">
          <span className="text-sm text-gray-700">Bahasa</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Indonesia</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3.5 border border-gray-100 shadow-sm">
          <span className="text-sm text-gray-700">Kebijakan Privasi</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto py-6 text-center">
        <p className="text-xs text-gray-400">© 2026 Waroeng RCM Kang Abuy</p>
      </div>
    </div>
  )
}

// ─── Main Login Component ──────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile, signIn, signInWithGoogle, signInWithPhone, signOut } = useAuthStore()

  const [showLoginModal, setShowLoginModal] = useState(!user) // jika belum login, langsung ke modal
  const [loginStep, setLoginStep] = useState('whatsapp') // 'whatsapp' | 'email' | 'phone'

  // Form states
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const redirectUrl = searchParams.get('redirect') || '/customer'

  const redirectAfterLogin = () => {
    const { role } = useAuthStore.getState()
    setTimeout(() => {
      if (role === 'admin') navigate('/admin', { replace: true })
      else if (role === 'cashier') navigate('/cashier', { replace: true })
      else navigate(redirectUrl, { replace: true })
    }, 300)
  }

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    if (!phone || phone.length < 9) { toast.error('Nomor HP tidak valid'); return }
    setLoading(true)
    let fmt = phone.replace(/[\s\-\(\)]/g, '')
    if (fmt.startsWith('0')) fmt = '62' + fmt.slice(1)
    if (fmt.startsWith('+')) fmt = fmt.slice(1)
    if (!fmt.startsWith('62')) fmt = '62' + fmt
    const result = await signInWithPhone(fmt)
    if (result.success) {
      toast.success(result.message || 'Berhasil masuk! 🎉')
      setShowLoginModal(false)
      redirectAfterLogin()
    } else {
      toast.error(result.error?.message || 'Gagal masuk')
    }
    setLoading(false)
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email dan password wajib diisi'); return }
    setLoading(true)
    const result = await signIn(email, password)
    if (result.success) {
      toast.success('Berhasil masuk! 🎉')
      setShowLoginModal(false)
      redirectAfterLogin()
    } else {
      toast.error(result.error?.message || 'Email atau password salah')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const result = await signInWithGoogle()
    if (!result.success) toast.error('Gagal masuk dengan Google')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  // Jika sudah login, tampilkan ProfileView
  if (user && profile && !showLoginModal) {
    return (
      <ProfileView
        user={user}
        profile={profile}
        onSignIn={() => setShowLoginModal(true)}
        onSignOut={handleSignOut}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ProfileView di belakang (jika sudah punya user) */}
      <ProfileView
        user={null}
        profile={null}
        onSignIn={() => setShowLoginModal(true)}
        onSignOut={handleSignOut}
      />

      {/* ── Login Modal Sheet (dari bawah) ── */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowLoginModal(false)}
            />

            {/* Bottom Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: '95vh' }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header baris */}
              <div className="flex items-center px-5 pb-2 pt-1">
                <button
                  onClick={() => {
                    if (loginStep !== 'whatsapp') { setLoginStep('whatsapp'); return }
                    setShowLoginModal(false)
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="flex-1 text-center font-bold text-base text-gray-900 pr-9">
                  {loginStep === 'whatsapp' ? 'Masuk' : loginStep === 'email' ? 'Login Email' : 'Login No. HP'}
                </h2>
              </div>

              <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 80px)' }}>
                <AnimatePresence mode="wait">

                  {/* ── Step: WhatsApp / HP (default, ESB style) ── */}
                  {loginStep === 'whatsapp' && (
                    <motion.div key="wa" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      {/* Ilustrasi */}
                      <ChatIllustration />

                      {/* Form HP */}
                      <form onSubmit={handlePhoneLogin} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                            Nomor WhatsApp / HP
                          </label>
                          <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-orange-400 transition-colors">
                            <div className="px-3 py-3.5 bg-gray-50 border-r border-gray-200 flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-base">🇮🇩</span>
                              <span className="text-xs font-semibold text-gray-600">+62</span>
                            </div>
                            <input
                              type="tel"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="812-3456-7890"
                              className="flex-1 px-4 py-3.5 text-sm outline-none bg-white"
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5 ml-1">
                            Akun baru otomatis dibuat jika nomor belum terdaftar
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60"
                          style={{ background: '#25D366' }}
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              {/* WhatsApp icon */}
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L.073 23.927a.5.5 0 0 0 .623.623l6.079-1.459A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.88 9.88 0 0 1-5.034-1.374l-.36-.214-3.738.897.912-3.628-.236-.374A9.883 9.883 0 0 1 2.118 12C2.118 6.535 6.535 2.118 12 2.118S21.882 6.535 21.882 12 17.465 21.882 12 21.882z"/>
                              </svg>
                              Masuk via WhatsApp / HP
                            </>
                          )}
                        </button>
                      </form>

                      {/* Divider */}
                      <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">atau</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Opsi lain */}
                      <div className="space-y-2.5">
                        {/* Google */}
                        <button
                          onClick={handleGoogleLogin}
                          className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-3 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Lanjutkan dengan Google
                        </button>

                        {/* Email */}
                        <button
                          onClick={() => setLoginStep('email')}
                          className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-3 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          <Mail className="w-5 h-5 text-gray-500" />
                          Lanjutkan dengan Email
                        </button>

                        {/* Lanjut tanpa login */}
                        <Link
                          to="/"
                          className="block w-full py-3 text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Lanjutkan sebagai Tamu
                        </Link>
                      </div>

                      <p className="text-center text-xs text-gray-400 mt-5 leading-relaxed">
                        Dengan masuk, kamu menyetujui{' '}
                        <span className="text-orange-500 font-medium">Syarat & Ketentuan</span>{' '}
                        dan{' '}
                        <span className="text-orange-500 font-medium">Kebijakan Privasi</span>
                      </p>
                    </motion.div>
                  )}

                  {/* ── Step: Email Login ── */}
                  {loginStep === 'email' && (
                    <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                      <div className="py-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md"
                          style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}>
                          <Mail className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-center text-sm text-gray-500">Masuk dengan akun email kamu</p>
                      </div>

                      <form onSubmit={handleEmailLogin} className="space-y-4 mt-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="email" value={email} onChange={e => setEmail(e.target.value)}
                              placeholder="contoh@email.com"
                              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 text-sm focus:border-orange-400 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'} value={password}
                              onChange={e => setPassword(e.target.value)} placeholder="Password kamu"
                              className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 border-gray-200 text-sm focus:border-orange-400 focus:outline-none transition-colors"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <button type="submit" disabled={loading}
                          className="w-full py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60"
                          style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}>
                          {loading
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <><LogIn className="w-5 h-5" />Masuk dengan Email</>
                          }
                        </button>
                        <p className="text-center text-xs text-gray-400">
                          Belum punya akun?{' '}
                          <Link to="/register" className="font-semibold" style={{ color: PRIMARY }}>Daftar</Link>
                        </p>
                      </form>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}