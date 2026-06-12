import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Download, Calendar, DollarSign, Banknote, CreditCard,
  ShoppingBag, RefreshCw, CheckCircle, XCircle, Clock, Eye
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime, formatDate } from '../../utils/format'
import { toast } from 'sonner'

export default function TransactionHistory() {
  const { profile } = useAuthStore()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    cashAmount: 0,
    qrisAmount: 0
  })
  const [showDetail, setShowDetail] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showProofModal, setShowProofModal] = useState(false)
  const [proofImage, setProofImage] = useState(null)

  useEffect(() => {
    loadTransactions()
  }, [dateFilter])

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

      // Ambil SEMUA payment dengan status COMPLETED
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          order:orders!order_id(
            id, total_amount, order_type, table_number,
            customer:profiles!customer_id(full_name)
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      const transactionsData = data || []
      setTransactions(transactionsData)

      // Hitung summary hanya untuk yang COMPLETED
      const completedTransactions = transactionsData.filter(t => t.status === 'completed')
      const cashTransactions = completedTransactions.filter(t => t.method === 'cash')
      const qrisTransactions = completedTransactions.filter(t => t.method === 'qris')

      setSummary({
        totalTransactions: completedTransactions.length,
        totalAmount: completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        cashAmount: cashTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        qrisAmount: qrisTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat riwayat transaksi')
    } finally {
      setLoading(false)
    }
  }

  // Filter di frontend
  const filteredTransactions = transactions.filter(t => {
    const matchSearch = !searchQuery || 
      t.order?.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.order?.customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchMethod = methodFilter === 'all' || t.method === methodFilter
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchMethod && matchStatus
  })

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Order ID', 'Pelanggan', 'Metode', 'Jumlah', 'Status']
    const rows = filteredTransactions.map(t => [
      formatDateTime(t.created_at),
      t.order?.id?.slice(0, 8) || '-',
      t.order?.customer?.full_name || 'Guest',
      t.method.toUpperCase(),
      t.amount,
      t.status === 'completed' ? 'SUKSES' : t.status
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transaksi-${formatDate(new Date())}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Data diexport!')
  }

  const handleViewDetail = (transaction) => {
    setSelectedTransaction(transaction)
    setShowDetail(true)
  }

  const dateFilters = [
    { id: 'today', label: 'Hari Ini' },
    { id: 'yesterday', label: 'Kemarin' },
    { id: 'week', label: '7 Hari' },
    { id: 'month', label: 'Bulan Ini' }
  ]

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Riwayat Transaksi</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {filteredTransactions.length} transaksi · {summary.totalTransactions} sukses
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={loadTransactions} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={handleExportCSV}
            className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-green-600">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Sukses', value: summary.totalTransactions, icon: ShoppingBag, color: 'from-blue-500 to-blue-600' },
          { label: 'Total Amount', value: formatCurrency(summary.totalAmount), icon: DollarSign, color: 'from-green-500 to-emerald-600' },
          { label: 'Cash', value: formatCurrency(summary.cashAmount), icon: Banknote, color: 'from-yellow-500 to-orange-600' },
          { label: 'QRIS', value: formatCurrency(summary.qrisAmount), icon: CreditCard, color: 'from-purple-500 to-pink-600' }
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border mb-4">
        {/* Date Filters */}
        <div className="flex space-x-1 overflow-x-auto mb-3 hide-scrollbar">
          {dateFilters.map(f => (
            <button key={f.id} onClick={() => setDateFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                dateFilter === f.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
              <Calendar className="w-3 h-3 inline mr-1" />{f.label}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Cari order ID atau pelanggan..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border text-xs sm:text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex space-x-2">
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border text-xs sm:text-sm">
              <option value="all">Semua Metode</option>
              <option value="cash">💵 Cash</option>
              <option value="qris">📱 QRIS</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border text-xs sm:text-sm">
              <option value="all">Semua Status</option>
              <option value="completed">✅ Sukses</option>
              <option value="pending">⏳ Pending</option>
              <option value="failed">❌ Gagal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-12 bg-white rounded-xl animate-pulse"></div>)}</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Tidak Ada Transaksi</h2>
          <p className="text-sm text-gray-500">Belum ada transaksi di periode ini</p>
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="sm:hidden space-y-2">
            {filteredTransactions.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-3 shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {t.method === 'cash' ? <Banknote className="w-4 h-4 text-green-500" /> : <CreditCard className="w-4 h-4 text-blue-500" />}
                    <span className="font-mono text-xs">#{t.order?.id?.slice(0,8) || '-'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.status === 'completed' ? 'bg-green-100 text-green-700' :
                    t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {t.status === 'completed' ? '✅ SUKSES' : 
                     t.status === 'pending' ? '⏳ PENDING' : '❌ GAGAL'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-gray-600">{t.order?.customer?.full_name || 'Guest'}</p>
                    <p className="text-gray-400">{formatDateTime(t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(t.amount)}</p>
                    <p className="text-gray-400">{t.method === 'cash' ? '💵 Cash' : '📱 QRIS'}</p>
                  </div>
                </div>
                {t.proof_url && (
                  <div className="mt-2 pt-2 border-t flex justify-end">
                    <button 
                      onClick={() => {
                        setProofImage(t.proof_url)
                        setShowProofModal(true)
                      }}
                      className="text-xs text-blue-600 font-medium flex items-center hover:underline"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Lihat Bukti
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Waktu</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pelanggan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Metode</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Jumlah</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600">{formatDateTime(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">#{t.order?.id?.slice(0,8) || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{t.order?.customer?.full_name || 'Guest'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.method === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {t.method === 'cash' ? '💵 Cash' : '📱 QRIS'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">{formatCurrency(t.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'completed' ? 'bg-green-100 text-green-700' :
                          t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {t.status === 'completed' ? '✅ SUKSES' : 
                           t.status === 'pending' ? '⏳ PENDING' : '❌ GAGAL'}
                        </span>
                        {t.proof_url && (
                          <button 
                            onClick={() => {
                              setProofImage(t.proof_url)
                              setShowProofModal(true)
                            }}
                            className="text-[10px] text-blue-600 hover:underline flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-0.5" /> Bukti
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Bukti */}
      {showProofModal && proofImage && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setShowProofModal(false)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowProofModal(false)} className="absolute -top-10 right-0 text-white font-medium hover:text-gray-300">✕ Tutup</button>
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              <h3 className="text-lg font-bold mb-3 text-center text-gray-900">📎 Bukti Pembayaran</h3>
              <div className="bg-gray-50 rounded-xl p-2">
                <img src={proofImage} alt="Bukti" className="w-full max-h-[70vh] object-contain rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}