import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  MessageCircle, 
  UtensilsCrossed,  // ← TAMBAHKAN INI
  ArrowLeft,
  LogIn
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { toast } from 'sonner'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, signInWithWhatsApp } = useAuthStore()
  const [loginMethod, setLoginMethod] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await signIn(email, password)
    
    if (result.success) {
      toast.success('Login berhasil!')
      const { role } = useAuthStore.getState()
      if (role === 'admin') navigate('/admin')
      else if (role === 'cashier') navigate('/cashier')
      else navigate('/')
    } else {
      toast.error(result.error?.message || 'Login gagal. Periksa email dan password.')
    }
    
    setLoading(false)
  }

  const handleWhatsAppLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const formattedPhone = phone.startsWith('+62') ? phone : `+62${phone.replace(/^0/, '')}`
    const result = await signInWithWhatsApp(formattedPhone)
    
    if (result.success) {
      toast.success('Kode OTP telah dikirim ke WhatsApp Anda')
      navigate('/verify-otp')
    } else {
      toast.error(result.error?.message || 'Gagal mengirim OTP')
    }
    
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const result = await signInWithGoogle()
    if (!result.success) {
      toast.error('Gagal login dengan Google')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden"
      >
        {/* Decorative background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-b-3xl opacity-10"></div>
        
        <div className="relative">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25"
            >
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900">WAROENG RCM</h1>
            <p className="text-sm text-gray-500">Kang Abuy</p>
            <p className="text-xs text-gray-400 mt-1">Makanan Enak, Harga Ekonomis</p>
          </div>

          {/* Login Method Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {[
              { id: 'email', icon: Mail, label: 'Email' },
              { id: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
              { id: 'google', icon: null, label: 'Google' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setLoginMethod(method.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  loginMethod === method.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {method.icon && <method.icon className="w-4 h-4" />}
                <span>{method.label}</span>
              </button>
            ))}
          </div>

          {/* Email Login Form */}
          {loginMethod === 'email' && (
            <motion.form
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleEmailLogin}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contoh@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <LogIn className="w-5 h-5" />
                <span>{loading ? 'Memproses...' : 'Login'}</span>
              </button>
            </motion.form>
          )}

          {/* WhatsApp Login Form */}
          {loginMethod === 'whatsapp' && (
            <motion.form
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleWhatsAppLogin}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Kode OTP akan dikirim via WhatsApp</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{loading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}</span>
              </button>
            </motion.form>
          )}

          {/* Google Login */}
          {loginMethod === 'google' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center space-x-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Lanjutkan dengan Google</span>
              </button>
              
              <p className="text-xs text-gray-400 text-center">
                Anda akan diarahkan ke halaman login Google
              </p>
            </motion.div>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">atau</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Belum punya akun?{' '}
              <Link to="/register" className="text-orange-600 font-medium hover:text-orange-700 transition-colors">
                Daftar sekarang
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link
              to="/"
              className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kembali ke Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}