import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Banknote, QrCode, CheckCircle, XCircle,
  ArrowLeft, Printer, DollarSign,
  ShoppingBag, MapPin, Clock, Copy, Check,
  UtensilsCrossed, Search, RefreshCw,
  AlertCircle, Eye, CreditCard, ChefHat, Package, User
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, getOrderTypeLabel, getStatusColor } from '../../utils/format'
import { toast } from 'sonner'
import { playPaymentSuccessSound, playOrderNewSound, playOrderProcessingSound, playOrderCompletedSound } from '../../utils/sound'
import { useRealtimeOrders } from '../../hooks/useRealtime'

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

  useRealtimeOrders((payload) => {
    if (payload?.eventType === 'INSERT') {
      playOrderNewSound()
    }
    loadAllOrders(true)
  })

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
      
      if (error) throw error

      // Log activity dihapus

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
      if (newStatus === 'processing') playOrderProcessingSound()
      else if (newStatus === 'ready' || newStatus === 'completed') playOrderCompletedSound()
      loadAllOrders(true)
      if (id === orderId) loadOrderDetail(id)
    } catch (error) {
      toast.error('Gagal update status')
    }
  }

  const quickValidatePayment = async (o, e) => {
    e.stopPropagation()
    const pay = o.payments?.[0]
    setValidating(true)
    try {
      if (pay) {
        await supabase.from('payments').update({
          status: 'completed',
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        }).eq('id', pay.id)
      } else {
        await supabase.from('payments').insert({
          order_id: o.id,
          amount: o.total_amount,
          method: 'cash',
          status: 'completed',
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        })
      }

      await supabase.from('orders').update({
        status: 'processing',
        updated_at: new Date().toISOString()
      }).eq('id', o.id)

      toast.success(`Pembayaran Order #${o.id.slice(0,8)} Lunas! ✅`)
      playPaymentSuccessSound()
      loadAllOrders(true)
    } catch (error) {
      toast.error('Gagal validasi cepat')
    } finally {
      setValidating(false)
    }
  }

  const getStatusIcon = (status) => {
    const icons = { pending: Clock, processing: ChefHat, ready: Package, completed: CheckCircle, cancelled: XCircle }
    const Icon = icons[status] || Clock
    return <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
  }

  // ============================================
  // LOAD ALL ORDERS - PAKAI SQL MENTAH
  // ============================================
  const loadAllOrders = async (isBackground = false) => {
    if (!isBackground) setLoadingOrders(true)
    
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

      // Activity log dihapus
      toast.success('Pembayaran SUKSES! ✅')
      // Play suara pembayaran lunas
      playPaymentSuccessSound()
      
      // Refresh data
      loadOrderDetail(order.id)
      loadAllOrders(true)
      
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
    navigate('/admin/payment')
  }

  // ============================================
  // ORDER DETAIL VIEW
  // ============================================
  if (order) {
    const isPaid = payment?.status === 'completed'

    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleBack} className="flex items-center px-4 py-2 bg-white rounded-xl text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm transition-colors font-semibold text-sm">
            <ArrowLeft className="w-5 h-5 mr-2" /> Kembali ke Daftar
          </button>
          
          <div className="text-right">
            <h1 className="text-2xl font-black text-gray-900">Order #{order.id.slice(0,6)}</h1>
            <button onClick={copyOrderId} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-end w-full mt-1">
              {copiedOrderId ? <><Check className="w-3 h-3 mr-1" /> ID Tersalin</> : <><Copy className="w-3 h-3 mr-1" /> Salin ID Order</>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KOLOM KIRI: Informasi & Menu (Memakan 2 kolom) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Banner */}
            <div className={`rounded-2xl p-5 border-l-8 flex items-center space-x-5 shadow-sm ${
              isPaid ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'
            }`}>
              {isPaid ? <CheckCircle className="w-12 h-12 text-green-600" /> : <AlertCircle className="w-12 h-12 text-yellow-600 animate-pulse" />}
              <div>
                <h2 className={`font-black text-xl ${isPaid ? 'text-green-800' : 'text-yellow-800'}`}>
                  {isPaid ? 'PEMBAYARAN LUNAS ✅' : 'MENUNGGU PEMBAYARAN ⏳'}
                </h2>
                <p className={`text-sm mt-1 font-medium ${isPaid ? 'text-green-700' : 'text-yellow-700'}`}>
                  {isPaid ? `Divalidasi pada ${formatDateTime(payment.validated_at)}` : 'Segera lakukan konfirmasi/validasi pembayaran di panel sebelah kanan.'}
                </p>
              </div>
            </div>

            {/* Informasi Pelanggan & Pesanan */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center">
                  <User className="w-5 h-5 mr-2 text-orange-500" /> Detail Informasi
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pelanggan</p>
                  <p className="font-bold text-gray-900 text-base">{order.display_name}</p>
                  {order.display_phone && <p className="text-sm text-gray-500">{order.display_phone}</p>}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tipe Pesanan</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-700 border border-gray-200">{getOrderTypeLabel(order.order_type)}</span>
                    {order.table_number && <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-xs font-bold border border-orange-200">Meja {order.table_number}</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal & Waktu</p>
                  <p className="font-medium text-gray-800 text-sm">{formatDateTime(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status Dapur</p>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                </div>
                
                {order.notes && (
                  <div className="col-span-2 bg-orange-50 border border-orange-100 rounded-xl p-4 mt-2">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 flex items-center">
                      📝 Catatan Khusus
                    </p>
                    <p className="text-sm font-medium text-orange-900">{order.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Daftar Menu */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center">
                  <UtensilsCrossed className="w-5 h-5 mr-2 text-orange-500" /> Item Pesanan
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[400px]">
                  <tbody>
                    {orderItems.map((item, idx) => (
                      <tr key={item.id} className={`border-b border-gray-50 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="py-4 pl-6 pr-4 w-16">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                            {item.menus?.image_url ? <img src={item.menus.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">{item.menus?.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{formatCurrency(item.price)}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-black text-gray-700 bg-gray-100 px-3 py-1 rounded-lg text-sm">x{item.quantity}</span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right font-black text-gray-900 text-sm sm:text-base">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-orange-50 px-6 py-5 border-t border-orange-100 flex justify-between items-center">
                <span className="text-lg font-bold text-orange-900">Total Tagihan</span>
                <span className="text-2xl sm:text-3xl font-black text-orange-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: Aksi & Validasi Pembayaran (Memakan 1 kolom) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="bg-gray-900 px-6 py-4">
                <h3 className="font-bold text-white flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-gray-300" /> Aksi Kasir
                </h3>
              </div>
              
              <div className="p-6">
                {/* Info Metode */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Metode Pembayaran</p>
                  {payment ? (
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${payment.method === 'cash' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <div className="flex items-center font-bold text-sm">
                        {payment.method === 'cash' ? <Banknote className="w-5 h-5 mr-2" /> : <QrCode className="w-5 h-5 mr-2" />}
                        {payment.method === 'cash' ? 'Tunai (Cash)' : 'QRIS Transfer'}
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-lg font-black ${isPaid ? 'bg-green-200 text-green-900' : 'bg-yellow-200 text-yellow-900'}`}>
                        {isPaid ? 'LUNAS' : 'PENDING'}
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm font-bold text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" /> Belum ada data
                      </p>
                    </div>
                  )}
                </div>

                {/* Bukti Transfer */}
                {payment?.proof_url && (
                  <div className="mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bukti Transfer (Dari Pelanggan)</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleViewProof(payment.proof_url) }}
                      className="w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex flex-col items-center justify-center transition-colors group"
                    >
                      <Eye className="w-6 h-6 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-blue-700 text-sm">Klik untuk Lihat Bukti</span>
                    </button>
                  </div>
                )}

                {/* Tombol Utama */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {!isPaid ? (
                    <button
                      onClick={handleValidatePayment}
                      disabled={validating}
                      className={`w-full py-4 px-4 rounded-xl font-black text-sm flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:opacity-50 ${
                        payment?.method === 'qris' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                      }`}
                    >
                      {validating ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memproses...</>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          {payment?.method === 'qris' ? 'Cek Pakasir & Validasi' : 'Konfirmasi Uang Diterima'}
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={printReceipt} 
                      className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black rounded-xl text-sm flex items-center justify-center transition-colors border border-gray-200"
                    >
                      <Printer className="w-5 h-5 mr-2" /> Cetak Struk
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
          <button onClick={() => loadAllOrders(true)} disabled={loadingOrders}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Pesanan Masuk</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Order pelanggan akan otomatis muncul di sini. Anda juga bisa membuat order manual melalui POS.
          </p>
          <div className="flex justify-center space-x-3">
            <button onClick={() => loadAllOrders(true)} className="px-5 py-2.5 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm hover:bg-orange-200 transition-colors">
              🔄 Refresh Manual
            </button>
            <Link to="/admin/pos" className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl text-sm hover:shadow-lg transition-all">
              🛒 Buka POS Kasir
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Perlu Bayar Section */}
          {needPayment.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-bold text-yellow-800 mb-4 flex items-center bg-yellow-100 inline-flex px-4 py-2.5 rounded-xl shadow-sm border border-yellow-200">
                <AlertCircle className="w-5 h-5 mr-2" /> Menunggu Pembayaran ({needPayment.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {needPayment.map(o => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border-2 border-yellow-100 hover:border-yellow-300 transition-all flex flex-col relative overflow-hidden"
                  >
                    {/* Pita aksen */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-4 pb-4 border-b border-gray-50 gap-2 sm:gap-0">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-black text-gray-900 text-lg sm:text-xl">#{o.id.slice(0,6)}</span>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center ${getStatusColor(o.status)}`}>
                            {getStatusIcon(o.status)}{o.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">{formatDateTime(o.created_at)}</p>
                      </div>
                      <div className="flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-1 sm:mt-0">
                        <p className="font-black text-xl sm:text-2xl text-yellow-600">{formatCurrency(o.total_amount)}</p>
                        <span className="inline-block mt-0 sm:mt-1 text-[10px] px-2 py-0.5 rounded-md font-bold bg-yellow-100 text-yellow-800">
                          ⚠️ BELUM LUNAS
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 mb-5">
                      <div className="flex justify-between items-start sm:items-center">
                        <div>
                          <p className="font-bold text-gray-800 text-sm sm:text-base">{o.customer?.full_name || 'Pelanggan Guest'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-bold text-gray-600 border border-gray-200">
                              {getOrderTypeLabel(o.order_type)}
                            </span>
                            {o.table_number && (
                              <span className="px-2.5 py-1 bg-orange-50 rounded-md text-xs font-bold text-orange-700 border border-orange-100">
                                Meja {o.table_number}
                              </span>
                            )}
                          </div>
                        </div>
                        {o.payments?.find(p => p.proof_url)?.proof_url && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewProof(o.payments.find(p => p.proof_url).proof_url) }}
                            className="flex items-center px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm ml-2 shrink-0"
                          >
                            <Eye className="w-4 h-4 mr-1.5 hidden sm:block" /><Eye className="w-4 h-4 sm:hidden" /> <span className="hidden sm:inline">Bukti TF</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto space-y-2">
                      <div className="flex gap-2">
                        <button onClick={(e) => quickValidatePayment(o, e)} disabled={validating} className="flex-1 py-3 bg-green-500 text-white hover:bg-green-600 font-black rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center">
                          ✅ LUNAS CEPAT
                        </button>
                        <button onClick={() => { navigate(`/admin/payment/${o.id}`); loadOrderDetail(o.id) }} className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 hover:from-yellow-500 hover:to-yellow-600 font-black rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center">
                          👁️ DETAIL
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {o.status === 'pending' && <button onClick={() => updateOrderStatus(o.id, 'processing')} className="flex-1 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-orange-600 font-bold rounded-xl text-[10px] sm:text-xs transition-colors border border-gray-200 min-w-[70px]">👨‍🍳 Masak</button>}
                        {o.status === 'processing' && <button onClick={() => updateOrderStatus(o.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 font-bold rounded-xl text-[10px] sm:text-xs transition-colors shadow-sm min-w-[70px]">✅ Selesai</button>}
                        {o.status === 'ready' && <button onClick={() => updateOrderStatus(o.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 font-bold rounded-xl text-[10px] sm:text-xs transition-colors shadow-sm min-w-[70px]">✅ Selesai</button>}
                        <button onClick={() => updateOrderStatus(o.id, 'cancelled')} className="px-3 sm:px-4 py-2 bg-white text-red-500 hover:bg-red-50 font-bold rounded-xl text-[10px] sm:text-xs transition-colors border border-red-100">Batal</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Sudah Lunas Section */}
          {alreadyPaid.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-green-800 mb-4 flex items-center bg-green-100 inline-flex px-4 py-2.5 rounded-xl shadow-sm border border-green-200">
                <CheckCircle className="w-5 h-5 mr-2" /> Sudah Lunas ({alreadyPaid.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {alreadyPaid.map(o => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-green-100 hover:shadow-md transition-all flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-400"></div>
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start mb-4 pb-4 border-b border-gray-50 gap-2 sm:gap-0">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-black text-gray-900 text-lg sm:text-xl">#{o.id.slice(0,6)}</span>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center ${getStatusColor(o.status)}`}>
                            {getStatusIcon(o.status)}{o.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">{formatDateTime(o.created_at)}</p>
                      </div>
                      <div className="flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-1 sm:mt-0">
                        <p className="font-black text-xl sm:text-2xl text-gray-900">{formatCurrency(o.total_amount)}</p>
                        <span className="inline-block mt-0 sm:mt-1 text-[10px] px-2 py-0.5 rounded-md font-bold bg-green-100 text-green-800">
                          ✅ LUNAS
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 mb-5">
                      <div className="flex justify-between items-start sm:items-center">
                        <div>
                          <p className="font-bold text-gray-800 text-sm sm:text-base">{o.customer?.full_name || 'Pelanggan Guest'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2.5 py-1 bg-gray-100 rounded-md text-xs font-bold text-gray-600 border border-gray-200">
                              {getOrderTypeLabel(o.order_type)}
                            </span>
                            {o.table_number && (
                              <span className="px-2.5 py-1 bg-orange-50 rounded-md text-xs font-bold text-orange-700 border border-orange-100">
                                Meja {o.table_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto space-y-2">
                      <button onClick={() => { navigate(`/admin/payment/${o.id}`); loadOrderDetail(o.id) }} className="w-full py-3 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center">
                        👁️ Lihat Detail / Cetak Struk
                      </button>
                      
                      <div className="flex flex-wrap gap-2">
                        {o.status === 'pending' && <button onClick={() => updateOrderStatus(o.id, 'processing')} className="flex-1 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold rounded-xl text-[10px] sm:text-xs transition-colors border border-orange-200 min-w-[80px]">👨‍🍳 Masak Dulu</button>}
                        {o.status === 'processing' && <button onClick={() => updateOrderStatus(o.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 font-bold rounded-xl text-[10px] sm:text-xs transition-colors shadow-sm min-w-[80px]">✅ Selesaikan</button>}
                        {o.status === 'ready' && <button onClick={() => updateOrderStatus(o.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 font-bold rounded-xl text-[10px] sm:text-xs transition-colors shadow-sm min-w-[80px]">✅ Selesaikan</button>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Bukti */}
      <AnimatePresence>
        {showProofModal && proofImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6" 
            onClick={() => setShowProofModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative max-w-2xl w-full" 
              onClick={e => e.stopPropagation()}
            >
              <button 
                type="button" 
                onClick={() => setShowProofModal(false)} 
                className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
              >
                <XCircle className="w-6 h-6" />
              </button>
              
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-50">
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-gray-900 mb-1 text-center">Bukti Transfer</h3>
                  <p className="text-sm text-gray-500 font-medium mb-6 text-center">Tinjau bukti pembayaran yang diunggah pelanggan</p>
                  
                  <div className="w-full bg-gray-50 rounded-2xl p-2 sm:p-3 border border-gray-100 shadow-inner group">
                    <div className="relative rounded-xl overflow-hidden bg-white">
                      <img 
                        src={proofImage} 
                        alt="Bukti Pembayaran" 
                        className="w-full max-h-[60vh] object-contain transition-transform duration-500 group-hover:scale-[1.02] cursor-zoom-in" 
                        onClick={() => window.open(proofImage, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center backdrop-blur-sm transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                          <Eye className="w-4 h-4 mr-2" /> Klik untuk perbesar
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setShowProofModal(false)}
                    className="w-full mt-6 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
                  >
                    Tutup & Kembali
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}