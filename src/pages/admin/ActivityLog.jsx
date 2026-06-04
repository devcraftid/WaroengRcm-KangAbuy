import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Search,
  Filter,
  Download,
  User,
  ShoppingBag,
  CreditCard,
  Settings,
  LogIn,
  LogOut,
  Trash2,
  Edit,
  Plus,
  Clock
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRealtimeActivities } from '../../hooks/useRealtime'
import { formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function AdminActivityLog() {
  const [activities, setActivities] = useState([])
  const [filteredActivities, setFilteredActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [users, setUsers] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  useRealtimeActivities((newActivity) => {
    setActivities(prev => [newActivity, ...prev])
  })

  useEffect(() => {
    filterActivities()
  }, [searchQuery, typeFilter, userFilter, activities])

  const loadData = async () => {
    try {
      const [activitiesResult, usersResult] = await Promise.all([
        supabase
          .from('activities')
          .select('*, user:profiles!user_id(full_name, role)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['admin', 'cashier'])
      ])

      setActivities(activitiesResult.data || [])
      setUsers(usersResult.data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
      toast.error('Gagal memuat activity log')
    } finally {
      setLoading(false)
    }
  }

  const filterActivities = () => {
    let filtered = [...activities]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.description?.toLowerCase().includes(query) ||
        a.user?.full_name?.toLowerCase().includes(query) ||
        a.type?.toLowerCase().includes(query)
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === typeFilter)
    }

    if (userFilter !== 'all') {
      filtered = filtered.filter(a => a.user_id === userFilter)
    }

    setFilteredActivities(filtered)
  }

  const clearLog = async () => {
    if (!window.confirm('Yakin ingin menghapus semua activity log?')) return

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) throw error

      setActivities([])
      toast.success('Activity log berhasil dibersihkan')
    } catch (error) {
      toast.error('Gagal membersihkan log')
    }
  }

  const handleExportCSV = () => {
    const headers = ['Waktu', 'User', 'Role', 'Tipe', 'Deskripsi']
    const csvData = filteredActivities.map(a => [
      new Date(a.created_at).toLocaleString('id-ID'),
      a.user?.full_name || 'System',
      a.user?.role || '-',
      a.type || '-',
      a.description
    ])

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Log berhasil diexport')
  }

  const getActivityIcon = (type) => {
    const icons = {
      order_created: ShoppingBag,
      order_updated: Edit,
      order_cancelled: Trash2,
      payment_received: CreditCard,
      user_login: LogIn,
      user_logout: LogOut,
      menu_created: Plus,
      menu_updated: Edit,
      menu_deleted: Trash2,
      settings_updated: Settings,
      table_updated: Edit
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
      user_login: 'bg-purple-100 text-purple-600',
      user_logout: 'bg-gray-100 text-gray-600',
      menu_created: 'bg-teal-100 text-teal-600',
      menu_updated: 'bg-orange-100 text-orange-600',
      menu_deleted: 'bg-red-100 text-red-600',
      settings_updated: 'bg-indigo-100 text-indigo-600'
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const activityTypes = [
    'order_created',
    'order_updated',
    'order_cancelled',
    'payment_received',
    'user_login',
    'user_logout',
    'menu_created',
    'menu_updated',
    'menu_deleted',
    'settings_updated'
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredActivities.length} aktivitas tercatat
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4 inline mr-1" />
            Export CSV
          </button>
          <button
            onClick={clearLog}
            className="px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4 inline mr-1" />
            Clear Log
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari aktivitas..."
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
            {activityTypes.map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua User</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-center py-16">
          <Activity className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Ada Aktivitas</h2>
          <p className="text-gray-500">Aktivitas akan tercatat di sini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center space-x-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  {index < filteredActivities.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-200 mt-1"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="flex items-center text-xs text-gray-500">
                          <User className="w-3 h-3 mr-1" />
                          {activity.user?.full_name || 'System'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {activity.user?.role || '-'}
                        </span>
                        <span className="text-xs text-gray-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                        {activity.type?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  {activity.metadata && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <pre className="text-xs text-gray-500 overflow-x-auto">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}