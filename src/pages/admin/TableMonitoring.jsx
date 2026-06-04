import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Users, Clock, Coffee, CheckCircle, AlertCircle,
  Search, RefreshCw, Plus, Edit, Trash2, QrCode, X, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtimeTables } from '../../hooks/useRealtime'
import { getTableStatusColor } from '../../utils/format'
import { toast } from 'sonner'
import TableGrid from '../../components/shared/TableGrid'

export default function TableMonitoring() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [activeView, setActiveView] = useState('grid')
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, waiting: 0 })
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState({
    table_number: '',
    capacity: 4,
    status: 'available'
  })

  useEffect(() => { loadTables() }, [])
  useRealtimeTables(() => loadTables())

  const loadTables = async () => {
    try {
      const { data } = await supabase.from('tables').select('*').order('table_number')
      const tablesData = data || []
      setTables(tablesData)
      setStats({
        total: tablesData.length,
        available: tablesData.filter(t => t.status === 'available').length,
        occupied: tablesData.filter(t => t.status === 'occupied').length,
        waiting: tablesData.filter(t => t.status === 'waiting_payment' || t.status === 'waiting_takeaway').length
      })
    } catch (error) {
      console.error('Error loading tables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (table = null) => {
    if (table) {
      setEditingTable(table)
      setForm({ table_number: table.table_number, capacity: table.capacity, status: table.status })
    } else {
      setEditingTable(null)
      const nextNumber = String(tables.length + 1).padStart(2, '0')
      setForm({ table_number: `T${nextNumber}`, capacity: 4, status: 'available' })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTable) {
        const { error } = await supabase.from('tables').update(form).eq('id', editingTable.id)
        if (error) throw error
        toast.success('Meja berhasil diupdate')
      } else {
        const { error } = await supabase.from('tables').insert(form)
        if (error) throw error
        toast.success('Meja berhasil ditambahkan')
      }
      setShowModal(false)
      loadTables()
    } catch (error) {
      toast.error('Gagal menyimpan meja')
    }
  }

  const handleDelete = async (tableId) => {
    if (!window.confirm('Yakin ingin menghapus meja ini?')) return
    try {
      await supabase.from('tables').delete().eq('id', tableId)
      toast.success('Meja berhasil dihapus')
      loadTables()
    } catch (error) {
      toast.error('Gagal menghapus meja')
    }
  }

  const handleUpdateStatus = async (tableId, newStatus) => {
    try {
      await supabase.from('tables').update({ status: newStatus }).eq('id', tableId)
      toast.success('Status meja diupdate')
      loadTables()
    } catch (error) {
      toast.error('Gagal mengupdate status')
    }
  }

  const filteredTables = tables.filter(t =>
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Monitoring Meja</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Real-time table monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setActiveView(activeView === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200">
            {activeView === 'grid' ? '📋 List' : '🔲 Grid'}
          </button>
          <button onClick={() => handleOpenModal()}
            className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Tambah Meja</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Monitor, color: 'from-blue-500 to-blue-600' },
          { label: 'Tersedia', value: stats.available, icon: CheckCircle, color: 'from-green-500 to-emerald-600' },
          { label: 'Terisi', value: stats.occupied, icon: Users, color: 'from-red-500 to-pink-600' },
          { label: 'Menunggu', value: stats.waiting, icon: Clock, color: 'from-yellow-500 to-orange-600' }
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">{stat.label}</p><p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p></div>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search (List View) */}
      {activeView === 'list' && (
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Cari nomor meja..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
      )}

      {/* Tables */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(12)].map((_, i) => (<div key={i} className="h-28 sm:h-32 bg-white rounded-2xl animate-pulse"></div>))}
        </div>
      ) : activeView === 'grid' ? (
        <TableGrid tables={filteredTables} onTableClick={(table) => {
          const actions = {
            available: 'occupied', occupied: 'waiting_payment',
            waiting_payment: 'cleaning', cleaning: 'available'
          }
          const nextStatus = actions[table.status]
          if (nextStatus && window.confirm(`Ubah status meja ${table.table_number} ke ${nextStatus}?`)) {
            handleUpdateStatus(table.id, nextStatus)
          }
        }} />
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Meja</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Kapasitas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">QR</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTables.map(table => (
                  <tr key={table.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{table.table_number}</td>
                    <td className="px-4 py-3 text-gray-600">{table.capacity} orang</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTableStatusColor(table.status)}`}>{table.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {table.qr_code_url ? <span className="text-green-600 text-xs">✅</span> : <span className="text-gray-400 text-xs">❌</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-1">
                        <button onClick={() => handleOpenModal(table)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(table.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTables.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">Tidak ada meja ditemukan</div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editingTable ? 'Edit Meja' : 'Tambah Meja'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Meja *</label>
                  <input type="text" value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                    required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 4 })}
                    min="1" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm">
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="waiting_payment">Waiting Payment</option>
                    <option value="waiting_takeaway">Waiting Takeaway</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="reserved">Reserved</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">Batal</button>
                  <button type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg">
                    {editingTable ? 'Update' : 'Simpan'}
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