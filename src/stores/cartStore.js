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
        const existingItem = items.find(i => i.id === item.id)
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          })
        } else {
          set({ items: [...items, { ...item, quantity: 1 }] })
        }
      },
      
      removeItem: (itemId) => {
        set({ items: get().items.filter(i => i.id !== itemId) })
      },
      
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId)
          return
        }
        
        set({
          items: get().items.map(i =>
            i.id === itemId ? { ...i, quantity } : i
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