import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  QrCode, Download, Printer, Copy, Check,
  Search, RefreshCw, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import QRCode from 'qrcode'

export default function CashierQRTable() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTables, setSelectedTables] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [qrCodes, setQrCodes] = useState({}) // Simpan QR data URL di memory
  const [generating, setGenerating] = useState({}) // Track generating status
  const [copiedTable, setCopiedTable] = useState(null)

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .order('table_number')

      const tablesData = data || []
      setTables(tablesData)

      // Auto-generate QR untuk meja yang belum punya
      tablesData.forEach(table => {
        if (!qrCodes[table.id]) {
          generateQRDataURL(table)
        }
      })
    } catch (error) {
      console.error('Error loading tables:', error)
      toast.error('Gagal memuat data meja')
    } finally {
      setLoading(false)
    }
  }

  // Generate QR code sebagai Data URL (disimpan di memory browser)
  const generateQRDataURL = async (table) => {
    if (qrCodes[table.id]) return // Sudah ada, skip
    
    setGenerating(prev => ({ ...prev, [table.id]: true }))
    
    try {
      const qrData = `${window.location.origin}/order?table=${table.table_number}`
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      
      setQrCodes(prev => ({ ...prev, [table.id]: dataUrl }))
    } catch (error) {
      console.error('Error generating QR:', error)
      toast.error(`Gagal membuat QR untuk meja ${table.table_number}`)
    } finally {
      setGenerating(prev => ({ ...prev, [table.id]: false }))
    }
  }

  // Generate semua QR
  const generateAllQR = async () => {
    toast.promise(
      Promise.all(tables.map(table => generateQRDataURL(table))),
      {
        loading: 'Membuat QR Code...',
        success: 'Semua QR Code berhasil dibuat!',
        error: 'Gagal membuat beberapa QR Code'
      }
    )
  }

  // Download QR sebagai file PNG
  const downloadQR = async (table) => {
    const qrDataUrl = qrCodes[table.id]
    if (!qrDataUrl) {
      toast.error('QR Code belum dibuat. Klik Generate dulu.')
      return
    }

    const link = document.createElement('a')
    link.download = `QR-Meja-${table.table_number}.png`
    link.href = qrDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`QR Meja ${table.table_number} didownload!`)
  }

  // Print QR individual
  const printQR = (table) => {
    const qrDataUrl = qrCodes[table.id]
    if (!qrDataUrl) {
      toast.error('QR Code belum dibuat')
      return
    }

    const printWindow = window.open('', '_blank', 'width=400,height=500')
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Meja ${table.table_number}</title>
          <style>
            * { margin: 0; padding: 0; }
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .container { text-align: center; }
            img { width: 250px; height: 250px; image-rendering: crisp-edges; }
            h2 { margin: 10px 0 5px; font-size: 18px; color: #333; }
            h3 { margin: 5px 0; font-size: 16px; color: #f97316; }
            p { color: #666; font-size: 12px; margin: 3px 0; }
            .link { font-size: 10px; color: #999; word-break: break-all; }
            @media print {
              body { margin: 0; padding: 10px; }
              .container { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🍜 WAROENG RCM KANG ABUY</h2>
            <p>Scan QR untuk order</p>
            <img src="${qrDataUrl}" alt="QR Meja ${table.table_number}" />
            <h3>Meja: ${table.table_number}</h3>
            <p>Kapasitas: ${table.capacity} orang</p>
            <p class="link">${window.location.origin}/order?table=${table.table_number}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Bulk print QR
  const bulkPrintQR = () => {
    if (selectedTables.length === 0) {
      toast.error('Pilih meja terlebih dahulu')
      return
    }

    const selectedData = tables.filter(t => selectedTables.includes(t.id) && qrCodes[t.id])
    
    if (selectedData.length === 0) {
      toast.error('QR Code belum dibuat untuk meja yang dipilih')
      return
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    
    const cardsHTML = selectedData.map(table => `
      <div class="card">
        <h3>WAROENG RCM</h3>
        <img src="${qrCodes[table.id]}" alt="QR" />
        <p class="table-num">Meja: ${table.table_number}</p>
        <p class="capacity">Kapasitas: ${table.capacity} orang</p>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Meja - Bulk Print</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 15px; }
            .header { text-align: center; margin-bottom: 20px; }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 15px; 
            }
            .card { 
              text-align: center; 
              padding: 10px; 
              border: 2px dashed #ddd; 
              border-radius: 10px; 
            }
            img { width: 130px; height: 130px; }
            .table-num { font-size: 14px; font-weight: bold; margin: 5px 0; color: #f97316; }
            .capacity { font-size: 11px; color: #666; }
            @media print {
              body { padding: 5px; }
              .grid { gap: 5px; }
              .card { page-break-inside: avoid; border-color: #ccc; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>🍜 WAROENG RCM KANG ABUY</h2>
            <p>QR Code Meja - ${new Date().toLocaleDateString('id-ID')}</p>
          </div>
          <div class="grid">${cardsHTML}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Copy link order
  const copyLink = async (table) => {
    const link = `${window.location.origin}/order?table=${table.table_number}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedTable(table.id)
      toast.success('Link order disalin!')
      setTimeout(() => setCopiedTable(null), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = link
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiedTable(table.id)
      toast.success('Link order disalin!')
      setTimeout(() => setCopiedTable(null), 2000)
    }
  }

  // Select handlers
  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([])
    } else {
      setSelectedTables(tables.map(t => t.id))
    }
  }

  const handleSelectTable = (tableId) => {
    setSelectedTables(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    )
  }

  const filteredTables = tables.filter(t =>
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">QR Meja</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Generate & cetak QR Code untuk setiap meja
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generateAllQR}
            className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-green-600 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Generate Semua
          </button>
          <button
            onClick={bulkPrintQR}
            disabled={selectedTables.length === 0}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print ({selectedTables.length})
          </button>
        </div>
      </div>

      {/* Search & Select All */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor meja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <label className="flex items-center space-x-2 cursor-pointer text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedTables.length === tables.length && tables.length > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 text-orange-500 rounded"
          />
          <span>Pilih Semua ({tables.length})</span>
        </label>
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-48 sm:h-56 bg-white rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="text-center py-12">
          <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Tidak ada meja ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredTables.map(table => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border-2 p-3 sm:p-4 transition-all ${
                selectedTables.includes(table.id)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              {/* Checkbox */}
              <div className="flex items-center justify-between mb-2">
                <input
                  type="checkbox"
                  checked={selectedTables.includes(table.id)}
                  onChange={() => handleSelectTable(table.id)}
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <span className="text-xs text-gray-500">
                  Kap: {table.capacity}
                </span>
              </div>

              {/* QR Code Display */}
              <div className="text-center mb-3">
                {qrCodes[table.id] ? (
                  <img
                    src={qrCodes[table.id]}
                    alt={`QR Meja ${table.table_number}`}
                    className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-lg border"
                  />
                ) : generating[table.id] ? (
                  <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                      <span className="text-xs text-gray-500">Generating...</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => generateQRDataURL(table)}
                    className="w-32 h-32 sm:w-36 sm:h-36 mx-auto bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <div className="text-center">
                      <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">Klik Generate</span>
                    </div>
                  </button>
                )}
                
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-2">
                  Meja {table.table_number}
                </h3>
              </div>

              {/* Action Buttons */}
              {qrCodes[table.id] && (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => downloadQR(table)}
                      className="py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 flex items-center justify-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </button>
                    <button
                      onClick={() => printQR(table)}
                      className="py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 flex items-center justify-center"
                    >
                      <Printer className="w-3 h-3 mr-1" />
                      Print
                    </button>
                  </div>
                  <button
                    onClick={() => copyLink(table)}
                    className={`w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                      copiedTable === table.id
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {copiedTable === table.id ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Salin Link
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside mt-1 text-xs space-y-1">
          <li>QR Code digenerate langsung di browser (tidak perlu upload)</li>
          <li>Klik <strong>Generate Semua</strong> untuk membuat QR semua meja sekaligus</li>
          <li>Centang meja lalu klik <strong>Print</strong> untuk cetak massal</li>
          <li>Gunakan <strong>Salin Link</strong> untuk share link order meja via WhatsApp</li>
        </ul>
      </div>
    </div>
  )
}