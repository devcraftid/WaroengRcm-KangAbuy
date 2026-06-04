// scripts/setup-storage.js
// Cara pakai: node scripts/setup-storage.js
// Pastikan .env sudah ada dengan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// ============================================
// LOAD ENV
// ============================================
function loadEnv() {
  const envPath = join(rootDir, '.env')
  const envData = {}
  
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#') || trimmed === '') continue
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim()
        let value = trimmed.substring(equalIndex + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1)
        }
        envData[key] = value
      }
    }
  }
  return envData
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !anonKey) {
  console.error('❌ VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY harus ada di .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey)

// ============================================
// KONFIGURASI BUCKET
// ============================================
const BUCKETS = [
  {
    name: 'website-assets',
    public: true,
    folders: [
      'logo',
      'favicon',
      'hero',
      'banners',
      'promotions',
      'gallery',
      'testimonials',
      'qris',
      'categories',
      'seo',
      'avatars'
    ]
  },
  {
    name: 'menu-images',
    public: true,
    folders: [
      'foods',
      'drinks',
      'packages'
    ]
  },
  {
    name: 'qr-codes',
    public: true,
    folders: []
  },
  {
    name: 'payment-proofs',
    public: false,
    folders: []
  }
]

// ============================================
// FUNCTIONS
// ============================================

async function createBucket(bucketName, isPublic) {
  try {
    // Cek apakah bucket sudah ada
    const { data: existingBucket } = await supabase.storage.getBucket(bucketName)
    
    if (existingBucket) {
      console.log(`   ⚠️  Bucket "${bucketName}" sudah ada, update ke public: ${isPublic}`)
      
      // Update bucket ke public
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: 52428800 // 50MB
      })
      
      if (updateError) {
        console.log(`   ⚠️  Tidak bisa update bucket: ${updateError.message}`)
      } else {
        console.log(`   ✅ Bucket "${bucketName}" diupdate (public: ${isPublic})`)
      }
      return true
    }
  } catch (error) {
    // Bucket tidak ditemukan, lanjutkan untuk membuat
  }

  try {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
    })

    if (error) {
      console.error(`   ❌ Gagal membuat bucket "${bucketName}": ${error.message}`)
      return false
    }

    console.log(`   ✅ Bucket "${bucketName}" berhasil dibuat (public: ${isPublic})`)
    return true
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function createFolder(bucketName, folderName) {
  try {
    // Upload file placeholder untuk membuat folder
    const placeholderContent = ' '
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(`${folderName}/.gitkeep`, placeholderContent, {
        contentType: 'text/plain',
        upsert: true
      })

    if (error) {
      console.log(`      ⚠️  ${folderName}: ${error.message}`)
    } else {
      console.log(`      ✅ ${folderName}`)
    }
  } catch (error) {
    console.log(`      ⚠️  ${folderName}: ${error.message}`)
  }
}

// ============================================
// MAIN
// ============================================
async function setup() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║     🍜  WAROENG RCM - Storage Bucket Setup  🍜      ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`📡 Supabase URL: ${supabaseUrl.substring(0, 50)}...`)
  console.log('')

  // 1. Login dulu (pakai anon key)
  console.log('🔑 Sign in dengan anonymous...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@waroengrcm.com',
    password: 'admin123'
  }).catch(() => ({ data: null, error: null }))

  if (signInError) {
    console.log('⚠️  Tidak bisa login, melanjutkan tanpa login...')
    console.log('   (Beberapa operasi mungkin dibatasi)')
  } else if (signInData?.user) {
    console.log(`✅ Login sebagai: ${signInData.user.email}`)
  }
  console.log('')

  // 2. Create buckets
  console.log('📦 Membuat buckets...')
  console.log('')

  for (const bucket of BUCKETS) {
    console.log(` 📁 ${bucket.name} (public: ${bucket.public})`)
    const success = await createBucket(bucket.name, bucket.public)

    if (success && bucket.folders.length > 0) {
      console.log('   📂 Membuat folder:')
      for (const folder of bucket.folders) {
        await createFolder(bucket.name, folder)
      }
    }
    console.log('')
  }

  // 3. Setup policies
  console.log('🔓 Setup Storage Policies...')
  console.log('')
  console.log('   ⚠️  Untuk mengaktifkan upload, lakukan ini di Supabase Dashboard:')
  console.log('')
  console.log('   1. Buka Supabase Dashboard → Storage')
  console.log('   2. Klik bucket "website-assets"')
  console.log('   3. Klik tab "Policies"')
  console.log('   4. Klik "New Policy" → "For full customization"')
  console.log('   5. Buat 4 policy:')
  console.log('')
  console.log('      Policy 1 (SELECT):')
  console.log('        - Name: Public Read')
  console.log('        - Operation: SELECT')
  console.log('        - USING: true')
  console.log('')
  console.log('      Policy 2 (INSERT):')
  console.log('        - Name: Auth Upload')
  console.log('        - Operation: INSERT')
  console.log('        - Target roles: authenticated')
  console.log('        - WITH CHECK: true')
  console.log('')
  console.log('      Policy 3 (UPDATE):')
  console.log('        - Name: Auth Update')
  console.log('        - Operation: UPDATE')
  console.log('        - Target roles: authenticated')
  console.log('        - USING: true')
  console.log('')
  console.log('      Policy 4 (DELETE):')
  console.log('        - Name: Auth Delete')
  console.log('        - Operation: DELETE')
  console.log('        - Target roles: authenticated')
  console.log('        - USING: true')
  console.log('')
  console.log('   6. Ulangi untuk bucket: menu-images, qr-codes, payment-proofs')
  console.log('')
  console.log('══════════════════════════════════════════════════════')
  console.log('')
  console.log('✅ Setup selesai!')
  console.log('')
  console.log('📋 Langkah selanjutnya:')
  console.log('   1. Setup policies di Supabase Dashboard (lihat di atas)')
  console.log('   2. Restart aplikasi: npm run dev')
  console.log('   3. Login sebagai admin')
  console.log('   4. Buka Admin → Pengaturan Website')
  console.log('   5. Upload logo, favicon, QRIS, dll')
  console.log('')
}

setup().catch(console.error)