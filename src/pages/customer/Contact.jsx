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
      if (settings?.email) {
        await supabase.from('notifications').insert({
          user_id: null, // Admin notification
          title: 'Pesan Baru dari Contact Form',
          message: `Dari: ${form.name}\nEmail: ${form.email}\nPesan: ${form.message}`,
          type: 'contact_form'
        })
      }

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
    if (settings?.whatsapp_number) {
      const message = encodeURIComponent('Halo, saya ingin bertanya tentang menu...')
      window.open(`https://wa.me/${settings.whatsapp_number}?text=${message}`, '_blank')
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
          {settings?.address && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Alamat</h3>
              <p className="text-gray-500 text-sm">{settings.address}</p>
              {settings.google_maps_url && (
                <a
                  href={settings.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 text-sm font-medium hover:text-orange-700 mt-2 inline-block"
                >
                  Lihat di Google Maps →
                </a>
              )}
            </motion.div>
          )}

          {/* WhatsApp */}
          {settings?.whatsapp_number && (
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
              <p className="text-green-100 text-sm">{settings.whatsapp_number}</p>
              <p className="text-white text-sm font-medium mt-2">Chat sekarang →</p>
            </motion.button>
          )}

          {/* Operating Hours */}
          {settings?.operating_hours && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Jam Operasional</h3>
              <p className="text-gray-500 text-sm">{settings.operating_hours}</p>
            </motion.div>
          )}

          {/* Social Media */}
          {settings?.instagram_url && (
            <motion.a
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              href={settings.instagram_url}
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
            <h2 className="text-xl font-bold text-gray-900 mb-6">Kirim Pesan</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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