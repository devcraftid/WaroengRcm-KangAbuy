import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit, Trash2, X, Ticket, Copy, Check,
  Calendar, Users, Tag, Percent, DollarSign
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../utils/format'
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
    code: '', type: 'percentage', value: '', min_purchase: '0',
    max_discount: '', valid_from: '', valid_until: '',
    usage_limit: '', customer_id: '', is_active: true
  })

  const [customers, setCustomers] = useState([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [voucherResult, customerResult] = await Promise.all([
        supabase.from('vouchers').select('*, profiles!customer_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'customer')
      ])
      setVouchers(voucherResult.data || [])
      setCustomers(customerResult.data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const filteredVouchers = vouchers.filter(v =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    setForm({ ...form, code })
  }

  const handleOpenModal = (voucher = null) => {
    if (voucher) {
      setEditingVoucher(voucher)
      setForm({
        code: voucher.code, type: voucher.type, value: voucher.value.toString(),
        min_purchase: voucher.min_purchase?.toString() || '0',
        max_discount: voucher.max_discount?.toString() || '',
        valid_from: voucher.valid_from ? new Date(voucher.valid_from).toISOString().split('T')[0] : '',
        valid_until: voucher.valid_until ? new Date(voucher.valid_until).toISOString().split('T')[0] : '',
        usage_limit: voucher.usage_limit?.toString() || '',
        customer_id: voucher.customer_id || '', is_active: voucher.is_active
      })
    } else {
      setEditingVoucher(null)
      setForm({ code: '', type: 'percentage', value: '', min_purchase: '0', max_discount: '', valid_from: '', valid_until: '', usage_limit: '', customer_id: '', is_active: true })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        code: form.code.toUpperCase(), type: form.type,
        value: parseFloat(form.value), min_purchase: parseFloat(form.min_purchase) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        customer_id: form.customer_id || null, is_active: form.is_active
      }

      if (editingVoucher) {
        await supabase.from('vouchers').update(data).eq('id', editingVoucher.id)
        toast.success('Voucher diupdate')
      } else {
        await supabase.from('vouchers').insert(data)
        toast.success('Voucher dibuat')
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      toast.error(error.code === '23505' ? 'Kode voucher sudah ada' : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus voucher ini?')) return
    await supabase.from('vouchers').delete().eq('id', id)
    toast.success('Voucher dihapus')
    loadData()
  }

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      toast.success('Kode disalin!')
      setTimeout(() => setCopiedCode(null), 2000)
    } catch { toast.error('Gagal menyalin') }
  }

  const isVoucherValid = (v) => {
    if (!v.is_active) return false
    const now = new Date()
    if (v.valid_from && new Date(v.valid_from) > now) return false
    if (v.valid_until && new Date(v.valid_until) < now) return false
    if (v.usage_limit && v.usage_count >= v.usage_limit) return false
    return true
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Voucher</h1>
          <p className="text-xs sm:text-sm text-gray-500">{vouchers.length} voucher</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg">
          <Plus className="w-4 h-4" /><span>Buat Voucher</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Cari kode voucher..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>

      {/* Voucher List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-24 bg-white rounded-xl animate-pulse"></div>)}</div>
      ) : (
        <div className="space-y-3">
          {filteredVouchers.map(v => {
            const valid = isVoucherValid(v)
            return (
              <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`bg-white rounded-xl shadow-sm border p-3 sm:p-4 ${!valid ? 'opacity-60' : ''}`}>
                
                {/* Desktop View */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${valid ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gray-300'}`}>
                      <Ticket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold">{v.code}</h3>
                        <button onClick={() => handleCopy(v.code)} className="p-1 hover:bg-gray-100 rounded">
                          {copiedCode === v.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {valid ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="text-orange-600 font-bold text-sm">
                        {v.type === 'percentage' ? `Diskon ${v.value}%` : `Potongan ${formatCurrency(v.value)}`}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{v.valid_from ? formatDate(v.valid_from) : '-'} - {v.valid_until ? formatDate(v.valid_until) : '-'}</span>
                        <span className="flex items-center"><Users className="w-3 h-3 mr-1" />{v.usage_count || 0}/{v.usage_limit || '∞'}</span>
                      </div>
                      {v.min_purchase > 0 && <p className="text-xs text-gray-400">Min: {formatCurrency(v.min_purchase)}</p>}
                      {v.profiles && <p className="text-xs text-blue-500">Untuk: {v.profiles.full_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleOpenModal(v)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(v.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${valid ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gray-300'}`}>
                        <Ticket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <h3 className="font-bold text-sm">{v.code}</h3>
                          <button onClick={() => handleCopy(v.code)} className="p-0.5">
                            {copiedCode === v.code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                          </button>
                        </div>
                        <p className="text-orange-600 font-bold text-xs">
                          {v.type === 'percentage' ? `${v.value}%` : formatCurrency(v.value)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {valid ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-gray-500 space-y-0.5">
                      <span className="flex items-center"><Calendar className="w-2.5 h-2.5 mr-1" />{v.valid_until ? formatDate(v.valid_until) : 'Selamanya'}</span>
                      <span className="flex items-center"><Users className="w-2.5 h-2.5 mr-1" />{v.usage_count || 0}/{v.usage_limit || '∞'}</span>
                    </div>
                    <div className="flex space-x-1">
                      <button onClick={() => handleOpenModal(v)} className="p-1.5 text-blue-600 bg-blue-50 rounded"><Edit className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 text-red-600 bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                    </div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-6 border-b">
                <h2 className="text-lg font-bold">{editingVoucher ? 'Edit Voucher' : 'Buat Voucher'}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kode Voucher *</label>
                  <div className="flex space-x-2">
                    <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                      required className="flex-1 px-3 py-2 rounded-xl border text-sm" />
                    <button type="button" onClick={generateCode} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">Generate</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipe</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border text-sm">
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nilai *</label>
                    <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})}
                      required min="0" className="w-full px-3 py-2 rounded-xl border text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1">Min. Pembelian</label>
                    <input type="number" value={form.min_purchase} onChange={e => setForm({...form, min_purchase: e.target.value})}
                      min="0" className="w-full px-3 py-2 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Max. Diskon</label>
                    <input type="number" value={form.max_discount} onChange={e => setForm({...form, max_discount: e.target.value})}
                      min="0" className="w-full px-3 py-2 rounded-xl border text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1">Berlaku Dari</label>
                    <input type="date" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Berlaku Sampai</label>
                    <input type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1">Batas Pakai</label>
                    <input type="number" value={form.usage_limit} onChange={e => setForm({...form, usage_limit: e.target.value})}
                      placeholder="Unlimited" className="w-full px-3 py-2 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Untuk Pelanggan</label>
                    <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border text-sm">
                      <option value="">Semua</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                    </select></div>
                </div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                    className="w-4 h-4 text-orange-500 rounded" />
                  <span className="text-sm">Voucher Aktif</span>
                </label>
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-semibold text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                    {saving ? 'Menyimpan...' : editingVoucher ? 'Update' : 'Buat'}
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