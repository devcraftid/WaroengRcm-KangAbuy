import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Ticket,
  Copy,
  Check,
  Calendar,
  Users
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function ManageVoucher() {
  const [vouchers, setVouchers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  const [form, setForm] = useState({
    code: '',
    type: 'percentage',
    value: '',
    min_purchase: '0',
    max_discount: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    customer_id: '',
    is_active: true
  })

  const [customers, setCustomers] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [voucherResult, customerResult] = await Promise.all([
        supabase.from('vouchers').select('*, profiles!customer_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'customer')
      ])

      setVouchers(voucherResult.data || [])
      setCustomers(customerResult.data || [])
    } catch (error) {
      console.error('Error loading vouchers:', error)
      toast.error('Gagal memuat data voucher')
    } finally {
      setLoading(false)
    }
  }

  const filteredVouchers = vouchers.filter(voucher =>
    voucher.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm({ ...form, code })
  }

  const handleOpenModal = (voucher = null) => {
    if (voucher) {
      setEditingVoucher(voucher)
      setForm({
        code: voucher.code,
        type: voucher.type,
        value: voucher.value.toString(),
        min_purchase: voucher.min_purchase.toString(),
        max_discount: voucher.max_discount?.toString() || '',
        valid_from: voucher.valid_from ? new Date(voucher.valid_from).toISOString().split('T')[0] : '',
        valid_until: voucher.valid_until ? new Date(voucher.valid_until).toISOString().split('T')[0] : '',
        usage_limit: voucher.usage_limit?.toString() || '',
        customer_id: voucher.customer_id || '',
        is_active: voucher.is_active
      })
    } else {
      setEditingVoucher(null)
      setForm({
        code: '',
        type: 'percentage',
        value: '',
        min_purchase: '0',
        max_discount: '',
        valid_from: '',
        valid_until: '',
        usage_limit: '',
        customer_id: '',
        is_active: true
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const voucherData = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        min_purchase: parseFloat(form.min_purchase) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        customer_id: form.customer_id || null,
        is_active: form.is_active
      }

      if (editingVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update(voucherData)
          .eq('id', editingVoucher.id)

        if (error) throw error
        toast.success('Voucher berhasil diupdate')
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert(voucherData)

        if (error) throw error
        toast.success('Voucher berhasil dibuat')
      }

      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving voucher:', error)
      if (error.code === '23505') {
        toast.error('Kode voucher sudah digunakan')
      } else {
        toast.error('Gagal menyimpan voucher')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (voucherId) => {
    if (!window.confirm('Yakin ingin menghapus voucher ini?')) return

    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', voucherId)

      if (error) throw error
      toast.success('Voucher berhasil dihapus')
      loadData()
    } catch (error) {
      console.error('Error deleting voucher:', error)
      toast.error('Gagal menghapus voucher')
    }
  }

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success('Kode voucher disalin')
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      toast.error('Gagal menyalin kode')
    }
  }

  const isVoucherValid = (voucher) => {
    if (!voucher.is_active) return false
    const now = new Date()
    if (voucher.valid_from && new Date(voucher.valid_from) > now) return false
    if (voucher.valid_until && new Date(voucher.valid_until) < now) return false
    if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) return false
    return true
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Voucher</h1>
          <p className="text-sm text-gray-500 mt-1">Total {vouchers.length} voucher</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Voucher</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kode voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Vouchers List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVouchers.map((voucher) => {
            const valid = isVoucherValid(voucher)
            return (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${
                  !valid ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Voucher Icon */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                      valid ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gray-300'
                    }`}>
                      <Ticket className="w-8 h-8 text-white" />
                    </div>

                    {/* Voucher Info */}
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">{voucher.code}</h3>
                        <button
                          onClick={() => handleCopyCode(voucher.code)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          {copiedCode === voucher.code ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          valid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {valid ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </div>

                      <p className="text-lg font-semibold text-orange-600 mb-2">
                        {voucher.type === 'percentage'
                          ? `Diskon ${voucher.value}%`
                          : `Potongan ${formatCurrency(voucher.value)}`
                        }
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>
                            {voucher.valid_from ? formatDate(voucher.valid_from) : 'N/A'}
                            {' - '}
                            {voucher.valid_until ? formatDate(voucher.valid_until) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          <span>
                            {voucher.usage_count || 0}/{voucher.usage_limit || '∞'} digunakan
                          </span>
                        </div>
                      </div>

                      {voucher.min_purchase > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Min. pembelian: {formatCurrency(voucher.min_purchase)}
                        </p>
                      )}

                      {voucher.customer_id && voucher.profiles && (
                        <p className="text-xs text-blue-600 mt-1">
                          Untuk: {voucher.profiles.full_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenModal(voucher)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(voucher.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingVoucher ? 'Edit Voucher' : 'Buat Voucher Baru'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Voucher Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Voucher *</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      required
                      placeholder="Contoh: PROMO10"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={generateVoucherCode}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {/* Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Voucher</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai *</label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      required
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Min Purchase & Max Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min. Pembelian</label>
                    <input
                      type="number"
                      value={form.min_purchase}
                      onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max. Diskon</label>
                    <input
                      type="number"
                      value={form.max_discount}
                      onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                      min="0"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Dari</label>
                    <input
                      type="date"
                      value={form.valid_from}
                      onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Sampai</label>
                    <input
                      type="date"
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Usage Limit & Customer */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batas Penggunaan</label>
                    <input
                      type="number"
                      value={form.usage_limit}
                      onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                      min="1"
                      placeholder="Kosong = unlimited"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Untuk Pelanggan</label>
                    <select
                      value={form.customer_id}
                      onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Semua Pelanggan</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.full_name || customer.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Toggle */}
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Voucher Aktif</span>
                </label>

                {/* Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : editingVoucher ? 'Update' : 'Buat Voucher'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}