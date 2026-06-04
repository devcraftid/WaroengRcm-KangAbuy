import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardList, DollarSign, Banknote, CreditCard, Calculator,
  Save, CheckCircle, AlertCircle, Printer
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
      const tomorrow = new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0]

      // Get today's payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', today)
        .lt('created_at', tomorrow)
        .eq('status', 'completed')

      if (paymentsError) {
        console.error('Payments error:', paymentsError)
        // Lanjutkan dengan data kosong
      }

      const paymentsData = payments || []
      const cashPayments = paymentsData.filter(p => p.method === 'cash')
      const qrisPayments = paymentsData.filter(p => p.method === 'qris')

      // Get today's orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today)
        .lt('created_at', tomorrow)

      if (ordersError) {
        console.error('Orders error:', ordersError)
      }

      const ordersData = orders || []

      // Get last closing (try-catch untuk handle error)
      let lastClosing = null
      try {
        const { data: closingResult } = await supabase
          .from('cashier_closings')
          .select('*')
          .eq('cashier_id', profile?.id)
          .order('closed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        lastClosing = closingResult
      } catch (err) {
        console.warn('Could not fetch last closing:', err.message)
      }

      setSummary({
        openingBalance: lastClosing?.closing_balance || 0,
        cashTransactions: cashPayments.length,
        qrisTransactions: qrisPayments.length,
        totalCash: cashPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        totalQRIS: qrisPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        totalRevenue: paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0),
        orderCount: ordersData.length,
        completedOrders: ordersData.filter(o => o.status === 'completed').length,
        cancelledOrders: ordersData.filter(o => o.status === 'cancelled').length
      })

      // Get previous closings
      try {
        const { data: closingsResult } = await supabase
          .from('cashier_closings')
          .select('*')
          .eq('cashier_id', profile?.id)
          .order('closed_at', { ascending: false })
          .limit(10)

        setPreviousClosings(closingsResult || [])
      } catch (err) {
        console.warn('Could not fetch closings:', err.message)
        setPreviousClosings([])
      }
    } catch (error) {
      console.error('Error loading closing data:', error)
      toast.error('Gagal memuat data closing')
    } finally {
      setLoading(false)
    }
  }

  const calculateDiscrepancy = (actualCash) => {
    const expectedCash = summary.totalCash + summary.openingBalance
    const diff = parseFloat(actualCash || 0) - expectedCash
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
          notes: closingData.notes,
          closed_at: new Date().toISOString()
        })

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      // Log activity
      await supabase.from('activities').insert({
        user_id: profile?.id,
        description: `Closing kasir - Revenue: ${formatCurrency(summary.totalRevenue)}`,
        type: 'cashier_closing'
      })

      toast.success('Closing kasir berhasil!')
      
      // Print
      window.print()
      
      // Reload
      loadClosingData()
      setClosingData({ actualCash: '', notes: '' })
    } catch (error) {
      console.error('Error closing:', error)
      toast.error('Gagal melakukan closing: ' + error.message)
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Closing Kasir</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => window.print()} className="no-print px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center">
          <Printer className="w-4 h-4 mr-1" />Print
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Saldo Awal', value: summary.openingBalance, icon: Calculator, color: 'from-gray-500 to-gray-600' },
          { label: 'Cash', value: summary.totalCash, icon: Banknote, color: 'from-green-500 to-emerald-600' },
          { label: 'QRIS', value: summary.totalQRIS, icon: CreditCard, color: 'from-blue-500 to-indigo-600' },
          { label: 'Total Revenue', value: summary.totalRevenue, icon: DollarSign, color: 'from-orange-500 to-red-600' }
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{item.label}</span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <item.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>
            <p className="text-base sm:text-xl font-bold text-gray-900">{formatCurrency(item.value)}</p>
          </motion.div>
        ))}
      </div>

      {/* Order Stats */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Ringkasan Order Hari Ini</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{summary.orderCount}</p>
            <p className="text-xs text-gray-500 mt-1">Total Order</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{summary.completedOrders}</p>
            <p className="text-xs text-gray-500 mt-1">Selesai</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-xl sm:text-2xl font-bold text-red-600">{summary.cancelledOrders}</p>
            <p className="text-xs text-gray-500 mt-1">Dibatalkan</p>
          </div>
        </div>
      </div>

      {/* Closing Form */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 no-print">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Form Closing</h3>
        
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Expected: {formatCurrency(summary.totalCash + summary.openingBalance)}
            </p>
          </div>

          {closingData.actualCash && (
            <div className={`p-3 sm:p-4 rounded-xl ${discrepancy === 0 ? 'bg-green-50' : discrepancy > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <div className="flex items-center">
                {discrepancy === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {discrepancy === 0
                      ? 'Kas sesuai (balance) ✅'
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
              rows="2"
              placeholder="Tambahkan catatan (opsional)..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>

          <button
            onClick={handleClosing}
            disabled={closing || !closingData.actualCash}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base"
          >
            {closing ? 'Memproses...' : 'Proses Closing'}
          </button>
        </div>
      </div>

      {/* Previous Closings */}
      {previousClosings.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 no-print">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Riwayat Closing</h3>
          <div className="space-y-2">
            {previousClosings.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{formatDateTime(item.closed_at)}</p>
                  <p className="text-xs text-gray-500">
                    Cash: {formatCurrency(item.closing_balance)} | QRIS: {item.qris_transactions} transaksi
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(item.total_revenue)}</p>
                  {item.discrepancy !== 0 && (
                    <p className={`text-xs ${item.discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.discrepancy > 0 ? '+' : ''}{formatCurrency(item.discrepancy)}
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