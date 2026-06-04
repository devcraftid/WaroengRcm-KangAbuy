import { motion } from 'framer-motion'
import { Monitor, Users, Clock, Coffee, CheckCircle, AlertCircle } from 'lucide-react'
import { getTableStatusColor } from '../../utils/format'

const statusIcons = {
  available: CheckCircle,
  occupied: Users,
  waiting_payment: Clock,
  waiting_takeaway: Coffee,
  cleaning: AlertCircle,
  reserved: Clock,
  disabled: AlertCircle
}

export default function TableGrid({ tables = [], onTableClick }) {
  if (!tables || tables.length === 0) {
    return (
      <div className="text-center py-12 col-span-full">
        <Monitor className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Belum ada meja</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {tables.map((table) => {
        const StatusIcon = statusIcons[table.status] || Monitor
        const statusColor = getTableStatusColor(table.status)
        const isAvailable = table.status === 'available'

        return (
          <motion.button
            key={table.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTableClick?.(table)}
            className={`relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-left ${
              isAvailable ? 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-lg' :
              table.status === 'occupied' ? 'bg-red-50 border-red-200 hover:border-red-300' :
              table.status === 'disabled' ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed' :
              'bg-yellow-50 border-yellow-200 hover:border-yellow-300'
            }`}
            disabled={table.status === 'disabled'}
          >
            <div className="text-center">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 shadow-sm ${isAvailable ? 'bg-white' : 'bg-white/80'}`}>
                <span className="text-base sm:text-xl font-bold text-gray-900">{table.table_number}</span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusColor}`}>
                <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                {table.status === 'available' && 'Tersedia'}
                {table.status === 'occupied' && 'Terisi'}
                {table.status === 'waiting_payment' && 'Tunggu Bayar'}
                {table.status === 'waiting_takeaway' && 'Takeaway'}
                {table.status === 'cleaning' && 'Cleaning'}
                {table.status === 'reserved' && 'Reserved'}
                {table.status === 'disabled' && 'Nonaktif'}
              </span>
            </div>
            <div className="text-center mt-1">
              <p className="text-[10px] sm:text-xs text-gray-500 flex items-center justify-center">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                {table.capacity} org
              </p>
            </div>
            {table.qr_code_url && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" title="QR tersedia"></div>
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}