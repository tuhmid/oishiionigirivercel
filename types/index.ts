export type PaymentMethod = 'cash' | 'check' | 'zelle' | 'square'
export type BatchStatus = 'pending' | 'delivered' | 'returned' | 'invoiced' | 'paid'
export type ConsumerOrderStatus = 'pending' | 'confirmed' | 'ready' | 'delivered' | 'cancelled'
export type OrderType = 'pickup' | 'delivery'
export type SendVia = 'email' | 'sms'

export interface Flavor {
  id: string
  name: string
  description: string | null
  image_url: string | null
  in_stock: boolean
  stock_count: number
  sort_order: number
  created_at: string
}

export interface Store {
  id: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  hours: Record<string, { open: string; close: string }> | null
  preferred_payment_method: PaymentMethod | null
  notes: string | null
  active: boolean
  delivery_days: string[]
  billable_name: string | null
  billable_address: string | null
  cert_authority_number: string | null
  resale_cert_url: string | null
  created_at: string
  contacts?: StoreContact[]
  allocations?: StoreFlavorAllocation[]
}

export interface StoreContact {
  id: string
  store_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  is_default: boolean
  created_at: string
}

export interface StoreFlavorAllocation {
  id: string
  store_id: string
  flavor_id: string
  default_qty: number
  flavor?: Flavor
}

export interface Batch {
  id: string
  store_id: string
  delivery_date: string
  return_date: string | null
  status: BatchStatus
  notes: string | null
  created_at: string
  store?: Store
  items?: BatchItem[]
  invoice?: Invoice
}

export interface BatchItem {
  id: string
  batch_id: string
  flavor_id: string
  qty_delivered: number
  qty_sold: number | null
  created_at: string
  flavor?: Flavor
}

export interface Invoice {
  id: string
  batch_id: string
  store_id: string
  amount_due: number
  amount_paid: number
  payment_method: PaymentMethod | null
  paid_at: string | null
  sent_via: SendVia | null
  sent_to_contact_id: string | null
  sent_at: string | null
  created_at: string
  store?: Store
  batch?: Batch
  sent_to_contact?: StoreContact
}

export interface ConsumerOrder {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  type: OrderType
  delivery_address: string | null
  status: ConsumerOrderStatus
  square_payment_id: string | null
  square_order_id: string | null
  total_amount: number | null
  notes: string | null
  created_at: string
  items?: ConsumerOrderItem[]
}

export interface ConsumerOrderItem {
  id: string
  order_id: string
  flavor_id: string
  quantity: number
  price_at_time: number
  flavor?: Flavor
}

export interface StoreOrderRequest {
  id: string
  store_name: string
  contact_name: string
  phone: string | null
  email: string | null
  message: string | null
  status: 'new' | 'reviewed' | 'approved' | 'rejected'
  created_at: string
}

export interface RoutePlan {
  id: string
  planned_date: string
  stops: RouteStop[]
  notes: string | null
  created_at: string
}

export interface RouteStop {
  store_id: string
  store_name: string
  address: string | null
  hours: Record<string, { open: string; close: string }> | null
  scheduled_time: string | null
  order_index: number
}
