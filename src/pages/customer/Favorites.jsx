import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, UtensilsCrossed, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import useCartStore from '../../stores/cartStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function Favorites() {
  const { user } = useAuthStore()
  const { addItem } = useCartStore()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadFavorites()
  }, [user])

  const loadFavorites = async () => {
    try {
      // For this implementation, we'll store favorites in localStorage
      const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]')
      
      if (storedFavorites.length > 0) {
        const { data } = await supabase
          .from('menus')
          .select('*, categories(name)')
          .in('id', storedFavorites)
        
        setFavorites(data || [])
      } else {
        setFavorites([])
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = (menuId) => {
    const updatedFavorites = favorites.filter(f => f.id !== menuId)
    setFavorites(updatedFavorites)
    
    const storedIds = updatedFavorites.map(f => f.id)
    localStorage.setItem(`favorites_${user.id}`, JSON.stringify(storedIds))
    
    toast.success('Dihapus dari favorit')
  }

  const addToCart = (menu) => {
    addItem(menu)
    toast.success(`${menu.name} ditambahkan ke keranjang`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
        <Heart className="w-6 h-6 mr-2 text-red-500" />
        Favorit Saya
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Favorit</h2>
          <p className="text-gray-500">Tandai menu favoritmu dengan klik icon hati</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {favorites.map((menu) => (
              <motion.div
                key={menu.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-8 h-8 text-orange-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{menu.name}</h3>
                    <p className="text-sm text-gray-500">{menu.categories?.name}</p>
                    <p className="text-lg font-bold text-orange-600 mt-1">{formatCurrency(menu.price)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => addToCart(menu)}
                      className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200"
                      title="Tambah ke keranjang"
                    >
                      <ShoppingBag className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFavorite(menu.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                      title="Hapus dari favorit"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}