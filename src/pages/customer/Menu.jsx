import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UtensilsCrossed, Star, Heart, Plus, Minus, X, ChevronDown, ShoppingCart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'
import { toast } from 'sonner'

const PRIMARY = '#f05a28'

export default function Menu() {
  const [searchParams] = useSearchParams()
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState([])
  const [quantities, setQuantities] = useState({}) // menuId -> qty dari cart
  const catRef = useRef(null)
  const { items, addItem, updateQuantity, removeItem, getTotal, getItemCount } = useCartStore()
  const { user } = useAuthStore()

  useEffect(() => {
    loadData()
    loadFavorites()
    const itemId = searchParams.get('item')
    if (itemId) {
      setTimeout(() => {
        const el = document.getElementById(`menu-${itemId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [selectedCategory])

  // Sync quantities dari cart
  useEffect(() => {
    const qty = {}
    items.forEach(item => { qty[item.id] = item.quantity })
    setQuantities(qty)
  }, [items])

  const loadData = async () => {
    setLoading(true)
    try {
      let menuQuery = supabase.from('menus').select('*, categories(name, slug)').eq('is_available', true)
      if (selectedCategory !== 'all') menuQuery = menuQuery.eq('category_id', selectedCategory)
      const [menuResult, categoryResult] = await Promise.all([
        menuQuery.order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      ])
      setMenus(menuResult.data || [])
      setCategories(categoryResult.data || [])
    } catch (error) {
      console.error('Error loading menu:', error)
      toast.error('Gagal memuat menu')
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = () => {
    if (user) {
      const stored = localStorage.getItem(`favorites_${user.id}`)
      if (stored) setFavorites(JSON.parse(stored))
    }
  }

  const toggleFavorite = (menuId) => {
    if (!user) { toast.error('Login terlebih dahulu'); return }
    const newFavs = favorites.includes(menuId)
      ? favorites.filter(id => id !== menuId)
      : [...favorites, menuId]
    setFavorites(newFavs)
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavs))
  }

  const handleAdd = (menu) => {
    addItem({ id: menu.id, name: menu.name, price: menu.price, image_url: menu.image_url, description: menu.description })
    toast.success(`${menu.name} ditambahkan`)
  }

  const handleIncrease = (menu) => {
    const item = items.find(i => i.id === menu.id)
    if (item) updateQuantity(menu.id, item.quantity + 1)
    else handleAdd(menu)
  }

  const handleDecrease = (menu) => {
    const item = items.find(i => i.id === menu.id)
    if (!item) return
    if (item.quantity <= 1) removeItem(menu.id)
    else updateQuantity(menu.id, item.quantity - 1)
  }

  const filteredMenus = menus.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group by category
  const groupedMenus = selectedCategory === 'all'
    ? categories.reduce((acc, cat) => {
        const catMenus = filteredMenus.filter(m => m.category_id === cat.id)
        if (catMenus.length > 0) acc[cat.name] = catMenus
        return acc
      }, {})
    : { '': filteredMenus }

  const totalQty = getItemCount()
  const totalPrice = getTotal()

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: totalQty > 0 ? 80 : 16 }}>

      {/* ─── STICKY CATEGORY HEADER ─── */}
      <div className="sticky top-14 z-30 bg-white" style={{ boxShadow: '0 1px 0 #f0f0f0' }}>
        {/* Search bar (toggle) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white border-b border-gray-100"
            >
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text" placeholder="Cari menu..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg
                               text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                               placeholder-gray-400"
                  />
                </div>
                <button onClick={() => { setShowSearch(false); setSearchQuery('') }}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category tabs row */}
        <div className="flex items-stretch border-b border-gray-100">
          {/* HEAD MENU label */}
          <div className="flex items-center gap-1 px-3 py-2.5 text-xs font-bold border-r border-gray-100 flex-shrink-0"
            style={{ color: PRIMARY }}>
            KATEGORI
          </div>

          {/* Scrollable tabs */}
          <div className="flex items-stretch overflow-x-auto hide-scrollbar flex-1 px-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`cat-tab ${selectedCategory === 'all' ? 'active' : ''}`}>
              Semua
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`cat-tab ${selectedCategory === cat.id ? 'active' : ''}`}>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <button onClick={() => setShowSearch(!showSearch)}
            className={`p-3 flex-shrink-0 transition-colors ${showSearch ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── MENU CONTENT ─── */}
      <div className="px-3 pt-4">
        {loading ? (
          // Skeleton
          <div className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                <div className="h-36 shimmer" />
                <div className="p-3 space-y-2">
                  <div className="h-4 shimmer rounded w-3/4" />
                  <div className="h-3 shimmer rounded w-1/2" />
                  <div className="h-8 shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMenus).map(([categoryName, categoryMenus]) => (
              <div key={categoryName}>
                {/* Category header */}
                {categoryName && (
                  <div className="mb-3 pb-2 border-b border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">PAKET</p>
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">{categoryName}</p>
                  </div>
                )}

                {/* 2-column grid */}
                <div className="grid grid-cols-2 gap-3">
                  {categoryMenus.map((menu, index) => (
                    <MenuCard
                      key={menu.id}
                      menu={menu}
                      index={index}
                      quantity={quantities[menu.id] || 0}
                      isFavorite={favorites.includes(menu.id)}
                      onToggleFavorite={() => toggleFavorite(menu.id)}
                      onAdd={() => handleAdd(menu)}
                      onIncrease={() => handleIncrease(menu)}
                      onDecrease={() => handleDecrease(menu)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {!loading && filteredMenus.length === 0 && (
              <div className="text-center py-16">
                <UtensilsCrossed className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Menu tidak ditemukan</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}
                  className="mt-3 text-sm font-medium" style={{ color: PRIMARY }}>
                  Reset pencarian
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CHECKOUT BAR (ESB Style) ─── */}
      <AnimatePresence>
        {totalQty > 0 && (
          <motion.div
            initial={{ y: 100, x: '-50%', opacity: 0 }} 
            animate={{ y: 0, x: '-50%', opacity: 1 }} 
            exit={{ y: 100, x: '-50%', opacity: 0 }}
            className="checkout-bar safe-bottom pb-2 pt-2 px-3 mx-auto"
            style={{ 
              borderRadius: '8px 8px 0 0',
              maxWidth: '480px',
              width: '100%',
              bottom: 0,
            }}
          >
            {/* Cart icon + badge */}
            <div className="relative flex-shrink-0 bg-white/20 p-2 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center
                               text-[10px] font-bold shadow-sm" style={{ color: PRIMARY }}>
                {totalQty > 9 ? '9+' : totalQty}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pl-1">
              <p className="text-[11px] text-white/90 font-medium">Total Harga</p>
              <p className="text-sm font-bold text-white">{formatCurrency(totalPrice)}</p>
            </div>

            {/* CTA */}
            <Link to="/cart"
              className="flex-shrink-0 px-4 py-2 bg-white rounded-lg text-xs font-bold shadow-sm"
              style={{ color: PRIMARY }}>
              CHECKOUT ({totalQty})
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ────────────────────────────────── */
/* MENU CARD — ESB Order Style        */
/* ────────────────────────────────── */
function MenuCard({ menu, index, quantity, isFavorite, onToggleFavorite, onAdd, onIncrease, onDecrease }) {
  return (
    <motion.div
      id={`menu-${menu.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="menu-card flex flex-col"
    >
      {/* Image */}
      <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {menu.image_url ? (
          <img src={menu.image_url} alt={menu.name}
            className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        {menu.is_best_seller && (
          <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full
                           text-[10px] font-bold text-white"
            style={{ background: PRIMARY }}>
            <Star className="w-2.5 h-2.5 fill-current" /> Best
          </span>
        )}

        {/* Favorite */}
        <button onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center
                     shadow-sm hover:scale-110 transition-transform">
          <Heart className={`w-3 h-3 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-2.5 flex flex-col flex-1">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-0.5 leading-snug flex-1">
          {menu.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2 font-medium">{formatCurrency(menu.price)}</p>

        {/* Add / Quantity control */}
        {quantity === 0 ? (
          <button onClick={onAdd} className="btn-add text-sm py-1.5">
            Add
          </button>
        ) : (
          <div className="qty-counter">
            <button onClick={onDecrease} className="qty-btn">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="qty-num text-sm">{quantity}</span>
            <button onClick={onIncrease} className="qty-btn">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}