import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Download, Printer, Search, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import QRCode from 'qrcode'

export default function CashierQRTable() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedTable, setCopiedTable] = useState(null)

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .order('table_number')
    
    setTables(data || [])
    setLoading(false)
  }

  const generateQR = async (table) => {
    setGenerating(table.id)
    try {
      const qrData = `${window.location.origin}/order?table=${table.table_number}`
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })

      const response = await fetch(qrCodeDataUrl)
      const blob = await response.blob()
      
      const filePath = `qr-codes/table-${table.table_number}.png`
      await supabase.storage.from('qr-codes').upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true
      })

      const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(filePath)
      
      await supabase.from('tables').update({ qr_code_url: publicUrl }).eq('id', table.id)
      
      toast.success(`QR Meja ${table.table_number} dibuat`)
      loadTables()
    } catch (error) {
      console.error('Error generating QR:', error)
      toast.error('Gagal membuat QR')
    } finally {
      setGenerating(null)
    }
  }

  const generateAllQR = async () => {
    for (const table of tables) {
      if (!table.qr_code_url) {
        await generateQR(table)
      }
    }
  }

  const downloadQR = async (table) => {
    if (!table.qr_code_url) {
      toast.error('QR belum dibuat')
      return
    }
    const response = await fetch(table.qr_code_url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QR-Meja-${table.table_number}.png`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const printQR = (table) => {
    if (!table.qr_code_url) {
      toast.error('QR belum dibuat')
      return
    }
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Meja ${table.table_number}</title>
          <style>
            body { text-align: center; padding: 20px; font-family: Arial; }
            img { width: 250px; height: 250px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h2>WAROENG RCM</h2>
          <img src="${table.qr_code_url}" alt="QR" />
          <h3>Meja: ${table.table_number}</h3>
          <p>Scan untuk order</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const copyLink = async (table) => {
    const link = `${window.location.origin}/order?table=${table.table_number}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedTable(table.id)
      toast.success('Link disalin')
      setTimeout(() => setCopiedTable(null), 2000)
    } catch {
      toast.error('Gagal menyalin link')
    }
  }

  const filteredTables = tables.filter(t => 
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Meja</h1>
          <p className="text-sm text-gray-500 mt-1">Generate & manage QR codes</p>
        </div>
        <button
          onClick={generateAllQR}
          disabled={generating}
          className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:opacity-50"
        >
          Generate Semua
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor meja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTables.map(table => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Meja {table.table_number}
              </h3>

              {table.qr_code_url ? (
                <>
                  <img
                    src={table.qr_code_url}
                    alt={`QR Meja ${table.table_number}`}
                    className="w-48 h-48 mx-auto rounded-lg mb-4"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadQR(table)}
                      className="py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
                    >
                      <Download className="w-4 h-4 inline mr-1" />
                      Download
                    </button>
                    <button
                      onClick={() => printQR(table)}
                      className="py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100"
                    >
                      <Printer className="w-4 h-4 inline mr-1" />
                      Print
                    </button>
                  </div>
                  <button
                    onClick={() => copyLink(table)}
                    className="w-full mt-2 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    {copiedTable === table.id ? (
                      <><Check className="w-4 h-4 inline mr-1" /> Tersalin</>
                    ) : (
                      <><Copy className="w-4 h-4 inline mr-1" /> Salin Link</>
                    )}
                  </button>
                </>
              ) : (
                <div className="mb-4">
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-300" />
                  </div>
                  <button
                    onClick={() => generateQR(table)}
                    disabled={generating === table.id}
                    className="mt-4 w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                  >
                    {generating === table.id ? 'Generating...' : 'Generate QR'}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}