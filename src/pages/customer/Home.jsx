import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UtensilsCrossed, Star, MapPin, Phone, Clock, Instagram,
  MessageCircle, ShoppingBag, Sparkles, ChevronRight,
  Percent, Flame, Package, Store
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'

const PRIMARY = '#f05a28'

// Gambar banner lokal dari public/img/
const LOCAL_BANNERS = [
  '/img/banner1.png',
  '/img/banner2.png',
  '/img/banner3.png',
]

// Info restoran default (fallback jika belum diset di CMS)
const DEFAULT_INFO = {
  restaurant_name: 'Waroeng RCM Kang Abuy',
  tagline: 'Aneka Nasi, Ayam & Bebek — Makanan Enak, Harga Ekonomis',
  address: 'Jl. Raya Cisauk Lapan Bunderan Avani No.21, Sampora, Kec. Cisauk, Kab. Tangerang, Banten 15345',
  whatsapp_number: '082110011010',
  operating_hours: 'Senin–Sabtu: 10.00–22.00 | Minggu: Tutup',
  gofood_url: 'https://gofood.co.id/jakarta/restaurant/waroeng-rcm-kang-abuy-b9ada0f0-93a9-448a-997d-14a56bc904db',
  instagram_url: 'https://www.instagram.com/waroeng.rcm.kang.abuy',
}

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
}

const bannerVariants = {
  enter: { opacity: 0, scale: 1.04 },
  center: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.4, ease: 'easeIn' } },
}

export default function Home() {
  const [settings, setSettings]     = useState(null)
  const [bestSellers, setBestSellers] = useState([])
  const [categories, setCategories]  = useState([])
  const [loading, setLoading]        = useState(true)
  const [bannerIndex, setBannerIndex] = useState(0)

  // Auto-slide banner setiap 4 detik (hanya jika tidak ada banner_url dari settings)
  useEffect(() => {
    if (settings?.banner_url) return
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % LOCAL_BANNERS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [settings?.banner_url])

  useEffect(() => { loadHomeData() }, [])

  const loadHomeData = async () => {
    try {
      const [
        { data: settingsData },
        { data: bestSellersData },
        { data: categoriesData },
      ] = await Promise.all([
        supabase.from('website_settings').select('*').single(),
        supabase.from('menus').select('*').eq('is_available', true).order('total_sold', { ascending: false }).limit(6),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      ])
      setSettings(settingsData || DEFAULT_INFO)
      setBestSellers(bestSellersData || [])
      setCategories(categoriesData || [])
    } catch (err) {
      console.error(err)
      setSettings(DEFAULT_INFO)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="loading-dots"><span /><span /><span /></div>
          <p className="text-xs text-gray-400 mt-3">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ════════════════════════════════ */}
      {/* HERO — gambar restoran (ESB style) */}
      {/* ════════════════════════════════ */}
      <section className="relative">
        {/* Banner Slider */}
        <div className="relative w-full overflow-hidden h-[200px] md:h-[400px]">
          {settings?.banner_url ? (
            /* Prioritas: gambar dari Supabase settings */
            <img src={settings.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            /* Slider dari gambar lokal public/img/ */
            <>
              <AnimatePresence mode="sync">
                <motion.img
                  key={bannerIndex}
                  src={LOCAL_BANNERS[bannerIndex]}
                  alt={`Banner ${bannerIndex + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  variants={bannerVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                />
              </AnimatePresence>

              {/* Gradient overlay bawah untuk readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {LOCAL_BANNERS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIndex(i)}
                    className={`rounded-full transition-all duration-300 ${i === bannerIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Resto info card */}
        <div className="bg-white mx-3 md:mx-auto md:max-w-4xl -mt-6 md:-mt-12 relative z-10 rounded-2xl border border-gray-100 p-4 md:p-6"
             style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo"
                className="w-20 h-20 rounded-xl object-contain border border-gray-100 flex-shrink-0 bg-white scale-110 transform origin-left" />
            ) : (
              <img src="/logo.png" alt="Logo Waroeng RCM"
                className="w-20 h-20 rounded-xl object-contain border border-gray-100 flex-shrink-0 bg-white shadow-sm scale-110 transform origin-left" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 text-base leading-snug">
                {settings?.restaurant_name || DEFAULT_INFO.restaurant_name}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                {/* Indikator buka/tutup: Minggu = merah, lainnya = hijau */}
                {new Date().getDay() === 0
                  ? <><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" /><p className="text-xs text-red-500">Tutup hari ini</p></>
                  : <><span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" /><p className="text-xs text-gray-500">{settings?.operating_hours || DEFAULT_INFO.operating_hours}</p></>
                }
              </div>
              <div className="flex items-start gap-1 mt-1.5">
                <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: PRIMARY }} />
                <p className="text-xs text-gray-400 line-clamp-1">{settings?.address || DEFAULT_INFO.address}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Order Type pill (ESB style) ─── */}
      <div className="mx-3 md:mx-auto md:max-w-4xl mt-3 md:mt-6">
        <div className="border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" style={{ color: PRIMARY }} />
            <span className="text-sm font-medium text-gray-700">Takeaway / Dine In</span>
          </div>
          <Link to="/menu"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: PRIMARY }}>
            Pesan
          </Link>
        </div>
      </div>


      {/* ─── BEST SELLER ─── */}
      <section className="mt-5 md:mt-8 md:max-w-7xl md:mx-auto">
        <div className="px-3 flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Menu Terfavorit</h2>
          <Link to="/menu" className="text-xs font-medium" style={{ color: PRIMARY }}>
            Lihat semua →
          </Link>
        </div>
        {bestSellers.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto px-3 hide-scrollbar pb-1">
            {bestSellers.map((menu, i) => (
              <motion.div
                key={menu.id}
                custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="flex-shrink-0 w-36 rounded-xl overflow-hidden border border-gray-100 shadow-card bg-white"
              >
                <div className="relative h-28 bg-gray-100 overflow-hidden">
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UtensilsCrossed className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[10px] font-bold
                                   text-white px-1.5 py-0.5 rounded-full"
                    style={{ background: '#f59e0b' }}>
                    <Star className="w-2.5 h-2.5 fill-current" /> Best
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{menu.name}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: PRIMARY }}>{formatCurrency(menu.price)}</p>
                  <Link to={`/menu?item=${menu.id}`}
                    className="block w-full text-center text-[11px] font-semibold mt-2 py-1.5 rounded-lg border"
                    style={{ borderColor: PRIMARY, color: PRIMARY }}>
                    Add
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="px-3 text-center py-8">
            <UtensilsCrossed className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Belum ada menu</p>
          </div>
        )}
      </section>

      {/* ─── KATEGORI ─── */}
      {categories.length > 0 && (
        <section className="mt-5">
          <div className="px-3 mb-3">
            <h2 className="text-sm md:text-lg font-bold text-gray-900">Kategori</h2>
          </div>
          <div className="px-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 md:gap-4">
            {categories.slice(0, 6).map((cat, i) => (
              <motion.div
                key={cat.id}
                custom={i} variants={fadeUp} initial="hidden" animate="visible"
              >
                <Link to={`/menu?category=${cat.id}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-orange-200 bg-white transition-all group">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center
                                  group-hover:bg-orange-50 transition-colors">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-gray-700 text-center line-clamp-1">{cat.name}</p>
                </Link>
              </motion.div>
            ))}
          </div>
          {categories.length > 6 && (
            <div className="px-3 mt-2">
              <Link to="/menu"
                className="flex items-center justify-center gap-1 w-full py-2.5 rounded-xl border border-gray-200
                           text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Lihat semua kategori
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ─── CTA ORDER ─── */}
      <section className="mt-6 md:mt-10 px-3 md:max-w-4xl md:mx-auto">
        <Link to="/menu"
          className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white"
          style={{ background: `linear-gradient(135deg, ${PRIMARY}, #d44d1f)` }}>
          <div>
            <p className="font-bold text-base">Pesan Sekarang</p>
            <p className="text-xs text-white/80 mt-0.5">Lihat menu lengkap kami</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
        </Link>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="mt-8 bg-gray-900 text-white px-4 py-8">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.png" alt="Logo Waroeng RCM" className="w-20 h-20 object-contain drop-shadow-sm scale-110 transform origin-left" />
          <div>
            <p className="font-bold text-sm">{settings?.restaurant_name || DEFAULT_INFO.restaurant_name}</p>
            <p className="text-[11px] text-gray-400">Kang Abuy</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          {settings?.tagline || DEFAULT_INFO.tagline}
        </p>
        <div className="space-y-2.5">
          {/* Alamat */}
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px" style={{ color: PRIMARY }} />
            <span>{settings?.address || DEFAULT_INFO.address}</span>
          </div>

          {/* Telepon / WhatsApp */}
          <a href={`https://wa.me/${(settings?.whatsapp_number || DEFAULT_INFO.whatsapp_number).replace(/^0/, '62').replace(/^\+/, '').replace(/[^\d]/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
            <Phone className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
            <span>{settings?.whatsapp_number || DEFAULT_INFO.whatsapp_number}</span>
          </a>

          {/* Jam Buka */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
            <span>{settings?.operating_hours || DEFAULT_INFO.operating_hours}</span>
          </div>

          {/* Instagram */}
          {(settings?.instagram_url || DEFAULT_INFO.instagram_url) && (
            <a href={settings?.instagram_url || DEFAULT_INFO.instagram_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
              <Instagram className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
              <span>Instagram</span>
            </a>
          )}

          {/* WhatsApp Chat */}
          <a href={`https://wa.me/${(settings?.whatsapp_number || DEFAULT_INFO.whatsapp_number).replace(/^0/, '62').replace(/^\+/, '').replace(/[^\d]/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
            <MessageCircle className="w-3.5 h-3.5 text-green-400" />
            <span>Chat WhatsApp</span>
          </a>

          {/* GoFood */}
          <a href={settings?.gofood_url || DEFAULT_INFO.gofood_url}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
            <ShoppingBag className="w-3.5 h-3.5" style={{ color: '#e8173e' }} />
            <span>Pesan via GoFood</span>
          </a>
        </div>
        <div className="border-t border-gray-800 mt-6 pt-4">
          <p className="text-[11px] text-gray-600 text-center">
            © {new Date().getFullYear()} {settings?.restaurant_name || DEFAULT_INFO.restaurant_name}
          </p>
        </div>
      </footer>
    </div>
  )
}