import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, Camera, Save, Key, Eye, EyeOff,
  Shield, Calendar, Award, ShoppingBag, DollarSign,
  Upload, Trash2
} from 'lucide-react'
import { supabase, uploadFile, STORAGE_BUCKETS, STORAGE_FOLDERS } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, getMembershipLevelColor } from '../../utils/format'
import { toast } from 'sonner'

export default function Profile() {
  const { user, profile, updateProfile } = useAuthStore()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false })

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || ''
      })
      setAvatarPreview(profile.avatar_url)
    }
  }, [profile])

  // ============================================
  // UPLOAD AVATAR
  // ============================================
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setAvatarPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleUploadAvatar = async () => {
    if (!avatarFile) return
    
    setUploading(true)
    try {
      const result = await uploadFile(
        STORAGE_BUCKETS.WEBSITE_ASSETS,
        STORAGE_FOLDERS.AVATARS,
        avatarFile
      )

      if (result.success) {
        await updateProfile({ avatar_url: result.url })
        setAvatarPreview(result.url)
        setAvatarFile(null)
        toast.success('Foto profil berhasil diupload!')
      } else {
        toast.error(result.error || 'Gagal upload foto')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Gagal upload foto: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    await updateProfile({ avatar_url: null })
    setAvatarPreview(null)
    setAvatarFile(null)
    toast.success('Foto profil dihapus')
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updates = {
        full_name: form.full_name,
        phone: form.phone || null,
        birth_date: form.birth_date || null
      }

      await updateProfile(updates)
      toast.success('Profile berhasil diupdate!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Gagal mengupdate profile')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // CHANGE PASSWORD
  // ============================================
  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password baru tidak cocok')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      toast.success('Password berhasil diubah!')
      setShowPasswordForm(false)
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Gagal mengubah password')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - Avatar & Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            {/* Avatar */}
            <div className="relative inline-block">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold mx-auto overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              
              <label className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors shadow-lg">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>

            {/* Upload/Remove buttons */}
            {avatarFile && (
              <button
                onClick={handleUploadAvatar}
                disabled={uploading}
                className="mt-3 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 w-full"
              >
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-1"></div>Mengupload...</>
                ) : (
                  <><Upload className="w-4 h-4 inline mr-1" />Simpan Foto</>
                )}
              </button>
            )}
            
            {avatarPreview && !avatarFile && (
              <button
                onClick={handleRemoveAvatar}
                className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 w-full"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />Hapus Foto
              </button>
            )}

            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-4">{profile?.full_name || 'User'}</h2>

            {/* Membership Badge */}
            {profile?.role === 'customer' && profile?.membership_level && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getMembershipLevelColor(profile.membership_level)}`}>
                <Award className="w-4 h-4 mr-1" />
                {profile.membership_level === 'member_baru' && 'Member Baru'}
                {profile.membership_level === 'member_setia' && 'Member Setia'}
                {profile.membership_level === 'vip' && 'VIP Customer'}
              </div>
            )}

            {/* Role Badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                profile?.role === 'admin' ? 'bg-yellow-100 text-yellow-700' :
                profile?.role === 'cashier' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <Shield className="w-3 h-3 mr-1" />
                {profile?.role === 'admin' ? 'Admin (Owner)' :
                 profile?.role === 'cashier' ? 'Kasir' : 'Customer'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-500">
              <p className="flex items-center justify-center">
                <Mail className="w-4 h-4 mr-2" />
                {profile?.email}
              </p>
              {profile?.phone && (
                <p className="flex items-center justify-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {profile.phone}
                </p>
              )}
              <p className="flex items-center justify-center">
                <Calendar className="w-4 h-4 mr-2" />
                Bergabung: {profile?.created_at ? formatDateTime(profile.created_at) : '-'}
              </p>
            </div>

            {/* Customer Stats */}
            {profile?.role === 'customer' && (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <ShoppingBag className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{profile.total_orders || 0}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div className="text-center">
                  <DollarSign className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(profile.total_spent || 0)}</p>
                  <p className="text-xs text-gray-500">Total Spent</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Edit Profile</h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" /> Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" /> Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" /> No. Telepon
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" /> Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center space-x-2 w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 text-sm"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Ubah Password</h3>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-200"
              >
                <Key className="w-4 h-4" />
                <span>{showPasswordForm ? 'Batal' : 'Ubah'}</span>
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 pr-12 text-sm"
                    />
                    <button type="button" onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      minLength={6}
                      placeholder="Ulangi password baru"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 pr-12 text-sm"
                    />
                    <button type="button" onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm">
                  Ubah Password
                </button>
              </form>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Informasi Akun</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Role</p>
                  <p className="text-sm text-gray-500 capitalize">{profile?.role || 'customer'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <User className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">User ID</p>
                  <p className="text-sm text-gray-500 font-mono text-xs break-all">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}