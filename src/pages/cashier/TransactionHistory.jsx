import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  Banknote,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  ShoppingBag
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, formatDate } from '../../utils/format'
import { toast } from 'sonner'

export default function TransactionHistory() {
  const { profile } = useAuthStore()
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    cashAmount: 0,
    qrisAmount: 0,
    averageAmount: 0
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDate, setCustomDate] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadTransactions()
  }, [dateFilter, customDate])

  useEffect(() => {
    filterTransactions()
  }, [searchQuery, methodFilter, transactions])

  const getDateRange = () => {
    const now = new Date()
    let start, end

    switch (dateFilter) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7))
        end = new Date()
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date()
        break
      case 'custom':
        start = new Date(customDate.start)
        end = new Date(customDate.end)
        end.setHours(23, 59, 59, 999)
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    }

    return { start, end }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()

      const { data } = await supabase
        .from('payments')
        .select(`
          *,
          order:orders!order_id(
            id,
            total_amount,
            order_type,
            table_number,
            customer:profiles!customer_id(full_name)
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

      const transactionsData = data || []
      setTransactions(transactionsData)
      setFilteredTransactions(transactionsData)

      // Calculate summary
      const cashTransactions = transactionsData.filter(t => t.method === 'cash')
      const qrisTransactions = transactionsData.filter(t => t.method === 'qris')
      const completedTransactions = transactionsData.filter(t => t.status === 'completed')

      setSummary({
        totalTransactions: completedTransactions.length,
        totalAmount: completedTransactions.reduce((sum, t) => sum + t.amount, 0),
        cashAmount: cashTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
        qrisAmount: qrisTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
        averageAmount: completedTransactions.length > 0 
          ? completedTransactions.reduce((sum, t) => sum + t.amount, 0) / completedTransactions.length 
          : 0
      })
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error('Gagal memuat riwayat transaksi')
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = [...transactions]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.order?.id?.toLowerCase().includes(query) ||
        t.order?.customer?.full_name?.toLowerCase().includes(query) ||
        t.id?.toLowerCase().includes(query)
      )
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(t => t.method === methodFilter)
    }

    setFilteredTransactions(filtered)
  }

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Order ID', 'Pelanggan', 'Metode', 'Jumlah', 'Status']
    const csvData = filteredTransactions.map(t => [
      formatDateTime(t.created_at),
      t.order?.id?.slice(0, 8) || '-',
      t.order?.customer?.full_name || 'Guest',
      t.method.toUpperCase(),
      t.amount,
      t.status
    ])

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${formatDate(new Date())}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Data transaksi berhasil diexport')
  }

  const dateFilters = [
    { id: 'today', label: 'Hari Ini' },
    { id: 'yesterday', label: 'Kemarin' },
    { id: 'week', label: '7 Hari' },
    { id: 'month', label: 'Bulan Ini' },
    { id: 'custom', label: 'Custom' }
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTransactions.length} transaksi ditemukan
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Transaksi', value: summary.totalTransactions, icon: ShoppingBag, color: 'from-blue-500 to-blue-600' },
          { label: 'Total Amount', value: formatCurrency(summary.totalAmount), icon: DollarSign, color: 'from-green-500 to-emerald-600' },
          { label: 'Cash', value: formatCurrency(summary.cashAmount), icon: Banknote, color: 'from-yellow-500 to-orange-600' },
          { label: 'QRIS', value: formatCurrency(summary.qrisAmount), icon: CreditCard, color: 'from-purple-500 to-pink-600' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{stat.value}</p>
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
        <div className="space-y-4">
          {/* Date Filters */}
          <div className="flex space-x-2 overflow-x-auto">
            {dateFilters.map(filter => (
              <button
                key={filter.id}
                onClick={() => {
                  setDateFilter(filter.id)
                  if (filter.id === 'custom') setShowDatePicker(true)
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  dateFilter === filter.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={customDate.start}
                onChange={(e) => setCustomDate({ ...customDate, start: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              <span className="text-gray-500">sampai</span>
              <input
                type="date"
                value={customDate.end}
                onChange={(e) => setCustomDate({ ...customDate, end: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          )}

          {/* Search & Method Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Cash</option>
              <option value="qris">QRIS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tidak Ada Transaksi</h2>
          <p className="text-gray-500">Transaksi akan muncul di sini</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Waktu</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Metode</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{formatDateTime(transaction.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-500">
                        #{transaction.order?.id?.slice(0, 8) || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.order?.customer?.full_name || 'Guest'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.method === 'cash'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {transaction.method === 'cash' ? (
                          <Banknote className="w-3 h-3 mr-1" />
                        ) : (
                          <CreditCard className="w-3 h-3 mr-1" />
                        )}
                        {transaction.method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status === 'completed' ? 'Lunas' :
                         transaction.status === 'pending' ? 'Pending' : 'Gagal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}