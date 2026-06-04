import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Monitor,
  Users,
  Clock,
  Coffee,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  QrCode,
  X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtimeTables } from '../../hooks/useRealtime'
import { getTableStatusColor } from '../../utils/format'
import { toast } from 'sonner'
import TableGrid from '../../components/shared/TableGrid'
import QRCode from 'qrcode'

export default function TableMonitoring() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [activeView, setActiveView] = useState('grid') // grid or list
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    waiting: 0
  })

  const [form, setForm] = useState({
    table_number: '',
    capacity: 4,
    status: 'available'
  })

  useEffect(() => {
    loadTables()
  }, [])

  useRealtimeTables(() => {
    loadTables()
  })

  const loadTables = async () => {
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .order('table_number')

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
      toast.error('Gagal memuat data meja')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (table = null) => {
    if (table) {
      setEditingTable(table)
      setForm({
        table_number: table.table_number,
        capacity: table.capacity,
        status: table.status
      })
    } else {
      setEditingTable(null)
      const nextNumber = (tables.length + 1).toString().padStart(2, '0')
      setForm({
        table_number: `T${nextNumber}`,
        capacity: 4,
        status: 'available'
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTable) {
        const { error } = await supabase
          .from('tables')
          .update(form)
          .eq('id', editingTable.id)

        if (error) throw error
        toast.success('Meja berhasil diupdate')
      } else {
        const { error } = await supabase
          .from('tables')
          .insert(form)

        if (error) throw error
        toast.success('Meja berhasil ditambahkan')
      }

      setShowModal(false)
      loadTables()
    } catch (error) {
      console.error('Error saving table:', error)
      toast.error('Gagal menyimpan meja')
    }
  }

  const handleDelete = async (tableId) => {
    if (!window.confirm('Yakin ingin menghapus meja ini?')) return

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId)

      if (error) throw error
      toast.success('Meja berhasil dihapus')
      loadTables()
    } catch (error) {
      console.error('Error deleting table:', error)
      toast.error('Gagal menghapus meja')
    }
  }

  const handleUpdateStatus = async (tableId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', tableId)

      if (error) throw error
      toast.success('Status meja diupdate')
      loadTables()
    } catch (error) {
      toast.error('Gagal mengupdate status meja')
    }
  }

  const handleGenerateQR = async (table) => {
    try {
      const qrData = `${window.location.origin}/order?table=${table.table_number}`
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1 })
      
      const response = await fetch(qrCodeDataUrl)
      const blob = await response.blob()
      
      const filePath = `qr-codes/table-${table.table_number}.png`
      await supabase.storage.from('qr-codes').upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true
      })

      const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(filePath)
      
      await supabase.from('tables').update({ qr_code_url: publicUrl }).eq('id', table.id)
      
      toast.success(`QR untuk meja ${table.table_number} dibuat`)
      loadTables()
    } catch (error) {
      toast.error('Gagal membuat QR')
    }
  }

  const handleTableClick = (table) => {
    const actions = {
      available: () => handleUpdateStatus(table.id, 'occupied'),
      occupied: () => handleUpdateStatus(table.id, 'waiting_payment'),
      waiting_payment: () => handleUpdateStatus(table.id, 'cleaning'),
      cleaning: () => handleUpdateStatus(table.id, 'available'),
    }
    
    const action = actions[table.status]
    if (action) {
      if (window.confirm(`Ubah status meja ${table.table_number}?`)) {
        action()
      }
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Meja</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time table monitoring</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveView(activeView === 'grid' ? 'list' : 'grid')}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            {activeView === 'grid' ? 'List View' : 'Grid View'}
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Meja</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Meja', value: stats.total, color: 'from-blue-500 to-blue-600', icon: Monitor },
          { label: 'Tersedia', value: stats.available, color: 'from-green-500 to-emerald-600', icon: CheckCircle },
          { label: 'Terisi', value: stats.occupied, color: 'from-red-500 to-pink-600', icon: Users },
          { label: 'Menunggu', value: stats.waiting, color: 'from-yellow-500 to-orange-600', icon: Clock }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : activeView === 'grid' ? (
        <TableGrid tables={tables} onTableClick={handleTableClick} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meja</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapasitas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QR Code</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tables.map(table => (
                <tr key={table.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{table.table_number}</span>
                  </td>
                  <td className="px-6 py-4">{table.capacity} orang</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTableStatusColor(table.status)}`}>
                      {table.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {table.qr_code_url ? (
                      <span className="text-green-600 text-xs">✓ Tersedia</span>
                    ) : (
                      <button
                        onClick={() => handleGenerateQR(table)}
                        className="text-orange-600 text-xs hover:underline"
                      >
                        Generate QR
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleOpenModal(table)} className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(table.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Table Modal */}
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
                  {editingTable ? 'Edit Meja' : 'Tambah Meja'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Meja *</label>
                  <input
                    type="text"
                    value={form.table_number}
                    onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kapasitas</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="waiting_payment">Waiting Payment</option>
                    <option value="waiting_takeaway">Waiting Takeaway</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="reserved">Reserved</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
                    Batal
                  </button>
                  <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg">
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