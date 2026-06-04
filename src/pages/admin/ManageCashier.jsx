import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit, Trash2, X, Users, UserPlus,
  Mail, Phone, Shield, Check, Ban
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function ManageCashier() {
  const [cashiers, setCashiers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCashier, setEditingCashier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })

  useEffect(() => { loadCashiers() }, [])

  const loadCashiers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'cashier').order('created_at', { ascending: false })
      setCashiers(data || [])
    } catch (error) {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const filteredCashiers = cashiers.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (cashier = null) => {
    if (cashier) {
      setEditingCashier(cashier)
      setForm({ full_name: cashier.full_name || '', email: cashier.email || '', phone: cashier.phone || '', password: '' })
    } else {
      setEditingCashier(null)
      setForm({ full_name: '', email: '', phone: '', password: '' })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingCashier) {
        await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone }).eq('id', editingCashier.id)
        if (form.password) {
          await supabase.auth.admin.updateUserById(editingCashier.id, { password: form.password })
        }
        toast.success('Kasir diupdate')
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: form.email, password: form.password, email_confirm: true,
          user_metadata: { full_name: form.full_name }
        })
        if (authError) throw authError
        await supabase.from('profiles').insert({
          id: authData.user.id, full_name: form.full_name,
          email: form.email, phone: form.phone, role: 'cashier'
        })
        toast.success('Kasir ditambahkan')
      }
      setShowModal(false)
      loadCashiers()
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (cashier) => {
    await supabase.from('profiles').update({ is_active: !cashier.is_active }).eq('id', cashier.id)
    toast.success(`Kasir ${cashier.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
    loadCashiers()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus kasir ini?')) return
    try {
      await supabase.auth.admin.deleteUser(id)
      toast.success('Kasir dihapus')
      loadCashiers()
    } catch { toast.error('Gagal menghapus') }
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Kasir</h1>
          <p className="text-xs sm:text-sm text-gray-500">{cashiers.length} kasir</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg">
          <UserPlus className="w-4 h-4" /><span>Tambah Kasir</span>
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Cari kasir..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>)}</div>
      ) : (
        <div className="space-y-3">
          {filteredCashiers.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`bg-white rounded-xl shadow-sm border p-3 sm:p-4 ${!c.is_active ? 'opacity-60' : ''}`}>
              
              {/* Desktop */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                    {c.full_name?.[0] || 'K'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{c.full_name}</h3>
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span className="flex items-center"><Mail className="w-3 h-3 mr-1" />{c.email}</span>
                      {c.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1" />{c.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button onClick={() => handleToggleActive(c)} className={`p-2 rounded-lg ${c.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                    {c.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                      {c.full_name?.[0] || 'K'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{c.full_name}</h3>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center justify-end space-x-1">
                  <button onClick={() => handleToggleActive(c)} className={`p-1.5 rounded ${c.is_active ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                    {c.is_active ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button onClick={() => handleOpenModal(c)} className="p-1.5 text-blue-600 bg-blue-50 rounded"><Edit className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editingCashier ? 'Edit Kasir' : 'Tambah Kasir'}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Nama *</label>
                  <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                    required className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    required className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Telepon</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">{editingCashier ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                    required={!editingCashier} minLength={6} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-semibold text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
                    {saving ? 'Menyimpan...' : editingCashier ? 'Update' : 'Tambah'}
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