import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Package,
  CheckCircle,
  XCircle,
  Search,
  User,
  Phone,
  ShoppingBag,
  MapPin,
  Bell
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, formatTime } from '../../utils/format'
import { useRealtimeOrders } from '../../hooks/useRealtime'
import { toast } from 'sonner'

export default function TakeawayQueue() {
  const { profile } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // all, waiting, pickup
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showCallModal, setShowCallModal] = useState(false)

  useEffect(() => {
    loadTakeawayOrders()
  }, [])

  useRealtimeOrders(() => {
    loadTakeawayOrders()
  })

  const loadTakeawayOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(full_name, phone),
          items:order_items(quantity, menus(name))
        `)
        .in('order_type', ['takeaway_waiting', 'takeaway_pickup'])
        .in('status', ['pending', 'confirmed', 'processing', 'ready'])
        .order('created_at', { ascending: true })

      setOrders(data || [])
    } catch (error) {
      console.error('Error loading takeaway orders:', error)
      toast.error('Gagal memuat antrian takeaway')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // If order is ready, send notification
      if (newStatus === 'ready') {
        const { data: order } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('id', orderId)
          .single()

        if (order?.customer_id) {
          await supabase.from('notifications').insert({
            user_id: order.customer_id,
            title: 'Pesanan Siap Diambil! 🎉',
            message: `Pesanan #${orderId.slice(0, 8)} sudah siap. Silakan ambil di kasir.`,
            type: 'order_ready',
            link: `/order/${orderId}`
          })
        }
      }

      // Log activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Takeaway order #${orderId.slice(0, 8)} diupdate ke ${newStatus}`,
        type: 'order_updated'
      })

      toast.success(`Order #${orderId.slice(0, 8)} diupdate ke ${newStatus}`)
      loadTakeawayOrders()
    } catch (error) {
      toast.error('Gagal mengupdate status order')
    }
  }

  const callCustomer = (order) => {
    setSelectedOrder(order)
    setShowCallModal(true)
  }

  const handleCallViaWhatsApp = (order) => {
    if (order.customer?.phone) {
      const message = encodeURIComponent(
        `Halo ${order.customer.full_name},\n\n` +
        `Pesanan Anda #${order.id.slice(0, 8)} sudah siap!\n\n` +
        `Silakan ambil di Waroeng RCM Kang Abuy.\n` +
        `Total: ${formatCurrency(order.total_amount)}\n\n` +
        `Terima kasih! 🙏`
      )
      window.open(`https://wa.me/${order.customer.phone.replace(/^0/, '62')}?text=${message}`, '_blank')
    } else {
      toast.error('Nomor telepon pelanggan tidak tersedia')
    }
    setShowCallModal(false)
  }

  const handleMarkAsPickedUp = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Pesanan telah diambil pelanggan')
      loadTakeawayOrders()
    } catch (error) {
      toast.error('Gagal mengupdate pesanan')
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.slice(0, 8).toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = 
      filterType === 'all' ? true :
      filterType === 'waiting' ? order.order_type === 'takeaway_waiting' :
      filterType === 'pickup' ? order.order_type === 'takeaway_pickup' :
      true

    return matchesSearch && matchesType
  })

  const waitingOrders = filteredOrders.filter(o => o.order_type === 'takeaway_waiting')
  const pickupOrders = filteredOrders.filter(o => o.order_type === 'takeaway_pickup')
  const readyOrders = filteredOrders.filter(o => o.status === 'ready')

  const getEstimatedTime = (createdAt) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMinutes = Math.floor((now - created) / 60000)
    
    if (diffMinutes < 15) return 'Baru'
    if (diffMinutes < 30) return `${diffMinutes} menit`
    if (diffMinutes < 60) return `${Math.floor(diffMinutes / 5) * 5} menit`
    return `${Math.floor(diffMinutes / 60)} jam`
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Takeaway Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} pesanan · {readyOrders.length} siap diambil
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadTakeawayOrders}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Waiting', value: waitingOrders.length, color: 'from-yellow-500 to-orange-600', icon: Clock },
          { label: 'Pickup', value: pickupOrders.length, color: 'from-blue-500 to-indigo-600', icon: Package },
          { label: 'Ready', value: readyOrders.length, color: 'from-green-500 to-emerald-600', icon: CheckCircle },
          { label: 'Total', value: orders.length, color: 'from-purple-500 to-pink-600', icon: ShoppingBag }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari order ID atau nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex space-x-2">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'waiting', label: 'Waiting' },
            { id: 'pickup', label: 'Pickup' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setFilterType(filter.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterType === filter.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Queue */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Antrian Kosong</h2>
          <p className="text-gray-500">Tidak ada pesanan takeaway</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${
                order.status === 'ready' 
                  ? 'border-l-4 border-l-green-500 bg-green-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Queue Number */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                    #{order.id.slice(0, 4)}
                  </div>

                  {/* Order Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-500">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'ready' ? 'bg-green-100 text-green-700' :
                        order.status === 'processing' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {order.customer?.full_name || 'Guest'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items?.map(i => `${i.menus?.name} x${i.quantity}`).join(', ') || '-'}
                    </p>
                  </div>
                </div>

                {/* Right Side */}
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{getEstimatedTime(order.created_at)}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-2">
                    {order.status === 'ready' ? (
                      <>
                        <button
                          onClick={() => callCustomer(order)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600"
                        >
                          <Bell className="w-3 h-3 inline mr-1" />
                          Panggil
                        </button>
                        <button
                          onClick={() => handleMarkAsPickedUp(order.id)}
                          className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                        >
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Diambil
                        </button>
                      </>
                    ) : (
                      <>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600"
                          >
                            Proses
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                          >
                            Siap
                          </button>
                        )}
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200"
                        >
                          Batal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Call Customer Modal */}
      <AnimatePresence>
        {showCallModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCallModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Panggil Pelanggan</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Order #{selectedOrder.id.slice(0, 8)} sudah siap
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {selectedOrder.customer?.full_name?.[0] || 'G'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedOrder.customer?.full_name || 'Guest'}
                    </p>
                    {selectedOrder.customer?.phone && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {selectedOrder.customer.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleCallViaWhatsApp(selectedOrder)}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>Hubungi via WhatsApp</span>
                </button>
                <button
                  onClick={() => setShowCallModal(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}