import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  XCircle,
  Check,
  Trash2,
  Search,
  Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { useRealtimeNotifications } from '../../hooks/useRealtime'
import { formatDateTime } from '../../utils/format'
import { toast } from 'sonner'
import { playNotificationByType } from '../../utils/sound'

export default function CashierNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadNotifications()
  }, [])

  useRealtimeNotifications(user?.id, (newNotification) => {
    setNotifications(prev => [newNotification, ...prev])
    // Play suara sesuai tipe notifikasi
    playNotificationByType(newNotification.type)
    toast.info(newNotification.title, {
      description: newNotification.message
    })
  })

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = notifications.filter(n =>
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAsRead = async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      toast.error('Gagal mengupdate notifikasi')
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length === 0) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      toast.success('Semua notifikasi ditandai dibaca')
    } catch (error) {
      toast.error('Gagal mengupdate notifikasi')
    }
  }

  const deleteNotification = async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success('Notifikasi dihapus')
    } catch (error) {
      toast.error('Gagal menghapus notifikasi')
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      order_created: ShoppingBag,
      payment_received: CreditCard,
      order_ready: CheckCircle,
      order_cancelled: XCircle,
      order_completed: CheckCircle
    }
    const Icon = icons[type] || Bell
    return <Icon className="w-4 h-4" />
  }

  const getNotificationColor = (type) => {
    const colors = {
      order_created: 'bg-blue-100 text-blue-600',
      payment_received: 'bg-green-100 text-green-600',
      order_ready: 'bg-purple-100 text-purple-600',
      order_cancelled: 'bg-red-100 text-red-600',
      order_completed: 'bg-teal-100 text-teal-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount} belum dibaca
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600"
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari notifikasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Ada Notifikasi</h2>
          <p className="text-gray-500">Anda belum memiliki notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${
                !notification.is_read ? 'border-l-4 border-l-orange-500' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {notification.title}
                      {!notification.is_read && (
                        <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full inline-block"></span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  
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