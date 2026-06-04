import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Users,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Check,
  Ban
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

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  })

  useEffect(() => {
    loadCashiers()
  }, [])

  const loadCashiers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'cashier')
        .order('created_at', { ascending: false })

      setCashiers(data || [])
    } catch (error) {
      console.error('Error loading cashiers:', error)
      toast.error('Gagal memuat data kasir')
    } finally {
      setLoading(false)
    }
  }

  const filteredCashiers = cashiers.filter(cashier =>
    cashier.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cashier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (cashier = null) => {
    if (cashier) {
      setEditingCashier(cashier)
      setForm({
        full_name: cashier.full_name || '',
        email: cashier.email || '',
        phone: cashier.phone || '',
        password: ''
      })
    } else {
      setEditingCashier(null)
      setForm({
        full_name: '',
        email: '',
        phone: '',
        password: ''
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingCashier) {
        // Update existing cashier
        const updateData = {
          full_name: form.full_name,
          phone: form.phone
        }
        
        if (form.email !== editingCashier.email) {
          updateData.email = form.email
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingCashier.id)

        if (error) throw error

        // Update auth email if changed
        if (form.email !== editingCashier.email) {
          await supabase.auth.admin.updateUserById(editingCashier.id, {
            email: form.email
          })
        }

        // Update password if provided
        if (form.password) {
          await supabase.auth.admin.updateUserById(editingCashier.id, {
            password: form.password
          })
        }

        toast.success('Kasir berhasil diupdate')
      } else {
        // Create new cashier
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: {
            full_name: form.full_name
          }
        })

        if (authError) throw authError

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            role: 'cashier'
          })

        if (profileError) throw profileError

        toast.success('Kasir berhasil ditambahkan')
      }

      setShowModal(false)
      loadCashiers()
    } catch (error) {
      console.error('Error saving cashier:', error)
      toast.error(error.message || 'Gagal menyimpan kasir')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (cashier) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !cashier.is_active })
        .eq('id', cashier.id)

      if (error) throw error

      // Ban/unban user in auth
      if (!cashier.is_active) {
        await supabase.auth.admin.updateUserById(cashier.id, { ban_duration: '0' })
      } else {
        await supabase.auth.admin.updateUserById(cashier.id, { ban_duration: '876600h' })
      }

      toast.success(`Kasir ${cashier.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
      loadCashiers()
    } catch (error) {
      toast.error('Gagal mengubah status kasir')
    }
  }

  const handleDelete = async (cashierId) => {
    if (!window.confirm('Yakin ingin menghapus kasir ini?')) return

    try {
      // Delete auth user
      await supabase.auth.admin.deleteUser(cashierId)

      // Profile will be deleted via CASCADE
      toast.success('Kasir berhasil dihapus')
      loadCashiers()
    } catch (error) {
      console.error('Error deleting cashier:', error)
      toast.error('Gagal menghapus kasir')
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Kasir</h1>
          <p className="text-sm text-gray-500 mt-1">Total {cashiers.length} kasir</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg"
        >
          <UserPlus className="w-5 h-5" />
          <span>Tambah Kasir</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Cashiers List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCashiers.map((cashier) => (
            <motion.div
              key={cashier.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${
                !cashier.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                    {cashier.full_name?.[0] || 'K'}
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900">{cashier.full_name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {cashier.email}
                      </span>
                      {cashier.phone && (
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {cashier.phone}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Bergabung: {formatDateTime(cashier.created_at)}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    cashier.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {cashier.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(cashier)}
                      className={`p-2 rounded-lg transition-colors ${
                        cashier.is_active
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                      title={cashier.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {cashier.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleOpenModal(cashier)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cashier.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
              className="bg-white rounded-2xl max-w-md w-full"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCashier ? 'Edit Kasir' : 'Tambah Kasir'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingCashier ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={!editingCashier}
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                    Batal
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50">
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