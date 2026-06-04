import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Eye, CheckCircle, XCircle, Clock, ChefHat, Package,
  ShoppingBag, Printer, MapPin, Filter
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
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { loadOrders() }, [])
  useRealtimeOrders(() => loadOrders())

  const loadOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`*, customer:profiles!customer_id(full_name, phone), payments(*)`)
        .order('created_at', { ascending: false })
        .limit(100)
      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchSearch = !searchQuery || 
      order.id.slice(0, 8).toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.table_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    return matchSearch && matchStatus
  })

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
      if (error) throw error

      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Order #${orderId.slice(0, 8)} → ${newStatus}`,
        type: 'order_updated'
      })

      toast.success(`Order #${orderId.slice(0, 8)} → ${newStatus}`)
      loadOrders()
    } catch (error) {
      toast.error('Gagal update status')
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

  const handlePrint = (order) => {
    const printWin = window.open('', '_blank')
    printWin.document.write(`
      <html><head><title>Order #${order.id.slice(0,8)}</title>
      <style>body{font-family:Arial;padding:20px;max-width:300px;margin:auto}
      .center{text-align:center}.divider{border-top:1px dashed #000;margin:10px 0}
      .bold{font-weight:bold}.total{font-size:20px}
      @media print{body{margin:0}}</style></head>
      <body>
      <div class="center"><h3>WAROENG RCM</h3><p>Order #${order.id.slice(0,8)}</p>
      <p>${formatDateTime(order.created_at)}</p></div>
      <div class="divider"></div>
      <p>Status: ${order.status}</p><p>Tipe: ${getOrderTypeLabel(order.order_type)}</p>
      ${order.table_number ? `<p>Meja: ${order.table_number}</p>` : ''}
      <p>Kasir: ${profile?.full_name}</p>
      <div class="divider"></div>
      <p class="total">Total: ${formatCurrency(order.total_amount)}</p>
      </body></html>
    `)
    printWin.document.close()
    printWin.print()
  }

  const statusTabs = [
    { id: 'all', label: 'Semua', color: 'bg-gray-100 text-gray-700' },
    { id: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'processing', label: 'Proses', color: 'bg-orange-100 text-orange-700' },
    { id: 'ready', label: 'Siap', color: 'bg-green-100 text-green-700' },
    { id: 'completed', label: 'Selesai', color: 'bg-blue-100 text-blue-700' },
    { id: 'cancelled', label: 'Batal', color: 'bg-red-100 text-red-700' }
  ]

  const getStatusIcon = (status) => {
    const icons = { pending: Clock, confirmed: CheckCircle, processing: ChefHat, ready: Package, completed: CheckCircle, cancelled: XCircle }
    const Icon = icons[status] || Clock
    return <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Kelola Order</h1>
        <button onClick={() => setShowFilters(!showFilters)} className="sm:hidden p-2 rounded-lg bg-gray-100">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Status Tabs - Horizontal Scroll Mobile */}
      <div className="flex space-x-1 overflow-x-auto pb-2 mb-4 hide-scrollbar">
        {statusTabs.map(tab => {
          const count = tab.id === 'all' ? orders.length : orders.filter(o => o.status === tab.id).length
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                statusFilter === tab.id
                  ? 'bg-orange-500 text-white'
                  : tab.color
              }`}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Cari order..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Tidak ada order</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`bg-white rounded-xl shadow-sm border p-3 sm:p-4 ${
                order.status === 'pending' ? 'border-l-4 border-l-yellow-500' :
                order.status === 'ready' ? 'border-l-4 border-l-green-500' : 'border-gray-100'
              }`}
            >
              {/* Mobile View */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{order.status}</span>
                    </span>
                    <span className="text-xs text-gray-400">#{order.id.slice(0, 6)}</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">{order.customer?.full_name || 'Guest'}</p>
                    <p className="text-xs text-gray-400">{getOrderTypeLabel(order.order_type)}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleViewDetail(order)} className="p-1.5 rounded bg-blue-50 text-blue-600">
                      <Eye className="w-3 h-3" />
                    </button>
                    <button onClick={() => handlePrint(order)} className="p-1.5 rounded bg-gray-50 text-gray-600">
                      <Printer className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex space-x-1 mt-2">
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => updateOrderStatus(order.id, 'processing')} className="flex-1 py-1.5 bg-orange-500 text-white rounded text-xs font-medium">Proses</button>
                      <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="flex-1 py-1.5 bg-red-100 text-red-600 rounded text-xs font-medium">Batal</button>
                    </>
                  )}
                  {order.status === 'processing' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 py-1.5 bg-green-500 text-white rounded text-xs font-medium">Siap</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="flex-1 py-1.5 bg-blue-500 text-white rounded text-xs font-medium">Selesai</button>
                  )}
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1">{order.status}</span>
                  </span>
                  <div>
                    <span className="text-sm font-mono text-gray-500">#{order.id.slice(0, 8)}</span>
                    <span className="ml-2 font-bold">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{order.customer?.full_name || 'Guest'}</span>
                  <button onClick={() => handleViewDetail(order)} className="p-1.5 rounded bg-blue-50 text-blue-600"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handlePrint(order)} className="p-1.5 rounded bg-gray-50 text-gray-600"><Printer className="w-4 h-4" /></button>
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => updateOrderStatus(order.id, 'processing')} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs">Proses</button>
                      <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-xs">Batal</button>
                    </>
                  )}
                  {order.status === 'processing' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="px-3 py-1.5 bg-green-500 text-white rounded text-xs">Siap</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs">Selesai</button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Order #{selectedOrder.id.slice(0, 8)}</h3>
                <button onClick={() => setShowDetail(false)}><XCircle className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2 text-sm">
                <p>Status: <span className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</span></p>
                <p>Pelanggan: {selectedOrder.customer?.full_name || 'Guest'}</p>
                <p>Tipe: {selectedOrder.order_type}</p>
                <p>Tanggal: {formatDateTime(selectedOrder.created_at)}</p>
                {selectedOrder.items?.map(item => (
                  <div key={item.id} className="flex justify-between py-1 border-b">
                    <span>{item.menus?.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span>
                  <span className="text-orange-600">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}