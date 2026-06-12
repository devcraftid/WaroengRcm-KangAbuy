import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, UtensilsCrossed, Plus, Minus, Trash2,
  ShoppingCart, ArrowLeft, QrCode, MapPin, Clock, Star,
  Search, Package, User, Phone, FileText, ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../stores/cartStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function QRTableOrder() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tableNumber = searchParams.get('table') || ''

  const { setGuestInfo, guestName, guestPhone, guestNotes } = useCartStore()

  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [tableInfo, setTableInfo] = useState(null)

  useEffect(() => {
    if (tableNumber) {
      loadTableInfo()
      useCartStore.getState().setTableId(tableNumber)
      useCartStore.getState().setOrderType('dine_in')
    }
    loadMenus()
  }, [tableNumber])

  const loadTableInfo = async () => {
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNumber)
        .single()
      
      if (data) {
        setTableInfo(data)
        if (data.status === 'available') {
          await supabase.from('tables').update({ status: 'occupied' }).eq('id', data.id)
        }
      }
    } catch (error) {
      console.error('Error loading table:', error)
    }
  }

  const loadMenus = async () => {
    try {
      const [menuResult, catResult] = await Promise.all([
        supabase.from('menus').select('*, categories(name)').eq('is_available', true).order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      ])
      setMenus(menuResult.data || [])
      setCategories(catResult.data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat menu')
    } finally {
      setLoading(false)
    }
  }

  const filteredMenus = menus.filter(m => {
    const matchCategory = selectedCategory === 'all' || m.category_id === selectedCategory
    const matchSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const addToCart = (menu) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === menu.id)
      if (existing) return prev.map(i => i.id === menu.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...menu, quantity: 1 }]
    })
    toast.success(`${menu.name} ditambahkan`)
  }

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0))
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const handleOrder = () => {
    // Simpan cart ke store dan redirect ke checkout
    const cartStore = useCartStore.getState()
    cart.forEach(item => {
      cartStore.addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        description: item.description
      })
      for (let i = 1; i < item.quantity; i++) {
        cartStore.addItem({
          id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          description: item.description
        })
      }
    })
    navigate('/checkout')
  }

  if (!tableNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <QrCode className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">QR Code Tidak Valid</h1>
          <p className="text-gray-500 mb-4">Scan QR Code meja yang benar untuk memesan</p>
          <Link to="/menu" className="text-orange-600 font-medium hover:underline">
            Lihat Menu Biasa
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* ─── App Content terpusat ─── */}
      <div className="w-full max-w-[480px] mx-auto bg-white min-h-screen shadow-[0_0_40px_rgba(0,0,0,0.1)] relative isolate flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                Pesan dari Meja
              </h1>
              <p className="text-orange-100 text-sm flex items-center mt-0.5">
                <MapPin className="w-3 h-3 mr-1" />
                Meja: {tableNumber}
                {tableInfo && <span className="ml-2">· Kapasitas: {tableInfo.capacity} orang</span>}
                {guestName && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    👤 {guestName}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Edit info button */}
              {guestName && (
                <button
                  onClick={() => {
                    setInputName(guestName)
                    setInputPhone(guestPhone)
                    setInputNotes(guestNotes)
                    setShowGuestModal(true)
                  }}
                  className="p-2 bg-white/20 rounded-lg text-xs"
                  title="Edit info pemesan"
                >
                  <User className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 bg-white/20 rounded-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Categories */}
          <div className="flex space-x-1 overflow-x-auto mt-2 hide-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                selectedCategory === 'all' ? 'bg-white text-orange-600' : 'bg-white/20 text-white'
              }`}
            >
              <Package className="w-3 h-3 inline mr-1" />Semua
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === cat.id ? 'bg-white text-orange-600' : 'bg-white/20 text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="w-full px-3 sm:px-4 py-4 flex-1">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Menu tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-20">
            {filteredMenus.map(menu => (
              <motion.button
                key={menu.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(menu)}
                className="bg-white rounded-xl shadow-sm overflow-hidden text-left hover:shadow-md transition-all"
              >
                <div className="h-28 sm:h-32 bg-gradient-to-br from-orange-100 to-red-100 relative">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <UtensilsCrossed className="w-8 h-8 text-orange-300" />
                    </div>
                  )}
                  {menu.is_best_seller && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center">
                      <Star className="w-2 h-2 mr-0.5 fill-current" />Best
                    </div>
                  )}
                </div>
                <div className="p-2.5 sm:p-3">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-1">{menu.name}</h3>
                  <p className="text-orange-600 font-bold text-sm sm:text-base mt-1">{formatCurrency(menu.price)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Cart Button Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 p-3 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 w-full max-w-[480px]">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {cart.reduce((s, i) => s + i.quantity, 0)} item · {formatCurrency(total)}
            <span className="ml-2">→</span>
          </button>
        </div>
      )}

      {/* Cart Slide-up Modal */}
      {showCart && (
        <div className="fixed inset-0 z-40 bg-black/60 flex flex-col items-center" onClick={() => setShowCart(false)}>
          <div className="w-full max-w-[480px] bg-white mt-auto h-full sm:h-[90vh] sm:rounded-t-3xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
              <button onClick={() => setShowCart(false)} className="flex items-center text-gray-600">
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="text-sm">Kembali</span>
              </button>
              <h2 className="font-bold">Pesanan Meja {tableNumber}</h2>
              <div className="w-16"></div>
            </div>

            {/* Guest info summary */}
            {guestName && (
              <div className="mx-4 mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-orange-700">👤 {guestName}</p>
                  <p className="text-xs text-orange-600">{guestPhone}</p>
                  {guestNotes && <p className="text-xs text-orange-500 mt-0.5">📝 {guestNotes}</p>}
                </div>
                <button
                  onClick={() => {
                    setInputName(guestName)
                    setInputPhone(guestPhone)
                    setInputNotes(guestNotes)
                    setShowCart(false)
                    setShowGuestModal(true)
                  }}
                  className="text-xs text-orange-600 underline"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Keranjang kosong</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center bg-gray-50 rounded-xl p-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UtensilsCrossed className="w-6 h-6 text-orange-300" />
                        )}
                      </div>
                      <div className="flex-1 ml-3 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        <p className="text-orange-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="ml-3 text-right">
                        <p className="font-bold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 mt-1">
                          <Trash2 className="w-3 h-3 inline" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t bg-white sticky bottom-0 z-10">
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600">Total</span>
                  <span className="text-xl font-bold text-orange-600">{formatCurrency(total)}</span>
                </div>
                <button
                  onClick={handleOrder}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-base hover:shadow-lg transition-all"
                >
                  Konfirmasi Pesanan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
