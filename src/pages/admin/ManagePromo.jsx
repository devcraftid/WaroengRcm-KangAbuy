import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit, Trash2, Image, Upload, X,
  Percent, Calendar, Tag
} from 'lucide-react'
import { supabase, uploadFile, STORAGE_BUCKETS, STORAGE_FOLDERS } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../utils/format'
import { toast } from 'sonner'

export default function ManagePromo() {
  const [promotions, setPromotions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: '',
    end_date: '',
    is_active: true
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => { loadPromotions() }, [])

  const loadPromotions = async () => {
    try {
      const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
      setPromotions(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat promo')
    } finally {
      setLoading(false)
    }
  }

  const filteredPromotions = promotions.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingPromo(promo)
      setForm({
        title: promo.title,
        description: promo.description || '',
        discount_type: promo.discount_type || 'percentage',
        discount_value: promo.discount_value?.toString() || '',
        start_date: promo.start_date ? new Date(promo.start_date).toISOString().split('T')[0] : '',
        end_date: promo.end_date ? new Date(promo.end_date).toISOString().split('T')[0] : '',
        is_active: promo.is_active
      })
      setImagePreview(promo.image_url)
    } else {
      setEditingPromo(null)
      setForm({
        title: '', description: '', discount_type: 'percentage', discount_value: '',
        start_date: '', end_date: '', is_active: true
      })
      setImagePreview(null)
      setImageFile(null)
    }
    setShowModal(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let imageUrl = editingPromo?.image_url || null

      // Upload gambar jika ada file baru - GUNAKAN uploadFile dari supabase.js
      if (imageFile) {
        setUploading(true)
        const result = await uploadFile(
          STORAGE_BUCKETS.WEBSITE_ASSETS,
          STORAGE_FOLDERS.PROMOTIONS,
          imageFile
        )
        setUploading(false)

        if (result.success) {
          imageUrl = result.url
          toast.success('Gambar berhasil diupload!')
        } else {
          toast.error(result.error || 'Gagal upload gambar')
          setSaving(false)
          return
        }
      }

      const promoData = {
        ...form,
        discount_value: parseFloat(form.discount_value) || 0,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        image_url: imageUrl
      }

      if (editingPromo) {
        const { error } = await supabase.from('promotions').update(promoData).eq('id', editingPromo.id)
        if (error) throw error
        toast.success('Promo berhasil diupdate!')
      } else {
        const { error } = await supabase.from('promotions').insert([promoData])
        if (error) throw error
        toast.success('Promo berhasil ditambahkan!')
      }

      setShowModal(false)
      loadPromotions()
    } catch (error) {
      console.error('Error saving promotion:', error)
      toast.error('Gagal menyimpan promo: ' + error.message)
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const handleDelete = async (promoId) => {
    if (!window.confirm('Yakin ingin menghapus promo ini?')) return
    try {
      const { error } = await supabase.from('promotions').delete().eq('id', promoId)
      if (error) throw error
      toast.success('Promo berhasil dihapus')
      loadPromotions()
    } catch (error) {
      toast.error('Gagal menghapus promo')
    }
  }

  const isPromoActive = (promo) => {
    if (!promo.is_active) return false
    const now = new Date()
    if (promo.start_date && new Date(promo.start_date) > now) return false
    if (promo.end_date && new Date(promo.end_date) < now) return false
    return true
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Promo</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Total {promotions.length} promo</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Promo</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text" placeholder="Cari promo..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Promo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredPromotions.map((promo) => {
          const active = isPromoActive(promo)
          return (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${!active ? 'opacity-60' : 'border-gray-100'}`}
            >
              {/* Image */}
              <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-100">
                {promo.image_url ? (
                  <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Percent className="w-12 h-12 text-orange-300" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{promo.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{promo.description || '-'}</p>

                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center text-sm">
                    <Tag className="w-4 h-4 text-orange-500 mr-1" />
                    <span className="font-medium text-orange-600">
                      {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : formatCurrency(promo.discount_value)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center text-xs text-gray-500 mb-3">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>
                    {promo.start_date ? formatDate(promo.start_date) : 'N/A'} - {promo.end_date ? formatDate(promo.end_date) : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={() => handleOpenModal(promo)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                    <Edit className="w-4 h-4 inline mr-1" />Edit
                  </button>
                  <button onClick={() => handleDelete(promo.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold">{editingPromo ? 'Edit Promo' : 'Tambah Promo'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Upload Gambar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Promo</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 flex items-center">
                        <Upload className="w-4 h-4 mr-1" />
                        {uploading ? 'Mengupload...' : 'Pilih Gambar'}
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WEBP (Max 10MB)</p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Promo *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500" />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500" />
                </div>

                {/* Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon</label>
                    <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500">
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Diskon</label>
                    <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      min="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Berakhir</label>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                {/* Active Toggle */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-500 rounded" />
                  <span className="text-sm text-gray-700">Promo Aktif</span>
                </label>

                {/* Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">Batal</button>
                  <button type="submit" disabled={saving || uploading}
                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg disabled:opacity-50">
                    {saving || uploading ? 'Menyimpan...' : editingPromo ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}