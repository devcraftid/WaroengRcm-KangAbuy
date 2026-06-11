import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingBag, UtensilsCrossed, Star, Heart, Percent, Package
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function CustomerMenu() {
  const { user } = useAuthStore()
  const { addItem } = useCartStore()
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [promotions, setPromotions] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState([])
  const PRIMARY = '#f05a28'

  // Modal state
  const [activeMenu, setActiveMenu] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalNote, setModalNote] = useState('')

  useEffect(() => {
    loadData()
    loadFavorites()
  }, [selectedCategory])

  const loadData = async () => {
    setLoading(true)
    try {
      let menuQuery = supabase
        .from('menus')
        .select('*, categories(name)')
        .eq('is_available', true)
      
      if (selectedCategory !== 'all') {
        menuQuery = menuQuery.eq('category_id', selectedCategory)
      }

      const [menuResult, catResult, promoResult] = await Promise.all([
        menuQuery.order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ])

      setMenus(menuResult.data || [])
      setCategories(catResult.data || [])

      const now = new Date()
      setPromotions((promoResult.data || []).filter(p => {
        if (!p.is_active) return false
        if (p.start_date && new Date(p.start_date) > now) return false
        if (p.end_date && new Date(p.end_date) < now) return false
        return true
      }))
    } catch (error) {
      console.error('Error:', error)
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
    const newFavs = favorites.includes(menuId) ? favorites.filter(id => id !== menuId) : [...favorites, menuId]
    setFavorites(newFavs)
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavs))
    toast.success(newFavs.includes(menuId) ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit')
  }

  const openAddModal = (menu) => {
    setActiveMenu(menu)
    setModalQty(1)
    setModalNote('')
  }

  const closeModal = () => {
    setActiveMenu(null)
    setModalNote('')
  }

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
      action: { label: 'Keranjang', onClick: () => window.location.href = '/cart' }
    })
    closeModal()
  }

  // Fungsi hitung diskon
  const getDiscountedPrice = (price) => {
    if (!promotions || promotions.length === 0) return null
    let bestDiscount = 0
    let discountType = 'percentage'
    promotions.forEach(p => {
      let d = p.discount_type === 'percentage' ? (price * p.discount_value) / 100 : p.discount_value
      if (d > bestDiscount) { bestDiscount = d; discountType = p.discount_type }
    })
    if (bestDiscount > 0 && bestDiscount < price) {
      return {
        discountedPrice: price - bestDiscount,
        discountLabel: discountType === 'percentage' ? `${Math.round((bestDiscount / price) * 100)}% OFF` : `-${formatCurrency(bestDiscount)}`,
        savedAmount: bestDiscount,
        originalPrice: price
      }
    }
    return null
  }

  const filteredMenus = menus.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">🍽️ Pesan Menu</h1>
      <p className="text-sm text-gray-500 mb-4">Pilih menu favoritmu</p>

      {/* PROMO BANNER */}
      {promotions.length > 0 && (
        <div className="mb-4 space-y-2">
          {promotions.map(promo => (
            <motion.div key={promo.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Percent className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-red-700 text-sm">{promo.title}</p>
                  <p className="text-xs text-red-500 truncate">{promo.description}</p>
                </div>
              </div>
              <span className="text-base sm:text-lg font-bold text-red-600 whitespace-nowrap ml-3">
                {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : formatCurrency(promo.discount_value)}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Cari menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
      </div>

      {/* Categories */}
      <div className="flex space-x-1 overflow-x-auto pb-3 mb-4 hide-scrollbar">
        <button onClick={() => setSelectedCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${selectedCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>
          <Package className="w-3 h-3 inline mr-1" />Semua
        </button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (<div key={i} className="h-48 bg-white rounded-xl animate-pulse"></div>))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredMenus.map((menu, index) => {
            const discount = getDiscountedPrice(menu.price)
            return (
              <motion.div key={menu.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                onClick={() => {
                  const d = getDiscountedPrice(menu.price)
                  openAddModal({ ...menu, discountedPrice: d?.discountedPrice })
                }}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-lg transition-all group cursor-pointer">
                
                {/* Image */}
                <div className="relative h-32 sm:h-36 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><UtensilsCrossed className="w-8 h-8 text-orange-300" /></div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {menu.is_best_seller && (
                      <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-semibold flex items-center shadow">
                        <Star className="w-2 h-2 mr-0.5 fill-current" />Best
                      </span>
                    )}
                    {discount && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-semibold shadow">
                        {discount.discountLabel}
                      </span>
                    )}
                  </div>

                  {/* Favorite */}
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(menu.id) }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:scale-110 transition-transform">
                    <Heart className={`w-3.5 h-3.5 ${favorites.includes(menu.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-2.5 sm:p-3">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-1">{menu.name}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{menu.categories?.name || 'Menu'}</p>

                  {/* Harga dengan Diskon */}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {discount ? (
                        <div>
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-sm sm:text-base font-bold text-red-600">{formatCurrency(discount.discountedPrice)}</span>
                            <span className="text-[10px] text-gray-400 line-through">{formatCurrency(discount.originalPrice)}</span>
                          </div>
                          <p className="text-[10px] text-green-600 font-medium mt-0.5">💰 Hemat {formatCurrency(discount.savedAmount)}</p>
                        </div>
                      ) : (
                        <span className="text-sm sm:text-base font-bold text-orange-600">{formatCurrency(menu.price)}</span>
                      )}
                    </div>
                    <button onClick={(e) => {
                      e.stopPropagation()
                      const d = getDiscountedPrice(menu.price)
                      openAddModal({ ...menu, discountedPrice: d?.discountedPrice })
                    }}
                      className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 font-bold text-xs flex items-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      + Tambah
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {!loading && filteredMenus.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Menu Tidak Ditemukan</h2>
          <p className="text-sm text-gray-500">Coba kata kunci lain</p>
        </div>
      )}

      {/* ─── MODAL ADD TO CART ─── */}
      <AnimatePresence>
        {activeMenu && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={closeModal}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Handle Bar (Mobile) */}
              <div className="w-full flex justify-center pt-3 pb-2 sm:hidden absolute top-0 z-20">
                <div className="w-12 h-1.5 bg-white/50 backdrop-blur-sm rounded-full"></div>
              </div>

              {/* Image Header */}
              <div className="relative h-48 sm:h-56 bg-gray-100 shrink-0">
                {activeMenu.image_url ? (
                  <img src={activeMenu.image_url} alt={activeMenu.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-50">
                    <UtensilsCrossed className="w-12 h-12 text-orange-200" />
                  </div>
                )}
                {/* Tutup Button */}
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Konten Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{activeMenu.name}</h2>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl font-bold" style={{ color: PRIMARY }}>{formatCurrency(activeMenu.discountedPrice || activeMenu.price)}</span>
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

              {/* Action Buttons */}
              <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm font-medium">Jml</span>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                    <button onClick={() => setModalQty(Math.max(1, modalQty - 1))} className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm">-</button>
                    <span className="font-semibold text-gray-900 w-4 text-center">{modalQty}</span>
                    <button onClick={() => setModalQty(modalQty + 1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-gray-600 shadow-sm">+</button>
                  </div>
                </div>
                <button onClick={handleConfirmAdd} className="flex-1 ml-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center" style={{ background: PRIMARY }}>
                  Tambah • {formatCurrency((activeMenu.discountedPrice || activeMenu.price) * modalQty)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}