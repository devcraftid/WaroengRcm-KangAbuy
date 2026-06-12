import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote, QrCode, MapPin, Phone, User,
  ShoppingBag, CheckCircle, Upload,
  ArrowLeft, Clock, UtensilsCrossed, CreditCard
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { playOrderNewSound } from '../../utils/sound'

export default function Checkout() {
  const { items, getTotal, clearCart, tableId, setTableId, guestName, guestPhone, guestNotes } = useCartStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const total = getTotal()

  useEffect(() => {
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    // Otomatis deteksi production jika key tidak berawalan SB-
    const isProduction = clientKey && !clientKey.startsWith('SB-');
    const scriptUrl = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
      
    if (clientKey && !document.getElementById('midtrans-script')) {
      const script = document.createElement('script');
      script.id = 'midtrans-script';
      script.src = scriptUrl;
      script.setAttribute('data-client-key', clientKey);
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const [customerName, setCustomerName] = useState(profile?.full_name || guestName || '')
  const [customerPhone, setCustomerPhone] = useState(profile?.phone || guestPhone || '')
  const [tableNumber, setTableNumber] = useState(tableId || '')
  const [orderTypeState, setOrderTypeState] = useState('dine_in')
  const [notes, setNotes] = useState(guestNotes || '')
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
      // Gabungkan catatan dari cart items
      const itemNotes = items
        .filter(i => i.note)
        .map(i => `[${i.name} x${i.quantity}: ${i.note}]`)
        .join(', ')
      
      const finalNote = [notes, itemNotes].filter(Boolean).join(' | ')

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          table_number: orderTypeState === 'dine_in' ? tableNumber.trim() : null,
          order_type: orderTypeState,
          status: 'pending', // SELALU PENDING DULU
          total_amount: total,
          notes: finalNote || null
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

      // PENTING: Semua payment status PENDING (perlu validasi kasir atau Pakasir)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: total,
          method: paymentMethod,
          status: 'pending', // SELALU PENDING
          proof_url: null
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

      // 5. NOTIFIKASI KE KASIR/ADMIN (sertakan nama pemesan)
      await supabase.from('notifications').insert({
        user_id: null, // Untuk semua staff
        title: 'Order Baru! 🔔',
        message: `${customerName.trim()} - Order #${order.id.slice(0, 8)} - ${formatCurrency(total)} - ${paymentMethod.toUpperCase()}${orderTypeState === 'dine_in' ? ` - Meja ${tableNumber}` : ' - Takeaway'}. Perlu pembayaran.`,
        type: 'order_created',
        link: `/cashier/payment/${order.id}`
      })

      // 6. NOTIFIKASI KE CUSTOMER
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Pesanan Dibuat! 📝',
          message: `Order #${order.id.slice(0, 8)} menunggu pembayaran. ${paymentMethod === 'cash' ? 'Silakan bayar di kasir.' : 'Silakan scan QRIS.'}`,
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

      console.log('✅ Checkout complete! Menunggu pembayaran.')
      
      // Jika pembayaran online (Midtrans), langsung buka Snap
      if (paymentMethod === 'qris') {
        try {
          const snapRes = await fetch('/api/midtrans-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: order.id,
              gross_amount: total,
              customer_details: {
                first_name: customerName,
                phone: customerPhone
              },
              items: items.map(i => ({
                id: i.id,
                price: i.price,
                quantity: i.quantity,
                name: i.name.substring(0, 50)
              }))
            })
          })

          if (snapData.token) {
            clearCart()
            if (!window.snap) {
              toast.error('Gagal memuat sistem pembayaran. Coba refresh halaman.')
              navigate(`/order/${order.id}`)
              return
            }
            window.snap.pay(snapData.token, {
              onSuccess: function(result) {
                toast.success('Pembayaran berhasil!')
                navigate(`/order/${order.id}`)
              },
              onPending: function(result) {
                toast.info('Menunggu pembayaran diselesaikan...')
                navigate(`/order/${order.id}`)
              },
              onError: function(result) {
                toast.error('Pembayaran gagal')
                navigate(`/order/${order.id}`)
              },
              onClose: function() {
                toast.error('Pembayaran belum diselesaikan')
                navigate(`/order/${order.id}`)
              }
            })
            return
          } else {
            throw new Error(snapData.error || 'Gagal mendapatkan token Midtrans')
          }
        } catch (err) {
          console.error('Midtrans Snap Error:', err)
          toast.error('Gagal memuat pembayaran online')
          navigate(`/order/${order.id}`)
          return
        }
      }

      // Jika Cash
      clearCart()
      playOrderNewSound()
      toast.success('Pesanan dibuat!')
      navigate(`/order/${order.id}`)

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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Tipe Pesanan</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'dine_in', label: 'Makan di Tempat', desc: 'Dine In' },
                { id: 'takeaway_waiting', label: 'Bawa Pulang', desc: 'Takeaway' }
              ].map(type => (
                <button key={type.id} type="button" onClick={() => setOrderTypeState(type.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    orderTypeState === type.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <p className={`font-bold text-sm ${orderTypeState === type.id ? 'text-orange-700' : 'text-gray-700'}`}>{type.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                </button>
              ))}
            </div>

            {orderTypeState === 'dine_in' && (
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Nomor Meja <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={tableNumber}
                    onChange={(e) => { setTableNumber(e.target.value); setTableId(e.target.value) }}
                    placeholder="Contoh: Meja 12" required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" />
                </div>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Informasi Pemesan</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masukkan nama Anda" required className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">No. WhatsApp <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812-3456-7890" required className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catatan Pesanan</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="2"
                  placeholder="Tambahkan instruksi khusus..." className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Metode Pembayaran</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button type="button" onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}>
                <Banknote className="w-6 h-6" />
                <span className="font-bold text-sm">Tunai di Kasir</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod('qris')}
                className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'qris' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}>
                <CreditCard className="w-6 h-6" />
                <span className="font-bold text-sm">QRIS / Online</span>
              </button>
            </div>

            {paymentMethod === 'qris' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                <div className="text-center p-4 bg-orange-50 rounded-xl text-sm font-medium text-orange-700 border border-orange-200">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  Popup pembayaran Midtrans (QRIS, GoPay, ShopeePay, dll) akan muncul otomatis setelah Anda menekan tombol "Pesan Sekarang".
                </div>
              </motion.div>
            )}
          </div>

          {/* Receipt Style Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            {/* Receipt jagged edge top */}
            <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px 0, transparent 10px, white 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x' }}></div>
            
            <div className="px-5 pt-3 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-4 h-4 text-gray-400" />
                <h2 className="text-base font-bold text-gray-900">Ringkasan Pesanan</h2>
              </div>
              
              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.cartItemId || item.id} className="flex justify-between items-start text-sm">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 mt-0.5">{item.quantity}x</div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{item.name}</span>
                        {item.note && <span className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center"><div className="w-1 h-1 bg-gray-400 rounded-full mr-1.5"></div>{item.note}</span>}
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              {/* Receipt dashed divider */}
              <div className="w-full border-t-2 border-dashed border-gray-200 my-4"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Bayar</span>
                <span className="text-2xl font-bold text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>
            
            {/* Receipt jagged edge bottom */}
            <div className="h-3 w-full" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, transparent 10px, white 11px)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom' }}></div>
          </div>
          
          {/* Spacer for sticky bottom bar */}
          <div className="h-8"></div>

          {/* STICKY BOTTOM BAR */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Total Pembayaran</p>
              <p className="text-xl font-bold text-gray-900 leading-none">{formatCurrency(total)}</p>
            </div>
            
            <button type="submit" disabled={loading}
              className="py-3.5 px-8 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:opacity-70 text-sm flex items-center justify-center min-w-[140px] shadow-lg shadow-orange-500/30 transition-all active:scale-95">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Proses...</>
              ) : (
                <>Pesan Sekarang</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}