import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChefHat,
  Package,
  ShoppingBag,
  Printer,
  ChevronDown,
  MapPin
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, getStatusColor, getOrderTypeLabel } from '../../utils/format'
import { useRealtimeOrders } from '../../hooks/useRealtime'
import { toast } from 'sonner'

export default function CashierOrders() {
  const { profile } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  useRealtimeOrders(() => {
    loadOrders()
  })

  useEffect(() => {
    filterOrders()
  }, [searchQuery, statusFilter, typeFilter, orders])

  const loadOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(full_name, phone),
          payments(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Gagal memuat order')
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order =>
        order.id.slice(0, 8).toLowerCase().includes(query) ||
        order.customer?.full_name?.toLowerCase().includes(query) ||
        order.table_number?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.order_type === typeFilter)
    }

    return filtered
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

      // Create activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Order #${orderId.slice(0, 8)} diupdate ke status: ${newStatus}`,
        type: 'order_updated'
      })

      // Send notification to customer if exists
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', orderId)
        .single()

      if (order?.customer_id) {
        await supabase.from('notifications').insert({
          user_id: order.customer_id,
          title: 'Status Pesanan Diupdate',
          message: `Pesanan #${orderId.slice(0, 8)} sekarang berstatus: ${newStatus}`,
          type: 'order_updated',
          link: `/order/${orderId}`
        })
      }

      toast.success(`Order #${orderId.slice(0, 8)} diupdate ke ${newStatus}`)
      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Gagal mengupdate status order')
    }
  }

  const handleViewDetail = async (order) => {
    const { data: items } = await supabase
      .from('order_items')
      .select('*, menus(name, price)')
      .eq('order_id', order.id)

    setSelectedOrder({ ...order, items: items || [] })
    setShowDetail(true)
  }

  const handlePrintOrder = (order) => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 5px; }
            .total { font-size: 18px; font-weight: bold; text-align: right; }
            @media print { body { margin: 0; padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>WAROENG RCM KANG ABUY</h2>
            <p>Order #${order.id.slice(0, 8)}</p>
            <p>${formatDateTime(order.created_at)}</p>
          </div>
          <div class="divider"></div>
          ${order.items?.map(item => `
            <p>${item.menus?.name} x${item.quantity} - ${formatCurrency(item.subtotal)}</p>
          `).join('')}
          <div class="divider"></div>
          <p class="total">Total: ${formatCurrency(order.total_amount)}</p>
          <p>Status: ${order.status}</p>
          <p>Tipe: ${getOrderTypeLabel(order.order_type)}</p>
          ${order.table_number ? `<p>Meja: ${order.table_number}</p>` : ''}
          <p>Kasir: ${profile?.full_name}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const filteredOrders = filterOrders()
  const pendingCount = orders.filter(o => o.status === 'pending').length
  const processingCount = orders.filter(o => o.status === 'processing').length
  const readyCount = orders.filter(o => o.status === 'ready').length

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      processing: ChefHat,
      ready: Package,
      completed: CheckCircle,
      cancelled: XCircle
    }
    const Icon = icons[status] || Clock
    return <Icon className="w-4 h-4" />
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Order</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredOrders.length} order · 
            <span className="text-yellow-600 ml-1">{pendingCount} pending</span> · 
            <span className="text-orange-600 ml-1">{processingCount} processing</span> · 
            <span className="text-purple-600 ml-1">{readyCount} ready</span>
          </p>
        </div>
      </div>

      {/* Status Quick Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {[
          { id: 'all', label: 'Semua', color: 'bg-gray-100 text-gray-700' },
          { id: 'pending', label: `Pending (${pendingCount})`, color: 'bg-yellow-100 text-yellow-700' },
          { id: 'processing', label: `Processing (${processingCount})`, color: 'bg-orange-100 text-orange-700' },
          { id: 'ready', label: `Ready (${readyCount})`, color: 'bg-purple-100 text-purple-700' },
          { id: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' },
          { id: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === filter.id
                ? 'ring-2 ring-offset-2 ring-orange-500 ' + filter.color
                : filter.color + ' hover:opacity-80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari order ID, pelanggan, atau nomor meja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">Semua Tipe</option>
          <option value="dine_in">Dine In</option>
          <option value="takeaway_waiting">Takeaway Waiting</option>
          <option value="takeaway_pickup">Takeaway Pickup</option>
        </select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Ada Order</h2>
          <p className="text-gray-500">Order akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${
                order.status === 'pending' ? 'border-l-4 border-l-yellow-500' :
                order.status === 'ready' ? 'border-l-4 border-l-green-500' :
                'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Status Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                  </div>

                  {/* Order Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-500">#{order.id.slice(0, 8)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>{order.customer?.full_name || 'Guest'}</span>
                      <span>{getOrderTypeLabel(order.order_type)}</span>
                      {order.table_number && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {order.table_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetail(order)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                    title="Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handlePrintOrder(order)}
                    className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* Status Update Buttons */}
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'processing')}
                        className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600"
                      >
                        Proses
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200"
                      >
                        Batal
                      </button>
                    </>
                  )}

                  {order.status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                    >
                      Siap
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedOrder && (
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
              className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold">Detail Order #{selectedOrder.id.slice(0, 8)}</h2>
                <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">Pelanggan</p>
                    <p className="font-medium">{selectedOrder.customer?.full_name || 'Guest'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tipe</p>
                    <p className="font-medium capitalize">{selectedOrder.order_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tanggal</p>
                    <p className="font-medium">{formatDateTime(selectedOrder.created_at)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  {selectedOrder.items?.map(item => (
                    <div key={item.id} className="flex justify-between py-2 border-b border-gray-100">
                      <span>{item.menus?.name} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-1">Catatan</h3>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}