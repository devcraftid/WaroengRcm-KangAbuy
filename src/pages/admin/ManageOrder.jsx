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
  ChevronDown,
  Download,
  Printer
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime, getStatusColor } from '../../utils/format'
import { useRealtimeOrders } from '../../hooks/useRealtime'
import { toast } from 'sonner'

export default function ManageOrder() {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
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
          cashier:profiles!cashier_id(full_name),
          payments(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      setOrders(data || [])
      setFilteredOrders(data || [])
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
      filtered = filtered.filter(order =>
        order.id.slice(0, 8).toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.table_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.order_type === typeFilter)
    }

    setFilteredOrders(filtered)
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

      // Create activity log
      await supabase.from('activities').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        description: `Order #${orderId.slice(0, 8)} diupdate ke status: ${newStatus}`,
        type: 'order_updated'
      })

      toast.success('Status order berhasil diupdate')
      loadOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Gagal mengupdate status order')
    }
  }

  const handleViewDetail = async (order) => {
    // Load order items
    const { data: items } = await supabase
      .from('order_items')
      .select('*, menus(*)')
      .eq('order_id', order.id)

    setSelectedOrder({ ...order, items: items || [] })
    setShowDetail(true)
  }

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Pelanggan', 'Tipe', 'Status', 'Total', 'Tanggal']
    const csvData = filteredOrders.map(order => [
      order.id.slice(0, 8),
      order.customer?.full_name || 'Guest',
      order.order_type,
      order.status,
      order.total_amount,
      new Date(order.created_at).toLocaleString('id-ID')
    ])

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Data berhasil diexport')
  }

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

  const getPaymentStatus = (payments) => {
    if (!payments || payments.length === 0) return 'Belum bayar'
    const lastPayment = payments[payments.length - 1]
    return lastPayment.status === 'completed' ? 'Lunas' : 'Menunggu'
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Order</h1>
          <p className="text-sm text-gray-500 mt-1">Total {filteredOrders.length} order</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari order ID atau nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="dine_in">Dine In</option>
            <option value="takeaway_waiting">Takeaway (Waiting)</option>
            <option value="takeaway_pickup">Takeaway (Pickup)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Order ID</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Pelanggan</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tipe</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Total</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Pembayaran</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-medium text-gray-900">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {order.customer?.full_name || 'Guest'}
                        </p>
                        {order.table_number && (
                          <p className="text-xs text-gray-500">Meja: {order.table_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600">
                        {order.order_type === 'dine_in' ? '🍽️ Dine In' :
                         order.order_type === 'takeaway_waiting' ? '🛍️ Waiting' : '📦 Pickup'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${
                        getPaymentStatus(order.payments) === 'Lunas'
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}>
                        {getPaymentStatus(order.payments)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">
                        {formatDateTime(order.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(order)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="Konfirmasi"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Batalkan"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'processing')}
                            className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                            title="Proses"
                          >
                            <ChefHat className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            title="Siap"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                            title="Selesai"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada order ditemukan</p>
            </div>
          )}
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
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Detail Order #{selectedOrder.id.slice(0, 8)}
                </h2>
                <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipe Order</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{selectedOrder.order_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pelanggan</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedOrder.customer?.full_name || 'Guest'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kasir</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedOrder.cashier?.full_name || 'System'}
                    </p>
                  </div>
                  {selectedOrder.table_number && (
                    <div>
                      <p className="text-sm text-gray-500">Meja</p>
                      <p className="text-sm font-medium text-gray-900">{selectedOrder.table_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Tanggal</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateTime(selectedOrder.created_at)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.menus?.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.price)}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Catatan</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
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