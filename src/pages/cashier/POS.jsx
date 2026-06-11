import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Printer, X, UtensilsCrossed
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

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
  const [showCartMobile, setShowCartMobile] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMenus() }, [selectedCategory])

  const loadMenus = async () => {
    try {
      let query = supabase.from('menus').select('*, categories(*)').eq('is_available', true)
      if (selectedCategory !== 'all') query = query.eq('category_id', selectedCategory)

      const [menuResult, catResult] = await Promise.all([
        query.order('name'),
        supabase.from('categories').select('*').order('name')
      ])
      setMenus(menuResult.data || [])
      setCategories(catResult.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMenus = menus.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const addToCart = (menu) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === menu.id)
      if (existing) return prev.map(i => i.id === menu.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...menu, quantity: 1 }]
    })
  }
  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0))
  }
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Keranjang kosong'); return }
    if (orderType === 'dine_in' && !tableNumber) { toast.error('Masukkan nomor meja'); return }

    try {
      // Buat order tanpa created_by
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: tableNumber || null,
          order_type: orderType,
          total_amount: total,
          status: 'pending',
          cashier_id: profile?.id,
          notes: ''
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Order items
      const items = cart.map(item => ({
        order_id: order.id,
        menu_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      }))
      await supabase.from('order_items').insert(items)

      // Payment
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: total,
        method: paymentMethod,
        status: paymentMethod === 'cash' ? 'completed' : 'pending'
      })

      // Activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Order #${order.id.slice(0, 8)} - ${formatCurrency(total)}`,
        type: 'order_created'
      })

      toast.success('Order berhasil!')
      setCart([])
      setTableNumber('')
      setShowPayment(false)
      setShowCartMobile(false)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal membuat order: ' + error.message)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          {/* Categories - Horizontal Scroll */}
          <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-1">
            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-[#f05a28] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semua</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-[#f05a28] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat.name}</button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {filteredMenus.map(menu => (
              <button key={menu.id} onClick={() => addToCart(menu)}
                className="bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all text-left flex flex-col transform hover:-translate-y-1">
                <div className="h-24 sm:h-28 w-full bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl flex items-center justify-center mb-3 overflow-hidden relative">
                  {menu.image_url ? <img src={menu.image_url} alt="" className="w-full h-full object-cover" /> :
                    <UtensilsCrossed className="w-8 h-8 text-orange-200" />}
                </div>
                <p className="text-xs font-bold text-gray-900 leading-tight mb-1 line-clamp-2 flex-1">{menu.name}</p>
                <p className="text-sm text-[#f05a28] font-black">{formatCurrency(menu.price)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart - Desktop */}
      <div className="hidden lg:flex w-80 flex-col bg-white border-l">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold flex items-center text-gray-900"><ShoppingCart className="w-5 h-5 mr-2 text-[#f05a28]" />Order Baru</h3>
          <div className="flex space-x-2 mt-4 bg-gray-100 p-1 rounded-xl">
            {['dine_in', 'takeaway_waiting', 'takeaway_pickup'].map(t => (
              <button key={t} onClick={() => setOrderType(t)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${orderType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'dine_in' ? 'Dine In' : t === 'takeaway_waiting' ? 'Waiting' : 'Pickup'}
              </button>
            ))}
          </div>
          {orderType === 'dine_in' && (
            <div className="mt-3">
              <input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="Masukkan Nomor Meja" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#f05a28]/20 focus:border-[#f05a28] outline-none transition-all bg-white" />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-gray-500">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded bg-gray-100"><Minus className="w-3 h-3" /></button>
                <span className="w-6 text-center text-xs">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded bg-orange-100 text-orange-600"><Plus className="w-3 h-3" /></button>
              </div>
              <span className="ml-2 font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-gray-100 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold text-gray-500">Total Tagihan</span>
            <span className="text-2xl font-black text-[#f05a28]">{formatCurrency(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setPaymentMethod('cash'); handleCheckout() }} className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center">
              <Banknote className="w-4 h-4 mr-2 opacity-80" /> Cash
            </button>
            <button onClick={() => { setPaymentMethod('qris'); handleCheckout() }} className="w-full py-3 bg-gradient-to-br from-[#f05a28] to-[#d44d1f] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center">
              <QrCode className="w-4 h-4 mr-2 opacity-80" /> QRIS
            </button>
          </div>
        </div>
      </div>

      {/* Cart - Mobile Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-3 z-20">
        <button onClick={() => setShowCartMobile(true)} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 mr-2" />
          {cart.length} item · {formatCurrency(total)}
        </button>
      </div>

      {/* Cart - Mobile Modal */}
      <AnimatePresence>
        {showCartMobile && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="lg:hidden fixed inset-0 z-30 bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">Keranjang ({cart.length})</h3>
              <button onClick={() => setShowCartMobile(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex space-x-1 p-3">
              {['dine_in', 'takeaway_waiting', 'takeaway_pickup'].map(t => (
                <button key={t} onClick={() => setOrderType(t)} className={`flex-1 py-2 rounded-lg text-xs ${orderType === t ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>
                  {t === 'dine_in' ? 'Dine In' : t === 'takeaway_waiting' ? 'Waiting' : 'Pickup'}
                </button>
              ))}
            </div>
            {orderType === 'dine_in' && (
              <div className="px-3 pb-3"><input type="text" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="Nomor Meja" className="w-full px-3 py-2 rounded-lg border text-sm" /></div>
            )}
            <div className="flex-1 overflow-y-auto px-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center py-2 border-b">
                  <div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-gray-500">{formatCurrency(item.price)}</p></div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded bg-orange-100 text-orange-600 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="ml-3 font-bold">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t">
              <div className="flex justify-between mb-3"><span className="font-bold">Total</span><span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span></div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setPaymentMethod('cash'); handleCheckout() }} className="py-3 bg-green-500 text-white rounded-xl font-bold text-sm">💵 Cash</button>
                <button onClick={() => { setPaymentMethod('qris'); handleCheckout() }} className="py-3 bg-blue-500 text-white rounded-xl font-bold text-sm">📱 QRIS</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}