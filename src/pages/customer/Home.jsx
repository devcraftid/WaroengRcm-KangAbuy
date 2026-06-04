import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Star,
  MapPin,
  Phone,
  Clock,
  Instagram,
  MessageCircle,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Package,
  Zap,
  Quote,
  Percent,
  Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../utils/format'

export default function Home() {
  const [settings, setSettings] = useState(null)
  const [bestSellers, setBestSellers] = useState([])
  const [categories, setCategories] = useState([])
  const [promotions, setPromotions] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHomeData()
  }, [])

  const loadHomeData = async () => {
    try {
      const [
        { data: settingsData },
        { data: bestSellersData },
        { data: categoriesData },
        { data: promotionsData },
        { data: testimonialsData }
      ] = await Promise.all([
        supabase.from('website_settings').select('*').single(),
        supabase.from('menus').select('*').eq('is_available', true).order('total_sold', { ascending: false }).limit(8),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(4),
        supabase.from('website_testimonials').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10)
      ])

      setSettings(settingsData || {
        restaurant_name: 'Waroeng RCM Kang Abuy',
        tagline: 'Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer',
        address: 'Jl. Contoh No. 123',
        whatsapp_number: '628123456789',
        operating_hours: 'Senin - Minggu: 08:00 - 22:00'
      })
      setBestSellers(bestSellersData || [])
      setCategories(categoriesData || [])
      setPromotions(promotionsData || [])
      setTestimonials(testimonialsData || [])
    } catch (error) {
      console.error('Error loading home data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter promo yang masih aktif
  const activePromotions = promotions.filter(promo => {
    if (!promo.is_active) return false
    const now = new Date()
    if (promo.start_date && new Date(promo.start_date) > now) return false
    if (promo.end_date && new Date(promo.end_date) < now) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm sm:text-base">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ============================================ */}
      {/* HERO BANNER */}
      {/* ============================================ */}
      <section className="relative bg-gradient-to-br from-orange-500 via-red-500 to-red-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-10 left-10 w-32 sm:w-64 h-32 sm:h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-48 sm:w-96 h-48 sm:h-96 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mb-4 sm:mb-6"
            >
              {settings?.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className="w-16 h-16 sm:w-20 md:w-24 sm:h-20 md:h-24 mx-auto rounded-2xl object-contain bg-white p-2 shadow-2xl"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 md:w-24 sm:h-20 md:h-24 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
                  <UtensilsCrossed className="w-8 h-8 sm:w-10 md:w-12 sm:h-10 md:h-12 text-orange-600" />
                </div>
              )}
            </motion.div>
            
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight px-2">
              {settings?.restaurant_name || 'WAROENG RCM KANG ABUY'}
            </h1>
            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-orange-100 max-w-2xl mx-auto px-4">
              {settings?.tagline || 'Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link
                to="/menu"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-orange-600 rounded-full font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 text-sm sm:text-base"
              >
                <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Lihat Menu
              </Link>
              {settings?.whatsapp_number && (
                <a
                  href={`https://wa.me/${settings.whatsapp_number?.replace(/^0/, '62').replace(/^\+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-sm sm:text-base"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  WhatsApp
                </a>
              )}
            </div>
          </motion.div>
        </div>
        
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-white">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H0Z" />
          </svg>
        </div>
      </section>

      {/* ============================================ */}
      {/* PROMO SPESIAL */}
      {/* ============================================ */}
      {activePromotions.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                <Percent className="w-6 h-6 sm:w-8 sm:h-8 inline mr-2 text-red-500" />
                Promo Spesial
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                Jangan lewatkan penawaran menarik dari kami!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {activePromotions.map((promo, index) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl overflow-hidden border border-orange-200 hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Promo Image */}
                  {promo.image_url ? (
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={promo.image_url}
                        alt={promo.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        PROMO
                      </div>
                    </div>
                  ) : (
                    <div className="relative h-40 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                      <Percent className="w-16 h-16 text-white/50" />
                      <div className="absolute top-3 right-3 bg-white/90 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                        PROMO
                      </div>
                    </div>
                  )}

                  {/* Promo Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1 line-clamp-1">
                      {promo.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 min-h-[2.5rem]">
                      {promo.description || 'Promo spesial untuk Anda!'}
                    </p>

                    {/* Discount Badge */}
                    <div className="mb-3">
                      <span className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-600 rounded-full text-sm font-bold">
                        {promo.discount_type === 'percentage'
                          ? `Diskon ${promo.discount_value}%`
                          : formatCurrency(promo.discount_value)
                        }
                      </span>
                    </div>

                    {/* Date Range */}
                    {(promo.start_date || promo.end_date) && (
                      <div className="flex items-center text-xs text-gray-400 mb-3">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>
                          {promo.start_date ? formatDate(promo.start_date) : 'Sekarang'}
                          {' - '}
                          {promo.end_date ? formatDate(promo.end_date) : 'Seterusnya'}
                        </span>
                      </div>
                    )}

                    {/* CTA Button */}
                    <Link
                      to="/menu"
                      className="block w-full text-center py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                    >
                      Pesan Sekarang
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* BEST SELLER */}
      {/* ============================================ */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 inline mr-2 text-yellow-500" />
              Menu Terfavorit
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              Pilihan terbaik yang paling banyak dipesan
            </p>
          </div>

          {bestSellers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UtensilsCrossed className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Belum ada menu best seller</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {bestSellers.map((menu, index) => (
                <motion.div
                  key={menu.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <div className="relative h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-orange-100 to-red-100 overflow-hidden">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <UtensilsCrossed className="w-8 h-8 sm:w-12 sm:h-12 text-orange-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-orange-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center">
                      <Star className="w-2 h-2 sm:w-3 sm:h-3 mr-1 fill-current" />
                      Best Seller
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-1">{menu.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">{menu.description || '-'}</p>
                    <div className="flex items-center justify-between mt-2 sm:mt-3">
                      <span className="text-sm sm:text-lg font-bold text-orange-600">{formatCurrency(menu.price)}</span>
                      <Link to={`/menu?item=${menu.id}`} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all">
                        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-6 sm:mt-8">
            <Link to="/menu" className="inline-flex items-center text-orange-600 font-semibold hover:text-orange-700 text-sm sm:text-base">
              Lihat Semua Menu <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* CATEGORIES */}
      {/* ============================================ */}
      {categories.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 inline mr-2 text-orange-500" />
                Kategori Menu
              </h2>
              <p className="text-sm sm:text-base text-gray-500">Pilih berdasarkan kategori favoritmu</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <Link to={`/menu?category=${category.id}`}>
                    <div className="w-16 h-16 sm:w-20 md:w-24 sm:h-20 md:h-24 mx-auto bg-gradient-to-br from-orange-100 to-red-100 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 hover:shadow-lg transition-all hover:scale-110">
                      {category.image_url ? (
                        <img src={category.image_url} alt={category.name} className="w-full h-full object-cover rounded-xl sm:rounded-2xl" />
                      ) : (
                        <UtensilsCrossed className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{category.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">{category.description}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* HOW TO ORDER */}
      {/* ============================================ */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 inline mr-2 text-yellow-500" />
              Cara Pemesanan
            </h2>
            <p className="text-sm sm:text-base text-gray-500">Mudah dan cepat, cukup 3 langkah</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              { step: '01', icon: UtensilsCrossed, title: 'Pilih Menu', description: 'Pilih menu favorit Anda', color: 'from-orange-500 to-red-500' },
              { step: '02', icon: ShoppingBag, title: 'Checkout', description: 'Bayar via Cash atau QRIS', color: 'from-blue-500 to-indigo-500' },
              { step: '03', icon: Package, title: 'Siap!', description: 'Pesanan diproses dan siap', color: 'from-green-500 to-emerald-500' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                className="relative text-center"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm z-10">
                  {item.step}
                </div>
                <div className="bg-white rounded-2xl p-6 sm:p-8 pt-8 sm:pt-10 shadow-sm hover:shadow-lg transition-all">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 sm:mb-6 shadow-lg`}>
                    <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* TESTIMONIALS */}
      {/* ============================================ */}
      {testimonials.length > 0 && (
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                <Quote className="w-6 h-6 sm:w-8 sm:h-8 inline mr-2 text-orange-500" />
                Testimoni
              </h2>
              <p className="text-sm sm:text-base text-gray-500">Apa kata mereka tentang kami?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-2xl p-4 sm:p-6 relative"
                >
                  <Quote className="w-8 h-8 sm:w-10 sm:h-10 text-orange-200 absolute top-3 right-3 sm:top-4 sm:right-4" />
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg">
                      {testimonial.customer_name?.[0] || 'A'}
                    </div>
                    <div className="ml-3">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{testimonial.customer_name}</h4>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 sm:w-4 sm:h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs sm:text-sm italic">"{testimonial.review}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================ */}
      {/* FOOTER */}
      {/* ============================================ */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain bg-white p-1" />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-bold">{settings?.restaurant_name || 'WAROENG RCM'}</h3>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">{settings?.tagline || ''}</p>
            </div>
            
            <div>
              <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Kontak</h4>
              <div className="space-y-2 sm:space-y-3 text-gray-400 text-xs sm:text-sm">
                {settings?.address && <p className="flex items-center"><MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />{settings.address}</p>}
                {settings?.whatsapp_number && <p className="flex items-center"><Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />{settings.whatsapp_number}</p>}
                {settings?.operating_hours && <p className="flex items-center"><Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />{settings.operating_hours}</p>}
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Ikuti Kami</h4>
              <div className="flex space-x-3">
                {settings?.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 transition-all">
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                  </a>
                )}
              </div>
              <div className="mt-4 space-y-1 text-xs sm:text-sm text-gray-400">
                {settings?.gofood_url && (
                  <a href={settings.gofood_url} target="_blank" rel="noopener noreferrer" className="block hover:text-orange-400">🛵 GoFood</a>
                )}
                {settings?.grabfood_url && (
                  <a href={settings.grabfood_url} target="_blank" rel="noopener noreferrer" className="block hover:text-green-400">🛵 GrabFood</a>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center">
            <p className="text-gray-500 text-xs sm:text-sm">
              &copy; {new Date().getFullYear()} {settings?.restaurant_name || 'WAROENG RCM KANG ABUY'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}