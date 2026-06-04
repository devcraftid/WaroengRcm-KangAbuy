// ============================================
// scripts/create-buckets.js
// Membuat semua bucket storage untuk Waroeng RCM
// Cara pakai: node scripts/create-buckets.js
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// ============================================
// LOAD ENVIRONMENT VARIABLES
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
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        envData[key] = value
      }
    }
  }
  return envData
}

const env = loadEnv()

// ============================================
// VALIDASI CREDENTIALS
// ============================================
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceKey = env.VITE_SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  console.log('')
  console.log('❌ ERROR: VITE_SUPABASE_URL tidak ditemukan di .env')
  console.log('')
  console.log('💡 Tambahkan di file .env:')
  console.log('   VITE_SUPABASE_URL=https://xxxxx.supabase.co')
  console.log('')
  process.exit(1)
}

if (!serviceKey) {
  console.log('')
  console.log('❌ ERROR: VITE_SUPABASE_SERVICE_KEY tidak ditemukan di .env')
  console.log('')
  console.log('💡 Cara mendapatkan Service Role Key:')
  console.log('   1. Buka https://app.supabase.com')
  console.log('   2. Pilih project Anda')
  console.log('   3. Settings → API')
  console.log('   4. Copy "service_role" key')
  console.log('   5. Tambahkan di .env: VITE_SUPABASE_SERVICE_KEY=eyJhbGciOi...')
  console.log('')
  process.exit(1)
}

console.log('')
console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║                                                        ║')
console.log('║     🍜  WAROENG RCM - Storage Bucket Creator  🍜       ║')
console.log('║                                                        ║')
console.log('╚══════════════════════════════════════════════════════════╝')
console.log('')
console.log('📡 Supabase URL :', supabaseUrl.substring(0, 45) + '...')
console.log('🔑 Service Key  :', serviceKey.substring(0, 20) + '...')
console.log('')

// ============================================
// INIT SUPABASE CLIENT (dengan Service Role Key)
// ============================================
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ============================================
// KONFIGURASI BUCKET
// ============================================
const BUCKETS_CONFIG = [
  {
    name: 'website-assets',
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
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
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    folders: [
      'foods',
      'drinks',
      'packages'
    ]
  },
  {
    name: 'qr-codes',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png'],
    folders: []
  },
  {
    name: 'payment-proofs',
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    folders: []
  }
]

// ============================================
// FUNCTIONS
// ============================================

async function checkIfBucketExists(bucketName) {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName)
    if (data) return true
    return false
  } catch {
    return false
  }
}

async function createBucket(bucketConfig) {
  const { name, public: isPublic, fileSizeLimit, allowedMimeTypes } = bucketConfig
  
  // Check if exists
  const exists = await checkIfBucketExists(name)
  
  if (exists) {
    console.log(`   ⚠️  Bucket "${name}" sudah ada, update konfigurasi...`)
    
    // Update bucket
    const { error: updateError } = await supabase.storage.updateBucket(name, {
      public: isPublic,
      fileSizeLimit,
      allowedMimeTypes
    })
    
    if (updateError) {
      console.log(`   ⚠️  Tidak bisa update bucket: ${updateError.message}`)
    } else {
      console.log(`   ✅ Bucket "${name}" diupdate (public: ${isPublic})`)
    }
    return true
  }
  
  // Create new bucket
  console.log(`   🔨 Membuat bucket "${name}"...`)
  
  try {
    const { data, error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit,
      allowedMimeTypes
    })
    
    if (error) {
      console.log(`   ❌ Gagal: ${error.message}`)
      return false
    }
    
    console.log(`   ✅ Bucket "${name}" berhasil dibuat!`)
    return true
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function createFolders(bucketName, folders) {
  if (!folders || folders.length === 0) return
  
  console.log(`   📂 Membuat ${folders.length} folder...`)
  
  for (const folder of folders) {
    try {
      // Upload file .gitkeep untuk membuat folder
      const placeholderContent = new Blob([''], { type: 'text/plain' })
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(`${folder}/.gitkeep`, placeholderContent, {
          contentType: 'text/plain',
          upsert: true
        })
      
      if (error) {
        if (error.message === 'The resource already exists') {
          console.log(`      ✅ ${folder}/ (sudah ada)`)
        } else {
          console.log(`      ⚠️  ${folder}/ : ${error.message}`)
        }
      } else {
        console.log(`      ✅ ${folder}/`)
      }
    } catch (error) {
      console.log(`      ⚠️  ${folder}/ : ${error.message}`)
    }
  }
}

async function setupPolicies(bucketName) {
  console.log(`   🔓 Setup policies...`)
  
  const policies = [
    {
      name: `${bucketName}_select`,
      definition: {
        name: `${bucketName}_select`,
        allowedOperations: ['SELECT'],
        roles: [],
        using: 'true'
      }
    },
    {
      name: `${bucketName}_insert`,
      definition: {
        name: `${bucketName}_insert`,
        allowedOperations: ['INSERT'],
        roles: ['authenticated'],
        check: 'true'
      }
    },
    {
      name: `${bucketName}_update`,
      definition: {
        name: `${bucketName}_update`,
        allowedOperations: ['UPDATE'],
        roles: ['authenticated'],
        using: 'true'
      }
    },
    {
      name: `${bucketName}_delete`,
      definition: {
        name: `${bucketName}_delete`,
        allowedOperations: ['DELETE'],
        roles: ['authenticated'],
        using: 'true'
      }
    }
  ]
  
  for (const policy of policies) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createPolicy(policy.name, policy.definition)
      
      if (error) {
        if (error.message?.includes('already exists')) {
          console.log(`      ⚠️  Policy "${policy.name}" sudah ada`)
        } else {
          console.log(`      ⚠️  Policy "${policy.name}": ${error.message}`)
        }
      } else {
        console.log(`      ✅ Policy "${policy.name}" dibuat`)
      }
    } catch (error) {
      console.log(`      ⚠️  Policy "${policy.name}": ${error.message}`)
    }
  }
}

// ============================================
// UPLOAD DEFAULT LOGO (opsional)
// ============================================
async function uploadDefaultLogo() {
  const logoPath = join(rootDir, 'public', 'logo.png')
  
  if (!existsSync(logoPath)) {
    console.log('   ℹ️  Tidak ada logo default di public/logo.png')
    console.log('   💡 Letakkan logo Anda di public/logo.png untuk upload otomatis')
    return
  }
  
  console.log('   🖼️  Upload logo default...')
  
  try {
    const fileContent = readFileSync(logoPath)
    const fileName = 'logo-default.png'
    
    const { data, error } = await supabase.storage
      .from('website-assets')
      .upload(`logo/${fileName}`, fileContent, {
        contentType: 'image/png',
        upsert: true
      })
    
    if (error) {
      console.log(`   ⚠️  Gagal upload logo: ${error.message}`)
      return
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('website-assets')
      .getPublicUrl(`logo/${fileName}`)
    
    console.log(`   ✅ Logo default diupload!`)
    console.log(`   📎 URL: ${publicUrl}`)
    
    // Update website_settings
    const { error: updateError } = await supabase
      .from('website_settings')
      .update({ 
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (updateError) {
      console.log(`   ⚠️  Gagal update logo_url di database: ${updateError.message}`)
    } else {
      console.log(`   ✅ Logo URL tersimpan di database!`)
    }
  } catch (error) {
    console.log(`   ⚠️  Error upload logo: ${error.message}`)
  }
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
  console.log('🚀 Mulai membuat buckets...')
  console.log('')
  
  let successCount = 0
  let failCount = 0
  
  // 1. Create all buckets
  for (const bucketConfig of BUCKETS_CONFIG) {
    console.log(`📦 Bucket: ${bucketConfig.name}`)
    console.log(`   Public: ${bucketConfig.public}`)
    console.log(`   Size Limit: ${(bucketConfig.fileSizeLimit / 1048576).toFixed(0)}MB`)
    console.log('')
    
    const success = await createBucket(bucketConfig)
    
    if (success) {
      successCount++
      
      // Create folders
      if (bucketConfig.folders.length > 0) {
        await createFolders(bucketConfig.name, bucketConfig.folders)
      }
      
      // Setup policies
      await setupPolicies(bucketConfig.name)
    } else {
      failCount++
    }
    
    console.log('')
  }
  
  // 2. Upload default logo jika ada
  console.log('🖼️  Upload Default Assets...')
  console.log('')
  await uploadDefaultLogo()
  console.log('')
  
  // 3. Summary
  console.log('══════════════════════════════════════════════════════════')
  console.log('')
  console.log('📊 HASIL:')
  console.log(`   ✅ Berhasil: ${successCount} bucket`)
  console.log(`   ❌ Gagal: ${failCount} bucket`)
  console.log('')
  console.log('📋 LANGKAH SELANJUTNYA:')
  console.log('   1. Restart aplikasi: npm run dev')
  console.log('   2. Login sebagai admin')
  console.log('   3. Buka Admin → Pengaturan Website')
  console.log('   4. Upload logo, favicon, QRIS, dan gambar lainnya')
  console.log('')
  console.log('   Default Login:')
  console.log('   Email : admin@waroengrcm.com')
  console.log('   Pass  : admin123')
  console.log('')
  console.log('══════════════════════════════════════════════════════════')
  console.log('')
}

// ============================================
// RUN
// ============================================
main()
  .then(() => {
    console.log('✅ Selesai!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('❌ FATAL ERROR:', error.message)
    console.error('')
    process.exit(1)
  })