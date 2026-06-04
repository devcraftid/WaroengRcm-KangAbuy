import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { toast } from 'sonner'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setUser, setProfile } = useAuthStore()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (session?.user) {
          setUser(session.user)
          
          // Load or create profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (existingProfile) {
            setProfile(existingProfile)
          } else {
            // Create new profile
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || session.user.email,
                email: session.user.email,
                role: 'customer'
              })
              .select()
              .single()
            
            if (newProfile) setProfile(newProfile)
          }
          
          toast.success('Login berhasil!')
          
          // Redirect based on role
          const role = existingProfile?.role || 'customer'
          if (role === 'admin') navigate('/admin')
          else if (role === 'cashier') navigate('/cashier')
          else navigate('/')
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('Gagal autentikasi')
        navigate('/login')
      }
    }

    handleAuthCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900">Memproses login...</p>
        <p className="text-sm text-gray-500 mt-1">Mohon tunggu sebentar</p>
      </div>
    </div>
  )
}