import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, QrCode, Banknote, MapPin, Phone, User, ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, generateOrderNumber } from '../../utils/format'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function Checkout() {
  const { items, getTotal, clearCart, tableId, orderType } = useCartStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const total = getTotal()

  const [customerName, setCustomerName] = useState(profile?.full_name || '')
  const [customerPhone, setCustomerPhone] = useState(profile?.phone || '')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('qris')
  const [qrisImage, setQrisImage] = useState(null)
  const [proofFile, setProofFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [orderData, setOrderData] = useState(null)

  useEffect(() => {
    loadQRIS()
  }, [])

  const loadQRIS = async () => {
    const { data } = await supabase
      .from('website_settings')
      .select('qris_image_url')
      .single()
    
    if (data?.qris_image_url) {
      setQrisImage(data.qris_image_url)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || null,
          table_number: tableId || null,
          order_type: orderType || 'dine_in',
          status: 'pending',
          total_amount: total,
          notes: notes
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
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

      // Create payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: total,
          method: paymentMethod,
          status: paymentMethod === 'cash' ? 'pending' : 'pending'
        })

      if (paymentError) throw paymentError

      // Upload proof if QRIS
      if (paymentMethod === 'qris' && proofFile) {
        const fileExt = proofFile.name.split('.').pop()
        const fileName = `${order.id}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName)

        await supabase
          .from('payments')
          .update({ proof_url: publicUrl })
          .eq('order_id', order.id)
      }

      // Create notification for customer
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Order Berhasil',
          message: `Order #${order.id.slice(0, 8)} telah dibuat`,
          type: 'order_created',
          link: `/order/${order.id}`
        })
      }

      setOrderData(order)
      setOrderComplete(true)
      clearCart()
      toast.success('Order berhasil dibuat!')
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Gagal membuat order')
    } finally {
      setLoading(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <ShoppingBag className="w-12 h-12 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Berhasil!</h2>
        <p className="text-gray-500 mb-8">
          Order #{orderData?.id?.slice(0, 8)} telah dibuat. Silakan tunggu konfirmasi.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(`/order/${orderData?.id}`)}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600"
          >
            Track Order
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
          >
            Pesan Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pemesan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama Anda"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0812-3456-7890"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tambahkan catatan untuk pesanan Anda..."
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metode Pembayaran</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    paymentMethod === 'qris'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <QrCode className="w-8 h-8 text-orange-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">QRIS</h3>
                  <p className="text-xs text-gray-500">Scan & upload bukti</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Banknote className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Cash</h3>
                  <p className="text-xs text-gray-500">Bayar di kasir</p>
                </button>
              </div>

              {/* QRIS Display */}
              {paymentMethod === 'qris' && qrisImage && (
                <div className="mt-6 p-6 bg-gray-50 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Scan QRIS di bawah ini:</h3>
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img src={qrisImage} alt="QRIS" className="w-48 h-48" />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Bukti Pembayaran</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files[0])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 text-lg"
            >
              {loading ? 'Memproses...' : `Bayar ${formatCurrency(total)}`}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ringkasan Pesanan</h2>
            
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name} x{item.quantity}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}