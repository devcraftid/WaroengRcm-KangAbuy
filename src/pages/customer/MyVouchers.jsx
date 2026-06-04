import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Ticket, Copy, Check, Calendar, Tag, Percent, DollarSign, Gift } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import { toast } from 'sonner'

export default function MyVouchers() {
  const { user } = useAuthStore()
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(null)

  useEffect(() => {
    if (user) {
      loadVouchers()
    }
  }, [user])

  const loadVouchers = async () => {
    try {
      // Load vouchers assigned to this user OR public vouchers
      const { data } = await supabase
        .from('vouchers')
        .select('*')
        .or(`customer_id.eq.${user.id},customer_id.is.null`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Filter valid vouchers
      const now = new Date()
      const validVouchers = (data || []).filter(v => {
        // Check date validity
        if (v.valid_from && new Date(v.valid_from) > now) return false
        if (v.valid_until && new Date(v.valid_until) < now) return false
        // Check usage limit
        if (v.usage_limit && v.usage_count >= v.usage_limit) return false
        return true
      })

      setVouchers(validVouchers)
    } catch (error) {
      console.error('Error loading vouchers:', error)
      toast.error('Gagal memuat voucher')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success('Kode voucher berhasil disalin!')
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        setCopiedCode(code)
        toast.success('Kode voucher berhasil disalin!')
        setTimeout(() => setCopiedCode(null), 2000)
      } catch {
        toast.error('Gagal menyalin kode')
      }
      document.body.removeChild(textarea)
    }
  }

  const getVoucherIcon = (type) => {
    return type === 'percentage' ? Percent : DollarSign
  }

  const getVoucherColor = (type) => {
    return type === 'percentage' 
      ? 'from-orange-400 to-red-500' 
      : 'from-blue-400 to-indigo-500'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Ticket className="w-8 h-8 mr-3" />
            Voucher Saya
          </h1>
          <p className="text-orange-100">
            {vouchers.length} voucher tersedia untuk digunakan
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-white rounded-2xl shimmer"></div>
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ticket className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Voucher</h2>
            <p className="text-gray-500 mb-2">
              Voucher akan muncul di sini saat tersedia
            </p>
            <p className="text-sm text-gray-400">
              Voucher bisa didapatkan dari:
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li>• Transaksi ke-5, ke-10, dan ke-20</li>
              <li>• Promo spesial dari Waroeng RCM</li>
              <li>• Voucher ulang tahun</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            {vouchers.map((voucher, index) => {
              const Icon = getVoucherIcon(voucher.type)
              const gradientColor = getVoucherColor(voucher.type)
              const isExpiringSoon = voucher.valid_until && 
                new Date(voucher.valid_until) - new Date() < 3 * 24 * 60 * 60 * 1000

              return (
                <motion.div
                  key={voucher.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-orange-200 p-6 relative overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Decorative circles */}
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 rounded-full border-2 border-orange-200"></div>
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 rounded-full border-2 border-orange-200"></div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      {/* Voucher Icon */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      {/* Voucher Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900 tracking-wider">
                            {voucher.code}
                          </h3>
                          {isExpiringSoon && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                              Segera berakhir!
                            </span>
                          )}
                        </div>

                        <p className="text-lg font-bold text-orange-600">
                          {voucher.type === 'percentage'
                            ? `Diskon ${voucher.value}%`
                            : `Potongan ${formatCurrency(voucher.value)}`
                          }
                        </p>

                        {/* Conditions */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {voucher.min_purchase > 0 && (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                              <Tag className="w-3 h-3 mr-1" />
                              Min. pembelian {formatCurrency(voucher.min_purchase)}
                            </span>
                          )}
                          {voucher.max_discount && (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                              <Tag className="w-3 h-3 mr-1" />
                              Max. diskon {formatCurrency(voucher.max_discount)}
                            </span>
                          )}
                          {voucher.valid_until && (
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                              <Calendar className="w-3 h-3 mr-1" />
                              Berlaku hingga {formatDate(voucher.valid_until)}
                            </span>
                          )}
                        </div>

                        {/* Usage Info */}
                        {voucher.usage_limit && (
                          <p className="text-xs text-gray-400 mt-2">
                            Digunakan {voucher.usage_count} dari {voucher.usage_limit} kali
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyCode(voucher.code)}
                      className={`flex-shrink-0 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        copiedCode === voucher.code
                          ? 'bg-green-500 text-white'
                          : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-500/25'
                      }`}
                    >
                      {copiedCode === voucher.code ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          <span>Salin Kode</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* How to use hint */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 flex items-center">
                      <Gift className="w-3 h-3 mr-1" />
                      Gunakan kode voucher saat checkout untuk mendapatkan potongan harga
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}