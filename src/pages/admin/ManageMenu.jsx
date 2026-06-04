import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Edit, Trash2, Image, Upload, X, Check, Star, UtensilsCrossed
} from 'lucide-react'
import { supabase, uploadFile, STORAGE_BUCKETS, STORAGE_FOLDERS } from '../../lib/supabase'
import { formatCurrency } from '../../utils/format'
import { toast } from 'sonner'

export default function ManageMenu() {
  const [menus, setMenus] = useState([])
  const [categories, setCategories] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    name: '', category_id: '', description: '', price: '',
    is_best_seller: false, is_available: true
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [menuResult, categoryResult] = await Promise.all([
        supabase.from('menus').select('*, categories(name)').order('name'),
        supabase.from('categories').select('*').order('name')
      ])
      setMenus(menuResult.data || [])
      setCategories(categoryResult.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    menu.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (menu = null) => {
    if (menu) {
      setEditingMenu(menu)
      setForm({
        name: menu.name, category_id: menu.category_id || '',
        description: menu.description || '', price: menu.price.toString(),
        is_best_seller: menu.is_best_seller, is_available: menu.is_available
      })
      setImagePreview(menu.image_url)
    } else {
      setEditingMenu(null)
      setForm({ name: '', category_id: '', description: '', price: '', is_best_seller: false, is_available: true })
      setImagePreview(null)
      setImageFile(null)
    }
    setShowModal(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let imageUrl = editingMenu?.image_url || null

      // Upload gambar jika ada file baru
      if (imageFile) {
        setUploading(true)
        const result = await uploadFile(
          STORAGE_BUCKETS.MENU_IMAGES, 
          STORAGE_FOLDERS.FOODS, 
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

      const menuData = {
        ...form,
        slug: generateSlug(form.name),
        price: parseFloat(form.price) || 0,
        image_url: imageUrl
      }

      if (editingMenu) {
        const { error } = await supabase.from('menus').update(menuData).eq('id', editingMenu.id)
        if (error) throw error
        toast.success('Menu berhasil diupdate!')
      } else {
        const { error } = await supabase.from('menus').insert([menuData])
        if (error) throw error
        toast.success('Menu berhasil ditambahkan!')
      }

      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving menu:', error)
      toast.error('Gagal menyimpan menu: ' + error.message)
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const handleDelete = async (menuId) => {
    if (!window.confirm('Yakin ingin menghapus menu ini?')) return
    try {
      const { error } = await supabase.from('menus').delete().eq('id', menuId)
      if (error) throw error
      toast.success('Menu berhasil dihapus')
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus menu')
    }
  }

  const handleToggleAvailability = async (menu) => {
    try {
      const { error } = await supabase.from('menus').update({ is_available: !menu.is_available }).eq('id', menu.id)
      if (error) throw error
      toast.success(`Menu ${menu.is_available ? 'dinonaktifkan' : 'diaktifkan'}`)
      loadData()
    } catch (error) {
      toast.error('Gagal mengubah status menu')
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Menu</h1>
          <p className="text-sm text-gray-500 mt-1">Total {menus.length} menu</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Menu</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text" placeholder="Cari menu..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMenus.map((menu) => (
          <motion.div
            key={menu.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${!menu.is_available ? 'opacity-60' : ''}`}
          >
            <div className="relative h-40 bg-gradient-to-br from-orange-100 to-red-100">
              {menu.image_url ? (
                <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <UtensilsCrossed className="w-12 h-12 text-orange-300" />
                </div>
              )}
              <div className="absolute top-2 left-2 flex space-x-2">
                {menu.is_best_seller && (
                  <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-semibold">
                    <Star className="w-3 h-3 inline mr-1" />Best Seller
                  </span>
                )}
                {!menu.is_available && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-semibold">Nonaktif</span>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{menu.name}</h3>
                  <p className="text-xs text-gray-500">{menu.categories?.name || 'Tanpa Kategori'}</p>
                </div>
                <p className="text-lg font-bold text-orange-600 ml-2">{formatCurrency(menu.price)}</p>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">{menu.description || '-'}</p>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleOpenModal(menu)} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                  <Edit className="w-4 h-4 inline mr-1" />Edit
                </button>
                <button onClick={() => handleToggleAvailability(menu)} className={`px-3 py-2 rounded-lg text-sm font-medium ${menu.is_available ? 'bg-gray-50 text-gray-600 hover:bg-gray-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                  <Check className="w-4 h-4 inline mr-1" />{menu.is_available ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => handleDelete(menu.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{editingMenu ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Upload Gambar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Menu</label>
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

                {/* Nama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Menu *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500">
                    <option value="">Pilih Kategori</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>

                {/* Harga */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" />
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" />
                </div>

                {/* Toggle */}
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={form.is_best_seller} onChange={(e) => setForm({ ...form, is_best_seller: e.target.checked })} className="w-4 h-4 text-orange-500 rounded" />
                    <span className="text-sm text-gray-700">Best Seller</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 text-orange-500 rounded" />
                    <span className="text-sm text-gray-700">Tersedia</span>
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Batal</button>
                  <button type="submit" disabled={saving || uploading} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50">
                    {saving || uploading ? 'Menyimpan...' : editingMenu ? 'Update' : 'Simpan'}
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