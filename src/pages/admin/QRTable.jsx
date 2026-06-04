import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  QrCode, Download, Printer, Plus, Edit, Trash2, Copy, Check,
  Search, RefreshCw, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import QRCode from 'qrcode'

export default function QRTable() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTables, setSelectedTables] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [qrCodes, setQrCodes] = useState({}) // Simpan QR code data URL di state
  const canvasRef = useRef(null)

  const [form, setForm] = useState({
    table_number: '',
    capacity: 4
  })

  useEffect(() => { loadTables() }, [])

  const loadTables = async () => {
    try {
      const { data } = await supabase.from('tables').select('*').order('table_number')
      setTables(data || [])
      
      // Generate QR codes untuk semua meja
      if (data) {
        data.forEach(table => generateQRDataURL(table))
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Gagal memuat data meja')
    } finally {
      setLoading(false)
    }
  }

  // Generate QR code sebagai data URL (disimpan di memory, tidak upload)
  const generateQRDataURL = async (table) => {
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
      
      // Update tabel dengan URL QR (simpan data URL atau biarkan null)
      if (!table.qr_code_url) {
        await supabase.from('tables').update({ qr_code_url: dataUrl }).eq('id', table.id)
      }
    } catch (error) {
      console.error('Error generating QR:', error)
    }
  }

  // Generate QR untuk semua meja
  const generateAllQR = async () => {
    for (const table of tables) {
      await generateQRDataURL(table)
    }
    toast.success('Semua QR Code berhasil dibuat!')
  }

  // Download QR sebagai PNG
  const downloadQR = async (table) => {
    const qrDataUrl = qrCodes[table.id]
    if (!qrDataUrl) {
      toast.error('QR Code belum dibuat')
      return
    }

    const link = document.createElement('a')
    link.download = `QR-Meja-${table.table_number}.png`
    link.href = qrDataUrl
    link.click()
    toast.success('QR Code didownload!')
  }

  // Print QR
  const printQR = (table) => {
    const qrDataUrl = qrCodes[table.id]
    if (!qrDataUrl) {
      toast.error('QR Code belum dibuat')
      return
    }

    const printWindow = window.open('', '_blank', 'width=400,height=500')
    printWindow.document.write(`
      <html>
        <head><title>QR Meja ${table.table_number}</title>
        <style>
          body { text-align:center; padding:20px; font-family:Arial; }
          img { width:250px; height:250px; }
          h2 { margin:10px 0; } p { color:#666; }
          @media print { body { margin:0; } }
        </style></head>
        <body>
          <h2>WAROENG RCM KANG ABUY</h2>
          <p>Scan untuk order</p>
          <img src="${qrDataUrl}" alt="QR Meja ${table.table_number}" />
          <h3>Meja: ${table.table_number}</h3>
          <p>${window.location.origin}/order?table=${table.table_number}</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Bulk Print
  const bulkPrintQR = () => {
    if (selectedTables.length === 0) {
      toast.error('Pilih meja terlebih dahulu')
      return
    }

    const selectedData = tables.filter(t => selectedTables.includes(t.id))
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    const tablesHTML = selectedData.map(table => {
      const qrDataUrl = qrCodes[table.id]
      if (!qrDataUrl) return ''
      return `
        <div class="card">
          <h3>WAROENG RCM</h3>
          <img src="${qrDataUrl}" alt="QR" />
          <p class="table-num">Meja: ${table.table_number}</p>
          <p class="link">${window.location.origin}/order?table=${table.table_number}</p>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <html>
        <head><title>QR Meja - Bulk Print</title>
        <style>
          body { font-family:Arial; padding:10px; }
          .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:15px; }
          .card { text-align:center; padding:10px; border:1px dashed #ccc; border-radius:8px; }
          img { width:120px; height:120px; }
          .table-num { font-size:14px; font-weight:bold; margin:5px 0; }
          .link { font-size:10px; color:#666; word-break:break-all; }
          @media print { .grid { gap:5px; } .card { page-break-inside:avoid; } }
        </style></head>
        <body>
          <h2 style="text-align:center">QR Code Meja</h2>
          <div class="grid">${tablesHTML}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Copy link
  const copyLink = async (table) => {
    const link = `${window.location.origin}/order?table=${table.table_number}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link disalin!')
    } catch {
      toast.error('Gagal menyalin link')
    }
  }

  // Handle select
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

  // Modal handlers
  const handleOpenModal = (table = null) => {
    if (table) {
      setEditingTable(table)
      setForm({ table_number: table.table_number, capacity: table.capacity })
    } else {
      setEditingTable(null)
      const nextNumber = String(tables.length + 1).padStart(2, '0')
      setForm({ table_number: `T${nextNumber}`, capacity: 4 })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTable) {
        await supabase.from('tables').update(form).eq('id', editingTable.id)
        toast.success('Meja diupdate')
      } else {
        await supabase.from('tables').insert(form)
        toast.success('Meja ditambahkan')
      }
      setShowModal(false)
      loadTables()
    } catch (error) {
      toast.error('Gagal menyimpan meja')
    }
  }

  const handleDelete = async (tableId) => {
    if (!window.confirm('Hapus meja ini?')) return
    try {
      await supabase.from('tables').delete().eq('id', tableId)
      toast.success('Meja dihapus')
      loadTables()
    } catch (error) {
      toast.error('Gagal menghapus meja')
    }
  }

  const filteredTables = tables.filter(t =>
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">QR Meja</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Generate & download QR Code untuk setiap meja</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={generateAllQR}
            className="px-3 py-2 bg-green-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-green-600 flex items-center">
            <RefreshCw className="w-4 h-4 mr-1" />Generate Semua
          </button>
          <button onClick={bulkPrintQR} disabled={selectedTables.length === 0}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center">
            <Printer className="w-4 h-4 mr-1" />Print ({selectedTables.length})
          </button>
          <button onClick={() => handleOpenModal()}
            className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-600 flex items-center">
            <Plus className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Tambah</span>
          </button>
        </div>
      </div>

      {/* Search & Select All */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Cari meja..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
        </div>
        <label className="flex items-center space-x-2 cursor-pointer text-sm">
          <input type="checkbox" checked={selectedTables.length === tables.length && tables.length > 0}
            onChange={handleSelectAll} className="w-4 h-4 text-orange-500 rounded" />
          <span>Pilih Semua</span>
        </label>
      </div>

      {/* QR Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredTables.map(table => (
            <motion.div key={table.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border-2 p-3 sm:p-4 ${
                selectedTables.includes(table.id) ? 'border-orange-500' : 'border-gray-100'
              }`}>
              
              {/* Checkbox */}
              <div className="flex items-center justify-between mb-2">
                <input type="checkbox" checked={selectedTables.includes(table.id)}
                  onChange={() => handleSelectTable(table.id)}
                  className="w-4 h-4 text-orange-500 rounded" />
                <div className="flex space-x-1">
                  <button onClick={() => handleOpenModal(table)} className="p-1 text-blue-500 hover:bg-blue-50 rounded">
                    <Edit className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(table.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-3">
                {qrCodes[table.id] ? (
                  <img src={qrCodes[table.id]} alt={`QR ${table.table_number}`}
                    className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-lg" />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto bg-gray-100 rounded-lg flex items-center justify-center"
                    onClick={() => generateQRDataURL(table)}>
                    <div className="text-center cursor-pointer hover:bg-gray-200 p-3 rounded-lg transition-colors">
                      <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">Klik untuk generate</span>
                    </div>
                  </div>
                )}
                <h3 className="text-sm font-bold text-gray-900 mt-2">Meja {table.table_number}</h3>
                <p className="text-xs text-gray-500">Kapasitas: {table.capacity} orang</p>
              </div>

              {/* Actions */}
              {qrCodes[table.id] && (
                <div className="grid grid-cols-2 gap-1">
                  <button onClick={() => downloadQR(table)}
                    className="py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 flex items-center justify-center">
                    <Download className="w-3 h-3 mr-1" />Download
                  </button>
                  <button onClick={() => printQR(table)}
                    className="py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 flex items-center justify-center">
                    <Printer className="w-3 h-3 mr-1" />Print
                  </button>
                  <button onClick={() => copyLink(table)}
                    className="col-span-2 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 flex items-center justify-center">
                    <Copy className="w-3 h-3 mr-1" />Salin Link
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingTable ? 'Edit Meja' : 'Tambah Meja'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nomor Meja</label>
                <input type="text" value={form.table_number} onChange={e => setForm({...form, table_number: e.target.value})}
                  required className="w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kapasitas</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value) || 4})}
                  min="1" className="w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 rounded-xl font-semibold text-sm">Batal</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-semibold text-sm">
                  {editingTable ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}