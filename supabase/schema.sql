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
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. PRODUCT VARIANTS TABLE (Color × Size Matrix)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('Small', 'Medium', 'Large', 'Standard', 'XL')),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_product_color_size UNIQUE (product_id, color, size)
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
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
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
DROP VIEW IF EXISTS public.customer_balances_view;

CREATE OR REPLACE VIEW public.customer_balances_view WITH (security_invoker = true) AS
WITH customer_orders AS (
  SELECT
    customer_id,
    COALESCE(SUM(total_amount), 0.00) AS total_billed,
    COALESCE(SUM(amount_paid), 0.00) AS total_order_paid,
    COALESCE(SUM(remaining_amount), 0.00) AS total_outstanding,
    COUNT(id) AS total_orders_count
  FROM public.orders
  WHERE is_voided = FALSE
  GROUP BY customer_id
),
customer_payments AS (
  SELECT
    customer_id,
    COALESCE(SUM(amount), 0.00) AS total_paid
  FROM public.payments
  WHERE is_voided = FALSE
  GROUP BY customer_id
)
SELECT 
  c.id,
  c.id AS customer_id,
  c.name,
  c.phone,
  c.address,
  c.created_at,
  c.updated_at,
  COALESCE(co.total_billed, 0.00) AS total_billed,
  COALESCE(cp.total_paid, 0.00) AS total_paid,
  COALESCE(co.total_outstanding, 0.00) AS total_outstanding,
  COALESCE(co.total_orders_count, 0::BIGINT) AS total_orders_count
FROM public.customers c
LEFT JOIN customer_orders co ON co.customer_id = c.id
LEFT JOIN customer_payments cp ON cp.customer_id = c.id;

-- ==============================================================================
-- SUPABASE STORAGE BUCKET: product-images (500KB limit per image, public read)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  524288, -- 500 KB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage Policies for product-images bucket
DO $$
BEGIN
  -- 1. Public Read Access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access to Product Images'
  ) THEN
    CREATE POLICY "Public Access to Product Images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'product-images');
  END IF;

  -- 2. Allow Authenticated & Anon Uploads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Uploads to Product Images'
  ) THEN
    CREATE POLICY "Allow Uploads to Product Images"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'product-images');
  END IF;

  -- 3. Allow Updates / Overwriting
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Updates to Product Images'
  ) THEN
    CREATE POLICY "Allow Updates to Product Images"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id = 'product-images');
  END IF;

  -- 4. Allow Deletion
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow Deletes from Product Images'
  ) THEN
    CREATE POLICY "Allow Deletes from Product Images"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id = 'product-images');
  END IF;
END $$;

-- ==============================================================================
-- SUPPLIER SECTION: TABLES, INDEXES, RLS, VIEWS, RPCS
-- ==============================================================================

CREATE SEQUENCE IF NOT EXISTS purchase_number_seq START 1;

-- 1. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PURCHASES TABLE (Stock Receipts)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('PAID', 'PARTIALLY_PAID', 'UNPAID')),
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name_snapshot TEXT NOT NULL,
  color_snapshot TEXT,
  size_snapshot TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  cost_per_unit NUMERIC(12, 2) NOT NULL CHECK (cost_per_unit >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SUPPLIER PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank', 'Other')),
  note TEXT,
  idempotency_key TEXT UNIQUE,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SUPPLIER PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.supplier_payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_payment_id UUID NOT NULL REFERENCES public.supplier_payments(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE RESTRICT,
  amount_allocated NUMERIC(12, 2) NOT NULL CHECK (amount_allocated > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON public.purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_idempotency_key ON public.purchases(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON public.purchase_items(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier_id ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_payment_date ON public.supplier_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_payment_id ON public.supplier_payment_allocations(supplier_payment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_allocations_purchase_id ON public.supplier_payment_allocations(purchase_id);

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to suppliers" ON public.suppliers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to purchases" ON public.purchases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to purchase_items" ON public.purchase_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to supplier_payments" ON public.supplier_payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to supplier_payment_allocations" ON public.supplier_payment_allocations FOR ALL TO public USING (true) WITH CHECK (true);

-- SUPPLIER BALANCES VIEW
CREATE OR REPLACE VIEW public.supplier_balances_view WITH (security_invoker = true) AS
WITH supplier_purchases AS (
  SELECT
    supplier_id,
    COALESCE(SUM(total_cost), 0.00) AS total_purchased,
    COALESCE(SUM(amount_paid), 0.00) AS total_purchase_paid,
    COALESCE(SUM(remaining_amount), 0.00) AS total_outstanding,
    COUNT(id) AS total_purchases_count
  FROM public.purchases
  WHERE is_voided = FALSE AND supplier_id IS NOT NULL
  GROUP BY supplier_id
),
supplier_pays AS (
  SELECT
    supplier_id,
    COALESCE(SUM(amount), 0.00) AS total_paid
  FROM public.supplier_payments
  WHERE is_voided = FALSE
  GROUP BY supplier_id
)
SELECT
  s.id,
  s.id AS supplier_id,
  s.name,
  s.phone,
  s.address,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at,
  COALESCE(sp.total_purchased, 0.00) AS total_purchased,
  COALESCE(spay.total_paid, 0.00) AS total_paid,
  COALESCE(sp.total_outstanding, 0.00) AS total_outstanding,
  COALESCE(sp.total_purchases_count, 0::BIGINT) AS total_purchases_count
FROM public.suppliers s
LEFT JOIN supplier_purchases sp ON sp.supplier_id = s.id
LEFT JOIN supplier_pays spay ON spay.supplier_id = s.id;

