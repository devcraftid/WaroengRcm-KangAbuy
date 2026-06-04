import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardList,
  DollarSign,
  Banknote,
  CreditCard,
  Calculator,
  Save,
  CheckCircle,
  AlertCircle,
  Download,
  Printer
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../stores/authStore'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { toast } from 'sonner'

export default function CashierClosing() {
  const { profile } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [summary, setSummary] = useState({
    openingBalance: 0,
    cashTransactions: 0,
    qrisTransactions: 0,
    totalCash: 0,
    totalQRIS: 0,
    totalRevenue: 0,
    orderCount: 0,
    completedOrders: 0,
    cancelledOrders: 0
  })
  const [closingData, setClosingData] = useState({
    actualCash: '',
    notes: ''
  })
  const [previousClosings, setPreviousClosings] = useState([])
  const [discrepancy, setDiscrepancy] = useState(0)

  useEffect(() => {
    loadClosingData()
  }, [])

  const loadClosingData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get today's payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', today)
        .eq('status', 'completed')

      const paymentsData = payments || []
      const cashPayments = paymentsData.filter(p => p.method === 'cash')
      const qrisPayments = paymentsData.filter(p => p.method === 'qris')

      // Get today's orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today)

      const ordersData = orders || []

      // Get last closing
      const { data: lastClosing } = await supabase
        .from('cashier_closings')
        .select('*')
        .eq('cashier_id', profile?.id)
        .order('closed_at', { ascending: false })
        .limit(1)
        .single()

      setSummary({
        openingBalance: lastClosing?.closing_balance || 0,
        cashTransactions: cashPayments.length,
        qrisTransactions: qrisPayments.length,
        totalCash: cashPayments.reduce((sum, p) => sum + p.amount, 0),
        totalQRIS: qrisPayments.reduce((sum, p) => sum + p.amount, 0),
        totalRevenue: paymentsData.reduce((sum, p) => sum + p.amount, 0),
        orderCount: ordersData.length,
        completedOrders: ordersData.filter(o => o.status === 'completed').length,
        cancelledOrders: ordersData.filter(o => o.status === 'cancelled').length
      })

      // Get previous closings      const { data: closings } = await supabase
        .from('cashier_closings')
        .select('*')
        .eq('cashier_id', profile?.id)
        .order('closed_at', { ascending: false })
        .limit(10)

      setPreviousClosings(closings || [])
    } catch (error) {
      console.error('Error loading closing data:', error)
      toast.error('Gagal memuat data closing')
    } finally {
      setLoading(false)
    }
  }

  const calculateDiscrepancy = (actualCash) => {
    const expectedCash = summary.totalCash + summary.openingBalance
    const diff = parseFloat(actualCash) - expectedCash
    setDiscrepancy(diff)
    setClosingData({ ...closingData, actualCash })
  }

  const handleClosing = async () => {
    if (!closingData.actualCash) {
      toast.error('Masukkan jumlah kas aktual')
      return
    }

    setClosing(true)
    try {
      const expectedCash = summary.totalCash + summary.openingBalance
      const actualCash = parseFloat(closingData.actualCash)
      const diff = actualCash - expectedCash

      const { error } = await supabase
        .from('cashier_closings')
        .insert({
          cashier_id: profile?.id,
          opening_balance: summary.openingBalance,
          closing_balance: actualCash,
          cash_transactions: summary.cashTransactions,
          qris_transactions: summary.qrisTransactions,
          total_revenue: summary.totalRevenue,
          discrepancy: diff,
          notes: closingData.notes
        })

      if (error) throw error

      toast.success('Closing kasir berhasil!')
      
      // Print closing report
      window.print()
      
      // Reload data
      loadClosingData()
      setClosingData({ actualCash: '', notes: '' })
    } catch (error) {
      console.error('Error closing:', error)
      toast.error('Gagal melakukan closing')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Closing Kasir</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 no-print"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Saldo Awal', value: summary.openingBalance, icon: Calculator, color: 'from-gray-500 to-gray-600' },
          { label: 'Cash', value: summary.totalCash, icon: Banknote, color: 'from-green-500 to-emerald-600' },
          { label: 'QRIS', value: summary.totalQRIS, icon: CreditCard, color: 'from-blue-500 to-indigo-600' },
          { label: 'Total Revenue', value: summary.totalRevenue, icon: DollarSign, color: 'from-orange-500 to-red-600' }
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{item.label}</span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(item.value)}</p>
          </motion.div>
        ))}
      </div>

      {/* Order Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Order Hari Ini</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{summary.orderCount}</p>
            <p className="text-xs text-gray-500 mt-1">Total Order</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{summary.completedOrders}</p>
            <p className="text-xs text-gray-500 mt-1">Selesai</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{summary.cancelledOrders}</p>
            <p className="text-xs text-gray-500 mt-1">Dibatalkan</p>
          </div>
        </div>
      </div>

      {/* Closing Form */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 no-print">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Closing</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah Kas Aktual *
            </label>
            <input
              type="number"
              value={closingData.actualCash}
              onChange={(e) => calculateDiscrepancy(e.target.value)}
              placeholder="Masukkan jumlah uang di laci"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Expected: {formatCurrency(summary.totalCash + summary.openingBalance)}
            </p>
          </div>

          {closingData.actualCash && (
            <div className={`p-4 rounded-xl ${
              discrepancy === 0 ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <div className="flex items-center">
                {discrepancy === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {discrepancy === 0
                      ? 'Kas sesuai (balance)'
                      : discrepancy > 0
                        ? `Kelebihan: ${formatCurrency(discrepancy)}`
                        : `Kekurangan: ${formatCurrency(Math.abs(discrepancy))}`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={closingData.notes}
              onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
              rows="3"
              placeholder="Tambahkan catatan jika ada..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            onClick={handleClosing}
            disabled={closing || !closingData.actualCash}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {closing ? 'Memproses...' : 'Proses Closing'}
          </button>
        </div>
      </div>

      {/* Previous Closings */}
      {previousClosings.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 no-print">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Closing</h3>
          <div className="space-y-3">
            {previousClosings.slice(0, 5).map((closing) => (
              <div key={closing.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateTime(closing.closed_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Cash: {formatCurrency(closing.closing_balance)} | 
                    QRIS: {formatCurrency(closing.qris_transactions > 0 ? closing.total_revenue - closing.closing_balance + closing.opening_balance : 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(closing.total_revenue)}
                  </p>
                  {closing.discrepancy !== 0 && (
                    <p className={`text-xs ${closing.discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {closing.discrepancy > 0 ? '+' : ''}{formatCurrency(closing.discrepancy)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}