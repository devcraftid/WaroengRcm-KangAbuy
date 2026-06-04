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
import { useRealtimeNotifications } from '../../hooks/useRealtime'
import useAuthStore from '../../stores/authStore'
import { formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

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

  useRealtimeNotifications(user?.id, (newNotification) => {
    setNotifications(prev => [newNotification, ...prev])
    toast.info(newNotification.title, {
      description: newNotification.message
    })
  })

  useEffect(() => {
    filterNotifications()
  }, [searchQuery, typeFilter, notifications])

  const loadNotifications = async () => {
    try {
      // Admin sees all notifications or can filter by type
      const { data } = await supabase
        .from('notifications')
        .select('*, user:profiles!user_id(full_name)')
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {notifications.filter(n => !n.is_read).length} belum dibaca
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={sendNotification}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            <Mail className="w-4 h-4 inline mr-1" />
            Broadcast
          </button>
          <button
            onClick={markAllAsRead}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            Tandai Semua Dibaca
          </button>
          {selectedNotifications.length > 0 && (
            <button
              onClick={deleteSelected}
              className="px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Hapus ({selectedNotifications.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari notifikasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="order_created">Order Baru</option>
            <option value="payment_received">Pembayaran</option>
            <option value="order_processing">Diproses</option>
            <option value="order_completed">Selesai</option>
            <option value="order_cancelled">Dibatalkan</option>
            <option value="new_customer">Pelanggan Baru</option>
          </select>
        </div>
      </div>

      {/* Select All */}
      {filteredNotifications.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedNotifications.length === filteredNotifications.length}
              onChange={handleSelectAll}
              className="w-4 h-4 text-orange-500 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Pilih Semua</span>
          </label>
        </div>
      )}

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Ada Notifikasi</h2>
          <p className="text-gray-500">Notifikasi akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${
                !notification.is_read
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start space-x-4">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedNotifications.includes(notification.id)}
                  onChange={() => handleSelect(notification.id)}
                  className="w-4 h-4 text-orange-500 rounded mt-1"
                />

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {notification.title}
                      {!notification.is_read && (
                        <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full inline-block"></span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  
                  {notification.user && (
                    <p className="text-xs text-gray-400 mt-1">
                      Untuk: {notification.user.full_name || 'Semua Pengguna'}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-3 mt-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        Tandai Dibaca
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}