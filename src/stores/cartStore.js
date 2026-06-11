import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      orderType: 'dine_in', // dine_in, takeaway_waiting, takeaway_pickup
      
      setTableId: (tableId) => set({ tableId }),
      
      setOrderType: (orderType) => set({ orderType }),
      
      addItem: (item) => {
        const items = get().items
        // Generate a cartItemId based on the original id and a safe note string
        const safeNote = (item.note || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        const cartItemId = item.cartItemId || `${item.id}-${safeNote}`
        
        const existingItemIndex = items.findIndex(i => i.cartItemId === cartItemId)
        
        if (existingItemIndex >= 0) {
          const newItems = [...items]
          newItems[existingItemIndex].quantity += item.quantity || 1
          set({ items: newItems })
        } else {
          set({ items: [...items, { ...item, cartItemId, quantity: item.quantity || 1 }] })
        }
      },
      
      removeItem: (cartItemId) => {
        set({ items: get().items.filter(i => i.cartItemId !== cartItemId) })
      },
      
      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        
        set({
          items: get().items.map(i =>
            i.cartItemId === cartItemId ? { ...i, quantity } : i
          )
        })
      },
      
      clearCart: () => set({ items: [], tableId: null, orderType: 'dine_in' }),
      
      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      }
    }),
    {
      name: 'cart-storage'
    }
  )
)

export default useCartStore