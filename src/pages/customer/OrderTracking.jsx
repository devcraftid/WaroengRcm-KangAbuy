import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Clock, CheckCircle, ChefHat, Package, ShoppingBag,
  ArrowLeft, MapPin, Banknote, QrCode,
  AlertCircle, Upload, Image as ImageIcon, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function OrderTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProofModal, setShowProofModal] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)

  useEffect(() => {
    if (id) loadOrder()
    
    // Realtime subscription
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        setOrder(payload.new)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
        filter: `order_id=eq.${id}`
      }, () => {
        loadPayment()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  const loadOrder = async () => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderData) {
        setOrder(orderData)
        
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*, menus(*)')
          .eq('order_id', id)
        
        setItems(itemsData || [])
      }
      
      await loadPayment()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPayment = async () => {
    try {
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      setPayment(payData || null)
    } catch (error) {
      console.error('Error loading payment:', error)
    }
  }

  // ============================================
  // MANUAL PAYMENT (UPLOAD BUKTI)
  // ============================================
  const handleUploadProof = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    try {
      setUploadingProof(true)
      
      // Karena kita butuh storage, untuk saat ini jika bucket tidak ada,
      // kita konversi ke base64 agar aman (atau idealnya upload ke bucket 'payment_proofs')
      // Kita coba upload ke storage terlebih dahulu
      const fileExt = file.name.split('.').pop()
      const fileName = `${order.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Coba upload ke bucket Supabase
      const { error: uploadError, data } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file)

      let proofUrl = ''
      
      if (uploadError) {
        // Jika gagal karena bucket tidak ada, fallback ke base64
        console.warn('Gagal upload ke storage (mungkin bucket tidak ada), fallback ke base64', uploadError)
        const reader = new FileReader()
        proofUrl = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
      } else {
        // Jika berhasil
        const { data: { publicUrl } } = supabase.storage
          .from('payment_proofs')
          .getPublicUrl(filePath)
        proofUrl = publicUrl
      }

      // Update tabel payments
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          proof_url: proofUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) throw updateError

      // Kirim notifikasi ke kasir
      await supabase.from('notifications').insert({
        user_id: null,
        title: 'Bukti Transfer Diupload 💸',
        message: `Order #${order.id.slice(0, 8)} telah mengupload bukti transfer. Segera validasi!`,
        type: 'payment_proof',
        link: `/cashier/payment/${order.id}`
      })

      toast.success('Bukti transfer berhasil diupload!')
      setShowProofModal(false)
      loadPayment()

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Gagal mengupload bukti transfer')
    } finally {
      setUploadingProof(false)
    }
  }

  // ============================================
  // PAYMENT STATUS
  // ============================================
  const getPaymentStatus = () => {
    if (!payment) return {
      icon: AlertCircle,
      color: 'bg-gray-50 border-gray-200',
      textColor: 'text-gray-600',
      title: 'Belum Ada Pembayaran',
      desc: 'Menunggu pembayaran',
      badge: '⏳ PENDING',
      badgeColor: 'bg-gray-100 text-gray-600'
    }

    if (payment.status === 'completed') {
      return {
        icon: CheckCircle,
        color: 'bg-green-50 border-green-200',
        textColor: 'text-green-700',
        title: 'Pembayaran Lunas ✅',
        desc: `Divalidasi pada ${formatDateTime(payment.validated_at || payment.updated_at)}`,
        badge: '✅ LUNAS',
        badgeColor: 'bg-green-100 text-green-700'
      }
    }

    if (payment.status === 'pending') {
      return {
        icon: Clock,
        color: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-700',
        title: 'Menunggu Validasi',
        desc: payment.method === 'qris' ? 'Selesaikan pembayaran Anda.' : 'Menunggu konfirmasi pembayaran dari kasir.',
        badge: '⚠️ MENUNGGU',
        badgeColor: 'bg-yellow-100 text-yellow-700'
      }
    }

    return {
      icon: AlertCircle,
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700',
      title: 'Pembayaran Gagal',
      desc: 'Pembayaran gagal atau ditolak.',
      badge: '❌ GAGAL',
      badgeColor: 'bg-red-100 text-red-700'
    }
  }

  const paymentStatus = getPaymentStatus()
  const StatusIcon = paymentStatus.icon

  // ============================================
  // ORDER STEPS
  // ============================================
  const steps = [
    { status: 'pending', icon: Clock, label: 'Menunggu', desc: 'Pesanan diterima' },
    { status: 'processing', icon: ChefHat, label: 'Diproses', desc: 'Sedang dimasak' },
    { status: 'ready', icon: Package, label: 'Siap', desc: 'Siap diambil' },
    { status: 'completed', icon: CheckCircle, label: 'Selesai', desc: 'Pesanan selesai' }
  ]

  const getCurrentStep = () => {
    if (!order) return 0
    const statusOrder = ['pending', 'processing', 'ready', 'completed']
    const idx = statusOrder.indexOf(order.status)
    return idx >= 0 ? idx : 0
  }

  const currentStep = getCurrentStep()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat pesanan...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Order Tidak Ditemukan</h2>
          <button onClick={() => navigate('/')} className="text-orange-600 hover:underline text-sm">Kembali ke Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-gray-600">
            <ArrowLeft className="w-5 h-5 mr-1" /><span className="text-sm">Kembali</span>
          </button>
          <h1 className="font-bold text-lg">Track Order</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Order Info */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">Order</p>
              <p className="text-lg font-bold font-mono">#{order.id.slice(0, 8)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</p>
            </div>
          </div>

          {order.table_number && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1 text-orange-500" />
              <span>Meja: <strong>{order.table_number}</strong></span>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <ShoppingBag className="w-4 h-4 mr-1 text-orange-500" />
            <span>Tipe: <strong>{order.order_type === 'dine_in' ? '🍽️ Dine In' : order.order_type === 'takeaway_waiting' ? '🛍️ Takeaway' : '📦 Pickup'}</strong></span>
          </div>
        </div>

        {/* PAYMENT STATUS CARD */}
        <div className={`rounded-2xl border p-4 sm:p-6 ${paymentStatus.color}`}>
          <div className="flex items-start space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${paymentStatus.badgeColor}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-bold ${paymentStatus.textColor}`}>{paymentStatus.title}</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${paymentStatus.badgeColor}`}>
                  {paymentStatus.badge}
                </span>
              </div>
              <p className="text-sm opacity-80 mt-1">{paymentStatus.desc}</p>
              
              {payment && (
                <div className="flex items-center space-x-2 mt-3">
                  <span className="inline-flex items-center px-2 py-1 bg-white/50 rounded-lg text-xs">
                    {payment.method === 'cash' ? <Banknote className="w-3 h-3 mr-1" /> : <QrCode className="w-3 h-3 mr-1" />}
                    {payment.method === 'cash' ? 'Cash' : 'QRIS'}
                  </span>
                  <span className="text-xs">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              )}

              {/* Bukti Pembayaran / Upload */}
              {payment?.method === 'qris' && payment?.status === 'pending' && (
                <div className="mt-4 bg-white p-4 rounded-xl border border-gray-100 flex flex-col items-center">
                  {!payment.proof_url ? (
                    <>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Scan QRIS Berikut</p>
                      <div className="bg-white p-2 rounded-xl shadow-sm mb-4 border-2 border-orange-100">
                        <img src="https://tbjzsyoygpaioxxhsnmk.supabase.co/storage/v1/object/public/website-assets/qris/1780557685955-o1yjhm.jpg" alt="QRIS" className="w-48 h-48 object-contain rounded-lg" />
                      </div>
                      
                      <div className="w-full">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer bg-orange-50 hover:bg-orange-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadingProof ? (
                              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-orange-500 mb-2" />
                                <p className="text-sm font-semibold text-orange-700">Upload Bukti Transfer</p>
                              </>
                            )}
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={handleUploadProof} disabled={uploadingProof} />
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="w-full text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <p className="font-semibold text-gray-900">Bukti Telah Diupload</p>
                      <p className="text-xs text-gray-500 mb-4">Menunggu kasir melakukan validasi.</p>
                      
                      <button onClick={() => setShowProofModal(true)} className="flex items-center justify-center gap-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                        <Eye className="w-4 h-4" /> Lihat Bukti
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Lihat Bukti */}
        {showProofModal && payment?.proof_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowProofModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Bukti Pembayaran</h3>
                <button onClick={() => setShowProofModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-4 bg-gray-100">
                <img src={payment.proof_url} alt="Bukti Transfer" className="w-full rounded-xl shadow-sm max-h-[60vh] object-contain bg-white" />
              </div>
            </motion.div>
          </div>
        )}

        {/* ORDER PROGRESS */}
        {/* ============================================ */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Status Pesanan</h3>
          
          <div className="relative">
            {steps.map((step, index) => {
              const isCompleted = index <= currentStep
              const isCurrent = index === currentStep
              
              return (
                <div key={step.status} className="flex items-start mb-6 last:mb-0">
                  <div className="flex flex-col items-center mr-3 sm:mr-4">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isCurrent ? 1.1 : 1,
                      }}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.div>
                    {index < steps.length - 1 && (
                      <div className={`w-0.5 h-8 sm:h-10 ${
                        index < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1 sm:pt-2">
                    <h3 className={`font-semibold text-sm sm:text-base ${
                      isCompleted ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">{step.desc}</p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-orange-600 mt-1 font-medium"
                      >
                        {order.status === 'pending' && '⏳ Menunggu konfirmasi'}
                        {order.status === 'processing' && '👨‍🍳 Sedang dimasak'}
                        {order.status === 'ready' && '📦 Siap diambil!'}
                        {order.status === 'completed' && '✅ Selesai'}
                      </motion.p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Detail Pesanan</h3>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                    {item.menus?.image_url ? (
                      <img src={item.menus.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.menus?.name}</p>
                    <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.price)}</p>
                  </div>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Catatan</h3>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Modal Preview Bukti */}
      {showProofModal && payment?.proof_url && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowProofModal(false)}>
          <div className="relative max-w-lg w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowProofModal(false)}
              className="absolute -top-10 right-0 text-white text-sm hover:underline"
            >
              ✕ Tutup
            </button>
            <div className="bg-white rounded-2xl p-4">
              <h3 className="text-lg font-bold mb-3 text-center">📎 Bukti Pembayaran</h3>
              <img 
                src={payment.proof_url} 
                alt="Bukti Pembayaran" 
                className="w-full max-h-[70vh] object-contain rounded-xl bg-gray-100"
                onError={(e) => {
                  e.target.style.display = 'none'
                  toast.error('Gagal memuat gambar')
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}