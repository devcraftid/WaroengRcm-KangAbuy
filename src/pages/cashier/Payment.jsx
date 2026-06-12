import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Banknote, QrCode, CheckCircle, XCircle,
  ArrowLeft, Printer, DollarSign,
  ShoppingBag, MapPin, Clock, Copy, Check,
  UtensilsCrossed, Search, RefreshCw,
  AlertCircle, Eye, CreditCard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, getOrderTypeLabel } from '../../utils/format'
import { toast } from 'sonner'
import { playPaymentSuccessSound } from '../../utils/sound'

export default function CashierPayment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  
  const [order, setOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [showProofModal, setShowProofModal] = useState(false)
  const [proofImage, setProofImage] = useState(null)
  const [copiedOrderId, setCopiedOrderId] = useState(false)

  useEffect(() => {
    console.log('🔄 Payment page mounted')
    loadAllOrders()
    if (id) {
      console.log('📋 Loading order detail:', id.slice(0,8))
      loadOrderDetail(id)
    }
  }, [id])

  // ============================================
  // LOAD ALL ORDERS - PAKAI SQL MENTAH
  // ============================================
  const loadAllOrders = async () => {
    setLoadingOrders(true)
    setOrders([])
    
    try {
      console.log('📊 Fetching orders...')
      
      // AMBIL SEMUA ORDER DULU (TANPA FILTER)
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('❌ Error:', error)
        toast.error('Gagal memuat order: ' + error.message)
        setLoadingOrders(false)
        return
      }

      console.log('📊 Total orders in database:', allOrders?.length || 0)
      
      if (!allOrders || allOrders.length === 0) {
        console.log('⚠️ No orders found in database')
        setOrders([])
        setLoadingOrders(false)
        return
      }

      // Log semua status order
      const statusCounts = {}
      allOrders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
      })
      console.log('📊 Status counts:', statusCounts)

      // AMBIL SEMUA ORDER (TAMPILKAN SEMUA)
      const enrichedOrders = []
      
      for (const o of allOrders) {
        // Ambil payment
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', o.id)
          .order('created_at', { ascending: false })

        // Ambil customer
        let customer = null
        if (o.customer_id) {
          const { data: cust } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', o.customer_id)
            .maybeSingle()
          customer = cust
        }

        enrichedOrders.push({
          ...o,
          payments: payments || [],
          customer: customer
        })
      }

      console.log('📊 Enriched orders:', enrichedOrders.length)
      console.log('📊 Sample order:', enrichedOrders[0] ? {
        id: enrichedOrders[0].id.slice(0,8),
        status: enrichedOrders[0].status,
        hasPayment: enrichedOrders[0].payments?.length > 0,
        paymentStatus: enrichedOrders[0].payments?.[0]?.status
      } : 'none')
      
      setOrders(enrichedOrders)

    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Gagal memuat order')
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  // Filter - TAMPILKAN SEMUA order (tidak hanya pending)
  const filteredOrders = searchQuery.trim()
    ? orders.filter(o => {
        const q = searchQuery.toLowerCase()
        return (o.id || '').toLowerCase().includes(q) ||
               (o.customer?.full_name || '').toLowerCase().includes(q) ||
               (o.table_number || '').toLowerCase().includes(q)
      })
    : orders

  // ============================================
  // LOAD ORDER DETAIL
  // ============================================
  const loadOrderDetail = async (orderId) => {
    setLoading(true)
    setOrder(null)
    setOrderItems([])
    setPayment(null)
    
    try {
      console.log('📋 Loading detail for:', orderId.slice(0,8))
      
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError || !orderData) {
        console.error('❌ Order not found:', orderError)
        toast.error('Order tidak ditemukan')
        setLoading(false)
        return
      }

      console.log('✅ Order found:', { 
        id: orderData.id.slice(0,8), 
        status: orderData.status 
      })

      // Customer dari profil (jika login) atau dari field order (jika guest)
      let customer = null
      if (orderData.customer_id) {
        const { data: cust } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', orderData.customer_id)
          .maybeSingle()
        customer = cust
      }

      // Gabungkan: prioritaskan profil, fallback ke field order
      setOrder({
        ...orderData,
        customer,
        display_name: customer?.full_name || orderData.customer_name || 'Guest',
        display_phone: customer?.phone || orderData.customer_phone || null,
      })

      // Items
      const { data: items } = await supabase
        .from('order_items')
        .select('*, menus(name, price, image_url)')
        .eq('order_id', orderId)

      setOrderItems(items || [])
      console.log('✅ Items:', items?.length || 0)

      // Payment
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setPayment(payData || null)
      console.log('✅ Payment:', payData ? payData.status : 'none')

    } catch (error) {
      console.error('❌ Error:', error)
      toast.error('Gagal memuat order')
    } finally {
      setLoading(false)
    }
  }

  const handleViewProof = (proofUrl) => {
    setProofImage(proofUrl)
    setShowProofModal(true)
  }

  // ============================================
  // VALIDASI PEMBAYARAN
  // ============================================
  const handleValidatePayment = async () => {
    if (!order) {
      toast.error('Order tidak ditemukan')
      return
    }

    setValidating(true)
    
    try {
      console.log('💳 Validating payment for order:', order.id.slice(0,8))
      
      if (payment) {
        // === CEK STATUS PAKASIR JIKA QRIS ===
        if (payment.method === 'qris') {
          const projectSlug = import.meta.env.VITE_PAKASIR_PROJECT_SLUG
          const apiKey = import.meta.env.VITE_PAKASIR_API_KEY
          
          if (projectSlug && apiKey) {
            try {
              const res = await fetch(`/api/pakasir/transactiondetail?project=${projectSlug}&amount=${payment.amount}&order_id=${order.id}&api_key=${apiKey}`)
              const text = await res.text()
              let data;
              try {
                data = JSON.parse(text)
              } catch (e) {
                throw new Error(`Bukan JSON. Status: ${res.status}. Isi: ${text}`)
              }
              const isPaid = data?.transaction?.status === 'completed' || data?.transaction?.status === 'success' || data?.transaction?.status === 'paid' || data?.status === 'completed' || data?.status === 'success' || data?.status === 'paid'
              
              if (!isPaid) {
                toast.error('Pembayaran QRIS belum masuk di sistem Pakasir!')
                setValidating(false)
                return
              }
              // Jika sudah dibayar, lanjut update ke Supabase
            } catch (err) {
              console.error('Pakasir Check Error:', err)
              // Jika gagal koneksi ke Pakasir, kita bisa tanyakan apakah kasir mau paksa manual atau tidak.
              // Untuk saat ini, asumsikan kita butuh kepastian dari Pakasir.
              toast.error('Gagal mengecek status ke Pakasir.')
              setValidating(false)
              return
            }
          } else {
            // Fallback manual jika API Key tidak dikonfigurasi
            console.log('Pakasir belum dikonfigurasi, menggunakan validasi manual.')
          }
        }
        
        // Update existing payment
        const { error: payError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            validated_by: profile?.id,
            validated_at: new Date().toISOString()
          })
          .eq('id', payment.id)

        if (payError) {
          console.error('❌ Payment update error:', payError)
          throw payError
        }
        console.log('✅ Payment updated to COMPLETED')
      } else {
        // Create new payment
        const { error: createError } = await supabase
          .from('payments')
          .insert({
            order_id: order.id,
            amount: order.total_amount,
            method: 'cash',
            status: 'completed',
            validated_by: profile?.id,
            validated_at: new Date().toISOString()
          })

        if (createError) {
          console.error('❌ Payment create error:', createError)
          throw createError
        }
        console.log('✅ New payment created')
      }

      // Update order ke processing
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      if (orderError) {
        console.error('❌ Order update error:', orderError)
      } else {
        console.log('✅ Order updated to PROCESSING')
      }

      // Activity log
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Pembayaran #${order.id.slice(0,8)} - ${formatCurrency(order.total_amount)}`,
        type: 'payment_validated'
      })

      toast.success('Pembayaran SUKSES! ✅')
      // Play suara pembayaran lunas
      playPaymentSuccessSound()
      
      // Refresh data
      loadOrderDetail(order.id)
      loadAllOrders()
      
      setTimeout(() => printReceipt(), 500)

    } catch (error) {
      console.error('❌ Validation error:', error)
      toast.error('Gagal: ' + error.message)
    } finally {
      setValidating(false)
    }
  }

  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=350,height=600')
    if (!w || !order) return
    
    const items = orderItems.map(i => 
      `<tr><td>${i.menus?.name||'Menu'}</td><td align="center">${i.quantity}x</td><td align="right">${formatCurrency(i.subtotal)}</td></tr>`
    ).join('')

    w.document.write(`<html><head><title>Struk</title>
      <style>*{margin:0;padding:0}body{font-family:monospace;padding:15px;max-width:300px;margin:auto;font-size:11px}
      .c{text-align:center}.d{border-top:1px dashed #000;margin:8px 0}.t{font-size:15px}
      table{width:100%}td{padding:2px 0}@media print{body{margin:0;padding:10px}}</style></head>
      <body><div class="c"><h3>🍜 WAROENG RCM</h3></div><div class="d"></div>
      <p><b>Order:</b> #${order.id.slice(0,8)}</p><p><b>Tgl:</b> ${formatDateTime(order.created_at)}</p>
      <p><b>Kasir:</b> ${profile?.full_name||'-'}</p>
      <div class="d"></div><table>${items}</table><div class="d"></div>
      <p class="t r">Total: ${formatCurrency(order.total_amount)}</p>
      <p><b>Status:</b> ✅ LUNAS</p><div class="d"></div><div class="c"><p>Terima kasih!</p></div></body></html>`)
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

  const handleViewProof = (url) => {
    setProofImage(url)
    setShowProofModal(true)
  }

  // ============================================
  // ORDER DETAIL VIEW
  // ============================================
  if (order) {
    const isPaid = payment?.status === 'completed'

    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <button onClick={handleBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-5 h-5 mr-1" /><span className="text-sm">Kembali ke Daftar</span>
        </button>

        {/* Status */}
        <div className={`rounded-2xl p-4 mb-4 flex items-center space-x-4 ${
          isPaid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          {isPaid ? <CheckCircle className="w-10 h-10 text-green-600" /> : <AlertCircle className="w-10 h-10 text-yellow-600" />}
          <div>
            <h2 className="font-bold text-lg">{isPaid ? 'SUKSES ✅' : 'Perlu Pembayaran'}</h2>
            <p className="text-sm opacity-80">
              {isPaid ? `Divalidasi ${formatDateTime(payment.validated_at)}` : 'Klik tombol di bawah untuk konfirmasi'}
            </p>
          </div>
        </div>

        {/* Order Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 mb-4">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-bold">Order #{order.id.slice(0,8)}</h2>
            <button onClick={copyOrderId} className="text-xs text-gray-500">
              {copiedOrderId ? <><Check className="w-3 h-3 mr-1 text-green-500" />Disalin</> : <><Copy className="w-3 h-3 mr-1" />Salin</>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="font-medium">{order.display_name}</p>
              {order.display_phone && (
                <p className="text-xs text-gray-400">{order.display_phone}</p>
              )}
            </div>
            <div><p className="text-xs text-gray-500">Tipe</p><p className="font-medium">{getOrderTypeLabel(order.order_type)}</p></div>
            <div><p className="text-xs text-gray-500">Status Order</p><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{order.status}</span></div>
            {order.table_number && <div><p className="text-xs text-gray-500">Meja</p><p className="font-medium">{order.table_number}</p></div>}
            <div className="col-span-2"><p className="text-xs text-gray-500">Tanggal</p><p className="text-xs">{formatDateTime(order.created_at)}</p></div>
            {order.notes && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">📝 Catatan Pesanan</p>
                <p className="text-xs text-amber-800">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Payment Info */}
          {payment ? (
            <div className={`p-3 rounded-xl mb-3 ${payment.method === 'cash' ? 'bg-green-50' : 'bg-blue-50'}`}>
              <p className="text-sm">
                {payment.method === 'cash' ? '💵 Cash' : '📱 QRIS'} · 
                <span className={isPaid ? 'text-green-600 font-bold ml-1' : 'text-yellow-600 ml-1'}>
                  {isPaid ? 'LUNAS' : 'PENDING'}
                </span>
              </p>
              {payment.proof_url && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewProof(payment.proof_url)
                  }} 
                  className="text-xs text-blue-600 hover:underline mt-1 font-medium flex items-center"
                >
                  <Eye className="w-4 h-4 mr-1" /> Lihat Bukti
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 bg-red-50 rounded-xl mb-3">
              <p className="text-sm text-red-600">⚠️ Belum ada data pembayaran</p>
            </div>
          )}

          {/* Items */}
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold mb-2">Items</h3>
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs">
                    {item.menus?.image_url ? <img src={item.menus.image_url} alt="" className="w-full h-full object-cover rounded" /> : '🍽️'}
                  </span>
                  <span>{item.menus?.name} x{item.quantity}</span>
                </span>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t mt-3 pt-3 flex justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Tombol Bayar - SELALU TAMPIL jika belum lunas */}
        {!isPaid && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
            <h3 className="text-lg font-bold mb-3">Konfirmasi Pembayaran</h3>
            <p className="text-sm text-gray-500 mb-4">
              {payment?.method === 'qris' 
                ? 'Klik tombol di bawah untuk mengecek status pembayaran ke sistem Pakasir.' 
                : payment 
                  ? 'Klik tombol di bawah untuk mengkonfirmasi pembayaran tunai.' 
                  : 'Belum ada data pembayaran. Klik tombol di bawah untuk membuat pembayaran.'}
            </p>
            <button
              onClick={handleValidatePayment}
              disabled={validating}
              className={`w-full py-4 ${payment?.method === 'qris' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'} text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all text-base flex items-center justify-center`}
            >
              {validating ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memproses...</>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {payment?.method === 'qris' ? 'Cek Status & Sinkronisasi Pakasir' : 'Konfirmasi Pembayaran → SUKSES'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Sudah Lunas */}
        {isPaid && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-700 mb-1">Pembayaran SUKSES ✅</h3>
            <p className="text-sm text-gray-500 mb-3">
              Divalidasi oleh {profile?.full_name || 'Kasir'} pada {formatDateTime(payment.validated_at)}
            </p>
            <button onClick={printReceipt} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              <Printer className="w-4 h-4 inline mr-1" />Cetak Struk
            </button>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // DAFTAR ORDER VIEW
  // ============================================
  // Hitung yang perlu bayar
  const needPayment = filteredOrders.filter(o => {
    const pay = o.payments?.[0]
    return !pay || pay.status !== 'completed'
  })
  const alreadyPaid = filteredOrders.filter(o => o.payments?.[0]?.status === 'completed')

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pembayaran</h1>
          <p className="text-sm text-gray-500 mt-1">
            Total {filteredOrders.length} order · 
            <span className="text-yellow-600 ml-1">{needPayment.length} perlu bayar</span> · 
            <span className="text-green-600 ml-1">{alreadyPaid.length} sudah lunas</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link to="/cashier/orders" className="px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200">
            ← Orders
          </Link>
          <button onClick={loadAllOrders} disabled={loadingOrders}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">
            <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Cari Order ID atau nama pelanggan..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
        </div>
      </div>

      {/* Loading */}
      {loadingOrders ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Order</h2>
          <p className="text-sm text-gray-500 mb-4">
            Buat order di POS atau tunggu customer checkout
          </p>
          <div className="flex justify-center space-x-3">
            <button onClick={loadAllOrders} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
              🔄 Refresh
            </button>
            <Link to="/cashier/pos" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
              🛒 Buat Order (POS)
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Perlu Bayar Section */}
          {needPayment.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" /> Perlu Pembayaran ({needPayment.length})
              </h3>
              <div className="space-y-2">
                {needPayment.map(o => (
                  <motion.button
                    key={o.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      navigate(`/cashier/payment/${o.id}`)
                      loadOrderDetail(o.id)
                    }}
                    className="w-full bg-white rounded-xl p-4 shadow-sm border border-yellow-200 hover:border-orange-300 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                        <div>
                          <p className="font-mono text-sm font-medium">#{o.id.slice(0,8)}</p>
                          <p className="text-xs text-gray-500">
                            {o.customer?.full_name || 'Guest'} · {getOrderTypeLabel(o.order_type)}
                            {o.table_number ? ` · Meja ${o.table_number}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(o.total_amount)}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                          ⚠️ BAYAR
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Sudah Lunas Section */}
          {alreadyPaid.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" /> Sudah Lunas ({alreadyPaid.length})
              </h3>
              <div className="space-y-2 opacity-70">
                {alreadyPaid.map(o => (
                  <div key={o.id} className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <div>
                          <p className="font-mono text-sm font-medium">#{o.id.slice(0,8)}</p>
                          <p className="text-xs text-gray-500">
                            {o.customer?.full_name || 'Guest'} · {getOrderTypeLabel(o.order_type)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(o.total_amount)}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                          ✅ LUNAS
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Bukti */}
      {showProofModal && proofImage && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setShowProofModal(false)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setShowProofModal(false)} className="absolute -top-10 right-0 text-white font-bold hover:text-gray-300">✕ Tutup</button>
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              <h3 className="text-lg font-bold mb-3 text-center">📎 Bukti Pembayaran</h3>
              <div className="bg-gray-50 rounded-xl p-2">
                <img src={proofImage} alt="Bukti" className="w-full max-h-[70vh] object-contain rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}