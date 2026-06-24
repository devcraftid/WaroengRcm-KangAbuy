import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  ShoppingBag,
  CreditCard,
  ChefHat,
  CheckCircle,
  XCircle,
  Users,
  Trash2,
  Check,
  Filter,
  Search,
  Mail
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtimeAdminNotifications } from '../../hooks/useRealtime'
import useAuthStore from '../../stores/authStore'
import { formatDateTime } from '../../utils/format'
import { toast } from 'sonner'
import { playNotificationByType } from '../../utils/sound'

export default function AdminNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [filteredNotifications, setFilteredNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedNotifications, setSelectedNotifications] = useState([])

  useEffect(() => {
    loadNotifications()
  }, [])

  useRealtimeAdminNotifications((newNotification) => {
    setNotifications(prev => [newNotification, ...prev])
  })

  useEffect(() => {
    filterNotifications()
  }, [searchQuery, typeFilter, notifications])

  const loadNotifications = async () => {
    try {
      // Admin sees notifications where user_id is null
      const { data } = await supabase
        .from('notifications')
        .select('*, user:profiles!user_id(full_name)')
        .is('user_id', null)
        .order('created_at', { ascending: false })
        .limit(100)

      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Gagal memuat notifikasi')
    } finally {
      setLoading(false)
    }
  }

  const filterNotifications = () => {
    let filtered = [...notifications]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n =>
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query)
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === typeFilter)
    }

    setFilteredNotifications(filtered)
  }

  const markAsRead = async (notificationIds) => {
    try {
      const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds]
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
      )
      
      toast.success('Notifikasi ditandai dibaca')
    } catch (error) {
      toast.error('Gagal mengupdate notifikasi')
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) {
      toast.info('Semua notifikasi sudah dibaca')
      return
    }
    await markAsRead(unreadIds)
  }

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success('Notifikasi dihapus')
    } catch (error) {
      toast.error('Gagal menghapus notifikasi')
    }
  }

  const deleteSelected = async () => {
    if (selectedNotifications.length === 0) return
    
    if (!window.confirm(`Hapus ${selectedNotifications.length} notifikasi?`)) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', selectedNotifications)

      if (error) throw error

      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)))
      setSelectedNotifications([])
      toast.success(`${selectedNotifications.length} notifikasi dihapus`)
    } catch (error) {
      toast.error('Gagal menghapus notifikasi')
    }
  }

  const sendNotification = async () => {
    const title = prompt('Judul notifikasi:')
    if (!title) return
    
    const message = prompt('Pesan notifikasi:')
    if (!message) return

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title,
          message,
          type: 'admin_broadcast',
          user_id: null // null means all users
        })

      if (error) throw error
      
      toast.success('Notifikasi broadcast dikirim')
      loadNotifications()
    } catch (error) {
      toast.error('Gagal mengirim notifikasi')
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      order_created: ShoppingBag,
      payment_received: CreditCard,
      order_processing: ChefHat,
      order_completed: CheckCircle,
      order_cancelled: XCircle,
      new_customer: Users,
      admin_broadcast: Bell
    }
    const Icon = icons[type] || Bell
    return <Icon className="w-4 h-4" />
  }

  const getNotificationColor = (type) => {
    const colors = {
      order_created: 'bg-blue-100 text-blue-600',
      payment_received: 'bg-green-100 text-green-600',
      order_processing: 'bg-orange-100 text-orange-600',
      order_completed: 'bg-teal-100 text-teal-600',
      order_cancelled: 'bg-red-100 text-red-600',
      new_customer: 'bg-purple-100 text-purple-600',
      admin_broadcast: 'bg-gray-100 text-gray-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  const handleSelect = (notificationId) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Notifikasi</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {notifications.filter(n => !n.is_read).length} pesan belum dibaca
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={sendNotification}
            className="px-4 py-2 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm border border-gray-200 text-sm flex items-center"
          >
            <Mail className="w-4 h-4 mr-1.5" />
            Kirim
          </button>
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all text-sm flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Baca Semua
          </button>
          {selectedNotifications.length > 0 && (
            <button
              onClick={deleteSelected}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-100 text-sm flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Hapus ({selectedNotifications.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari notifikasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium bg-white/50"
            />
          </div>
          
          <div className="relative min-w-[150px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-bold text-gray-700 bg-white/50 cursor-pointer appearance-none"
            >
              <option value="all">Semua Tipe</option>
              <option value="order_created">Pesanan Baru</option>
              <option value="payment_received">Pembayaran</option>
              <option value="order_processing">Diproses</option>
              <option value="order_completed">Selesai</option>
              <option value="order_cancelled">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Select All */}
      {filteredNotifications.length > 0 && (
        <div className="mb-4 px-2">
          <label className="inline-flex items-center space-x-2 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedNotifications.length === filteredNotifications.length}
                onChange={handleSelectAll}
                className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-lg checked:border-orange-500 checked:bg-orange-500 transition-all cursor-pointer"
              />
              <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
            </div>
            <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Pilih Semua Pesan</span>
          </label>
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tidak Ada Notifikasi</h2>
          <p className="text-sm text-gray-500 font-medium">Kotak masuk Anda masih kosong.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative overflow-hidden rounded-2xl shadow-sm border transition-all hover:shadow-md group ${
                  !notification.is_read
                    ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-white'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {!notification.is_read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                )}
                
                <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                  {/* Checkbox */}
                  <div className="pt-1 relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleSelect(notification.id)}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-lg checked:border-orange-500 checked:bg-orange-500 transition-all cursor-pointer"
                    />
                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                      <h3 className={`text-sm sm:text-base font-bold truncate pr-4 ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-400 whitespace-nowrap mt-1 sm:mt-0">
                        {formatDateTime(notification.created_at)}
                      </span>
                    </div>
                    
                    <p className={`text-xs sm:text-sm leading-relaxed mb-3 ${!notification.is_read ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {notification.message}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-[11px] sm:text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Tandai Dibaca
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-[11px] sm:text-xs text-gray-400 hover:text-red-600 font-bold flex items-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}