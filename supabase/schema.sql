-- ==============================================================================
-- PAKISTANI WHOLESALE POS SYSTEM - COMPLETE POSTGRESQL PRODUCTION SCHEMA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sequence for centralized invoice numbers (INV-00001, INV-00002, ...)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  size TEXT,
  color TEXT,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  lot_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (lot_cost >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID')),
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  voided_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ORDER ITEMS TABLE (Snapshot historical values + internal cost for profit)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_code_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  size_snapshot TEXT,
  color_snapshot TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  selling_price_per_unit NUMERIC(12, 2) NOT NULL CHECK (selling_price_per_unit >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank', 'Other')),
  note TEXT,
  idempotency_key TEXT UNIQUE,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  voided_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PAYMENT ALLOCATIONS TABLE (FIFO allocations per invoice)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount_allocated NUMERIC(12, 2) NOT NULL CHECK (amount_allocated > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT DEFAULT 'system',
  user_name TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CASH REGISTER SESSIONS & MOVEMENTS
CREATE TABLE IF NOT EXISTS public.register_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_cash >= 0),
  closing_cash_actual NUMERIC(12, 2) CHECK (closing_cash_actual >= 0),
  expected_cash NUMERIC(12, 2) DEFAULT 0.00,
  cash_sales_total NUMERIC(12, 2) DEFAULT 0.00,
  cash_payments_total NUMERIC(12, 2) DEFAULT 0.00,
  cash_expenses_total NUMERIC(12, 2) DEFAULT 0.00,
  difference NUMERIC(12, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  opened_by TEXT DEFAULT 'Cashier',
  closed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.register_cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.register_sessions(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('CASH_SALE', 'CUSTOMER_PAYMENT', 'EXPENSE', 'MANUAL_DEPOSIT', 'MANUAL_WITHDRAWAL')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. BUSINESS SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.business_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'BURAQ WHOLESALE TRADERS',
  phone TEXT DEFAULT '0300-1234567',
  address TEXT DEFAULT 'Azam Cloth Market, Lahore, Pakistan',
  currency_symbol TEXT DEFAULT 'Rs.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_order_id ON public.payment_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.register_cash_movements(session_id);

-- ==============================================================================
-- DETERMINISTIC CUSTOMER BALANCES VIEW
-- ==============================================================================
CREATE OR REPLACE VIEW public.customer_balances_view WITH (security_invoker = true) AS
SELECT 
  c.id AS customer_id,
  c.name,
  c.phone,
  c.address,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.is_voided = FALSE), 0.00) AS total_billed,
  COALESCE(SUM(pa.amount_allocated) FILTER (WHERE o.is_voided = FALSE AND p.is_voided = FALSE), 0.00) AS total_paid,
  COALESCE(SUM(o.remaining_amount) FILTER (WHERE o.is_voided = FALSE), 0.00) AS total_outstanding,
  COUNT(DISTINCT o.id) FILTER (WHERE o.is_voided = FALSE) AS total_orders_count
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
LEFT JOIN public.payment_allocations pa ON pa.order_id = o.id
LEFT JOIN public.payments p ON p.id = pa.payment_id
GROUP BY c.id, c.name, c.phone, c.address;
