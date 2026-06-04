import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Package, 
  Truck, 
  ShoppingBag,
  ArrowLeft,
  MapPin
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../utils/format'

export default function OrderTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()
    
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
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { status: 'pending', icon: Clock, label: 'Menunggu', description: 'Pesanan diterima' },
    { status: 'processing', icon: ChefHat, label: 'Diproses', description: 'Sedang dimasak' },
    { status: 'ready', icon: Package, label: 'Siap', description: 'Siap diambil' },
    { status: 'completed', icon: CheckCircle, label: 'Selesai', description: 'Pesanan selesai' }
  ]

  const getCurrentStep = () => {
    if (!order) return 0
    const statusOrder = ['pending', 'processing', 'ready', 'completed']
    return statusOrder.indexOf(order.status)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Tidak Ditemukan</h2>
          <button onClick={() => navigate('/')} className="text-orange-600 hover:text-orange-700">
            Kembali ke Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        <span>Kembali</span>
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Order</h1>
            <p className="text-sm text-gray-500">
              Order #{order.id.slice(0, 8)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(order.total_amount)}</p>
          </div>
        </div>

        {order.table_number && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-1" />
            <span>Meja: {order.table_number}</span>
          </div>
        )}
      </div>

      {/* Progress Tracker */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
        <div className="relative">
          {steps.map((step, index) => {
            const isCompleted = index <= getCurrentStep()
            const isCurrent = index === getCurrentStep()
            
            return (
              <div key={step.status} className="flex items-start mb-8 last:mb-0">
                <div className="flex flex-col items-center mr-4">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted ? '#f97316' : '#e5e7eb'
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  >
                    <step.icon className={`w-5 h-5 ${
                      isCompleted ? 'text-white' : 'text-gray-400'
                    }`} />
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div className={`w-0.5 h-12 ${
                      index < getCurrentStep() ? 'bg-orange-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold ${
                    isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </h3>
                  <p className="text-sm text-gray-500">{step.description}</p>
                  {isCurrent && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-orange-600 mt-1 font-medium"
                    >
                      Sedang diproses...
                    </motion.p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Detail Pesanan</h2>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.menus?.name}</p>
                  <p className="text-sm text-gray-500">{item.quantity}x {formatCurrency(item.price)}</p>
                </div>
              </div>
              <p className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold text-orange-600">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}