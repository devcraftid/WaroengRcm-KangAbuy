import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search,
  ShoppingBag,
  UtensilsCrossed,
  Star,
  Heart,
  Package
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import useCartStore from '../../stores/cartStore'
import useAuthStore from '../../stores/authStore'
import { toast } from 'sonner'

export default function Menu() {
  const [searchParams] = useSearchParams()
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState([])
  const { addItem } = useCartStore()
  const { user } = useAuthStore()

  useEffect(() => {
    loadData()
    loadFavorites()
    
    const itemId = searchParams.get('item')
    if (itemId) {
      setTimeout(() => {
        const element = document.getElementById(`menu-${itemId}`)
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [selectedCategory])

  const loadData = async () => {
    setLoading(true)
    try {
      let query = supabase.from('menus').select('*, categories(name, slug)').eq('is_available', true)
      if (selectedCategory !== 'all') query = query.eq('category_id', selectedCategory)

      const [menuResult, categoryResult] = await Promise.all([
        query.order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
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
    if (!user) {
      toast.error('Login terlebih dahulu untuk menyimpan favorit')
      return
    }
    const newFavorites = favorites.includes(menuId) ? favorites.filter(id => id !== menuId) : [...favorites, menuId]
    setFavorites(newFavorites)
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(newFavorites))
    toast.success(newFavorites.includes(menuId) ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit')
  }

  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    menu.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    menu.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddToCart = (menu) => {
    addItem({ id: menu.id, name: menu.name, price: menu.price, image_url: menu.image_url, description: menu.description })
    toast.success(`${menu.name} ditambahkan`, {
      action: { label: 'Keranjang', onClick: () => window.location.href = '/cart' }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Menu Kami</h1>
            <p className="text-orange-100 text-sm sm:text-base">Pilih menu favorit Anda</p>
          </div>
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari menu favoritmu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-orange-300 focus:outline-none shadow-lg text-sm sm:text-base"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Categories - Horizontal Scroll Mobile */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-6 sm:mb-8 hide-scrollbar sticky top-0 z-10 bg-gray-50 py-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${
              selectedCategory === 'all' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-orange-500/25' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
            Semua
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${
                selectedCategory === category.id ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-orange-500/25' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {category.image_url ? (
                <img src={category.image_url} alt="" className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 rounded" />
              ) : (
                <UtensilsCrossed className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              )}
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Grid - 2 kolom mobile, 4 kolom desktop */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden animate-pulse">
                <div className="h-32 sm:h-40 lg:h-48 bg-gray-200"></div>
                <div className="p-3 sm:p-4 space-y-2">
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Menu Tidak Ditemukan</h2>
            <p className="text-sm text-gray-500">Coba kata kunci lain atau pilih kategori berbeda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {filteredMenus.map((menu, index) => (
              <motion.div
                key={menu.id}
                id={`menu-${menu.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                {/* Image */}
                <div className="relative h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <UtensilsCrossed className="w-8 h-8 sm:w-12 sm:h-12 text-orange-300" />
                    </div>
                  )}
                  {menu.is_best_seller && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center shadow-lg">
                      <Star className="w-2 h-2 sm:w-3 sm:h-3 mr-1 fill-current" /> Best Seller
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(menu.id) }}
                    className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${favorites.includes(menu.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1 line-clamp-1">{menu.name}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
                    {menu.description || 'Menu spesial dari Waroeng RCM'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-lg font-bold text-orange-600">{formatCurrency(menu.price)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(menu) }}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-orange-500/25 transition-all active:scale-95"
                    >
                      <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}