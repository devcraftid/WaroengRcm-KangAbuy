import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, LogIn, Eye, EyeOff, Store } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import { toast } from 'sonner'

const PRIMARY = '#f05a28'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, role, signIn } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const redirectUrl = searchParams.get('redirect') || '/admin'

  useEffect(() => {
    // If already logged in as admin, redirect to admin dashboard
    if (user && role === 'admin') {
      navigate('/admin', { replace: true })
    } else if (user) {
      // If they somehow have a different role, still redirect to home
      navigate('/', { replace: true })
    }
  }, [user, role, navigate])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email dan password wajib diisi'); return }
    setLoading(true)
    const result = await signIn(email, password)
    if (result.success) {
      toast.success('Berhasil masuk! 🎉')
      setTimeout(() => navigate(redirectUrl, { replace: true }), 300)
    } else {
      toast.error(result.error?.message || 'Email atau password salah')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}>
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-sm text-gray-500">Masuk dengan akun admin kamu</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Email</label>
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
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Password kamu"
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 border-gray-200 text-sm focus:border-orange-400 focus:outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-4 mt-2 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}>
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><LogIn className="w-5 h-5" />Masuk sebagai Admin</>
            }
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Kembali ke Website
          </button>
        </div>
      </div>
    </div>
  )
}