import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

// Client biasa (dengan RLS)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  }
)

// Client ADMIN (BYPASS RLS) - untuk upload file
let supabaseAdmin = null
export const getSupabaseAdmin = () => {
  if (!supabaseServiceKey) {
    console.warn('⚠️ VITE_SUPABASE_SERVICE_KEY tidak ada di .env')
    return supabase // fallback ke anon key
  }
  
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return supabaseAdmin
}

// ============================================
// STORAGE HELPERS
// ============================================
export const STORAGE_BUCKETS = {
  WEBSITE_ASSETS: 'website-assets',
  MENU_IMAGES: 'menu-images',
  QR_CODES: 'qr-codes',
  PAYMENT_PROOFS: 'payment-proofs'
}

export const STORAGE_FOLDERS = {
  LOGO: 'logo',
  FAVICON: 'favicon',
  HERO: 'hero',
  BANNERS: 'banners',
  PROMOTIONS: 'promotions',
  GALLERY: 'gallery',
  TESTIMONIALS: 'testimonials',
  QRIS: 'qris',
  CATEGORIES: 'categories',
  SEO: 'seo',
  AVATARS: 'avatars',
  FOODS: 'foods',
  DRINKS: 'drinks',
  PACKAGES: 'packages'
}

// ============================================
// UPLOAD FILE DENGAN SERVICE KEY (BYPASS RLS)
// ============================================
export async function uploadFile(bucket, folder, file) {
  const adminClient = getSupabaseAdmin()
  
  try {
    if (!file) throw new Error('File tidak ditemukan')

    // Validasi tipe file
    const allowedTypes = [
      'image/png', 'image/jpeg', 'image/jpg', 
      'image/gif', 'image/webp', 'image/svg+xml'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Format file tidak didukung: ${file.type}. Gunakan PNG, JPG, GIF, WEBP, atau SVG`)
    }

    // Validasi ukuran (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Ukuran file maksimal 10MB')
    }

    // Generate nama file unik
    const fileExt = file.name.split('.').pop().toLowerCase()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    console.log('📤 Uploading file:', { 
      bucket, 
      filePath, 
      type: file.type, 
      size: `${(file.size / 1024).toFixed(1)}KB`,
      usingServiceKey: !!supabaseServiceKey
    })

    // Upload menggunakan ADMIN client (bypass RLS)
    const { data, error } = await adminClient.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })

    if (error) {
      console.error('❌ Upload error:', error)
      
      // Coba upload ulang tanpa contentType
      const { data: retryData, error: retryError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (retryError) {
        console.error('❌ Retry error:', retryError)
        throw new Error(`Gagal upload: ${retryError.message}`)
      }
      
      console.log('✅ Upload berhasil (retry):', retryData)
    } else {
      console.log('✅ Upload berhasil:', data)
    }

    // Dapatkan public URL menggunakan client biasa
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    const publicUrl = urlData?.publicUrl

    if (!publicUrl) {
      throw new Error('Gagal mendapatkan public URL')
    }

    console.log('📎 Public URL:', publicUrl)

    return {
      success: true,
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('❌ Upload file error:', error)
    return {
      success: false,
      error: error.message || 'Gagal upload file'
    }
  }
}

// ============================================
// DELETE FILE DENGAN SERVICE KEY
// ============================================
export async function deleteFile(bucket, filePath) {
  const adminClient = getSupabaseAdmin()
  
  try {
    const { error } = await adminClient.storage
      .from(bucket)
      .remove([filePath])

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Delete file error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================
// GET PUBLIC URL
// ============================================
export function getPublicUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)
  
  return data?.publicUrl || null
}