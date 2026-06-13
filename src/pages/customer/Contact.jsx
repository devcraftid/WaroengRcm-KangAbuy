import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Instagram,
  Send,
  User,
  MessageSquare
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const DEFAULT_INFO = {
  address: 'Jl. Raya Cisauk Lapan Bunderan Avani No.21, Sampora, Kec. Cisauk, Kab. Tangerang, Banten 15345',
  whatsapp_number: '082110011010',
  operating_hours: 'Senin–Sabtu: 10.00–22.00 | Minggu: Tutup',
  instagram_url: 'https://www.instagram.com/waroeng.rcm.kang.abuy',
  google_maps_url: 'https://maps.app.goo.gl/3A74a9sFjHw4uJk69'
}

export default function Contact() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    const { data } = await supabase
      .from('website_settings')
      .select('*')
      .single()
    
    setSettings(data)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)

    try {
      // Here you would send the message via email API or store in database
      // For now, we'll simulate sending
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Send notification to admin
      await supabase.from('notifications').insert({
        user_id: null, // Admin notification
        title: 'Pesan Baru dari Contact Form',
        message: `Dari: ${form.name}\nEmail: ${form.email}\nPesan: ${form.message}`,
        type: 'contact_form',
        link: '/admin'
      })

      toast.success('Pesan berhasil dikirim!')
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Gagal mengirim pesan')
    } finally {
      setSending(false)
    }
  }

  const handleWhatsAppClick = () => {
    const waNumber = settings?.whatsapp_number || DEFAULT_INFO.whatsapp_number
    if (waNumber) {
      const message = encodeURIComponent('Halo, saya ingin bertanya tentang menu...')
      window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Hubungi Kami</h1>
        <p className="text-gray-500 text-lg">Kami siap membantu Anda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Address */}
          {(settings?.address || DEFAULT_INFO.address) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Alamat</h3>
              <p className="text-gray-500 text-sm">{settings?.address || DEFAULT_INFO.address}</p>
              <div className="mt-4 rounded-xl overflow-hidden h-48 relative border border-gray-100">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.6565154370215!2d106.6397394!3d-6.3087317!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69fb27e7fdf139%3A0xc3f345c26bdfec6!2sWaroeng%20RCM%20Kang%20Abuy!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <a
                href={settings?.google_maps_url || DEFAULT_INFO.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 text-sm font-medium hover:text-orange-700 mt-3 inline-block"
              >
                Buka di Aplikasi Google Maps →
              </a>
            </motion.div>
          )}

          {/* WhatsApp */}
          {(settings?.whatsapp_number || DEFAULT_INFO.whatsapp_number) && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={handleWhatsAppClick}
              className="w-full bg-green-500 rounded-2xl p-6 shadow-sm hover:bg-green-600 transition-colors text-left"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">WhatsApp</h3>
              <p className="text-green-100 text-sm">{settings?.whatsapp_number || DEFAULT_INFO.whatsapp_number}</p>
              <p className="text-white text-sm font-medium mt-2">Chat sekarang →</p>
            </motion.button>
          )}

          {/* Operating Hours */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              {/* Realtime Status Badge */}
              {(() => {
                const now = new Date()
                const day = now.getDay() // 0 = Minggu
                const time = now.getHours() + now.getMinutes() / 60
                const isOpen = day !== 0 && time >= 10 && time < 22
                return (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {isOpen ? '● BUKA SEKARANG' : '● TUTUP SEKARANG'}
                  </span>
                )
              })()}
            </div>
            <h3 className="font-semibold text-gray-900 mb-3">Jam Operasional</h3>
            <div className="space-y-2 text-sm">
              {[
                { day: 'Senin', hours: '10.00 – 22.00', num: 1 },
                { day: 'Selasa', hours: '10.00 – 22.00', num: 2 },
                { day: 'Rabu', hours: '10.00 – 22.00', num: 3 },
                { day: 'Kamis', hours: '10.00 – 22.00', num: 4 },
                { day: 'Jumat', hours: '10.00 – 22.00', num: 5 },
                { day: 'Sabtu', hours: '10.00 – 22.00', num: 6 },
                { day: 'Minggu', hours: 'Tutup', num: 0 },
              ].map((item) => {
                const isToday = new Date().getDay() === item.num
                return (
                  <div key={item.day} className={`flex justify-between pb-1.5 border-b border-gray-50 last:border-0 ${isToday ? 'font-bold text-orange-600' : 'text-gray-500'}`}>
                    <span>{item.day} {isToday && '(Hari Ini)'}</span>
                    <span>{item.hours}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Social Media */}
          {(settings?.instagram_url || DEFAULT_INFO.instagram_url) && (
            <motion.a
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              href={settings?.instagram_url || DEFAULT_INFO.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">Instagram</h3>
              <p className="text-purple-100 text-sm">Follow kami untuk update terbaru</p>
            </motion.a>
          )}
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Kirim Masukan (Kritik & Saran)</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Masukan *
                </label>
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 bg-white"
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  defaultValue=""
                >
                  <option value="" disabled>Pilih Jenis Masukan</option>
                  <option value="pertanyaan">Pertanyaan</option>
                  <option value="kritik">Kritik</option>
                  <option value="saran">Saran</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" /> Nama *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" /> Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" /> No. Telepon
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="w-4 h-4 inline mr-1" /> Pesan *
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows="5"
                  placeholder="Tulis pesan Anda..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="flex items-center justify-center space-x-2 w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                <span>{sending ? 'Mengirim...' : 'Kirim Pesan'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  )
}