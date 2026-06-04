import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'
import useAuthStore from '../../stores/authStore'

export default function POS() {
  const { profile } = useAuthStore()
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [tableNumber, setTableNumber] = useState('')
  const [orderType, setOrderType] = useState('dine_in')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMenus()
  }, [selectedCategory])

  const loadMenus = async () => {
    try {
      let query = supabase.from('menus').select('*, categories(*)')
      
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      const { data: menuData } = await query
      const { data: categoryData } = await supabase.from('categories').select('*')
      
      setMenus(menuData || [])
      setCategories(categoryData || [])
    } catch (error) {
      console.error('Error loading menus:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addToCart = (menu) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === menu.id)
      if (existingItem) {
        return prevCart.map(item =>
          item.id === menu.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, { ...menu, quantity: 1 }]
    })
    toast.success(`${menu.name} ditambahkan`)
  }

  const updateQuantity = (menuId, delta) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.id === menuId) {
            const newQuantity = item.quantity + delta
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
          }
          return item
        })
        .filter(Boolean)
    })
  }

  const removeFromCart = (menuId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== menuId))
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong')
      return
    }

    if (orderType === 'dine_in' && !tableNumber) {
      toast.error('Masukkan nomor meja')
      return
    }

    try {
      const total = calculateTotal()

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber,
          order_type: orderType,
          total_amount: total,
          status: 'pending',
          cashier_id: profile?.id,
          created_by: profile?.id
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map(item => ({
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
          status: paymentMethod === 'cash' ? 'completed' : 'pending'
        })

      if (paymentError) throw paymentError

      // Log activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Order #${order.id.slice(0, 8)} dibuat - ${formatCurrency(total)}`,
        type: 'order_created'
      })

      toast.success('Order berhasil dibuat!')
      setCart([])
      setTableNumber('')
      setShowPayment(false)

      // Print invoice if needed
      if (paymentMethod === 'cash') {
        printInvoice(order)
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Gagal membuat order')
    }
  }

  const printInvoice = (order) => {
    // Implementation for printing invoice
    window.print()
  }

  return (
    <div className="h-full flex">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenus.map(menu => (
              <motion.button
                key={menu.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(menu)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
              >
                <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl mb-3 flex items-center justify-center">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <UtensilsCrossed className="w-8 h-8 text-orange-400" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{menu.name}</h3>
                <p className="text-orange-600 font-bold mt-1">{formatCurrency(menu.price)}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Order Baru
          </h2>

          {/* Order Type */}
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tipe Order</label>
            <div className="grid grid-cols-3 gap-2">
              {['dine_in', 'takeaway_waiting', 'takeaway_pickup'].map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    orderType === type
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'dine_in' ? 'Dine In' : type === 'takeaway_waiting' ? 'Waiting' : 'Pickup'}
                </button>
              ))}
            </div>
          </div>

          {/* Table Number */}
          {orderType === 'dine_in' && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Nomor Meja</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Contoh: A01"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence>
            {cart.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center space-x-3 mb-4 bg-gray-50 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs mt-1">Klik menu untuk menambahkan</p>
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotal())}</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setPaymentMethod('cash')
                  handleCheckout()
                }}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <Banknote className="w-5 h-5" />
                <span>Bayar Cash</span>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod('qris')
                  setShowPayment(true)
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <QrCode className="w-5 h-5" />
                <span>Bayar QRIS</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Pembayaran QRIS</h3>
                <button onClick={() => setShowPayment(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <QrCode className="w-32 h-32 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">Scan QR code untuk membayar</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(calculateTotal())}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Konfirmasi Pembayaran
                </button>
                <button
                  onClick={() => setShowPayment(false)}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}