import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Upload,
  Image,
  Printer
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function CashierPayment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [change, setChange] = useState(0)
  const [qrisProof, setQrisProof] = useState(null)

  useEffect(() => {
    if (id) loadOrderData()
  }, [id])

  const loadOrderData = async () => {
    try {
      const [orderResult, paymentResult] = await Promise.all([
        supabase.from('orders').select('*, customer:profiles!customer_id(*)').eq('id', id).single(),
        supabase.from('payments').select('*').eq('order_id', id).order('created_at', { ascending: false }).limit(1)
      ])

      setOrder(orderResult.data)
      if (paymentResult.data?.length > 0) {
        setPayment(paymentResult.data[0])
      }
    } catch (error) {
      console.error('Error loading payment data:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const handleCashPayment = async () => {
    if (!cashAmount || parseFloat(cashAmount) < order.total_amount) {
      toast.error('Jumlah uang kurang')
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount: order.total_amount,
          method: 'cash',
          status: 'completed',
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        })

      if (error) throw error

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', order.id)

      // Log activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Pembayaran cash untuk order #${order.id.slice(0, 8)} - ${formatCurrency(order.total_amount)}`,
        type: 'payment_received'
      })

      // Send notification
      if (order.customer_id) {
        await supabase.from('notifications').insert({
          user_id: order.customer_id,
          title: 'Pembayaran Berhasil',
          message: `Pembayaran untuk order #${order.id.slice(0, 8)} telah diterima`,
          type: 'payment_received',
          link: `/order/${order.id}`
        })
      }

      toast.success('Pembayaran berhasil!')
      
      // Print receipt
      printReceipt()

      navigate('/cashier/orders')
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Gagal memproses pembayaran')
    } finally {
      setProcessing(false)
    }
  }

  const handleQRISValidation = async () => {
    if (!payment?.proof_url && !qrisProof) {
      toast.error('Belum ada bukti pembayaran')
      return
    }

    setProcessing(true)
    try {
      // Upload proof if provided by cashier
      let proofUrl = payment?.proof_url
      if (qrisProof) {
        const fileExt = qrisProof.name.split('.').pop()
        const fileName = `payment-${order.id}-${Date.now()}.${fileExt}`
        await supabase.storage.from('payment-proofs').upload(fileName, qrisProof)
        const { data } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)
        proofUrl = data.publicUrl
      }

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          proof_url: proofUrl,
          validated_by: profile?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (error) throw error

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', order.id)

      // Log activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Validasi QRIS untuk order #${order.id.slice(0, 8)}`,
        type: 'payment_validated'
      })

      toast.success('Pembayaran QRIS divalidasi!')
      navigate('/cashier/orders')
    } catch (error) {
      console.error('Error validating QRIS:', error)
      toast.error('Gagal validasi pembayaran')
    } finally {
      setProcessing(false)
    }
  }

  const printReceipt = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Order #${order?.id?.slice(0, 8)}</title>
          <style>
            body { font-family: Arial; padding: 20px; max-width: 300px; margin: auto; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .bold { font-weight: bold; }
            .total { font-size: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="center">
            <h3>WAROENG RCM KANG ABUY</h3>
            <p>Jl. Example No. 123</p>
            <div class="divider"></div>
            <p>Order: #${order?.id?.slice(0, 8)}</p>
            <p>${formatDateTime(order?.created_at)}</p>
            <p>Kasir: ${profile?.full_name}</p>
            <div class="divider"></div>
            <p class="bold">${order?.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'}</p>
            ${order?.table_number ? `<p>Meja: ${order.table_number}</p>` : ''}
            <div class="divider"></div>
            <p>Metode: Cash</p>
            <p>Tunai: ${formatCurrency(parseFloat(cashAmount))}</p>
            <p>Kembalian: ${formatCurrency(change)}</p>
            <div class="divider"></div>
            <p class="total bold">Total: ${formatCurrency(order?.total_amount)}</p>
            <div class="divider"></div>
            <p>Terima kasih!</p>
            <p>Makanan Enak, Harga Ekonomis</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const calculateChange = (amount) => {
    setCashAmount(amount)
    if (amount && order) {
      const changeAmount = parseFloat(amount) - order.total_amount
      setChange(changeAmount > 0 ? changeAmount : 0)
    } else {
      setChange(0)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Order tidak ditemukan</h2>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-5 h-5 mr-2" />
        Kembali
      </button>

      {/* Order Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Pembayaran Order #{order.id.slice(0, 8)}
        </h2>
        
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Pelanggan</span>
            <span className="font-medium">{order.customer?.full_name || 'Guest'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tipe</span>
            <span className="font-medium capitalize">{order.order_type}</span>
          </div>
          {order.table_number && (
            <div className="flex justify-between">
              <span className="text-gray-500">Meja</span>
              <span className="font-medium">{order.table_number}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Tanggal</span>
            <span className="font-medium">{formatDateTime(order.created_at)}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-3xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Metode Pembayaran</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
            }`}
          >
            <Banknote className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-semibold">Cash</h4>
            <p className="text-xs text-gray-500">Bayar tunai</p>
          </button>
          <button
            onClick={() => setPaymentMethod('qris')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              paymentMethod === 'qris' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
            }`}
          >
            <QrCode className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-semibold">QRIS</h4>
            <p className="text-xs text-gray-500">Validasi QRIS</p>
          </button>
        </div>

        {/* Cash Payment */}
        {paymentMethod === 'cash' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah Uang Diterima
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => calculateChange(e.target.value)}
                placeholder="Masukkan jumlah uang"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-lg"
              />
            </div>

            {change > 0 && (
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-gray-600">Kembalian:</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(change)}</p>
              </div>
            )}

            <button
              onClick={handleCashPayment}
              disabled={processing || !cashAmount || parseFloat(cashAmount) < order.total_amount}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {processing ? 'Memproses...' : 'Konfirmasi Pembayaran'}
            </button>
          </div>
        )}

        {/* QRIS Validation */}
        {paymentMethod === 'qris' && (
          <div className="space-y-4">
            {payment?.proof_url && (
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <img src={payment.proof_url} alt="Bukti Pembayaran" className="max-h-48 mx-auto rounded-lg" />
                <p className="text-xs text-gray-500 mt-2">Bukti pembayaran dari pelanggan</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Bukti (Optional)
              </label>
              <label className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Klik untuk upload bukti</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQrisProof(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={handleQRISValidation}
              disabled={processing || (!payment?.proof_url && !qrisProof)}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              {processing ? 'Memvalidasi...' : 'Validasi Pembayaran'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}