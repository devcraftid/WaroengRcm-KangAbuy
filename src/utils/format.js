/**
 * Format currency to IDR
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'Rp 0'
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date) {
  if (!date) return '-'
  
  try {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

/**
 * Format datetime to Indonesian locale
 */
export function formatDateTime(date) {
  if (!date) return '-'
  
  try {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

/**
 * Format time only
 */
export function formatTime(date) {
  if (!date) return '-'
  
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

/**
 * Format number with thousand separator
 */
export function formatNumber(number) {
  if (number === null || number === undefined) return '0'
  return new Intl.NumberFormat('id-ID').format(number)
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, length = 50) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Generate unique order number
 */
export function generateOrderNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `ORD${year}${month}${day}${hours}${minutes}${random}`
}

/**
 * Get status color for badges
 */
export function getStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-orange-100 text-orange-800 border-orange-200',
    ready: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    delivered: 'bg-teal-100 text-teal-800 border-teal-200'
  }
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Get order type label
 */
export function getOrderTypeLabel(type) {
  const labels = {
    dine_in: '🍽️ Dine In',
    takeaway_waiting: '🛍️ Takeaway (Waiting)',
    takeaway_pickup: '📦 Takeaway (Pickup)'
  }
  return labels[type] || type
}

/**
 * Get membership level color
 */
export function getMembershipLevelColor(level) {
  const colors = {
    member_baru: 'bg-gray-100 text-gray-700 border-gray-200',
    member_setia: 'bg-blue-100 text-blue-700 border-blue-200',
    vip: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }
  return colors[level] || 'bg-gray-100 text-gray-700 border-gray-200'
}

/**
 * Get table status color
 */
export function getTableStatusColor(status) {
  const colors = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    waiting_payment: 'bg-yellow-100 text-yellow-800',
    waiting_takeaway: 'bg-orange-100 text-orange-800',
    cleaning: 'bg-blue-100 text-blue-800',
    reserved: 'bg-purple-100 text-purple-800',
    disabled: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get payment status label
 */
export function getPaymentStatusLabel(status) {
  const labels = {
    pending: 'Menunggu',
    completed: 'Lunas',
    failed: 'Gagal',
    refunded: 'Refund'
  }
  return labels[status] || status
}

/**
 * Calculate discount
 */
export function calculateDiscount(price, discountType, discountValue, maxDiscount = null) {
  if (!discountValue) return 0
  
  let discount = 0
  
  if (discountType === 'percentage') {
    discount = (price * discountValue) / 100
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount
    }
  } else if (discountType === 'fixed') {
    discount = discountValue
  }
  
  return Math.min(discount, price)
}

/**
 * Slugify text
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Validate phone number (Indonesian format)
 */
export function isValidPhone(phone) {
  const regex = /^(\+62|62|0)8[1-9][0-9]{6,10}$/
  return regex.test(phone.replace(/[\s-]/g, ''))
}

/**
 * Format phone number to WhatsApp format
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/[\s-]/g, '')
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.slice(1)
  }
  if (cleaned.startsWith('+62')) {
    return cleaned.slice(1)
  }
  return cleaned
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {})
}

/**
 * Sort array by key
 */
export function sortBy(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Get date range for period
 */
export function getDateRange(period) {
  const now = new Date()
  let start, end

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      start = new Date(now.setDate(now.getDate() - now.getDay()))
      start.setHours(0, 0, 0, 0)
      end = new Date()
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date()
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date()
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date()
  }

  return { start, end }
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file extension
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

/**
 * Check if file is image
 */
export function isImageFile(filename) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  return imageExtensions.includes(getFileExtension(filename))
}

/**
 * Generate random string
 */
export function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}