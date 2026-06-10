import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UtensilsCrossed, Star, MapPin, Phone, Clock, Instagram,
  MessageCircle, ShoppingBag, Sparkles, ChevronRight,
  Percent, Flame, Package
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'

const PRIMARY = '#f05a28'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
}

export default function Home() {
  const [settings, setSettings]     = useState(null)
  const [bestSellers, setBestSellers] = useState([])
  const [categories, setCategories]  = useState([])
  const [promotions, setPromotions]  = useState([])
  const [loading, setLoading]        = useState(true)

  useEffect(() => { loadHomeData() }, [])

  const loadHomeData = async () => {
    try {
      const [
        { data: settingsData },
        { data: bestSellersData },
        { data: categoriesData },
        { data: promotionsData },
      ] = await Promise.all([
        supabase.from('website_settings').select('*').single(),
        supabase.from('menus').select('*').eq('is_available', true).order('total_sold', { ascending: false }).limit(6),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
      ])
      setSettings(settingsData || { restaurant_name: 'Waroeng RCM Kang Abuy', tagline: 'Makanan Enak, Harga Ekonomis' })
      setBestSellers(bestSellersData || [])
      setCategories(categoriesData || [])
      const now = new Date()
      setPromotions((promotionsData || []).filter(p => {
        if (!p.is_active) return false
        if (p.start_date && new Date(p.start_date) > now) return false
        if (p.end_date && new Date(p.end_date) < now) return false
        return true
      }))
    } catch (err) {
      console.error(err)
      setSettings({ restaurant_name: 'Waroeng RCM Kang Abuy', tagline: 'Makanan Enak, Harga Ekonomis' })
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
        {/* Banner */}
        <div className="relative w-full overflow-hidden" style={{ height: 200, background: 'linear-gradient(135deg, #fff5f2 0%, #fde8dc 50%, #ffd5c0 100%)' }}>
          {settings?.banner_url ? (
            <img src={settings.banner_url} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: PRIMARY }}>
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-bold" style={{ color: PRIMARY }}>Waroeng RCM Kang Abuy</p>
            </div>
          )}
        </div>

        {/* Resto info card */}
        <div className="bg-white mx-3 -mt-6 relative z-10 rounded-2xl border border-gray-100 p-4"
             style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center gap-3">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="Logo"
                className="w-14 h-14 rounded-xl object-contain border border-gray-100 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 text-base leading-snug">
                {settings?.restaurant_name || 'Waroeng RCM Kang Abuy'}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-xs text-gray-500">
                  {settings?.operating_hours || 'Buka setiap hari'}
                </p>
              </div>
              {settings?.address && (
                <div className="flex items-start gap-1 mt-1.5">
                  <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: PRIMARY }} />
                  <p className="text-xs text-gray-400 line-clamp-1">{settings.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Order Type pill (ESB style) ─── */}
      <div className="mx-3 mt-3">
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

      {/* ─── PROMO ─── */}
      {promotions.length > 0 && (
        <section className="mt-5">
          <div className="px-3 flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Promo Spesial</h2>
            <Link to="/menu" className="text-xs font-medium" style={{ color: PRIMARY }}>
              Lihat semua →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto px-3 hide-scrollbar pb-1">
            {promotions.map((promo, i) => (
              <motion.div
                key={promo.id}
                custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="flex-shrink-0 w-52 rounded-xl overflow-hidden border border-gray-100 shadow-card"
              >
                <div className="relative h-28 bg-gray-100">
                  {promo.image_url ? (
                    <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, #fff5f2, #ffddd0)' }}>
                      <Percent className="w-10 h-10" style={{ color: PRIMARY, opacity: 0.4 }} />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-xs font-bold text-white px-2 py-0.5 rounded-full"
                    style={{ background: PRIMARY }}>
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `DISKON`}
                  </span>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-1">{promo.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{promo.description || 'Promo spesial!'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─── BEST SELLER ─── */}
      <section className="mt-5">
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
            <h2 className="text-sm font-bold text-gray-900">Kategori</h2>
          </div>
          <div className="px-3 grid grid-cols-3 gap-2.5">
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
      <section className="mt-6 px-3">
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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: PRIMARY }}>
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">{settings?.restaurant_name || 'WAROENG RCM'}</p>
            <p className="text-[11px] text-gray-400">Kang Abuy</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          {settings?.tagline || 'Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer'}
        </p>
        <div className="space-y-2">
          {settings?.address && (
            <div className="flex items-start gap-2 text-xs text-gray-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-px" style={{ color: PRIMARY }} />
              <span>{settings.address}</span>
            </div>
          )}
          {settings?.whatsapp_number && (
            <a href={`https://wa.me/${settings.whatsapp_number?.replace(/^0/, '62').replace(/^\+/, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
              <Phone className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
              <span>{settings.whatsapp_number}</span>
            </a>
          )}
          {settings?.operating_hours && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
              <span>{settings.operating_hours}</span>
            </div>
          )}
          {settings?.instagram_url && (
            <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
              <Instagram className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
              <span>Instagram</span>
            </a>
          )}
          {settings?.whatsapp_number && (
            <a href={`https://wa.me/${settings.whatsapp_number?.replace(/^0/, '62').replace(/^\+/, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white">
              <MessageCircle className="w-3.5 h-3.5 text-green-400" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
        <div className="border-t border-gray-800 mt-6 pt-4">
          <p className="text-[11px] text-gray-600 text-center">
            © {new Date().getFullYear()} {settings?.restaurant_name || 'Waroeng RCM Kang Abuy'}
          </p>
        </div>
      </footer>
    </div>
  )
}