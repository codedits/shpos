export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
export type PaymentMethod = 'Cash' | 'Bank' | 'Other';
export type RegisterSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_SALE' | 'CUSTOMER_PAYMENT' | 'EXPENSE' | 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAWAL';

export interface Product {
  id: string;
  product_code: string;
  name: string;
  size?: string | null;
  color?: string | null;
  stock_quantity: number;
  lot_cost: number;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  // Computed property
  unit_cost?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
  // Derived properties from ledger
  total_billed?: number;
  total_paid?: number;
  total_outstanding?: number;
  total_orders_count?: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_code_snapshot: string;
  product_name_snapshot: string;
  size_snapshot?: string | null;
  color_snapshot?: string | null;
  quantity: number;
  selling_price_per_unit: number;
  line_total: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface OrderPaymentRecord {
  id?: string;
  payment_id: string;
  amount_allocated: number;
  payment_date: string;
  payment_method: PaymentMethod;
  note?: string | null;
}

export interface Order {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  order_date: string;
  subtotal: number;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  notes?: string | null;
  items?: OrderItem[];
  payments_history?: OrderPaymentRecord[];
  idempotency_key?: string | null;
  is_voided?: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
  voided_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  order_id: string;
  invoice_number?: string;
  amount_allocated: number;
  created_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  note?: string | null;
  allocations?: PaymentAllocation[];
  idempotency_key?: string | null;
  is_voided?: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
  voided_by?: string | null;
  created_at: string;
}

export interface BusinessSettings {
  business_name: string;
  phone: string;
  email?: string | null;
  address: string;
  tax_rate_percent?: number;
  currency_symbol: string;
  cashier_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface RegisterSession {
  id: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  closing_cash_actual?: number | null;
  expected_cash: number;
  cash_sales_total: number;
  cash_payments_total: number;
  cash_expenses_total: number;
  difference?: number | null;
  status: RegisterSessionStatus;
  opened_by?: string | null;
  closed_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterCashMovement {
  id: string;
  session_id: string;
  movement_type: CashMovementType;
  amount: number;
  reference_id?: string | null;
  note?: string | null;
  created_at: string;
}

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  selling_price_per_unit: number;
}

export interface CreateOrderInput {
  customer_id: string;
  items: CreateOrderItemInput[];
  amount_paid: number;
  payment_method: PaymentMethod;
  notes?: string;
  order_date?: string;
  idempotency_key?: string;
}

export interface RecordPaymentInput {
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  order_id?: string;
  note?: string;
  payment_date?: string;
  idempotency_key?: string;
}
