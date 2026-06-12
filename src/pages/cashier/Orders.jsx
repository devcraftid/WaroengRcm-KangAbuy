import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Eye, CheckCircle, XCircle, Clock, ChefHat, Package,
  ShoppingBag, Printer, MapPin, RefreshCw, CreditCard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, getStatusColor, getOrderTypeLabel } from '../../utils/format'
import { useRealtimeOrders } from '../../hooks/useRealtime'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { playOrderNewSound, playOrderProcessingSound, playOrderCompletedSound } from '../../utils/sound'

export default function CashierOrders() {
  const { profile } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => { loadOrders() }, [])
  useRealtimeOrders((payload) => {
    // Play suara pesanan baru saat ada INSERT
    if (payload?.eventType === 'INSERT') {
      playOrderNewSound()
    }
    loadOrders()
  })

  const loadOrders = async () => {
    try {
      // Ambil order dengan payment dan customer_name
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:profiles!customer_id(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Ambil payment untuk setiap order
      const ordersWithPayment = await Promise.all(
        (data || []).map(async (order) => {
          const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          return {
            ...order,
            payments: payments || [],
            // Nama tampil: dari profil (login) atau dari field order (guest)
            display_name: order.customer?.full_name || order.customer_name || 'Guest',
            display_phone: order.customer?.phone || order.customer_phone || null,
          }
        })
      )

      setOrders(ordersWithPayment)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat order')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchSearch = !searchQuery || 
      order.id.slice(0, 8).toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.table_number?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    return matchSearch && matchStatus
  })

  // ============================================
  // UPDATE STATUS ORDER (PROSES → SIAP → SELESAI)
  // ============================================
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
      
      if (error) throw error

      // Activity log
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Order #${orderId.slice(0,8)} → ${newStatus}`,
        type: 'order_updated'
      })

      // Notifikasi customer
      const { data: orderData } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', orderId)
        .single()

      if (orderData?.customer_id) {
        const labels = {
          processing: 'sedang diproses 👨‍🍳',
          ready: 'siap diambil! 📦',
          completed: 'selesai ✅'
        }
        
        await supabase.from('notifications').insert({
          user_id: orderData.customer_id,
          title: 'Status Pesanan Diupdate',
          message: `Pesanan #${orderId.slice(0,8)} ${labels[newStatus] || newStatus}`,
          type: 'order_updated',
          link: `/order/${orderId}`
        })
      }

      toast.success(`Order #${orderId.slice(0,8)} → ${newStatus}`)
      // Play suara sesuai status baru
      if (newStatus === 'processing') playOrderProcessingSound()
      else if (newStatus === 'ready' || newStatus === 'completed') playOrderCompletedSound()
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
    const w = window.open('', '_blank', 'width=350,height=600')
    if (!w) return
    
    const pay = order.payments?.[0]
    
    w.document.write(`<html><head><title>Order #${order.id.slice(0,8)}</title>
      <style>*{margin:0;padding:0}body{font-family:monospace;padding:15px;max-width:300px;margin:auto;font-size:11px}
      .c{text-align:center}.d{border-top:1px dashed #000;margin:8px 0}.t{font-size:15px;font-weight:bold}
      @media print{body{margin:0;padding:10px}}</style></head>
      <body><div class="c"><h3>🍜 WAROENG RCM</h3><p>Order #${order.id.slice(0,8)}</p>
      <p>${formatDateTime(order.created_at)}</p></div><div class="d"></div>
      <p>Status: ${order.status}</p><p>Tipe: ${getOrderTypeLabel(order.order_type)}</p>
      ${order.table_number?`<p>Meja: ${order.table_number}</p>`:''}
      <p>Kasir: ${profile?.full_name||'-'}</p>
      ${pay?`<p>Bayar: ${pay.method==='cash'?'💵 Cash':'📱 QRIS'} - ${pay.status==='completed'?'Lunas':'Pending'}</p>`:''}
      <div class="d"></div><p class="t">Total: ${formatCurrency(order.total_amount)}</p></body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  // Payment status helper
  const getPaymentStatus = (order) => {
    const pay = order.payments?.[0]
    if (!pay) return { label: 'Belum Bayar', color: 'bg-red-100 text-red-700', icon: XCircle }
    if (pay.status === 'completed') return { label: 'Lunas', color: 'bg-green-100 text-green-700', icon: CheckCircle }
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
  }

  const statusTabs = [
    { id: 'all', label: 'Semua' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Proses' },
    { id: 'ready', label: 'Siap' },
    { id: 'completed', label: 'Selesai' },
    { id: 'cancelled', label: 'Batal' }
  ]

  const getStatusIcon = (status) => {
    const icons = { pending: Clock, processing: ChefHat, ready: Package, completed: CheckCircle, cancelled: XCircle }
    const Icon = icons[status] || Clock
    return <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Order</h1>
          <p className="text-xs text-gray-500">{filteredOrders.length} order</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/cashier/payment" className="px-4 py-2 bg-gradient-to-r from-[#f05a28] to-[#d44d1f] text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all flex items-center">
            <CreditCard className="w-4 h-4 mr-1.5" />Pembayaran
          </Link>
          <button onClick={loadOrders} className="p-2 rounded-xl bg-white border border-gray-100 hover:border-orange-200 text-gray-500 hover:text-orange-500 hover:shadow-sm transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-2 mb-4 hide-scrollbar">
        {statusTabs.map(tab => {
          const count = tab.id === 'all' ? orders.length : orders.filter(o => o.status === tab.id).length
          return (
              <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                  statusFilter === tab.id ? 'bg-[#f05a28] text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                }`}>
                {tab.label} ({count})
              </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Cari order..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>)}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Tidak ada order</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(order => {
            const payInfo = getPaymentStatus(order)
            const PayIcon = payInfo.icon
            
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-4 sm:p-5 relative overflow-hidden group ${
                  order.status === 'pending' ? 'border-l-4 border-l-amber-400' :
                  order.status === 'ready' ? 'border-l-4 border-l-emerald-400' :
                  order.status === 'processing' ? 'border-l-4 border-l-orange-400' :
                  order.status === 'completed' ? 'border-l-4 border-l-emerald-500' :
                  'border-l-4 border-l-gray-300'
                }`}>
                
                {/* Mobile View */}
                <div className="sm:hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}{order.status}
                      </span>
                      <span className="text-xs text-gray-400">#{order.id.slice(0,6)}</span>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(order.total_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs">{order.display_name}</p>
                      <p className="text-xs text-gray-400">{getOrderTypeLabel(order.order_type)}</p>
                      <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded-full ${payInfo.color}`}>
                        <PayIcon className="w-2.5 h-2.5 mr-0.5" />{payInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleViewDetail(order)} className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handlePrint(order)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Printer className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {/* Action Buttons - HANYA JIKA SUDAH LUNAS */}
                  {payInfo.label === 'Lunas' && (
                    <div className="flex space-x-2 mt-3">
                      {order.status === 'pending' && (
                        <button onClick={() => updateOrderStatus(order.id, 'processing')} className="flex-1 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold rounded-xl text-xs transition-colors">Masak/Proses</button>
                      )}
                      {order.status === 'processing' && (
                        <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 py-2 bg-[#f05a28] text-white hover:bg-[#d44d1f] font-bold rounded-xl text-xs shadow-sm transition-colors">Pesanan Siap</button>
                      )}
                      {order.status === 'ready' && (
                        <button onClick={() => updateOrderStatus(order.id, 'completed')} className="flex-1 py-2 bg-emerald-500 text-white hover:bg-emerald-600 font-bold rounded-xl text-xs shadow-sm transition-colors">Selesai</button>
                      )}
                    </div>
                  )}
                  {/* Jika belum lunas, tampilkan tombol bayar */}
                  {payInfo.label !== 'Lunas' && order.status === 'pending' && (
                    <div className="flex space-x-2 mt-3">
                      <Link to={`/cashier/payment/${order.id}`} className="flex-1 py-2 bg-gradient-to-r from-[#f05a28] to-[#d44d1f] text-white rounded-xl text-xs font-bold text-center shadow-sm">
                        💰 Bayar
                      </Link>
                      <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-colors">Batalkan</button>
                    </div>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}{order.status}
                    </span>
                    <div>
                      <span className="font-mono text-sm">#{order.id.slice(0,8)}</span>
                      <span className="ml-2 font-bold">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${payInfo.color}`}>
                      <PayIcon className="w-3 h-3 mr-0.5" />{payInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-700 mr-2">{order.display_name}</span>
                    <button onClick={() => handleViewDetail(order)} className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handlePrint(order)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"><Printer className="w-4 h-4" /></button>
                    
                    {/* HANYA jika LUNAS */}
                    {payInfo.label === 'Lunas' && (
                      <>
                        {order.status === 'pending' && (
                          <button onClick={() => updateOrderStatus(order.id, 'processing')} className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold rounded-xl text-xs ml-2 transition-colors">Masak/Proses</button>
                        )}
                        {order.status === 'processing' && (
                          <button onClick={() => updateOrderStatus(order.id, 'ready')} className="px-4 py-2 bg-[#f05a28] text-white hover:bg-[#d44d1f] font-bold rounded-xl text-xs ml-2 shadow-sm transition-colors">Pesanan Siap</button>
                        )}
                        {order.status === 'ready' && (
                          <button onClick={() => updateOrderStatus(order.id, 'completed')} className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 font-bold rounded-xl text-xs ml-2 shadow-sm transition-colors">Selesai</button>
                        )}
                      </>
                    )}
                    
                    {/* Jika BELUM LUNAS */}
                    {payInfo.label !== 'Lunas' && order.status === 'pending' && (
                      <>
                        <Link to={`/cashier/payment/${order.id}`} className="px-4 py-2 bg-gradient-to-r from-[#f05a28] to-[#d44d1f] text-white rounded-xl text-xs font-bold ml-2 shadow-sm">💰 Bayar</Link>
                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-xs ml-2 transition-colors">Batalkan</button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Order #{selectedOrder.id.slice(0,8)}</h3>
                <button onClick={() => setShowDetail(false)}><XCircle className="w-5 h-5" /></button>
              </div>
              
              {/* Payment Info */}
              {selectedOrder.payments?.[0] && (
                <div className={`p-3 rounded-xl mb-3 ${
                  selectedOrder.payments[0].status === 'completed' ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <p className="text-sm font-medium">
                    {selectedOrder.payments[0].method === 'cash' ? '💵 Cash' : '📱 QRIS'} - 
                    <span className={selectedOrder.payments[0].status === 'completed' ? 'text-green-600' : 'text-yellow-600'}>
                      {selectedOrder.payments[0].status === 'completed' ? ' Lunas' : ' Pending'}
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <p>Status: <span className={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</span></p>
                <p>Customer: <strong>{selectedOrder.display_name}</strong></p>
                {selectedOrder.display_phone && <p className="text-gray-500">📞 {selectedOrder.display_phone}</p>}
                <p>Tipe: {getOrderTypeLabel(selectedOrder.order_type)}</p>
                <p>Tgl: {formatDateTime(selectedOrder.created_at)}</p>
                {selectedOrder.table_number && <p>Meja: {selectedOrder.table_number}</p>}
                {selectedOrder.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
                    <p className="text-xs font-semibold text-amber-700 mb-0.5">📝 Catatan Pesanan</p>
                    <p className="text-xs text-amber-800">{selectedOrder.notes}</p>
                  </div>
                )}
                <div className="border-t pt-2">
                {selectedOrder.items?.map(item => (
                  <div key={item.id} className="flex justify-between py-1 border-b">
                    <span>{item.menus?.name} x{item.quantity}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
                </div>
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total</span><span className="text-orange-600">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}