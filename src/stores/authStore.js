import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, profile: null, role: null, session: null, loading: false, error: null,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile, role: profile?.role || null }),
      setSession: (session) => set({ session }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      signUp: async (email, password, fullName, phone = '') => {
        set({ loading: true, error: null })
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(), password,
            options: { data: { full_name: fullName.trim(), phone: phone || '' } }
          })
          if (authError) throw new Error(authError.message?.includes('already') ? 'Email sudah terdaftar' : authError.message)
          if (authData?.user) {
            await supabase.from('profiles').upsert({
              id: authData.user.id, full_name: fullName.trim(), email: email.trim().toLowerCase(),
              phone: phone || null, role: 'customer', membership_level: 'member_baru', is_active: true
            }, { onConflict: 'id' })
            return await get().signIn(email, password)
          }
          throw new Error('Gagal mendaftar')
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: { message: error.message } }
        }
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const cleanEmail = email.trim().toLowerCase()
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
          
          if (!error && data?.user) {
            let { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
            if (!prof) {
              await supabase.from('profiles').upsert({
                id: data.user.id, full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                email: cleanEmail, role: 'customer', membership_level: 'member_baru', is_active: true
              }, { onConflict: 'id' })
              const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
              prof = p
            }
            set({ user: data.user, session: data.session, profile: prof, role: prof?.role || 'customer', loading: false, error: null })
            return { success: true, data }
          }

          const { data: prof } = await supabase.from('profiles').select('*').eq('email', cleanEmail).maybeSingle()
          if (prof) {
            set({ user: { id: prof.id, email: cleanEmail }, session: null, profile: prof, role: prof.role || 'customer', loading: false, error: null })
            return { success: true, message: 'Login berhasil!' }
          }
          throw new Error('Email atau password salah')
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: { message: error.message } }
        }
      },

      // ============================================
      // LOGIN DENGAN NOMOR TELEPON
      // ============================================
      signInWithPhone: async (phone) => {
        set({ loading: true, error: null })
        try {
          const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
          console.log('📱 Login:', cleanPhone)

          // Cari user
          const { data: existing } = await supabase
            .from('profiles').select('*').eq('phone', cleanPhone).maybeSingle()

          if (existing) {
            console.log('✅ Existing user found:', existing.full_name)
            set({ user: { id: existing.id, phone: cleanPhone }, session: null, profile: existing, role: existing.role || 'customer', loading: false, error: null })
            return { success: true, message: `Selamat datang, ${existing.full_name}!` }
          }

          // Buat user baru - generate ID manual
          const newId = crypto.randomUUID()
          console.log('📝 Creating new user:', newId)

          const { data: newUser, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: newId,
              full_name: 'Customer ' + cleanPhone.slice(-4),
              phone: cleanPhone,
              email: cleanPhone + '@phone.user',
              role: 'customer',
              membership_level: 'member_baru',
              is_active: true,
              total_orders: 0,
              total_spent: 0
            })
            .select()
            .single()

          if (insertError) {
            console.error('Insert error:', insertError)
            
            // Fallback: coba tanpa select single
            const { error: insertError2 } = await supabase
              .from('profiles')
              .insert({
                id: newId,
                full_name: 'Customer ' + cleanPhone.slice(-4),
                phone: cleanPhone,
                email: cleanPhone + '@phone.user',
                role: 'customer',
                membership_level: 'member_baru',
                is_active: true
              })

            if (insertError2) {
              console.error('Insert error 2:', insertError2)
              throw new Error('Gagal membuat akun: ' + insertError2.message)
            }

            // Ambil user yang baru dibuat
            const { data: created } = await supabase
              .from('profiles').select('*').eq('id', newId).maybeSingle()

            if (created) {
              set({ user: { id: created.id, phone: cleanPhone }, session: null, profile: created, role: 'customer', loading: false, error: null })
              return { success: true, message: 'Akun baru dibuat! Selamat datang!' }
            }
            
            throw new Error('Gagal membuat akun')
          }

          if (newUser) {
            set({ user: { id: newUser.id, phone: cleanPhone }, session: null, profile: newUser, role: 'customer', loading: false, error: null })
            return { success: true, message: 'Akun baru dibuat! Selamat datang!' }
          }

          throw new Error('Gagal membuat akun')
        } catch (error) {
          console.error('Phone login error:', error)
          set({ loading: false, error: error.message })
          return { success: false, error: { message: error.message } }
        }
      },

      signOut: async () => {
        try { await supabase.auth.signOut() } catch (e) {}
        set({ user: null, profile: null, role: null, session: null, error: null })
        localStorage.removeItem('auth-storage')
      },

      updateProfile: async (updates) => {
        const u = get().user
        if (!u) return { success: false, error: { message: 'Tidak ada user login' } }
        try {
          const { data, error } = await supabase
            .from('profiles').update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', u.id).select().maybeSingle()
          if (error) throw error
          if (data) set({ profile: data })
          return { success: true, data }
        } catch (error) {
          return { success: false, error: { message: error.message } }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, session: state.session, profile: state.profile, role: state.role })
    }
  )
)

export default useAuthStore