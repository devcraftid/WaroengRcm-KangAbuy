import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Eye,
  Users,
  UserCircle,
  Mail,
  Phone,
  Star,
  Award,
  ShoppingBag,
  DollarSign,
  Calendar,
  X,
  Ban,
  Check,
  Filter,
  Download
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime, getMembershipLevelColor } from '../../utils/format'
import { toast } from 'sonner'

export default function ManageCustomer() {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    members: 0,
    vip: 0
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [searchQuery, membershipFilter, customers])

  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false })

      const customersData = data || []
      setCustomers(customersData)
      setFilteredCustomers(customersData)

      setStats({
        total: customersData.length,
        active: customersData.filter(c => c.is_active).length,
        members: customersData.filter(c => c.membership_level === 'member_setia').length,
        vip: customersData.filter(c => c.membership_level === 'vip').length
      })
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Gagal memuat data pelanggan')
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    let filtered = [...customers]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(customer =>
        customer.full_name?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query)
      )
    }

    if (membershipFilter !== 'all') {
      filtered = filtered.filter(customer => customer.membership_level === membershipFilter)
    }

    setFilteredCustomers(filtered)
  }

  const handleViewDetail = async (customer) => {
    try {
      // Load order history
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20)

      // Load vouchers
      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('*')
        .eq('customer_id', customer.id)

      setSelectedCustomer({
        ...customer,
        orders: orders || [],
        vouchers: vouchers || []
      })
      setShowDetail(true)
    } catch (error) {
      console.error('Error loading customer detail:', error)
    }
  }

  const handleUpdateMembership = async (customerId, newLevel) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ membership_level: newLevel })
        .eq('id', customerId)

      if (error) throw error

      toast.success(`Membership diupdate ke ${newLevel}`)
      loadCustomers()
    } catch (error) {
      toast.error('Gagal mengupdate membership')
    }
  }

  const handleToggleActive = async (customer) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !customer.is_active })
        .eq('id', customer.id)

      if (error) throw error

      toast.success(`Pelanggan ${customer.is_active ? 'dinonaktifkan' : 'diaktifkan'}`)
      loadCustomers()
    } catch (error) {
      toast.error('Gagal mengubah status pelanggan')
    }
  }

  const handleExportCSV = () => {
    const headers = ['Nama', 'Email', 'Phone', 'Membership', 'Total Order', 'Total Spent', 'Bergabung']
    const csvData = filteredCustomers.map(c => [
      c.full_name,
      c.email,
      c.phone || '-',
      c.membership_level,
      c.total_orders,
      c.total_spent,
      new Date(c.created_at).toLocaleDateString('id-ID')
    ])

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Data pelanggan berhasil diexport')
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Pelanggan</h1>
          <p className="text-sm text-gray-500 mt-1">Total {customers.length} pelanggan</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pelanggan', value: stats.total, icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Aktif', value: stats.active, icon: UserCircle, color: 'from-green-500 to-emerald-600' },
          { label: 'Member Setia', value: stats.members, icon: Star, color: 'from-yellow-500 to-orange-600' },
          { label: 'VIP', value: stats.vip, icon: Award, color: 'from-purple-500 to-pink-600' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, email, atau nomor telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <select
            value={membershipFilter}
            onChange={(e) => setMembershipFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Membership</option>
            <option value="member_baru">Member Baru</option>
            <option value="member_setia">Member Setia</option>
            <option value="vip">VIP Customer</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Pelanggan</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Kontak</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Membership</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Total Order</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Total Spent</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                          {customer.full_name?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{customer.full_name || 'Tanpa Nama'}</p>
                          <p className="text-xs text-gray-500">ID: {customer.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="flex items-center text-gray-600">
                          <Mail className="w-3 h-3 mr-1" />
                          {customer.email || '-'}
                        </p>
                        {customer.phone && (
                          <p className="flex items-center text-gray-500 text-xs mt-1">
                            <Phone className="w-3 h-3 mr-1" />
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getMembershipLevelColor(customer.membership_level)}`}>
                        {customer.membership_level === 'member_baru' && '⭐ Member Baru'}
                        {customer.membership_level === 'member_setia' && '🌟🌟 Member Setia'}
                        {customer.membership_level === 'vip' && '👑 VIP'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{customer.total_orders || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(customer.total_spent || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        customer.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {customer.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewDetail(customer)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(customer)}
                          className={`p-2 rounded-lg transition-colors ${
                            customer.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                          title={customer.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {customer.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada pelanggan ditemukan</p>
            </div>
          )}
        </div>
      )}

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {showDetail && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Detail Pelanggan</h2>
                <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                    {selectedCustomer.full_name?.[0] || 'C'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.full_name}</h3>
                    <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Membership</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getMembershipLevelColor(selectedCustomer.membership_level)}`}>
                      {selectedCustomer.membership_level}
                    </span>
                    <div className="mt-2 space-x-2">
                      {['member_baru', 'member_setia', 'vip'].map(level => (
                        <button
                          key={level}
                          onClick={() => handleUpdateMembership(selectedCustomer.id, level)}
                          className={`text-xs px-2 py-1 rounded ${
                            selectedCustomer.membership_level === level
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {level === 'member_baru' ? 'Baru' : level === 'member_setia' ? 'Setia' : 'VIP'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Total Order</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedCustomer.total_orders || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(selectedCustomer.total_spent || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Bergabung</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedCustomer.created_at)}</p>
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Riwayat Order Terbaru</h3>
                  <div className="space-y-2">
                    {selectedCustomer.orders?.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                          <span className="text-xs text-gray-500 capitalize">{order.status}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                      <p className="text-sm text-gray-500">Belum ada order</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}