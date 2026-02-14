'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { CartItem } from '@/types'
import { usePWADiscountContext } from './pwa-discount-context'

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
  discountAmount: number
  finalTotal: number
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }
  | { type: 'APPLY_DISCOUNT'; payload: { discountAmount: number; finalTotal: number } }

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  discountAmount: 0,
  finalTotal: 0,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id)
      
      let newItems: CartItem[]
      if (existingItem) {
        newItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }]
      }
      
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
      
      return { 
        items: newItems, 
        total, 
        itemCount, 
        discountAmount: state.discountAmount,
        finalTotal: total - state.discountAmount
      }
    }
    
    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload)
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
      
      return { 
        items: newItems, 
        total, 
        itemCount, 
        discountAmount: state.discountAmount,
        finalTotal: total - state.discountAmount
      }
    }
    
    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(0, action.payload.quantity) }
          : item
      ).filter(item => item.quantity > 0)
      
      const total = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)
      
      return { 
        items: newItems, 
        total, 
        itemCount, 
        discountAmount: state.discountAmount,
        finalTotal: total - state.discountAmount
      }
    }
    
    case 'CLEAR_CART':
      return initialState
    
    case 'LOAD_CART': {
      const total = action.payload.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const itemCount = action.payload.reduce((sum, item) => sum + item.quantity, 0)
      const discountAmount = state.discountAmount || 0
      
      return { 
        items: action.payload, 
        total, 
        itemCount, 
        discountAmount,
        finalTotal: total - discountAmount
      }
    }
    
    case 'APPLY_DISCOUNT': {
      return {
        ...state,
        discountAmount: action.payload.discountAmount,
        finalTotal: action.payload.finalTotal
      }
    }
    
    default:
      return state
  }
}

interface CartContextType extends CartState {
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { isEligible, calculateDiscount } = usePWADiscountContext()

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('at-restaurant-cart')
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: cartItems })
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('at-restaurant-cart', JSON.stringify(state.items))
  }, [state.items])

  // Apply PWA discount whenever cart total or eligibility changes
  useEffect(() => {
    if (state.total > 0) {
      const discount = calculateDiscount(state.total)
      dispatch({ 
        type: 'APPLY_DISCOUNT', 
        payload: { 
          discountAmount: discount.discountAmount,
          finalTotal: discount.finalAmount
        }
      })
    }
  }, [state.total, isEligible, calculateDiscount])

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}