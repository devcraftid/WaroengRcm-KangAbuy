import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Monitor,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Coffee,
  RefreshCw,
  Edit,
  QrCode
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtimeTables } from '../../hooks/useRealtime'
import { getTableStatusColor } from '../../utils/format'
import { toast } from 'sonner'
import TableGrid from '../../components/shared/TableGrid'

export default function CashierTableMonitoring() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    waiting: 0
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
        waiting: tablesData.filter(t => 
          t.status === 'waiting_payment' || t.status === 'waiting_takeaway'
        ).length
      })
    } catch (error) {
      console.error('Error loading tables:', error)
      toast.error('Gagal memuat data meja')
    } finally {
      setLoading(false)
    }
  }

  const handleTableClick = (table) => {
    setSelectedTable(table)
    setShowActionModal(true)
  }

  const handleUpdateStatus = async (tableId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', tableId)

      if (error) throw error

      toast.success(`Status meja diupdate ke ${newStatus}`)
      setShowActionModal(false)
      loadTables()
    } catch (error) {
      toast.error('Gagal mengupdate status meja')
    }
  }

  const getAvailableActions = (status) => {
    const actions = {
      available: [
        { status: 'occupied', label: 'Isi Meja', icon: Users, color: 'bg-red-500' },
        { status: 'reserved', label: 'Reservasi', icon: Clock, color: 'bg-purple-500' },
        { status: 'disabled', label: 'Nonaktifkan', icon: AlertCircle, color: 'bg-gray-500' }
      ],
      occupied: [
        { status: 'waiting_payment', label: 'Tunggu Bayar', icon: Clock, color: 'bg-yellow-500' },
        { status: 'cleaning', label: 'Bersihkan', icon: Coffee, color: 'bg-blue-500' }
      ],
      waiting_payment: [
        { status: 'available', label: 'Bebaskan', icon: CheckCircle, color: 'bg-green-500' },
        { status: 'cleaning', label: 'Bersihkan', icon: Coffee, color: 'bg-blue-500' }
      ],
      cleaning: [
        { status: 'available', label: 'Tersedia', icon: CheckCircle, color: 'bg-green-500' }
      ],
      reserved: [
        { status: 'occupied', label: 'Isi Meja', icon: Users, color: 'bg-red-500' },
        { status: 'available', label: 'Batalkan', icon: CheckCircle, color: 'bg-green-500' }
      ],
      disabled: [
        { status: 'available', label: 'Aktifkan', icon: CheckCircle, color: 'bg-green-500' }
      ]
    }
    return actions[status] || []
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Meja</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time · {stats.available} tersedia dari {stats.total} meja
          </p>
        </div>
        <button
          onClick={loadTables}
          className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'from-gray-500 to-gray-600', icon: Monitor },
          { label: 'Tersedia', value: stats.available, color: 'from-green-500 to-emerald-600', icon: CheckCircle },
          { label: 'Terisi', value: stats.occupied, color: 'from-red-500 to-pink-600', icon: Users },
          { label: 'Menunggu', value: stats.waiting, color: 'from-yellow-500 to-orange-600', icon: Clock }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
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
      ) : (
        <TableGrid tables={tables} onTableClick={handleTableClick} />
      )}

      {/* Action Modal */}
      {showActionModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowActionModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Meja {selectedTable.table_number}
            </h3>
            <div className="flex items-center space-x-2 mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTableStatusColor(selectedTable.status)}`}>
                {selectedTable.status}
              </span>
              <span className="text-sm text-gray-500">
                Kapasitas: {selectedTable.capacity} orang
              </span>
            </div>

            {selectedTable.qr_code_url && (
              <div className="text-center mb-4 p-4 bg-gray-50 rounded-xl">
                <img src={selectedTable.qr_code_url} alt="QR" className="w-32 h-32 mx-auto" />
                <p className="text-xs text-gray-500 mt-2">Scan untuk order</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Update Status:</p>
              {getAvailableActions(selectedTable.status).map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleUpdateStatus(selectedTable.id, action.status)}
                  className={`w-full flex items-center space-x-2 px-4 py-3 ${action.color} text-white rounded-xl text-sm font-medium hover:opacity-90`}
                >
                  <action.icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowActionModal(false)}
              className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}