import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Image, Upload, Save, Globe, Palette, QrCode,
  Eye, Trash2, Store, MapPin, Phone, Mail
} from 'lucide-react'
import { supabase, uploadFile, deleteFile, STORAGE_BUCKETS, STORAGE_FOLDERS } from '../../lib/supabase'
import { toast } from 'sonner'

export default function WebsiteSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  const [uploading, setUploading] = useState({})

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'branding', label: 'Logo & Branding', icon: Image },
    { id: 'qris', label: 'QRIS', icon: QrCode },
    { id: 'contact', label: 'Kontak', icon: Phone },
    { id: 'social', label: 'Social Media', icon: Globe },
    { id: 'theme', label: 'Theme', icon: Palette }
  ]

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('website_settings').select('*').single()
      if (error && error.code !== 'PGRST116') throw error
      setSettings(data || {
        restaurant_name: 'Waroeng RCM Kang Abuy',
        tagline: 'Makanan Enak, Harga Ekonomis, Solusi Ketika Laper & Mageer',
        primary_color: '#f97316',
        secondary_color: '#ef4444'
      })
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // UPLOAD GAMBAR - GUNAKAN uploadFile DARI supabase.js
  // ============================================
  const handleImageUpload = async (file, field, folder) => {
    if (!file) { toast.error('Pilih file terlebih dahulu'); return }

    setUploading(prev => ({ ...prev, [field]: true }))

    try {
      const result = await uploadFile(STORAGE_BUCKETS.WEBSITE_ASSETS, folder, file)

      if (result.success) {
        // Tambahkan timestamp untuk force reload
        const urlWithTimestamp = `${result.url}?t=${Date.now()}`
        setSettings(prev => ({ ...prev, [field]: urlWithTimestamp }))
        toast.success('Gambar berhasil diupload!')
      } else {
        toast.error(result.error || 'Gagal upload gambar')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Gagal upload: ' + (error.message || 'Unknown error'))
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }))
    }
  }

  // ============================================
  // HAPUS GAMBAR - GUNAKAN deleteFile DARI supabase.js
  // ============================================
  const handleRemoveImage = async (field) => {
    const imageUrl = settings[field]
    if (!imageUrl) return

    try {
      // Extract path dari URL
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.indexOf(STORAGE_BUCKETS.WEBSITE_ASSETS)
      
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        await deleteFile(STORAGE_BUCKETS.WEBSITE_ASSETS, filePath)
      }
    } catch (error) {
      console.warn('Gagal hapus file:', error.message)
    }

    setSettings(prev => ({ ...prev, [field]: null }))
    toast.success('Gambar dihapus')
  }

  // ============================================
  // SIMPAN PENGATURAN
  // ============================================
  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ ...settings, updated_at: new Date().toISOString() })

      if (error) throw error

      toast.success('Pengaturan berhasil disimpan!')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // KOMPONEN UPLOAD GAMBAR
  // ============================================
  const ImageUploader = ({ field, folder, label, previewSize = 'h-32' }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-orange-400 transition-colors">
        {settings?.[field] ? (
          <div className="text-center">
            <img 
              src={settings[field].split('?')[0]} 
              alt={label} 
              className={`${previewSize} mx-auto rounded-lg object-contain bg-gray-50`}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="mt-3 flex justify-center space-x-2">
              <a href={settings[field]} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 flex items-center">
                <Eye className="w-3 h-3 mr-1" />Lihat
              </a>
              <button type="button" onClick={() => handleRemoveImage(field)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center">
                <Trash2 className="w-3 h-3 mr-1" />Hapus
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-3">Belum ada gambar</p>
          </div>
        )}
        
        <label className={`mt-3 cursor-pointer flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploading[field] ? 'bg-gray-200 text-gray-500 cursor-wait' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
          {uploading[field] ? (
            <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div><span>Mengupload...</span></>
          ) : (
            <><Upload className="w-4 h-4 mr-1" /><span>Upload {label}</span></>
          )}
          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, field, folder); e.target.value = '' }} className="hidden" disabled={uploading[field]} />
        </label>
        <p className="text-xs text-gray-400 mt-1 text-center">PNG, JPG, GIF, WEBP (Max 10MB)</p>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          {[...Array(6)].map((_, i) => (<div key={i} className="h-12 bg-gray-200 rounded"></div>))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Website</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola logo, gambar, dan informasi website</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
          <Save className="w-5 h-5" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Semua'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 space-y-1 sticky top-24">
            {sections.map(section => (
              <button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeSection === section.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                <section.icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            {activeSection === 'branding' && (
              <div className="space-y-8">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center"><Image className="w-5 h-5 mr-2 text-orange-500" />Logo & Branding</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ImageUploader field="logo_url" folder={STORAGE_FOLDERS.LOGO} label="Logo Restoran" previewSize="h-40" />
                  <ImageUploader field="favicon_url" folder={STORAGE_FOLDERS.FAVICON} label="Favicon" previewSize="h-20" />
                </div>
              </div>
            )}

            {activeSection === 'qris' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center"><QrCode className="w-5 h-5 mr-2 text-orange-500" />QRIS</h2>
                <ImageUploader field="qris_image_url" folder={STORAGE_FOLDERS.QRIS} label="QRIS Code" previewSize="h-64" />
                <div className="bg-blue-50 rounded-xl p-4"><p className="text-sm text-blue-700">💡 QRIS otomatis tampil saat checkout.</p></div>
              </div>
            )}

            {activeSection === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Informasi Restoran</h2>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Restoran</label><input type="text" value={settings.restaurant_name || ''} onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label><input type="text" value={settings.tagline || ''} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label><textarea value={settings.address || ''} onChange={(e) => setSettings({ ...settings, address: e.target.value })} rows="2" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Jam Operasional</label><input type="text" value={settings.operating_hours || ''} onChange={(e) => setSettings({ ...settings, operating_hours: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
              </div>
            )}

            {activeSection === 'contact' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Kontak</h2>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label><input type="text" value={settings.whatsapp_number || ''} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={settings.email || ''} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL</label><input type="url" value={settings.google_maps_url || ''} onChange={(e) => setSettings({ ...settings, google_maps_url: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
              </div>
            )}

            {activeSection === 'social' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Social Media</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['instagram_url','tiktok_url','facebook_url','youtube_url','gofood_url','grabfood_url'].map(f => (
                    <div key={f}><label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{f.replace('_url','').replace('_',' ')}</label><input type="url" value={settings[f] || ''} onChange={(e) => setSettings({ ...settings, [f]: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'theme' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Theme</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Warna Utama</label><div className="flex items-center space-x-3"><input type="color" value={settings.primary_color || '#f97316'} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="w-12 h-12 rounded-xl cursor-pointer" /><input type="text" value={settings.primary_color || ''} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} className="flex-1 px-4 py-3 rounded-xl border border-gray-200" /></div></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Warna Kedua</label><div className="flex items-center space-x-3"><input type="color" value={settings.secondary_color || '#ef4444'} onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })} className="w-12 h-12 rounded-xl cursor-pointer" /><input type="text" value={settings.secondary_color || ''} onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })} className="flex-1 px-4 py-3 rounded-xl border border-gray-200" /></div></div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}