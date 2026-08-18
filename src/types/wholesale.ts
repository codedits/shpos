export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
export type PaymentMethod = 'Cash' | 'Bank' | 'Other';
export type RegisterSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_SALE' | 'CUSTOMER_PAYMENT' | 'EXPENSE' | 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAWAL';

export type FixedSize = 'Small' | 'Medium' | 'Large' | 'Standard' | 'XL';
export const FIXED_SIZES: FixedSize[] = ['Small', 'Medium', 'Large', 'Standard', 'XL'];

export interface ProductVariant {
  id: string;
  product_id: string;
  color: string;
  size: FixedSize;
  stock_quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface VariantMatrixRow {
  color: string;
  sizes: Record<FixedSize, number>;
}

export interface Product {
  id: string;
  product_code: string;
  name: string;
  size?: string | null;
  color?: string | null;
  stock_quantity: number;
  lot_cost: number;
  unit_cost: number;
  selling_price: number;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  // Variant relationships & computed properties
  variants?: ProductVariant[];
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
  variant_id?: string | null;
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
  idempotency_key?: string | null;
  due_date?: string | null;
  is_voided: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
  voided_by?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  payments_history?: OrderPaymentRecord[];
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
  idempotency_key?: string | null;
  is_voided?: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
  voided_by?: string | null;
  allocations?: PaymentAllocation[];
  created_at: string;
}

export interface BusinessSettings {
  id?: string;
  business_name: string;
  phone: string;
  email?: string | null;
  address: string;
  tax_number?: string | null;
  tax_rate_percent?: number | null;
  cashier_name?: string | null;
  currency_symbol: string;
  invoice_footer_note?: string | null;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id?: string | null;
  user_name?: string | null;
  metadata?: any;
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
  variant_id?: string | null;
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
  due_date?: string | null;
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

// ==============================================================================
// SUPPLIER & PURCHASE TYPES
// ==============================================================================

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Derived from supplier_balances_view
  total_purchased?: number;
  total_paid?: number;
  total_outstanding?: number;
  total_purchases_count?: number;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  variant_id?: string | null;
  product_name_snapshot: string;
  color_snapshot?: string | null;
  size_snapshot?: string | null;
  quantity: number;
  cost_per_unit: number;
  line_total: number;
  created_at: string;
}

export interface PurchasePaymentHistory {
  id: string;
  payment_id: string;
  amount_allocated: number;
  payment_date: string;
  payment_method: string;
  note?: string | null;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id?: string | null;
  supplier?: Supplier | null;
  purchase_date: string;
  total_cost: number;
  amount_paid: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  notes?: string | null;
  idempotency_key?: string | null;
  is_voided: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
  payments_history?: PurchasePaymentHistory[];
}

export interface SupplierPaymentAllocation {
  id: string;
  supplier_payment_id: string;
  purchase_id: string;
  purchase_number?: string;
  amount_allocated: number;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  note?: string | null;
  idempotency_key?: string | null;
  is_voided?: boolean;
  voided_at?: string | null;
  void_reason?: string | null;
  allocations?: SupplierPaymentAllocation[];
  created_at: string;
}

export interface CreatePurchaseItemInput {
  product_name: string;
  product_id?: string | null;
  variant_id?: string | null;
  quantity: number;
  cost_per_unit: number;
  color_snapshot?: string;
  size_snapshot?: string;
}

export interface CreatePurchaseInput {
  supplier_id?: string | null;
  items: CreatePurchaseItemInput[];
  amount_paid: number;
  payment_method: PaymentMethod;
  notes?: string;
  purchase_date?: string;
  idempotency_key?: string;
}

export interface RecordSupplierPaymentInput {
  supplier_id: string;
  amount: number;
  payment_method: PaymentMethod;
  purchase_id?: string;
  note?: string;
  payment_date?: string;
  idempotency_key?: string;
}
