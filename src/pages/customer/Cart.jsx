import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, Trash2, UtensilsCrossed, ArrowLeft } from 'lucide-react'
import useCartStore from '../../stores/cartStore'
import { formatCurrency } from '../../utils/format'

const PRIMARY = '#f05a28'

export default function Cart() {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore()
  const navigate = useNavigate()
  const total = getTotal()

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 bg-white">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5">
          <ShoppingCart className="w-9 h-9" style={{ color: PRIMARY }} />
        </div>
        <h2 className="font-bold text-gray-900 text-base mb-1">Keranjang Kosong</h2>
        <p className="text-xs text-gray-400 text-center mb-6">Yuk tambahkan menu favorit kamu!</p>
        <Link to="/menu"
          className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold"
          style={{ background: PRIMARY }}>
          Lihat Menu
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── SUB-HEADER ─── */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
        <div className="flex items-center justify-between px-4 py-2.5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <p className="font-bold text-gray-900 text-sm">Keranjang ({items.length} item)</p>
          <button onClick={clearCart}
            className="text-xs font-medium hover:opacity-70" style={{ color: PRIMARY }}>
            Hapus
          </button>
        </div>
      </div>

      {/* ─── ITEMS ─── */}
      <div className="px-3 pt-3 pb-44 space-y-2">
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.cartItemId || item.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
              <div className="flex items-center gap-3 p-3">
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</p>
                  {item.note && (
                    <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md inline-block mt-1">📝 {item.note}</p>
                  )}
                  <p className="text-xs font-medium mt-0.5" style={{ color: PRIMARY }}>
                    {formatCurrency(item.price)}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    {/* Qty counter */}
                    <div className="flex items-center rounded-lg overflow-hidden border" style={{ borderColor: PRIMARY }}>
                      <button
                        onClick={() => item.quantity <= 1 ? removeItem(item.cartItemId || item.id) : updateQuantity(item.cartItemId || item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-orange-50 transition-colors"
                        style={{ color: PRIMARY }}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 text-sm font-semibold" style={{ color: PRIMARY }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-orange-50 transition-colors"
                        style={{ color: PRIMARY }}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                      <button onClick={() => removeItem(item.cartItemId || item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add more */}
        <Link to="/menu"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border-2 border-dashed
                     text-sm font-medium transition-colors hover:bg-orange-50"
          style={{ borderColor: '#ffd0bc', color: PRIMARY }}>
          <Plus className="w-4 h-4" />
          Tambah menu lagi
        </Link>
      </div>

      {/* ─── BOTTOM CHECKOUT BAR ─── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-app bg-white border-t border-gray-100"
           style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}>
        {/* Summary */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item)</span>
            <span className="font-medium text-gray-600">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-base font-bold" style={{ color: PRIMARY }}>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pt-2 pb-4">
          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: PRIMARY }}>
            <ShoppingCart className="w-4 h-4" />
            CHECKOUT — {formatCurrency(total)}
          </button>
        </div>
      </div>
    </div>
  )
}