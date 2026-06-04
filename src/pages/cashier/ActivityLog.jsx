import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Search,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  Monitor
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { useRealtimeActivities } from '../../hooks/useRealtime'
import { formatDateTime } from '../../utils/format'

export default function CashierActivityLog() {
  const { profile } = useAuthStore()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadActivities()
  }, [])

  useRealtimeActivities((newActivity) => {
    // Only show if related to current cashier
    if (newActivity.user_id === profile?.id) {
      setActivities(prev => [newActivity, ...prev])
    }
  })

  const loadActivities = async () => {
    try {
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setActivities(data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(a =>
    a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getActivityIcon = (type) => {
    const icons = {
      order_created: ShoppingBag,
      order_updated: Edit,
      order_cancelled: Trash2,
      payment_received: CreditCard,
      payment_validated: DollarSign,
      user_login: LogIn,
      user_logout: LogOut,
      table_updated: Monitor
    }
    const Icon = icons[type] || Activity
    return <Icon className="w-4 h-4" />
  }

  const getActivityColor = (type) => {
    const colors = {
      order_created: 'bg-blue-100 text-blue-600',
      order_updated: 'bg-yellow-100 text-yellow-600',
      order_cancelled: 'bg-red-100 text-red-600',
      payment_received: 'bg-green-100 text-green-600',
      payment_validated: 'bg-purple-100 text-purple-600',
      user_login: 'bg-teal-100 text-teal-600',
      user_logout: 'bg-gray-100 text-gray-600',
      table_updated: 'bg-indigo-100 text-indigo-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activities.length} aktivitas tercatat
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari aktivitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Activities Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-16">
          <Activity className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Aktivitas</h2>
          <p className="text-gray-500">Aktivitas Anda akan tercatat di sini</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="relative pl-12"
              >
                {/* Timeline Dot */}
                <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-white ${getActivityColor(activity.type)}`}>
                  <div className="w-2 h-2 rounded-full bg-current mx-auto mt-0.5"></div>
                </div>

                {/* Activity Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                            {activity.type?.replace(/_/g, ' ') || 'Activity'}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDateTime(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}