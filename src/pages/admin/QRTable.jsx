import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Download, Printer, Plus, Edit, Trash2, Copy, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import QRCode from 'qrcode'

export default function QRTable() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [selectedTables, setSelectedTables] = useState([])

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    const { data } = await supabase.from('tables').select('*').order('table_number')
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
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })

      // Convert data URL to blob
      const response = await fetch(qrCodeDataUrl)
      const blob = await response.blob()

      // Upload to storage
      const filePath = `qr-codes/table-${table.table_number}.png`
      const { error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('qr-codes')
        .getPublicUrl(filePath)

      // Update table with QR URL
      await supabase
        .from('tables')
        .update({ qr_code_url: publicUrl })
        .eq('id', table.id)

      toast.success(`QR Code untuk meja ${table.table_number} berhasil dibuat`)
      loadTables()
    } catch (error) {
      console.error('Error generating QR:', error)
      toast.error('Gagal membuat QR Code')
    } finally {
      setGenerating(null)
    }
  }

  const generateAllQR = async () => {
    for (const table of tables) {
      await generateQR(table)
    }
  }

  const downloadQR = async (table) => {
    if (!table.qr_code_url) {
      toast.error('QR Code belum dibuat')
      return
    }

    try {
      const response = await fetch(table.qr_code_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QR-Meja-${table.table_number}.png`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Gagal mendownload QR Code')
    }
  }

  const printQR = (table) => {
    if (!table.qr_code_url) {
      toast.error('QR Code belum dibuat')
      return
    }

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Meja ${table.table_number}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .container { text-align: center; padding: 20px; }
            img { width: 250px; height: 250px; }
            h2 { margin: 10px 0; color: #333; }
            p { color: #666; margin: 5px 0; }
            @media print {
              body { margin: 0; }
              .container { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>WAROENG RCM KANG ABUY</h2>
            <p>Scan untuk order</p>
            <img src="${table.qr_code_url}" alt="QR Meja ${table.table_number}" />
            <h3>Meja: ${table.table_number}</h3>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const bulkPrintQR = () => {
    if (selectedTables.length === 0) {
      toast.error('Pilih meja terlebih dahulu')
      return
    }

    const selectedData = tables.filter(t => selectedTables.includes(t.id) && t.qr_code_url)
    if (selectedData.length === 0) {
      toast.error('Tidak ada QR Code yang bisa dicetak')
      return
    }

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Meja - Bulk Print</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; }
            .grid { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 20px; 
              padding: 20px;
            }
            .container { 
              text-align: center; 
              padding: 15px; 
              border: 2px dashed #ccc;
              border-radius: 10px;
            }
            img { width: 150px; height: 150px; }
            h2 { margin: 5px 0; font-size: 14px; }
            p { font-size: 12px; color: #666; }
            @media print {
              .grid { gap: 10px; padding: 10px; }
              .container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${selectedData.map(table => `
              <div class="container">
                <h2>WAROENG RCM</h2>
                <img src="${table.qr_code_url}" alt="QR Meja ${table.table_number}" />
                <h3>Meja: ${table.table_number}</h3>
                <p>Scan untuk order</p>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([])
    } else {
      setSelectedTables(tables.map(t => t.id))
    }
  }

  const handleSelectTable = (tableId) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    )
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-2xl shimmer"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Meja</h1>
          <p className="text-sm text-gray-500 mt-1">Generate & manage QR codes untuk setiap meja</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={generateAllQR}
            disabled={generating}
            className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
          >
            Generate Semua QR
          </button>
          <button
            onClick={bulkPrintQR}
            disabled={selectedTables.length === 0}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4 inline mr-1" />
            Print Terpilih ({selectedTables.length})
          </button>
        </div>
      </div>

      {/* Select All */}
      <div className="mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedTables.length === tables.length}
            onChange={handleSelectAll}
            className="w-4 h-4 text-orange-500 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Pilih Semua</span>
        </label>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map(table => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl shadow-sm border-2 p-6 ${
              selectedTables.includes(table.id)
                ? 'border-orange-500'
                : 'border-gray-100'
            }`}
          >
            {/* Checkbox */}
            <div className="flex items-center justify-between mb-4">
              <input
                type="checkbox"
                checked={selectedTables.includes(table.id)}
                onChange={() => handleSelectTable(table.id)}
                className="w-4 h-4 text-orange-500 rounded"
              />
              <span className="text-sm font-medium text-gray-500">Meja {table.table_number}</span>
            </div>

            {/* QR Code */}
            <div className="text-center mb-4">
              {table.qr_code_url ? (
                <div className="relative">
                  <img
                    src={table.qr_code_url}
                    alt={`QR Meja ${table.table_number}`}
                    className="w-48 h-48 mx-auto rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {!table.qr_code_url ? (
                <button
                  onClick={() => generateQR(table)}
                  disabled={generating === table.id}
                  className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {generating === table.id ? 'Generating...' : 'Generate QR'}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadQR(table)}
                    className="py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => printQR(table)}
                    className="py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                  >
                    <Printer className="w-4 h-4 inline mr-1" />
                    Print
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}