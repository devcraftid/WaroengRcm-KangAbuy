import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote, QrCode, MapPin, Phone, User,
  ShoppingBag, CheckCircle, Upload,
  ArrowLeft, Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'

export default function Checkout() {
  const { items, getTotal, clearCart, tableId, setTableId } = useCartStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const total = getTotal()

  const [customerName, setCustomerName] = useState(profile?.full_name || '')
  const [customerPhone, setCustomerPhone] = useState(profile?.phone || '')
  const [tableNumber, setTableNumber] = useState(tableId || '')
  const [orderTypeState, setOrderTypeState] = useState('dine_in')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  
  const [qrisImage, setQrisImage] = useState(null)
  const [qrisLoading, setQrisLoading] = useState(true)
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderData, setOrderData] = useState(null)

  useEffect(() => {
    loadQRIS()
  }, [])

  const loadQRIS = async () => {
    setQrisLoading(true)
    try {
      const { data } = await supabase
        .from('website_settings')
        .select('qris_image_url')
        .single()
      if (data?.qris_image_url) setQrisImage(data.qris_image_url)
    } catch (e) {}
    setQrisLoading(false)
  }

  const handleProofChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setProofFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setProofPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error('Keranjang masih kosong')
      return
    }
    if (orderTypeState === 'dine_in' && !tableNumber.trim()) {
      toast.error('Nomor meja diperlukan untuk Dine In')
      return
    }
    if (!customerName.trim()) {
      toast.error('Nama pemesan wajib diisi')
      return
    }
    if (!customerPhone.trim()) {
      toast.error('Nomor WhatsApp wajib diisi')
      return
    }

    setLoading(true)

    try {
      // 1. BUAT ORDER - STATUS PENDING
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          table_number: orderTypeState === 'dine_in' ? tableNumber.trim() : null,
          order_type: orderTypeState,
          status: 'pending', // SELALU PENDING DULU
          total_amount: total,
          notes: notes || null
        })
        .select()
        .single()

      if (orderError) throw orderError
      console.log('✅ Order created:', order.id.slice(0, 8))

      // 2. BUAT ORDER ITEMS
      const orderItems = items.map(item => ({
        order_id: order.id,
        menu_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // 3. BUAT PAYMENT - SELALU PENDING (PERLU VALIDASI KASIR)
      let proofUrl = null

      if (paymentMethod === 'qris' && proofFile) {
        const fileExt = proofFile.name.split('.').pop()
        const fileName = `proof-${order.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile, { cacheControl: '3600', upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName)
          proofUrl = urlData?.publicUrl
        }
      }

      // PENTING: Semua payment status PENDING (perlu validasi kasir)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: total,
          method: paymentMethod,
          status: 'pending', // SELALU PENDING
          proof_url: proofUrl || null
        })

      if (paymentError) {
        console.error('Payment error:', paymentError)
      }

      // 4. UPDATE MEJA (DINE IN)
      if (orderTypeState === 'dine_in' && tableNumber) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('table_number', tableNumber.trim())
      }

      // 5. NOTIFIKASI KE KASIR/ADMIN
      await supabase.from('notifications').insert({
        user_id: null, // Untuk semua staff
        title: 'Order Baru! 🔔',
        message: `Order #${order.id.slice(0, 8)} - ${formatCurrency(total)} - ${paymentMethod.toUpperCase()}. Perlu validasi pembayaran.`,
        type: 'order_created',
        link: `/cashier/payment/${order.id}`
      })

      // 6. NOTIFIKASI KE CUSTOMER
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Pesanan Dibuat! 📝',
          message: `Order #${order.id.slice(0, 8)} menunggu validasi pembayaran. ${paymentMethod === 'cash' ? 'Silakan bayar di kasir.' : 'Upload bukti pembayaran jika belum.'}`,
          type: 'order_created',
          link: `/order/${order.id}`
        })
      }

      // 7. Activity log
      await supabase.from('activities').insert({
        user_id: user?.id || null,
        description: `Order baru #${order.id.slice(0, 8)} - ${formatCurrency(total)} - ${paymentMethod}`,
        type: 'order_created'
      })

      console.log('✅ Checkout complete! Menunggu validasi pembayaran.')
      setOrderData(order)
      setOrderComplete(true)
      clearCart()
      toast.success('Pesanan dibuat! Silakan lakukan pembayaran.')

    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Gagal membuat pesanan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ORDER COMPLETE VIEW
  // ============================================
  if (orderComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 200 }}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600" />
          </motion.div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Pesanan Dibuat! 📝
          </h2>
          <p className="text-sm text-gray-500 mb-1">
            Order #{orderData?.id?.slice(0, 8)}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Total: {formatCurrency(total)}
          </p>

          {/* Status Pembayaran */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Menunggu Validasi Pembayaran
            </h3>
            
            {paymentMethod === 'cash' ? (
              <div className="space-y-2 text-sm text-yellow-700">
                <p>💵 Silakan lakukan pembayaran <strong>Cash</strong> di kasir.</p>
                <p>👨‍💼 Kasir akan memvalidasi pembayaran Anda.</p>
                <p>🍳 Setelah divalidasi, pesanan akan diproses.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-yellow-700">
                <p>📱 Pembayaran <strong>QRIS</strong> sedang menunggu validasi.</p>
                {proofFile ? (
                  <p>✅ Bukti pembayaran telah diupload.</p>
                ) : (
                  <p>⚠️ Jangan lupa upload bukti pembayaran.</p>
                )}
                <p>👨‍💼 Kasir akan memvalidasi pembayaran Anda.</p>
                <p>🍳 Setelah divalidasi, pesanan akan diproses.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => navigate(`/order/${orderData?.id}`)}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 text-sm"
            >
              Track Pesanan
            </button>
            <button 
              onClick={() => navigate('/menu')}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 text-sm"
            >
              Pesan Lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // EMPTY CART
  // ============================================
  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingBag className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Keranjang Kosong</h2>
          <p className="text-gray-500 mb-4">Tambahkan menu terlebih dahulu</p>
          <Link to="/menu" className="text-orange-600 font-medium hover:underline">
            Lihat Menu
          </Link>
        </div>
      </div>
    )
  }

  // ============================================
  // CHECKOUT FORM
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600">
            <ArrowLeft className="w-5 h-5 mr-1" /><span className="text-sm">Kembali</span>
          </button>
          <h1 className="text-lg font-bold">Checkout</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Type */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
            <h2 className="text-base font-semibold mb-3">Tipe Pesanan</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dine_in', label: '🍽️ Dine In' },
                { id: 'takeaway_waiting', label: '🛍️ Takeaway' },
                { id: 'takeaway_pickup', label: '📦 Pickup' }
              ].map(type => (
                <button key={type.id} type="button" onClick={() => setOrderTypeState(type.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-semibold ${
                    orderTypeState === type.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                  }`}>
                  {type.label}
                </button>
              ))}
            </div>

            {orderTypeState === 'dine_in' && (
              <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />Nomor Meja <span className="text-red-500">*</span>
                </label>
                <input type="text" value={tableNumber}
                  onChange={(e) => { setTableNumber(e.target.value); setTableId(e.target.value) }}
                  placeholder="Contoh: A01" required
                  className="w-full px-4 py-3 rounded-xl border-2 border-orange-300 bg-white text-lg font-bold text-center" />
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
            <h2 className="text-base font-semibold mb-3">Informasi Pemesan</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nama <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Anda" required className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">No. WhatsApp <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812-3456-7890" required className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan (Opsional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2"
                  placeholder="Contoh: Tidak pedas..." className="w-full px-4 py-3 rounded-xl border text-sm resize-none" />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
            <h2 className="text-base font-semibold mb-3">Metode Pembayaran</h2>
            <p className="text-xs text-gray-500 mb-3">Semua pembayaran akan divalidasi oleh kasir.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button type="button" onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 text-left ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                <Banknote className={`w-8 h-8 mb-2 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-sm">💵 Cash</h3>
                <p className="text-xs text-gray-500 mt-1">Bayar di kasir → Validasi</p>
              </button>
              <button type="button" onClick={() => setPaymentMethod('qris')}
                className={`p-4 rounded-xl border-2 text-left ${paymentMethod === 'qris' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}>
                <QrCode className={`w-8 h-8 mb-2 ${paymentMethod === 'qris' ? 'text-blue-600' : 'text-gray-400'}`} />
                <h3 className="font-semibold text-sm">📱 QRIS</h3>
                <p className="text-xs text-gray-500 mt-1">Transfer → Upload → Validasi</p>
              </button>
            </div>

            {paymentMethod === 'qris' && (
              <div className="space-y-4">
                {qrisImage ? (
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium mb-2">Scan QRIS:</p>
                    <img src={qrisImage} alt="QRIS" className="w-48 h-48 mx-auto rounded-xl" />
                    <p className="text-sm font-bold text-orange-600 mt-2">Total: {formatCurrency(total)}</p>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">
                    QRIS belum diatur. Silakan pilih Cash.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Upload Bukti Pembayaran</label>
                  <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-400 block">
                    {proofPreview ? (
                      <div>
                        <img src={proofPreview} alt="Bukti" className="max-h-40 mx-auto rounded-lg mb-2" />
                        <span className="text-xs text-gray-500">Klik untuk ganti</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Upload bukti transfer</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleProofChange} className="hidden" />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
            <h2 className="text-base font-semibold mb-3">Ringkasan</h2>
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{item.name} x{item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t mt-3 pt-3 flex justify-between items-center">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 text-lg flex items-center justify-center">
            {loading ? (
              <><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Memproses...</>
            ) : (
              <>Buat Pesanan · {formatCurrency(total)}</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}