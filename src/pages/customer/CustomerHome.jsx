import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, UtensilsCrossed, Ticket, Heart, Award,
  ChevronRight, Star, Package, Sparkles, Percent, X, Minus, Plus
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import useCartStore from '../../stores/cartStore'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

const PRIMARY = '#f05a28'
const LOGO_URL = 'https://tbjzsyoygpaioxxhsnmk.supabase.co/storage/v1/object/public/website-assets/logo/logo1.png'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
}

export default function CustomerHome() {
  const { user, profile } = useAuthStore()
  const { items, addItem, updateQuantity } = useCartStore()
  const navigate = useNavigate()
  const [activeOrder, setActiveOrder] = useState(null)
  const [promotions, setPromotions] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [activeMenu, setActiveMenu] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalNote, setModalNote] = useState('')

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [orderRes, promoRes, menuRes, catRes] = await Promise.all([
        // Active order
        supabase.from('orders').select('*').eq('customer_id', user.id).in('status', ['pending', 'processing', 'ready']).order('created_at', { ascending: false }).limit(1),
        // Promos
        supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        // Best sellers
        supabase.from('menus').select('*').eq('is_available', true).eq('is_best_seller', true).limit(6),
        // Categories
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      ])

      if (orderRes.data && orderRes.data.length > 0) setActiveOrder(orderRes.data[0])
      else setActiveOrder(null)

      const now = new Date()
      setPromotions((promoRes.data || []).filter(p => {
        if (!p.is_active) return false
        if (p.start_date && new Date(p.start_date) > now) return false
        if (p.end_date && new Date(p.end_date) < now) return false
        return true
      }))

      setBestSellers(menuRes.data || [])
      setCategories(catRes.data || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'ready': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Menunggu Konfirmasi'
      case 'processing': return 'Sedang Diproses'
      case 'ready': return 'Siap Diambil'
      default: return status
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
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
      price: activeMenu.discountedPrice || activeMenu.price, // Fallback if no discount calculated
      image_url: activeMenu.image_url,
      quantity: modalQty,
      note: modalNote.trim()
    })

    toast.success(`${modalQty} ${activeMenu.name} ditambahkan`, {
      action: {
        label: 'Lihat Keranjang',
        onClick: () => navigate('/cart')
      }
    })
    closeModal()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 space-y-6">
      
      {/* ─── HEADER GREETING + LOGO ─── */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {profile?.full_name ? profile.full_name.split(' ')[0] : 'Customer'}! 👋
          </h1>
        </div>
        <img src={LOGO_URL} alt="Logo Waroeng RCM" className="w-16 h-16 object-contain drop-shadow-sm scale-110 origin-right" />
      </motion.div>

      {/* ─── MEMBERSHIP CARD ─── */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/20 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Status Keanggotaan</p>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold capitalize">{profile?.membership_level?.replace('_', ' ') || 'Member'}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Waroeng Points</p>
            <h2 className="text-xl font-bold text-orange-400">{profile?.points || 0} <span className="text-sm font-normal text-gray-400">pts</span></h2>
          </div>
        </div>
        
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
          <p className="text-xs text-gray-300">Kumpulkan terus poin untuk tingkatkan levelmu!</p>
          <Link to="/customer/membership" className="text-xs font-semibold text-orange-400 flex items-center hover:text-orange-300 transition">
            Lihat Detail <ChevronRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </motion.div>

      {/* ─── ACTIVE ORDER WIDGET ─── */}
      {activeOrder && (
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
          onClick={() => navigate(`/order/${activeOrder.id}`)}
          className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-orange-100 transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-16 h-16 text-orange-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <h3 className="text-sm font-bold text-gray-900">Pesanan Aktif</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Order ID: #{activeOrder.id.slice(0,8)}</p>
            
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(activeOrder.status)}`}>
                {getStatusText(activeOrder.status)}
              </span>
              <div className="flex items-center text-xs font-semibold text-orange-600">
                Lacak Pesanan <ChevronRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── QUICK ACTIONS GRID ─── */}
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Akses Cepat</h3>
        <div className="grid grid-cols-4 gap-3">
          <Link to="/customer/menu" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-orange-50 group-hover:border-orange-200 group-hover:scale-105 transition-all">
              <UtensilsCrossed className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-600 text-center">Pesan<br/>Menu</span>
          </Link>
          <Link to="/customer/history" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:scale-105 transition-all">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-600 text-center">Riwayat<br/>Order</span>
          </Link>
          <Link to="/customer/vouchers" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-green-50 group-hover:border-green-200 group-hover:scale-105 transition-all">
              <Ticket className="w-6 h-6 text-green-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-600 text-center">Voucher<br/>Saya</span>
          </Link>
          <Link to="/customer/favorites" className="flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center group-hover:bg-red-50 group-hover:border-red-200 group-hover:scale-105 transition-all">
              <Heart className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-[10px] font-medium text-gray-600 text-center">Menu<br/>Favorit</span>
          </Link>
        </div>
      </motion.div>

      {/* ─── PROMO SPESIAL (Sama seperti public Home) ─── */}
      {promotions.length > 0 && (
        <motion.section custom={4} variants={fadeUp} initial="hidden" animate="visible" className="mt-5 -mx-4">
          <div className="px-4 flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Promo Spesial</h2>
            <Link to="/customer/menu" className="text-xs font-medium text-orange-600">Lihat semua →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 hide-scrollbar pb-1 snap-x">
            {promotions.map((promo, i) => (
              <div key={promo.id} className="flex-shrink-0 w-52 rounded-xl overflow-hidden border border-gray-100 shadow-sm snap-center">
                <div className="relative h-28 bg-gray-100">
                  {promo.image_url ? (
                    <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff5f2, #ffddd0)' }}>
                      <Percent className="w-10 h-10 text-orange-500 opacity-40" />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full">
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `DISKON`}
                  </span>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-1">{promo.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{promo.description || 'Promo spesial!'}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ─── MENU TERFAVORIT (Sama seperti public Home) ─── */}
      <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible" className="mt-5 -mx-4">
        <div className="px-4 flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Menu Terfavorit</h2>
          <Link to="/customer/menu" className="text-xs font-medium text-orange-600">Lihat semua →</Link>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-4 hide-scrollbar pb-1">
            {[...Array(3)].map((_, i) => <div key={i} className="flex-shrink-0 w-36 h-48 bg-gray-100 rounded-xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4 hide-scrollbar pb-1 snap-x">
            {bestSellers.map((menu) => (
              <div key={menu.id} onClick={() => openAddModal(menu)} className="flex-shrink-0 w-36 rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white snap-center group cursor-pointer">
                <div className="relative h-28 bg-gradient-to-br from-orange-50 to-red-50">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-8 h-8 text-orange-200" /></div>
                  )}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-bold flex items-center shadow-sm">
                    <Star className="w-2.5 h-2.5 mr-0.5 fill-current" /> Best
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-xs line-clamp-2 min-h-[2rem] leading-tight mb-1">{menu.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-bold text-orange-600 text-sm">{formatCurrency(menu.price)}</p>
                    <div className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <span className="text-lg font-bold leading-none -mt-0.5">+</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ─── KATEGORI (Sama seperti public Home) ─── */}
      <motion.section custom={6} variants={fadeUp} initial="hidden" animate="visible" className="mt-5 -mx-4">
        <div className="px-4 mb-3">
          <h2 className="text-sm font-bold text-gray-900">Kategori Menu</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 px-4">
          {categories.map((cat, i) => (
            <Link key={cat.id} to="/customer/menu" className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3 shadow-sm hover:border-orange-500 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500 transition-colors">
                <UtensilsCrossed className="w-5 h-5 text-orange-500 group-hover:text-white transition-colors" />
              </div>
              <p className="text-xs font-semibold text-gray-900 line-clamp-2">{cat.name}</p>
            </Link>
          ))}
        </div>
      </motion.section>

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
                  <span className="text-xl font-bold" style={{ color: PRIMARY }}>{formatCurrency(activeMenu.price)}</span>
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
                Tambah • {formatCurrency(activeMenu.price * modalQty)}
              </button>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

    </div>
  )
}