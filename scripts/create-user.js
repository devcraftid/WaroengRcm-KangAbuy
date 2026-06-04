// ============================================
// WAROENG RCM KANG ABUY - User Creation Script
// ============================================
// Cara pakai: node scripts/create-user.js
// ============================================

import { createClient } from '@supabase/supabase-js'
import readline from 'readline'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

// Get directory paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load .env file manually (without dotenv)
function loadEnv() {
  const envPath = join(rootDir, '.env')
  const envData = {}
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') continue
      
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim()
        let value = trimmed.substring(equalIndex + 1).trim()
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1)
        }
        
        // Set to process.env AND our local object
        process.env[key] = value
        envData[key] = value
      }
    }
    
    console.log('✅ .env file loaded successfully')
    return envData
  } else {
    console.log('⚠️  .env file not found, using environment variables')
    return {}
  }
}

// Load environment variables
const envData = loadEnv()

// Get Supabase credentials
const supabaseUrl = envData.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = envData.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = envData.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Helper function to ask questions
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer)
    })
  })
}

// Helper function to print colored text
function print(color, text) {
  console.log(`${color}${text}${colors.reset}`)
}

// Banner
function showBanner() {
  console.clear()
  console.log('')
  print(colors.bright + colors.cyan, '╔══════════════════════════════════════════════════════════╗')
  print(colors.bright + colors.cyan, '║                                                          ║')
  print(colors.bright + colors.cyan, '║     🍜  WAROENG RCM KANG ABUY - User Creation Tool  🍜  ║')
  print(colors.bright + colors.cyan, '║                                                          ║')
  print(colors.bright + colors.cyan, '╚══════════════════════════════════════════════════════════╝')
  console.log('')
  print(colors.dim, '     Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer')
  console.log('')
}

// Validate Supabase credentials
function validateCredentials() {
  let valid = true
  
  if (!supabaseUrl) {
    print(colors.red, '❌ ERROR: VITE_SUPABASE_URL tidak ditemukan')
    print(colors.yellow, '   Pastikan file .env ada dan berisi VITE_SUPABASE_URL')
    valid = false
  }
  
  if (!supabaseAnonKey && !supabaseServiceKey) {
    print(colors.red, '❌ ERROR: Supabase key tidak ditemukan')
    print(colors.yellow, '   Pastikan file .env berisi VITE_SUPABASE_ANON_KEY')
    valid = false
  }
  
  if (valid) {
    print(colors.green, '✅ Credentials valid')
    print(colors.dim, `   URL: ${supabaseUrl?.substring(0, 45)}...`)
  }
  
  return valid
}

// Initialize Supabase client
function initSupabase() {
  // Use service key if available, otherwise anon key
  const key = supabaseServiceKey || supabaseAnonKey
  
  if (!key) {
    throw new Error('No valid API key found')
  }
  
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Show success message
function showSuccess(userData) {
  console.log('')
  print(colors.bgGreen + colors.white, ' ✅ USER BERHASIL DIBUAT! ')
  console.log('')
  print(colors.bright, '📋 Detail User:')
  console.log('')
  print(colors.cyan, `   Nama      : ${userData.full_name}`)
  print(colors.cyan, `   Email     : ${userData.email}`)
  print(colors.cyan, `   Role      : ${userData.role === 'admin' ? '👑 Admin' : userData.role === 'cashier' ? '💰 Kasir' : '👤 Customer'}`)
  if (userData.phone) {
    print(colors.cyan, `   Phone     : ${userData.phone}`)
  }
  if (userData.password) {
    print(colors.yellow, `   Password  : ${userData.password}`)
  }
  console.log('')
  print(colors.green, '   ✅ User dapat login sekarang!')
  console.log('')
  print(colors.dim, `   Login di: http://localhost:3000/login`)
  console.log('')
}

// Create user function
async function createUser(supabase, userData) {
  try {
    // 1. Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    })

    if (authError) {
      // If admin API not available, try signUp
      if (authError.message?.includes('not authorized') || authError.status === 403) {
        throw new Error(
          'Service Role Key diperlukan!\n' +
          'Tambahkan VITE_SUPABASE_SERVICE_KEY di file .env\n' +
          'Dapatkan dari: Supabase Dashboard > Settings > API > service_role'
        )
      }
      throw new Error(`Auth Error: ${authError.message}`)
    }

    if (!authData?.user) {
      throw new Error('Gagal membuat auth user - tidak ada response')
    }

    const userId = authData.user.id

    // 2. Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone || null,
        role: userData.role,
        membership_level: userData.role === 'customer' ? 'member_baru' : null,
        is_active: true
      })

    if (profileError) {
      console.log(colors.yellow, '⚠️  Auth user created but profile failed, trying to clean up...')
      // Try to delete auth user
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (e) {
        // ignore
      }
      throw new Error(`Profile Error: ${profileError.message}`)
    }

    return {
      id: userId,
      full_name: userData.full_name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      password: userData.password
    }
  } catch (error) {
    throw error
  }
}

// Collect user data
async function collectUserData(role) {
  const roleLabel = role === 'admin' ? '👑 Admin (Owner)' : role === 'cashier' ? '💰 Kasir' : '👤 Customer'
  
  console.log('')
  print(colors.bright + colors.blue, `📝 Membuat User Baru - ${roleLabel}`)
  console.log('')
  print(colors.dim, 'Silakan isi data berikut (tekan Enter untuk default):')
  console.log('')

  // Full Name
  let fullName = ''
  while (!fullName || fullName.length < 3) {
    const defaultName = role === 'admin' ? 'Admin Waroeng' : role === 'cashier' ? 'Kasir 01' : 'Customer'
    fullName = await question(colors.white + `   Nama Lengkap [${defaultName}]    : ` + colors.reset)
    if (!fullName) fullName = defaultName
    if (fullName.length < 3) {
      print(colors.red, '   ⚠️  Nama minimal 3 karakter')
    }
  }

  // Email
  let email = ''
  while (!email || !isValidEmail(email)) {
    const defaultEmail = role === 'admin' ? 'admin@waroengrcm.com' : 
                         role === 'cashier' ? 'kasir@waroengrcm.com' : 
                         'customer@example.com'
    email = await question(colors.white + `   Email [${defaultEmail}]          : ` + colors.reset)
    if (!email) email = defaultEmail
    if (!isValidEmail(email)) {
      print(colors.red, '   ⚠️  Format email tidak valid (contoh: user@email.com)')
    }
  }

  // Phone (optional)
  let phone = await question(colors.white + '   No. Telepon (opsional)          : ' + colors.reset)
  if (phone && phone.trim() === '') phone = null

  // Password
  let password = ''
  while (!password || password.length < 6) {
    const defaultPass = role === 'admin' ? 'admin123' : 'password123'
    password = await question(colors.white + `   Password [${defaultPass}]        : ` + colors.reset)
    if (!password) password = defaultPass
    if (password.length < 6) {
      print(colors.red, '   ⚠️  Password minimal 6 karakter')
    }
  }

  // Confirm Password
  let confirmPassword = ''
  while (confirmPassword !== password) {
    confirmPassword = await question(colors.white + '   Konfirmasi Password             : ' + colors.reset)
    if (confirmPassword !== password) {
      print(colors.red, '   ⚠️  Password tidak cocok, coba lagi')
    }
  }

  return {
    full_name: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : null,
    password: password,
    role: role
  }
}

// Main menu
async function mainMenu(supabase) {
  while (true) {
    showBanner()
    
    print(colors.bright, '📋 PILIH TIPE USER:')
    console.log('')
    print(colors.white, '   [1]  👑 Admin (Owner) - Akses penuh ke semua fitur')
    print(colors.white, '   [2]  💰 Kasir - Akses operasional dan POS')
    print(colors.white, '   [3]  👤 Customer - Pelanggan biasa')
    print(colors.white, '   [4]  📋 Lihat Semua User')
    print(colors.white, '   [5]  🗑️  Hapus User')
    print(colors.white, '   [0]  ❌ Keluar')
    console.log('')
    
    const choice = await question(colors.yellow + '   Pilih [0-5]: ' + colors.reset)
    
    switch (choice) {
      case '1':
      case '2':
      case '3': {
        const role = choice === '1' ? 'admin' : choice === '2' ? 'cashier' : 'customer'
        try {
          const userData = await collectUserData(role)
          
          console.log('')
          print(colors.yellow, '   ⏳ Menyimpan ke database...')
          const result = await createUser(supabase, userData)
          
          showSuccess(result)
        } catch (error) {
          console.log('')
          print(colors.red, `   ❌ Gagal membuat user:`)
          print(colors.red, `   ${error.message}`)
          console.log('')
          print(colors.yellow, '   💡 Tips:')
          print(colors.dim, '   - Pastikan VITE_SUPABASE_SERVICE_KEY ada di .env')
          print(colors.dim, '   - Dapatkan dari Supabase Dashboard > Settings > API')
          print(colors.dim, '   - Service key berbeda dengan anon key')
        }
        await question(colors.dim + '\n   Tekan Enter untuk lanjut...' + colors.reset)
        break
      }
      
      case '4': {
        await showAllUsers(supabase)
        await question(colors.dim + '\n   Tekan Enter untuk lanjut...' + colors.reset)
        break
      }
      
      case '5': {
        await deleteUserMenu(supabase)
        await question(colors.dim + '\n   Tekan Enter untuk lanjut...' + colors.reset)
        break
      }
      
      case '0': {
        console.log('')
        print(colors.green, '   👋 Sampai jumpa!')
        console.log('')
        rl.close()
        return
      }
      
      default: {
        print(colors.red, '   ⚠️  Pilihan tidak valid!')
        await question(colors.dim + '\n   Tekan Enter untuk lanjut...' + colors.reset)
      }
    }
  }
}

// Show all users
async function showAllUsers(supabase) {
  console.log('')
  print(colors.blue, '📋 DAFTAR SEMUA USER:')
  console.log('')
  
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    if (!users || users.length === 0) {
      print(colors.yellow, '   Belum ada user terdaftar')
      return
    }
    
    // Print table
    console.log('   ┌──────┬──────────────────────┬──────────────────────────────┬───────────┬──────────┐')
    console.log('   │ No   │ Nama                 │ Email                        │ Role      │ Status   │')
    console.log('   ├──────┼──────────────────────┼──────────────────────────────┼───────────┼──────────┤')
    
    users.forEach((user, index) => {
      const no = String(index + 1).padStart(4)
      const name = (user.full_name || 'N/A').padEnd(20).substring(0, 20)
      const email = (user.email || 'N/A').padEnd(28).substring(0, 28)
      const role = user.role === 'admin' ? '👑 Admin ' : 
                   user.role === 'cashier' ? '💰 Kasir ' : 
                   '👤 Customer'
      const status = user.is_active ? '🟢 Aktif' : '🔴 Nonaktif'
      
      console.log(`   │ ${no} │ ${name} │ ${email} │ ${role}│ ${status} │`)
    })
    
    console.log('   └──────┴──────────────────────┴──────────────────────────────┴───────────┴──────────┘')
    console.log('')
    print(colors.green, `   Total: ${users.length} user`)
    
  } catch (error) {
    print(colors.red, `   ❌ Error: ${error.message}`)
  }
}

// Delete user menu
async function deleteUserMenu(supabase) {
  console.log('')
  print(colors.red, '🗑️  HAPUS USER:')
  console.log('')
  
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    if (!users || users.length === 0) {
      print(colors.yellow, '   Tidak ada user untuk dihapus')
      return
    }
    
    console.log('')
    print(colors.dim, '   Daftar User:')
    users.forEach((user, index) => {
      const roleIcon = user.role === 'admin' ? '👑' : user.role === 'cashier' ? '💰' : '👤'
      print(colors.white, `   [${index + 1}] ${roleIcon} ${user.full_name} (${user.email})`)
    })
    print(colors.white, '   [0] Batal')
    
    console.log('')
    const choice = await question(colors.red + '   Pilih user yang akan dihapus: ' + colors.reset)
    const index = parseInt(choice) - 1
    
    if (choice === '0' || isNaN(index) || index < 0 || index >= users.length) {
      print(colors.yellow, '   Dibatalkan')
      return
    }
    
    const selectedUser = users[index]
    
    console.log('')
    print(colors.yellow, '   ⚠️  Anda akan menghapus:')
    print(colors.white, `   Nama  : ${selectedUser.full_name}`)
    print(colors.white, `   Email : ${selectedUser.email}`)
    print(colors.white, `   Role  : ${selectedUser.role}`)
    console.log('')
    
    const confirm = await question(colors.red + '   Ketik "HAPUS" untuk konfirmasi: ' + colors.reset)
    
    if (confirm !== 'HAPUS') {
      print(colors.yellow, '   Dibatalkan')
      return
    }
    
    // Delete from auth
    try {
      await supabase.auth.admin.deleteUser(selectedUser.id)
    } catch (authError) {
      print(colors.yellow, `   ⚠️  Auth user delete warning: ${authError.message}`)
    }
    
    // Delete from profiles
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', selectedUser.id)
    
    if (deleteError) throw deleteError
    
    print(colors.green, `   ✅ User ${selectedUser.full_name} berhasil dihapus!`)
    
  } catch (error) {
    print(colors.red, `   ❌ Error: ${error.message}`)
    print(colors.yellow, '   Tips: Pastikan menggunakan Service Role Key')
  }
}

// Main function
async function main() {
  showBanner()
  
  if (!validateCredentials()) {
    console.log('')
    print(colors.yellow, '💡 Cara setting .env:')
    print(colors.white, '   1. Buka file .env di root folder')
    print(colors.white, '   2. Tambahkan baris berikut:')
    print(colors.dim, '      VITE_SUPABASE_URL=https://xxxxx.supabase.co')
    print(colors.dim, '      VITE_SUPABASE_ANON_KEY=eyJhbGciOi...')
    print(colors.dim, '      VITE_SUPABASE_SERVICE_KEY=eyJhbGciOi...  (untuk hapus user)')
    console.log('')
    rl.close()
    return
  }
  
  console.log('')
  
  // Initialize Supabase
  let supabase
  try {
    supabase = initSupabase()
    print(colors.green, '✅ Supabase client initialized')
  } catch (error) {
    print(colors.red, `❌ Failed to initialize Supabase: ${error.message}`)
    rl.close()
    return
  }
  
  console.log('')
  
  // Start main menu
  await mainMenu(supabase)
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('')
  print(colors.yellow, '\n👋 Dibatalkan oleh user')
  console.log('')
  rl.close()
  process.exit(0)
})

// Run
main().catch(error => {
  print(colors.red, `\n❌ Fatal Error: ${error.message}`)
  console.log('')
  rl.close()
  process.exit(1)
})