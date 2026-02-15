export interface Category {
  id: string
  name: string
  description: string | null
  emoji: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  sort_order: number
  created_at: string
  category?: Category
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
}

export interface Order {
  id: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
  // Location fields
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_address?: string | null
  location_method?: 'gps' | 'manual' | 'none' | null
  location_accuracy?: number | null
  location_timestamp?: string | null
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  menu_item?: MenuItem
}

export interface OrderStatusLog {
  id: string
  order_id: string
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  notes: string | null
  created_at: string
}