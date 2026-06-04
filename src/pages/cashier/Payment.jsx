import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Banknote, QrCode, CheckCircle, XCircle,
  ArrowLeft, Upload, Printer, DollarSign,
  ShoppingBag, MapPin, Clock, Copy, Check,
  UtensilsCrossed, Eye, Search, RefreshCw,
  AlertCircle, CreditCard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, getOrderTypeLabel } from '../../utils/format'
import { toast } from 'sonner'

export default function CashierPayment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  
  const [order, setOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  const [pendingOrders, setPendingOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [qrisProof, setQrisProof] = useState(null)
  const [qrisPreview, setQrisPreview] = useState(null)
  const [qrisImage, setQrisImage] = useState(null)
  const [copiedOrderId, setCopiedOrderId] = useState(false)

  useEffect(() => {
    loadPendingOrders()
    loadQRIS()
    if (id) loadOrderData(id)
  }, [id])

  const loadQRIS = async () => {
    try {
      const { data } = await supabase.from('website_settings').select('qris_image_url').single()
      if (data?.qris_image_url) setQrisImage(data.qris_image_url)
    } catch (e) {}
  }

  // ============================================
  // LOAD ORDER YANG PERLU DIVALIDASI
  // ============================================
  const loadPendingOrders = async () => {
    setLoadingOrders(true)
    try {
      // Ambil order yang statusnya pending & sudah ada payment-nya
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:profiles!customer_id(full_name, phone), payments(*)')
        .in('status', ['pending', 'processing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setPendingOrders(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  // Filter di frontend
  const filteredOrders = searchQuery.trim()
    ? pendingOrders.filter(o => {
        const q = searchQuery.toLowerCase()
        return o.id.slice(0, 8).toLowerCase().includes(q) ||
               (o.customer?.full_name || '').toLowerCase().includes(q) ||
               (o.table_number || '').toLowerCase().includes(q)
      })
    : pendingOrders

  // ============================================
  // LOAD ORDER DETAIL
  // ============================================
  const loadOrderData = async (orderId) => {
    setLoading(true)
    setOrder(null)
    setOrderItems([])
    setPayment(null)
    
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, customer:profiles!customer_id(full_name, phone, email)')
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) {
        toast.error('Order tidak ditemukan')
        setLoading(false)
        return
      }

      setOrder(orderData)

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*, menus(name, price, image_url)')
        .eq('order_id', orderId)

      setOrderItems(itemsData || [])

      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setPayment(payData || null)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat order')
    } finally {
      setLoading(false)
    }
  }

  const handleQrisProofChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setQrisProof(file)
      const r = new FileReader()
      r.onloadend = () => setQrisPreview(r.result)
      r.readAsDataURL(file)
    }
  }

  // ============================================
  // VALIDASI PEMBAYARAN (CASH / QRIS)
  // ============================================
  const handleValidatePayment = async () => {
    if (!order || !payment) {
      toast.error('Data payment tidak ditemukan')
      return
    }

    // Jika QRIS, wajib ada bukti
    if (payment.method === 'qris' && !payment.proof_url && !qrisProof) {
      toast.error('Belum ada bukti pembayaran QRIS')
      return
    }

    setProcessing(true)
    try {
      let proofUrl = payment.proof_url || null

      // Upload bukti jika kasir upload
      if (qrisProof) {
        const ext = qrisProof.name.split('.').pop()
        const fileName = `proof-${order.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, qrisProof, { upsert: true })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)
          proofUrl = urlData?.publicUrl || proofUrl
        }
      }

      // 1. Update payment status ke COMPLETED
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          proof_url: proofUrl,
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      // 2. Update order status ke PROCESSING
      await supabase
        .from('orders')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      // 3. Update meja (dine in)
      if (order.order_type === 'dine_in' && order.table_number) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('table_number', order.table_number)
      }

      // 4. Activity log
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Validasi pembayaran #${order.id.slice(0,8)} - ${payment.method.toUpperCase()} - ${formatCurrency(order.total_amount)}`,
        type: 'payment_validated'
      })

      // 5. Notifikasi ke customer
      if (order.customer_id) {
        await supabase.from('notifications').insert({
          user_id: order.customer_id,
          title: 'Pembayaran Divalidasi ✅',
          message: `Pembayaran order #${order.id.slice(0,8)} telah divalidasi. Pesanan sedang diproses! 🍳`,
          type: 'payment_validated',
          link: `/order/${order.id}`
        })
      }

      toast.success('Pembayaran berhasil divalidasi! ✅')
      
      // Refresh data
      loadOrderData(order.id)
      loadPendingOrders()
      
      // Print receipt
      setTimeout(() => printReceipt(), 500)

    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal validasi: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // ============================================
  // PRINT RECEIPT
  // ============================================
  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=350,height=600')
    if (!w || !order || !payment) return
    
    const items = orderItems.map(i => 
      `<tr><td>${i.menus?.name||'Menu'}</td><td align="center">${i.quantity}x</td><td align="right">${formatCurrency(i.subtotal)}</td></tr>`
    ).join('')

    w.document.write(`<html><head><title>Struk</title>
      <style>*{margin:0;padding:0}body{font-family:monospace;padding:15px;max-width:300px;margin:auto;font-size:11px}
      .c{text-align:center}.r{text-align:right}.b{font-weight:bold}.d{border-top:1px dashed #000;margin:8px 0}
      .t{font-size:15px}table{width:100%}td{padding:2px 0}@media print{body{margin:0;padding:10px}}</style></head>
      <body><div class="c"><h3>🍜 WAROENG RCM KANG ABUY</h3><p style="font-size:9px">Makanan Enak, Harga Ekonomis</p></div>
      <div class="d"></div>
      <p><b>Order:</b> #${order.id.slice(0,8)}</p>
      <p><b>Tgl:</b> ${formatDateTime(order.created_at)}</p>
      <p><b>Kasir:</b> ${profile?.full_name||'-'}</p>
      <p><b>Tipe:</b> ${getOrderTypeLabel(order.order_type)}</p>
      ${order.table_number?`<p><b>Meja:</b> ${order.table_number}</p>`:''}
      ${order.customer?.full_name?`<p><b>Customer:</b> ${order.customer.full_name}</p>`:''}
      <div class="d"></div><table>${items}</table><div class="d"></div>
      <p class="t r">Total: ${formatCurrency(order.total_amount)}</p>
      <p><b>Metode:</b> ${payment.method==='cash'?'💵 Cash':'📱 QRIS'}</p>
      <div class="d"></div><div class="c"><p>Terima kasih!</p></div></body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const copyOrderId = () => {
    navigator.clipboard?.writeText(order?.id||'')
    setCopiedOrderId(true)
    setTimeout(() => setCopiedOrderId(false), 2000)
  }

  const handleBack = () => {
    setOrder(null)
    setOrderItems([])
    setPayment(null)
    navigate('/cashier/payment')
  }

  // ============================================
  // GET PAYMENT STATUS INFO
  // ============================================
  const getPaymentStatusInfo = () => {
    if (!order || !payment) return null
    
    const isCompleted = payment.status === 'completed'
    const isPending = payment.status === 'pending'
    const method = payment.method

    if (isCompleted) {
      return {
        icon: CheckCircle,
        color: 'text-green-600 bg-green-100',
        title: 'Sudah Dibayar ✅',
        desc: `Divalidasi oleh: ${payment.validated_by ? 'Kasir' : 'Sistem'} pada ${formatDateTime(payment.validated_at || payment.created_at)}`,
        label: 'LUNAS'
      }
    }

    if (isPending && method === 'qris') {
      return {
        icon: AlertCircle,
        color: 'text-yellow-600 bg-yellow-100',
        title: 'Menunggu Validasi',
        desc: 'Customer sudah upload bukti pembayaran QRIS. Silakan validasi.',
        label: 'PERLU VALIDASI'
      }
    }

    if (isPending && method === 'cash') {
      return {
        icon: AlertCircle,
        color: 'text-blue-600 bg-blue-100',
        title: 'Menunggu Konfirmasi',
        desc: 'Pembayaran cash perlu dikonfirmasi.',
        label: 'KONFIRMASI'
      }
    }

    return {
      icon: AlertCircle,
      color: 'text-gray-600 bg-gray-100',
      title: 'Belum Dibayar',
      desc: 'Belum ada data pembayaran.',
      label: 'BELUM BAYAR'
    }
  }

  const statusInfo = getPaymentStatusInfo()

  // ============================================
  // DETAIL ORDER VIEW
  // ============================================
  if (order) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <button onClick={handleBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-5 h-5 mr-1" /><span className="text-sm">Kembali ke Daftar</span>
        </button>

        {/* Status Banner */}
        {statusInfo && (
          <div className={`rounded-2xl p-4 mb-4 flex items-center space-x-4 ${statusInfo.color}`}>
            <statusInfo.icon className="w-10 h-10 flex-shrink-0" />
            <div>
              <h2 className="font-bold text-lg">{statusInfo.title}</h2>
              <p className="text-sm opacity-80">{statusInfo.desc}</p>
            </div>
            <span className="ml-auto text-xs font-bold px-3 py-1 bg-white rounded-full">{statusInfo.label}</span>
          </div>
        )}

        {/* Order Detail */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-orange-500" />Order #{order.id.slice(0,8)}
            </h2>
            <button onClick={copyOrderId} className="flex items-center text-xs text-gray-500">
              {copiedOrderId ? <><Check className="w-3 h-3 mr-1 text-green-500" />Disalin</> : <><Copy className="w-3 h-3 mr-1" />Salin ID</>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><p className="text-gray-500 text-xs">Customer</p><p className="font-medium">{order.customer?.full_name || 'Guest'}</p></div>
            <div><p className="text-gray-500 text-xs">Tipe</p><p className="font-medium">{getOrderTypeLabel(order.order_type)}</p></div>
            <div><p className="text-gray-500 text-xs">Status Order</p><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{order.status}</span></div>
            {order.table_number && <div><p className="text-gray-500 text-xs">Meja</p><p className="font-medium flex items-center"><MapPin className="w-3 h-3 mr-1" />{order.table_number}</p></div>}
            <div className="col-span-2"><p className="text-gray-500 text-xs">Tanggal</p><p className="text-xs flex items-center"><Clock className="w-3 h-3 mr-1" />{formatDateTime(order.created_at)}</p></div>
          </div>

          {/* Payment Info */}
          {payment && (
            <div className={`p-3 rounded-xl mb-3 ${
              payment.method === 'cash' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className="text-sm font-medium">
                Metode Pembayaran: {payment.method === 'cash' ? '💵 Cash' : '📱 QRIS'}
              </p>
              <p className="text-xs mt-1">
                Status: <span className={`font-medium ${
                  payment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                }`}>{payment.status === 'completed' ? 'Lunas' : 'Menunggu Validasi'}</span>
              </p>
            </div>
          )}

          {/* Order Items */}
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold mb-2">Items</h3>
            {orderItems.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.menus?.image_url ? <img src={item.menus.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <UtensilsCrossed className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="min-w-0"><p className="text-xs font-medium truncate">{item.menus?.name}</p><p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.price)}</p></div>
                </div>
                <span className="text-xs font-semibold ml-2">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t mt-3 pt-3 flex justify-between items-center">
            <span className="text-base font-semibold">Total</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Validasi Pembayaran */}
        {payment && payment.status !== 'completed' && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-orange-500" />
              Validasi Pembayaran
            </h3>

            {/* QRIS: tampilkan bukti */}
            {payment.method === 'qris' && (
              <div className="space-y-3 mb-4">
                {payment.proof_url && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium mb-2">📎 Bukti dari Customer:</p>
                    <img src={payment.proof_url} alt="Bukti Pembayaran" className="max-h-48 mx-auto rounded-lg border" />
                  </div>
                )}
                {!payment.proof_url && (
                  <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">
                    <AlertCircle className="w-5 h-5 inline mr-1" />
                    Customer belum upload bukti pembayaran. Silakan upload di bawah atau minta customer mengirim bukti.
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Bukti (Opsional)</label>
                  <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-400 block">
                    {qrisPreview ? (
                      <div><img src={qrisPreview} alt="Preview" className="max-h-32 mx-auto rounded-lg mb-2" /><span className="text-xs text-red-500">Klik untuk ganti</span></div>
                    ) : (
                      <div><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Klik upload bukti</p></div>
                    )}
                    <input type="file" accept="image/*" onChange={handleQrisProofChange} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Tombol Validasi */}
            <button
              onClick={handleValidatePayment}
              disabled={processing || (payment.method === 'qris' && !payment.proof_url && !qrisProof)}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all text-base flex items-center justify-center"
            >
              {processing ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memvalidasi...</>
              ) : (
                <><CheckCircle className="w-5 h-5 mr-2" />Validasi Pembayaran {payment.method === 'cash' ? 'Cash' : 'QRIS'}</>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center mt-2">
              Setelah divalidasi, status order akan berubah menjadi "Diproses" dan customer akan mendapat notifikasi.
            </p>
          </div>
        )}

        {/* Sudah Dibayar - Cetak Ulang */}
        {payment && payment.status === 'completed' && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Pembayaran sudah divalidasi</p>
            <button onClick={printReceipt} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              <Printer className="w-4 h-4 inline mr-1" />Cetak Ulang Struk
            </button>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // DAFTAR ORDER VIEW
  // ============================================
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pembayaran</h1>
          <p className="text-sm text-gray-500 mt-1">{filteredOrders.length} order</p>
        </div>
        <button onClick={loadPendingOrders} disabled={loadingOrders}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Cari Order ID atau nama..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>

      {loadingOrders ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => (<div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>))}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tidak Ada Order</h2>
          <p className="text-sm text-gray-500">Semua order sudah dibayar 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map(o => {
            const orderPayment = o.payments?.[0]
            const isPaid = orderPayment?.status === 'completed'
            const needsValidation = orderPayment && orderPayment.status === 'pending'
            
            return (
              <motion.button
                key={o.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  navigate(`/cashier/payment/${o.id}`)
                  loadOrderData(o.id)
                }}
                className="w-full bg-white rounded-xl p-4 shadow-sm border hover:border-orange-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isPaid ? 'bg-green-500' : needsValidation ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="font-mono text-sm font-medium">#{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">
                        {o.customer?.full_name || 'Guest'} · {getOrderTypeLabel(o.order_type)}
                        {o.table_number ? ` · Meja ${o.table_number}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(o.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isPaid ? 'bg-green-100 text-green-700' :
                      needsValidation ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {isPaid ? '✅ Lunas' : needsValidation ? '⚠️ Perlu Validasi' : 'Belum Bayar'}
                    </span>
                    {orderPayment && (
                      <span className="text-xs text-gray-400 block mt-0.5">
                        {orderPayment.method === 'cash' ? '💵 Cash' : '📱 QRIS'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}