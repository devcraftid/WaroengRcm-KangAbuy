import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CreditCard, Banknote, QrCode, CheckCircle, XCircle,
  ArrowLeft, Upload, Printer, DollarSign,
  ShoppingBag, MapPin, Clock, Copy, Check, Search,
  User, UtensilsCrossed
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
  const [searchMode, setSearchMode] = useState(!id)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [change, setChange] = useState(0)
  const [qrisProof, setQrisProof] = useState(null)
  const [qrisPreview, setQrisPreview] = useState(null)
  const [copiedOrderId, setCopiedOrderId] = useState(false)

  useEffect(() => {
    if (id) {
      setSearchMode(false)
      loadOrderData(id)
    } else {
      setSearchMode(true)
      setLoading(false)
    }
  }, [id])

  // ============================================
  // SEARCH ORDER
  // ============================================
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Masukkan nomor order atau nama pelanggan')
      return
    }

    setSearching(true)
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:profiles!customer_id(full_name, phone)')
        .or(`id.ilike.%${searchQuery}%,customer.full_name.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20)

      setSearchResults(data || [])
      
      if (!data || data.length === 0) {
        toast.error('Order tidak ditemukan')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Gagal mencari order')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectOrder = (orderId) => {
    navigate(`/cashier/payment/${orderId}`)
    setSearchMode(false)
    loadOrderData(orderId)
  }

  // ============================================
  // LOAD ORDER DATA
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

      if (orderError) throw orderError
      if (!orderData) {
        toast.error('Order tidak ditemukan')
        setSearchMode(true)
        setLoading(false)
        return
      }

      setOrder(orderData)

      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*, menus(name, price, image_url)')
        .eq('order_id', orderId)

      setOrderItems(itemsData || [])

      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setPayment(paymentData || null)

      if (orderData.total_amount) {
        setCashAmount(orderData.total_amount.toString())
        calculateChange(orderData.total_amount.toString(), orderData.total_amount)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data order')
      setSearchMode(true)
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = (amount, total) => {
    setCashAmount(amount)
    const t = total || order?.total_amount || 0
    if (amount && t) {
      const paid = parseFloat(amount) || 0
      const changeAmount = paid - t
      setChange(changeAmount > 0 ? changeAmount : 0)
    } else {
      setChange(0)
    }
  }

  const handleQrisProofChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setQrisProof(file)
      const reader = new FileReader()
      reader.onloadend = () => setQrisPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  // ============================================
  // PROSES PEMBAYARAN CASH
  // ============================================
  const handleCashPayment = async () => {
    if (!cashAmount || parseFloat(cashAmount) < order.total_amount) {
      toast.error('Jumlah uang kurang dari total pembayaran')
      return
    }

    setProcessing(true)
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: order.total_amount,
          method: 'cash',
          status: 'completed',
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        })

      if (paymentError) throw paymentError

      await supabase
        .from('orders')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', order.id)

      if (order.order_type === 'dine_in' && order.table_number) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('table_number', order.table_number)
      }

      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Pembayaran cash order #${order.id.slice(0, 8)} - ${formatCurrency(order.total_amount)}`,
        type: 'payment_received'
      })

      if (order.customer_id) {
        await supabase.from('notifications').insert({
          user_id: order.customer_id,
          title: 'Pembayaran Berhasil ✅',
          message: `Pembayaran order #${order.id.slice(0, 8)} diterima.`,
          type: 'payment_received',
          link: `/order/${order.id}`
        })
      }

      toast.success('Pembayaran cash berhasil!')
      setTimeout(() => printReceipt('cash'), 300)
      setTimeout(() => navigate('/cashier/orders'), 1500)

    } catch (error) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // ============================================
  // VALIDASI QRIS
  // ============================================
  const handleQRISValidation = async () => {
    if (!payment?.proof_url && !qrisProof) {
      toast.error('Belum ada bukti pembayaran')
      return
    }

    setProcessing(true)
    try {
      let proofUrl = payment?.proof_url || null

      if (qrisProof) {
        const fileExt = qrisProof.name.split('.').pop()
        const fileName = `payment-${Date.now()}.${fileExt}`
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, qrisProof, { cacheControl: '3600', upsert: true })
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)
            proofUrl = urlData?.publicUrl || proofUrl
          }
        } catch (e) {
          console.warn('Upload proof failed:', e)
        }
      }

      if (payment?.id) {
        await supabase.from('payments').update({
          status: 'completed',
          proof_url: proofUrl,
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        }).eq('id', payment.id)
      } else {
        await supabase.from('payments').insert({
          order_id: order.id,
          amount: order.total_amount,
          method: 'qris',
          status: 'completed',
          proof_url: proofUrl,
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        })
      }

      await supabase.from('orders').update({
        status: 'processing',
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Validasi QRIS order #${order.id.slice(0, 8)}`,
        type: 'payment_validated'
      })

      toast.success('Pembayaran QRIS divalidasi!')
      setTimeout(() => printReceipt('qris'), 300)
      setTimeout(() => navigate('/cashier/orders'), 1500)

    } catch (error) {
      toast.error('Gagal: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  // ============================================
  // PRINT RECEIPT
  // ============================================
  const printReceipt = (method) => {
    const w = window.open('', '_blank', 'width=350,height=600')
    if (!w) return
    
    const itemsHTML = orderItems.map(item => `
      <tr><td>${item.menus?.name || 'Menu'}</td><td align="center">${item.quantity}x</td><td align="right">${formatCurrency(item.subtotal)}</td></tr>
    `).join('')

    w.document.write(`
      <html><head><title>Struk #${order?.id?.slice(0,8)}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',monospace;padding:15px;max-width:300px;margin:auto;font-size:11px}
        .c{text-align:center}.r{text-align:right}.b{font-weight:bold}
        .d{border-top:1px dashed #000;margin:8px 0}
        .t{font-size:15px;font-weight:bold}
        table{width:100%;border-collapse:collapse}td{padding:2px 0}
        @media print{body{margin:0;padding:10px}}
      </style></head>
      <body>
        <div class="c"><h3 style="font-size:13px">🍜 WAROENG RCM KANG ABUY</h3>
        <p style="font-size:9px">Makanan Enak, Harga Ekonomis</p></div>
        <div class="d"></div>
        <p><b>Order:</b> #${order?.id?.slice(0,8)}</p>
        <p><b>Tgl:</b> ${formatDateTime(order?.created_at)}</p>
        <p><b>Kasir:</b> ${profile?.full_name || '-'}</p>
        <p><b>Tipe:</b> ${getOrderTypeLabel(order?.order_type)}</p>
        ${order?.table_number ? `<p><b>Meja:</b> ${order.table_number}</p>` : ''}
        ${order?.customer?.full_name ? `<p><b>Customer:</b> ${order.customer.full_name}</p>` : ''}
        <div class="d"></div>
        <table>${itemsHTML}</table>
        <div class="d"></div>
        <p class="t r">Total: ${formatCurrency(order?.total_amount)}</p>
        <p><b>Metode:</b> ${method === 'cash' ? '💵 Cash' : '📱 QRIS'}</p>
        ${method === 'cash' ? `<p>Tunai: ${formatCurrency(parseFloat(cashAmount)||0)}</p><p>Kembali: ${formatCurrency(change)}</p>` : ''}
        <div class="d"></div>
        <div class="c"><p style="font-size:10px">Terima kasih!</p></div>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const copyOrderId = () => {
    navigator.clipboard.writeText(order?.id || '')
    setCopiedOrderId(true)
    setTimeout(() => setCopiedOrderId(false), 2000)
  }

  // ============================================
  // SEARCH MODE
  // ============================================
  if (searchMode) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <button onClick={() => navigate('/cashier/orders')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-5 h-5 mr-1" /><span className="text-sm">Kembali ke Orders</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cari Order</h1>
          <p className="text-sm text-gray-500 mt-1">Cari order untuk diproses pembayarannya</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Order ID atau nama pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {searching ? '...' : 'Cari'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">{searchResults.length} order ditemukan</p>
            {searchResults.map(o => (
              <button
                key={o.id}
                onClick={() => handleSelectOrder(o.id)}
                className="w-full bg-white rounded-xl p-4 shadow-sm border hover:border-orange-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">
                      {o.customer?.full_name || 'Guest'} · {getOrderTypeLabel(o.order_type)}
                      {o.table_number ? ` · Meja ${o.table_number}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(o.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      o.status === 'completed' ? 'bg-green-100 text-green-700' :
                      o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{o.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
          <div className="h-40 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  // ============================================
  // ORDER NOT FOUND
  // ============================================
  if (!order) {
    return (
      <div className="p-4 sm:p-6 text-center">
        <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Order Tidak Ditemukan</h2>
        <button onClick={() => setSearchMode(true)} className="text-orange-600 hover:underline text-sm">
          ← Cari Order Lain
        </button>
      </div>
    )
  }

  // ============================================
  // PAYMENT PAGE
  // ============================================
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/cashier/orders')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-5 h-5 mr-1" /><span className="text-sm">Kembali</span>
      </button>

      {/* Order Summary */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center">
            <ShoppingBag className="w-5 h-5 mr-2 text-orange-500" />Detail Order
          </h2>
          <button onClick={copyOrderId} className="flex items-center text-xs text-gray-500 hover:text-gray-700">
            {copiedOrderId ? <><Check className="w-3 h-3 mr-1 text-green-500" />Disalin</> : <><Copy className="w-3 h-3 mr-1" />#{order.id.slice(0,8)}</>}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><p className="text-gray-500 text-xs">Customer</p><p className="font-medium">{order.customer?.full_name || 'Guest'}</p></div>
          <div><p className="text-gray-500 text-xs">Tipe</p><p className="font-medium">{getOrderTypeLabel(order.order_type)}</p></div>
          <div><p className="text-gray-500 text-xs">Status</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>{order.status}</span>
          </div>
          {order.table_number && <div><p className="text-gray-500 text-xs">Meja</p><p className="font-medium flex items-center"><MapPin className="w-3 h-3 mr-1" />{order.table_number}</p></div>}
          <div className="col-span-2"><p className="text-gray-500 text-xs">Tanggal</p><p className="font-medium text-xs flex items-center"><Clock className="w-3 h-3 mr-1" />{formatDateTime(order.created_at)}</p></div>
        </div>

        <div className="border-t pt-4">
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

        <div className="border-t mt-4 pt-4 flex justify-between items-center">
          <span className="text-base font-semibold">Total</span>
          <span className="text-2xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border p-4 sm:p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-green-500" />Pembayaran</h3>

        {payment?.status === 'completed' ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Sudah Dibayar</h3>
            <p className="text-sm text-gray-500">{payment.method === 'cash' ? '💵 Cash' : '📱 QRIS'} - {formatCurrency(payment.amount)}</p>
            <button onClick={() => printReceipt(payment.method)} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"><Printer className="w-4 h-4 inline mr-1" />Cetak Ulang</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setPaymentMethod('cash')} className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                <Banknote className={`w-8 h-8 mb-2 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <h4 className="font-semibold text-sm">Cash</h4>
              </button>
              <button onClick={() => setPaymentMethod('qris')} className={`p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === 'qris' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                <QrCode className={`w-8 h-8 mb-2 ${paymentMethod === 'qris' ? 'text-blue-600' : 'text-gray-400'}`} />
                <h4 className="font-semibold text-sm">QRIS</h4>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Jumlah Uang</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                    <input type="number" value={cashAmount} onChange={(e) => calculateChange(e.target.value, order.total_amount)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border text-lg font-bold focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[order.total_amount, Math.ceil(order.total_amount/10000)*10000, Math.ceil(order.total_amount/50000)*50000, Math.ceil(order.total_amount/100000)*100000].map((a,i) => (
                    <button key={i} onClick={() => calculateChange(a.toString(), order.total_amount)} className="py-2 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">{formatCurrency(a)}</button>
                  ))}
                </div>
                {change > 0 && <div className="p-4 bg-green-50 rounded-xl"><p className="text-sm text-green-700">Kembalian:</p><p className="text-2xl font-bold text-green-600">{formatCurrency(change)}</p></div>}
                <button onClick={handleCashPayment} disabled={processing || !cashAmount || parseFloat(cashAmount) < order.total_amount}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center text-sm">
                  {processing ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memproses...</> : <><CheckCircle className="w-5 h-5 mr-2" />Konfirmasi Pembayaran</>}
                </button>
              </div>
            )}

            {paymentMethod === 'qris' && (
              <div className="space-y-4">
                {payment?.proof_url && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium mb-2">Bukti dari Customer:</p>
                    <img src={payment.proof_url} alt="Bukti" className="max-h-48 mx-auto rounded-lg" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Bukti (Opsional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-orange-400 cursor-pointer">
                    {qrisPreview ? (
                      <div>
                        <img src={qrisPreview} alt="Preview" className="max-h-32 mx-auto rounded-lg mb-2" />
                        <button type="button" onClick={() => { setQrisProof(null); setQrisPreview(null) }} className="text-xs text-red-500">Hapus</button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Klik untuk upload</p>
                        <input type="file" accept="image/*" onChange={handleQrisProofChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
                <button onClick={handleQRISValidation} disabled={processing || (!payment?.proof_url && !qrisProof)}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center text-sm">
                  {processing ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memvalidasi...</> : <><CheckCircle className="w-5 h-5 mr-2" />Validasi Pembayaran</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}