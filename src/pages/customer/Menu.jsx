import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, UtensilsCrossed, Star, Heart, Plus, Minus, X,
  ShoppingCart, ChevronUp, Expand
} from 'lucide-react'
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
  const [quantities, setQuantities] = useState({})

  // Modal state
  const [activeMenu, setActiveMenu] = useState(null)   // menu object yang sedang di-view
  const [modalQty, setModalQty] = useState(1)
  const [modalNote, setModalNote] = useState('')
  const [expandModal, setExpandModal] = useState(false)

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

  // Buka modal detail menu
  const openAddModal = (menu) => {
    setActiveMenu(menu)
    setModalQty(quantities[menu.id] || 1) // reset qty atau pakai qty yang sudah ada
    setModalNote('') // reset note
    setExpandModal(false)
  }

  const closeModal = () => {
    setActiveMenu(null)
    setExpandModal(false)
    setModalNote('')
  }

  // Konfirmasi tambah dari modal
  const handleConfirmAdd = () => {
    if (!activeMenu) return
    
    addItem({
      id: activeMenu.id,
      name: activeMenu.name,
      price: activeMenu.discountedPrice || activeMenu.price,
      image_url: activeMenu.image_url,
      quantity: modalQty,
      note: modalNote.trim()
    })

    toast.success(`${modalQty} ${activeMenu.name} ditambahkan`, {
      action: {
        label: 'Lihat Keranjang',
        onClick: () => window.location.href = '/cart'
      }
    })

    // Update qty sinkron
    setQuantities(prev => ({
      ...prev,
      [activeMenu.id]: (prev[activeMenu.id] || 0) + modalQty
    }))
    
    closeModal()
  }

  const handleIncrease = (menu) => {
    const item = items.find(i => i.id === menu.id)
    if (item) updateQuantity(menu.id, item.quantity + 1)
    else addItem({ id: menu.id, name: menu.name, price: menu.price, image_url: menu.image_url, description: menu.description })
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
    <div className="min-h-screen bg-white relative" style={{ paddingBottom: totalQty > 0 ? 60 : 16 }}>

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
          <div className="flex items-center gap-1 px-3 py-2.5 text-xs font-bold border-r border-gray-100 flex-shrink-0"
            style={{ color: PRIMARY }}>
            KATEGORI
          </div>
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
          <button onClick={() => setShowSearch(!showSearch)}
            className={`p-3 flex-shrink-0 transition-colors ${showSearch ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── MENU CONTENT ─── */}
      <div className="px-3 pt-4">
        {loading ? (
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
                {categoryName && (
                  <div className="mb-3 pb-2 border-b border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">PAKET</p>
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">{categoryName}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {categoryMenus.map((menu, index) => (
                    <MenuCard
                      key={menu.id}
                      menu={menu}
                      index={index}
                      quantity={quantities[menu.id] || 0}
                      isFavorite={favorites.includes(menu.id)}
                      onToggleFavorite={() => toggleFavorite(menu.id)}
                      onOpenModal={() => openAddModal(menu)}
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

      {/* ─── CHECKOUT BAR ─── */}
      <AnimatePresence>
        {totalQty > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="checkout-bar"
          >
            <div className="relative flex-shrink-0 bg-white/20 p-2 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center
                               text-[10px] font-bold shadow-sm" style={{ color: PRIMARY }}>
                {totalQty > 9 ? '9+' : totalQty}
              </span>
            </div>
            <div className="flex-1 min-w-0 pl-1">
              <p className="text-[11px] text-white/90 font-medium">Total Harga</p>
              <p className="text-sm font-bold text-white">{formatCurrency(totalPrice)}</p>
            </div>
            <Link to="/cart"
              className="flex-shrink-0 px-4 py-2 bg-white rounded-lg text-xs font-bold shadow-sm"
              style={{ color: PRIMARY }}>
              CHECKOUT ({totalQty})
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ADD MENU BOTTOM SHEET MODAL (ESB Style) ─── */}
      <AnimatePresence>
        {activeMenu && (
          <>
            {/* Overlay — fixed, menutupi viewport */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40"
              style={{ top: 0 }}
              onClick={closeModal}
            />

            {/* Bottom Sheet — fixed, muncul dari bawah viewport */}
            <motion.div
              key="modal"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white flex flex-col mx-auto max-w-[480px]"
              style={{
                borderRadius: '20px 20px 0 0',
                maxHeight: expandModal ? '85vh' : '75vh',
                overflow: 'hidden',
              }}
            >
              {/* Foto Menu — area klik untuk tutup */}
              <div
                className="relative flex-shrink-0 overflow-hidden bg-gray-100"
                style={{ height: expandModal ? 260 : 200 }}
              >
                {activeMenu.image_url ? (
                  <img
                    src={activeMenu.image_url}
                    alt={activeMenu.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #fff5f2, #fde8dc)' }}>
                    <UtensilsCrossed className="w-16 h-16 text-orange-200" />
                  </div>
                )}

                {/* Tombol Tutup (X) — kanan atas */}
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>

                {/* Tombol Expand — kanan bawah */}
                <button
                  onClick={() => setExpandModal(!expandModal)}
                  className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                >
                  <ChevronUp className={`w-4 h-4 text-gray-600 transition-transform ${expandModal ? 'rotate-180' : ''}`} />
                </button>

                {/* Badge Best Seller */}
                {activeMenu.is_best_seller && (
                  <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white shadow"
                    style={{ background: PRIMARY }}>
                    <Star className="w-3 h-3 fill-current" /> Best Seller
                  </span>
                )}
              </div>

              {/* Detail Konten — scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{activeMenu.name}</h2>
                  <div className="flex items-center gap-2 mb-3">
                    {activeMenu.discountedPrice ? (
                      <>
                        <span className="text-xl font-bold text-red-600">{formatCurrency(activeMenu.discountedPrice)}</span>
                        <span className="text-sm text-gray-400 line-through">{formatCurrency(activeMenu.price)}</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold" style={{ color: PRIMARY }}>{formatCurrency(activeMenu.price)}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {activeMenu.description || 'Tidak ada deskripsi.'}
                  </p>

                  {/* Catatan Field */}
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Catatan Tambahan (Opsional)</label>
                    <textarea
                      value={modalNote}
                      onChange={(e) => setModalNote(e.target.value)}
                      placeholder="Contoh: Tidak pedas, sedikit manis, dll..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors resize-none bg-gray-50 hover:bg-white"
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Sticky Footer: Qty + Add Button ─── */}
              <div className="flex-shrink-0 px-5 py-4 bg-white border-t border-gray-100"
                style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-4">
                  {/* Label & Qty Stepper */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Jumlah</span>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setModalQty(q => Math.max(1, q - 1))}
                        disabled={modalQty <= 1}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold text-gray-900">{modalQty}</span>
                      <button
                        onClick={() => setModalQty(q => q + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        style={{ color: PRIMARY }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tombol Tambah Pesanan */}
                  <button
                    onClick={handleConfirmAdd}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-between px-4 transition-all active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}
                  >
                    <span>Tambah Pesanan</span>
                    <span className="font-bold">{formatCurrency(activeMenu.price * modalQty)}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ──────────────────────────────────────── */
/* MENU CARD — ESB Order Style             */
/* ──────────────────────────────────────── */
function MenuCard({ menu, index, quantity, isFavorite, onToggleFavorite, onOpenModal, onIncrease, onDecrease }) {
  return (
    <motion.div
      id={`menu-${menu.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="menu-card flex flex-col"
    >
      {/* Image — klik buka modal */}
      <div
        className="relative bg-gray-100 overflow-hidden cursor-pointer"
        style={{ aspectRatio: '4/3' }}
        onClick={onOpenModal}
      >
        {menu.image_url ? (
          <img src={menu.image_url} alt={menu.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Best Seller Badge */}
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
        <h3
          className="text-xs font-semibold text-gray-900 line-clamp-2 mb-0.5 leading-snug flex-1 cursor-pointer hover:text-orange-600 transition-colors"
          onClick={onOpenModal}
        >
          {menu.name}
        </h3>
        <p className="text-xs text-gray-500 mb-2 font-medium">{formatCurrency(menu.price)}</p>

        {/* Add / Quantity control */}
        {quantity === 0 ? (
          /* Tombol Add → buka modal */
          <button
            onClick={onOpenModal}
            className="btn-add text-sm py-1.5"
          >
            Add
          </button>
        ) : (
          /* Qty counter inline (tanpa modal) */
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