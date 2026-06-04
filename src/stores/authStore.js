import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      role: null,
      session: null,
      loading: false,
      error: null,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile, role: profile?.role || null }),
      setSession: (session) => set({ session }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // ============================================
      // SIGN UP - VERSI WORKING
      // ============================================
      signUp: async (email, password, fullName, phone = '') => {
        set({ loading: true, error: null })
        
        try {
          // Validasi input
          if (!email || !email.includes('@')) {
            throw new Error('Format email tidak valid')
          }
          if (!password || password.length < 6) {
            throw new Error('Password minimal 6 karakter')
          }
          if (!fullName || fullName.length < 3) {
            throw new Error('Nama minimal 3 karakter')
          }

          const cleanEmail = email.trim().toLowerCase()
          const cleanName = fullName.trim()

          console.log('📝 Register:', { email: cleanEmail, name: cleanName })

          // 1. Sign up ke Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                full_name: cleanName,
                phone: phone || ''
              }
            }
          })

          if (authError) {
            console.error('Auth Error:', authError)
            
            // Handle specific errors
            if (authError.status === 429) {
              throw new Error('Terlalu banyak percobaan. Tunggu 1 menit.')
            }
            if (authError.message?.includes('already') || authError.message?.includes('duplicate')) {
              throw new Error('Email sudah terdaftar. Silakan login.')
            }
            if (authError.message?.includes('Database error')) {
              // Coba lagi sekali
              const { data: retryData, error: retryError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: password
              })
              if (retryError) {
                throw new Error('Gagal mendaftar. Silakan coba lagi nanti.')
              }
              if (!retryData?.user) throw new Error('Gagal membuat akun')
              
              // Insert profile manually
              await supabase.from('profiles').insert({
                id: retryData.user.id,
                full_name: cleanName,
                email: cleanEmail,
                phone: phone || null,
                role: 'customer',
                membership_level: 'member_baru',
                is_active: true
              }).select().maybeSingle()
              
              set({ loading: false })
              return { success: true, message: 'Pendaftaran berhasil! Silakan login.' }
            }
            throw new Error(authError.message)
          }

          if (!authData?.user) {
            throw new Error('Gagal membuat akun')
          }

          const userId = authData.user.id
          console.log('✅ Auth user created:', userId)

          // 2. Insert profile - gunakan upsert untuk menghindari duplicate
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: cleanName,
              email: cleanEmail,
              phone: phone || null,
              role: 'customer',
              membership_level: 'member_baru',
              is_active: true,
              total_orders: 0,
              total_spent: 0
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })

          if (profileError) {
            console.warn('⚠️ Profile insert warning:', profileError.message)
            // Tidak throw, karena auth user sudah berhasil
          } else {
            console.log('✅ Profile created')
          }

          set({ loading: false })
          return { 
            success: true, 
            message: 'Pendaftaran berhasil! Silakan login.' 
          }

        } catch (error) {
          console.error('❌ SignUp Error:', error)
          set({ loading: false, error: error.message })
          return { success: false, error: { message: error.message } }
        }
      },

      // ============================================
      // SIGN IN
      // ============================================
      signIn: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const cleanEmail = email.trim().toLowerCase()
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          })
          
          if (error) {
            if (error.message?.includes('Invalid login')) {
              throw new Error('Email atau password salah')
            }
            throw new Error(error.message)
          }
          
          if (!data?.user) {
            throw new Error('Gagal login')
          }

          // Load profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle()

          // Jika profile tidak ada, buat baru
          if (!profileData) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name || data.user.email,
                email: cleanEmail,
                role: 'customer',
                membership_level: 'member_baru',
                is_active: true
              })
              .select()
              .maybeSingle()
            
            set({
              user: data.user,
              session: data.session,
              profile: newProfile,
              role: 'customer',
              loading: false,
              error: null
            })
          } else {
            set({
              user: data.user,
              session: data.session,
              profile: profileData,
              role: profileData.role || 'customer',
              loading: false,
              error: null
            })
          }
          
          return { success: true, data }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: { message: error.message } }
        }
      },

      // ============================================
      // SIGN OUT
      // ============================================
      signOut: async () => {
        try {
          await supabase.auth.signOut()
        } catch (error) {
          console.error('Sign out error:', error)
        } finally {
          set({
            user: null,
            profile: null,
            role: null,
            session: null,
            error: null
          })
        }
      },

      // ============================================
      // UPDATE PROFILE
      // ============================================
      updateProfile: async (updates) => {
        const currentUser = get().user
        if (!currentUser) return { success: false, error: 'Tidak ada user login' }
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id)
            .select()
            .maybeSingle()
          
          if (error) throw error
          
          set({ profile: data })
          return { success: true, data }
        } catch (error) {
          return { success: false, error: error.message }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
        role: state.role
      })
    }
  )
)

export default useAuthStore