# Buraq Collection — Wholesale Garment POS System

> **Full Technical & User Experience Documentation**
> Version 0.1.0 · Last Updated: August 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema (Supabase / PostgreSQL)](#4-database-schema-supabase--postgresql)
5. [Stored Procedures (Atomic RPCs)](#5-stored-procedures-atomic-rpcs)
6. [Database Views](#6-database-views)
7. [Service Layer Architecture](#7-service-layer-architecture)
8. [Caching Strategy](#8-caching-strategy)
9. [Application Routes & Pages](#9-application-routes--pages)
10. [User Experience Flows](#10-user-experience-flows)
11. [TypeScript Type Definitions](#11-typescript-type-definitions)
12. [UI Design System](#12-ui-design-system)
13. [Testing & Verification](#13-testing--verification)
14. [Environment Configuration](#14-environment-configuration)
15. [Known Conventions & Rules](#15-known-conventions--rules)

---

## 1. System Overview

**Buraq Collection POS** is a wholesale garment business management system built for a cloth market trader in Lahore, Pakistan. It handles the complete lifecycle of a garment wholesale operation:

- **Inbound**: Register suppliers → Record stock purchases → Track supplier loans (pay-later credit)
- **Inventory**: Manage garment products with Color × Size variant matrices (5 fixed sizes)
- **Outbound**: Book wholesale orders for market customers → Print A4 and thermal invoices
- **Finance**: Collect customer installments (FIFO settlement) → Pay supplier loans → Track outstanding receivables and payables

The system runs as a **single-tenant, browser-based web application**. There is no user authentication — it is designed for a single business operator accessing from a trusted device.

### Business Context

- **Currency**: Pakistani Rupee (Rs.) — all amounts are displayed as **integers** (no decimal points)
- **Market**: Azam Cloth Market, Lahore — wholesale garment trading
- **Products**: Clothing items (Kurtas, Shirts, Lawn, etc.) sold in bulk lots
- **Sizes**: Every product uses 5 fixed sizes: `Small`, `Medium`, `Large`, `Standard`, `XL`
- **Variants**: Each product has a Color × Size matrix (e.g., Black/Medium = 35 pcs, White/Large = 10 pcs)

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.3.1 |
| **Language** | TypeScript | 5.x |
| **UI Library** | React | 19.2.8 |
| **Styling** | Tailwind CSS | 4.x |
| **Database** | Supabase (PostgreSQL) | Cloud-hosted |
| **Client SDK** | @supabase/supabase-js | 2.112.3 |
| **Icons** | lucide-react | 1.31.0 |
| **Charts** | Recharts | 3.10.1 |
| **Animations** | Framer Motion | 13.1.0 |
| **Build Tool** | Turbopack (via Next.js) | Built-in |

### Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.112.3",
  "canvas-confetti": "^1.9.4",
  "lucide-react": "^1.31.0",
  "next": "16.3.1",
  "react": "19.2.8",
  "recharts": "^3.10.1",
  "framer-motion": "^13.1.0",
  "tailwind-merge": "^3.6.0"
}
```

---

## 3. Project Structure

```
d:\POS\
├── .env.local                          # Supabase URL + anon key
├── package.json
├── next.config.ts
├── tsconfig.json
├── DOCUMENTATION.md                    # System documentation
├── supabase/
│   └── schema.sql                      # Full database DDL (reference)
├── scripts/
│   └── test-suite.ts                   # 45-check automated backend test
├── src/
│   ├── app/                            # Next.js App Router pages
│   │   ├── page.tsx                    # Dashboard (home)
│   │   ├── layout.tsx                  # Root layout with GlobalScrollFix
│   │   ├── globals.css                 # Global styles + design tokens
│   │   ├── customers/                  # Customer directory & ledger
│   │   │   ├── page.tsx                # Customer list
│   │   │   ├── new/page.tsx            # Create customer
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Customer ledger detail
│   │   │       └── edit/page.tsx       # Edit customer
│   │   ├── products/                   # Product catalog & variants
│   │   │   ├── page.tsx                # Product list
│   │   │   ├── new/page.tsx            # Create product + variant matrix
│   │   │   └── [id]/edit/page.tsx      # Edit product + variant matrix
│   │   ├── orders/                     # Order booking terminal
│   │   │   ├── page.tsx                # Orders register
│   │   │   └── new/page.tsx            # Book new order (terminal)
│   │   ├── invoices/                   # Invoice viewing & printing
│   │   │   ├── page.tsx                # Invoice directory
│   │   │   └── [id]/page.tsx           # Invoice detail (A4 + thermal)
│   │   ├── payments/                   # Customer cash collection
│   │   │   ├── page.tsx                # Payments register
│   │   │   └── new/page.tsx            # Record customer payment
│   │   ├── suppliers/                  # Supplier directory
│   │   │   ├── page.tsx                # Supplier list + Quick Add
│   │   │   ├── new/page.tsx            # Create supplier (full form)
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Supplier ledger detail
│   │   │       └── edit/page.tsx       # Edit supplier
│   │   ├── purchases/                  # Stock purchase invoicing
│   │   │   ├── page.tsx                # Purchases register
│   │   │   ├── new/page.tsx            # Record purchase (items + loan)
│   │   │   └── [id]/page.tsx           # Purchase voucher detail
│   │   ├── supplier-payments/          # Supplier loan repayment
│   │   │   └── new/page.tsx            # Record supplier payment
│   │   └── settings/                   # Business configuration
│   │       └── page.tsx                # Business name, phone, etc.
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx           # Sidebar + top bar layout shell
│   │   ├── navigation/
│   │   │   └── Sidebar.tsx             # Navigation sidebar
│   │   ├── products/
│   │   │   └── VariantMatrixEditor.tsx # Color × Size matrix editor
│   │   └── ui/
│   │       ├── ConfirmModal.tsx         # Reusable confirmation dialog
│   │       └── Toaster.tsx             # Toast notification display
│   ├── context/
│   │   ├── POSContext.tsx              # Global app state context
│   │   └── ToastContext.tsx            # Toast notification context
│   ├── services/
│   │   └── wholesaleService.ts         # All Supabase API calls (~2000 LOC)
│   ├── lib/
│   │   ├── supabase.ts                # Supabase client singleton
│   │   ├── cache.ts                   # Dual-tier cache manager (L1+L2)
│   │   ├── dateUtils.ts               # PKT timezone date formatting
│   │   └── imageCompression.ts        # Client-side image compression
│   └── types/
│       └── wholesale.ts               # All TypeScript interfaces
```

---

## 4. Database Schema (Supabase / PostgreSQL)

The PostgreSQL database is hosted on Supabase with **Row Level Security (RLS) enabled** on all tables.

### 4.1 Core Sales Tables

#### `public.products`
Stores garment product catalog entries.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `product_code` | text | NO | — | Unique product SKU (e.g., "BQ-001") |
| `name` | text | NO | — | Product display name |
| `size` | text | YES | — | Legacy size field (unused with variants) |
| `color` | text | YES | — | Legacy color field (unused with variants) |
| `stock_quantity` | integer | NO | 0 | **Aggregate** total stock across all variants |
| `lot_cost` | numeric(12,2) | NO | 0.00 | **Derived**: `unit_cost × stock_quantity` |
| `unit_cost` | numeric(12,2) | YES | 0.00 | Cost price per piece (Rs.) |
| `selling_price` | numeric(12,2) | YES | 0.00 | Wholesale selling price per piece (Rs.) |
| `is_active` | boolean | NO | true | Soft delete flag |
| `image_url` | text | YES | — | Compressed product photo URL |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

#### `public.product_variants`
Color × Size inventory matrix entries. Each product can have many variants.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `product_id` | uuid | NO | — | FK → `products.id` |
| `color` | text | NO | — | Color name (e.g., "Black", "Royal Blue") |
| `size` | text | NO | — | One of: Small, Medium, Large, Standard, XL |
| `stock_quantity` | integer | NO | 0 | Stock count for this specific variant |
| `created_at` | timestamptz | YES | `now()` | — |
| `updated_at` | timestamptz | YES | `now()` | — |

**Unique constraint**: `(product_id, color, size)` — one row per color-size combination.

#### `public.customers`
Wholesale market customer/buyer directory.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | NO | — | Customer/shop name |
| `phone` | text | YES | — | Contact number |
| `address` | text | YES | — | Market address |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

#### `public.orders`
Wholesale order invoices booked for customers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `invoice_number` | text | NO | — | Sequential: "INV-00001", "INV-00002", etc. |
| `customer_id` | uuid | NO | — | FK → `customers.id` |
| `order_date` | timestamptz | NO | `now()` | When the order was booked |
| `subtotal` | numeric | NO | — | Sum of all line totals before tax |
| `total_amount` | numeric | NO | — | Final invoice total |
| `amount_paid` | numeric | NO | 0.00 | Running total of all payments received |
| `remaining_amount` | numeric | NO | 0.00 | `total_amount - amount_paid` |
| `payment_status` | text | NO | — | `PAID`, `PARTIALLY_PAID`, or `UNPAID` |
| `notes` | text | YES | — | Optional order notes |
| `idempotency_key` | text | YES | — | Prevents duplicate order submission |
| `is_voided` | boolean | NO | false | Soft-void flag |
| `voided_at` | timestamptz | YES | — | When voided |
| `void_reason` | text | YES | — | Reason for voiding |
| `voided_by` | text | YES | — | Who voided |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

#### `public.order_items`
Line items within an order. Each row is a specific product-variant-quantity-price entry.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `order_id` | uuid | NO | — | FK → `orders.id` |
| `product_id` | uuid | NO | — | FK → `products.id` |
| `variant_id` | uuid | YES | — | FK → `product_variants.id` |
| `product_code_snapshot` | text | NO | — | Frozen product code at time of order |
| `product_name_snapshot` | text | NO | — | Frozen product name at time of order |
| `size_snapshot` | text | YES | — | Frozen size label |
| `color_snapshot` | text | YES | — | Frozen color label |
| `quantity` | integer | NO | — | Pieces ordered |
| `selling_price_per_unit` | numeric | NO | — | Selling rate per piece |
| `line_total` | numeric | NO | — | `quantity × selling_price_per_unit` |
| `unit_cost` | numeric | NO | 0.00 | Cost price (for profit tracking) |
| `total_cost` | numeric | NO | 0.00 | `quantity × unit_cost` |
| `created_at` | timestamptz | NO | `now()` | — |

#### `public.payments`
Cash collection records from customers (installments, advances, settlements).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `customer_id` | uuid | NO | — | FK → `customers.id` |
| `amount` | numeric | NO | — | Payment amount (Rs.) |
| `payment_date` | timestamptz | NO | `now()` | When payment was received |
| `payment_method` | text | NO | 'Cash' | `Cash`, `Bank`, or `Other` |
| `note` | text | YES | — | Optional payment note |
| `idempotency_key` | text | YES | — | Prevents duplicate payment recording |
| `is_voided` | boolean | NO | false | Soft-void flag |
| `voided_at` | timestamptz | YES | — | — |
| `void_reason` | text | YES | — | — |
| `voided_by` | text | YES | — | — |
| `created_at` | timestamptz | NO | `now()` | — |

#### `public.payment_allocations`
Links a customer payment to specific orders it settles (FIFO allocation).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `payment_id` | uuid | NO | — | FK → `payments.id` |
| `order_id` | uuid | NO | — | FK → `orders.id` |
| `amount_allocated` | numeric | NO | — | How much of the payment went to this order |
| `created_at` | timestamptz | NO | `now()` | — |

### 4.2 Supplier & Purchase Tables

#### `public.suppliers`
Garment supplier/factory directory.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | NO | — | Supplier/factory name |
| `phone` | text | YES | — | Contact number |
| `address` | text | YES | — | Factory/market address |
| `notes` | text | YES | — | Internal notes |
| `is_active` | boolean | NO | true | Active flag |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

#### `public.purchases`
Stock purchase invoices from suppliers (inbound goods).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `purchase_number` | text | NO | — | Sequential: "PUR-00001", etc. |
| `supplier_id` | uuid | YES | — | FK → `suppliers.id` |
| `purchase_date` | timestamptz | NO | `now()` | Date of purchase |
| `total_cost` | numeric | NO | — | Total lot price (sum of all items) |
| `amount_paid` | numeric | NO | 0.00 | Running total paid to supplier |
| `remaining_amount` | numeric | NO | 0.00 | Outstanding supplier loan |
| `payment_status` | text | NO | — | `PAID`, `PARTIALLY_PAID`, or `UNPAID` |
| `notes` | text | YES | — | Bill reference, credit terms, etc. |
| `is_voided` | boolean | NO | false | Soft-void flag |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

#### `public.purchase_items`
Line items within a purchase (what products were bought, quantity, unit cost).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `purchase_id` | uuid | NO | — | FK → `purchases.id` |
| `product_id` | uuid | YES | — | FK → `products.id` (optional link) |
| `variant_id` | uuid | YES | — | FK → `product_variants.id` (optional) |
| `product_name_snapshot` | text | NO | — | Product name as text (not a strict FK) |
| `color_snapshot` | text | YES | — | Color if applicable |
| `size_snapshot` | text | YES | — | Size if applicable |
| `quantity` | integer | NO | — | Pieces purchased |
| `cost_per_unit` | numeric | NO | — | Price per piece |
| `line_total` | numeric | NO | — | `quantity × cost_per_unit` |
| `created_at` | timestamptz | NO | `now()` | — |

#### `public.supplier_payments`
Payments made to suppliers (loan repayments).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `supplier_id` | uuid | NO | — | FK → `suppliers.id` |
| `amount` | numeric | NO | — | Payment amount |
| `payment_date` | timestamptz | NO | `now()` | — |
| `payment_method` | text | NO | 'Cash' | `Cash`, `Bank`, or `Other` |
| `note` | text | YES | — | — |
| `is_voided` | boolean | NO | false | — |
| `created_at` | timestamptz | NO | `now()` | — |

#### `public.supplier_payment_allocations`
FIFO allocation of supplier payments across unpaid purchases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `supplier_payment_id` | uuid | NO | — | FK → `supplier_payments.id` |
| `purchase_id` | uuid | NO | — | FK → `purchases.id` |
| `amount_allocated` | numeric | NO | — | How much went to this purchase |
| `created_at` | timestamptz | NO | `now()` | — |

### 4.3 System Tables

#### `public.business_settings`
Single-row table storing business configuration (always `id = 1`).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | integer | 1 | Fixed primary key |
| `business_name` | text | 'PAK WHOLESALE TRADERS' | Company name on invoices |
| `phone` | text | '0300-1234567' | Business phone |
| `email` | text | 'sales@buraqcollection.pk' | Business email |
| `address` | text | 'Azam Cloth Market, Lahore' | Business address |
| `currency_symbol` | text | 'Rs.' | Currency prefix |
| `tax_rate_percent` | numeric | 0.00 | Tax rate (currently 0%) |
| `cashier_name` | text | 'Tariq Mahmood' | Operator name |

#### `public.audit_logs`
Immutable audit trail of all state-changing operations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | 'system' (no auth) |
| `entity_type` | text | 'ORDER', 'PAYMENT', 'PURCHASE', etc. |
| `entity_id` | uuid | ID of the affected record |
| `action` | text | 'CREATE', 'VOID', etc. |
| `metadata` | jsonb | Contextual data (amounts, items, etc.) |
| `created_at` | timestamptz | When it happened |

---

## 5. Stored Procedures (Atomic RPCs)

All critical state mutations are executed via **PostgreSQL stored functions** called as Supabase RPCs. This ensures atomicity — either the entire operation succeeds or nothing changes.

### 5.1 `create_wholesale_order`

**Purpose**: Books a new wholesale order, deducts variant stock atomically, records initial payment.

**Flow**:
1. Generates sequential invoice number (`INV-XXXXX`)
2. Takes `SELECT ... FOR UPDATE` row locks on all affected `product_variants`
3. Validates stock availability — rejects if any variant has insufficient stock
4. Inserts `orders` record with calculated totals
5. Inserts `order_items` rows with frozen product snapshots
6. Decrements `product_variants.stock_quantity` for each item
7. Decrements `products.stock_quantity` (aggregate)
8. If advance payment > 0: inserts `payments` record and `payment_allocations`
9. Writes audit log entry
10. Returns the new order ID and invoice number

### 5.2 `record_customer_payment`

**Purpose**: Records a cash collection from a customer and allocates it to outstanding orders using FIFO (oldest first).

**Flow**:
1. Inserts `payments` record
2. If a specific `order_id` is provided: allocates entire amount to that order
3. If no specific order: iterates unpaid orders (oldest first), allocating amounts until the payment is exhausted
4. For each allocated order: updates `orders.amount_paid`, `orders.remaining_amount`, and `orders.payment_status`
5. Inserts `payment_allocations` rows
6. Writes audit log entry

### 5.3 `void_wholesale_order`

**Purpose**: Cancels/voids an order, restoring all variant stock and clearing financial records.

**Flow**:
1. Marks `orders.is_voided = true`, zeros out `remaining_amount`
2. Restores `product_variants.stock_quantity` for each order item
3. Restores `products.stock_quantity` aggregate
4. Writes audit log entry

### 5.4 `void_customer_payment`

**Purpose**: Reverses a customer payment, re-opening the affected orders.

**Flow**:
1. Marks `payments.is_voided = true`
2. Reads `payment_allocations` for this payment
3. For each allocation: subtracts the amount from the corresponding order's `amount_paid`, re-adds to `remaining_amount`, recalculates `payment_status`
4. Writes audit log entry

### 5.5 `create_purchase`

**Purpose**: Records a new stock purchase from a supplier, with optional advance payment.

**Flow**:
1. Generates sequential purchase number (`PUR-XXXXX`)
2. Calculates total lot cost from items (`SUM(quantity × cost_per_unit)`)
3. Inserts `purchases` record with payment status
4. Inserts `purchase_items` rows
5. If advance payment > 0: inserts `supplier_payments` record and `supplier_payment_allocations`
6. Writes audit log entry
7. Returns purchase ID

### 5.6 `record_supplier_payment`

**Purpose**: Records a payment to a supplier, allocating it via FIFO across unpaid purchases.

**Flow**:
1. Inserts `supplier_payments` record
2. If specific `purchase_id` given: allocates to that purchase
3. Otherwise: FIFO allocation across oldest unpaid purchases
4. Updates `purchases.amount_paid`, `remaining_amount`, and `payment_status`
5. Inserts `supplier_payment_allocations` rows
6. Writes audit log entry

### 5.7 `void_purchase`

**Purpose**: Cancels a purchase, clearing the supplier's loan obligation.

### 5.8 `void_supplier_payment`

**Purpose**: Reverses a supplier payment, re-opening the loan balance on affected purchases.

### 5.9 `log_audit_event`

**Purpose**: Utility function to insert a row into `audit_logs`.

---

## 6. Database Views

### `customer_balances_view`

Joins `customers` with aggregated order and payment data to produce real-time ledger balances.

```sql
SELECT c.id, c.name, c.phone, c.address,
  COALESCE(SUM(orders.total_amount), 0) AS total_billed,
  COALESCE(SUM(payments.amount), 0)     AS total_paid,
  COALESCE(SUM(orders.remaining_amount), 0) AS total_outstanding,
  COUNT(orders.id) AS total_orders_count
FROM customers c
  LEFT JOIN orders  ON ... WHERE orders.is_voided = false
  LEFT JOIN payments ON ... WHERE payments.is_voided = false
```

**Used by**: Customer directory page, customer ledger detail, dashboard metrics.

### `supplier_balances_view`

Joins `suppliers` with aggregated purchase and supplier_payment data.

```sql
SELECT s.id, s.name, s.phone, s.address,
  COALESCE(SUM(purchases.total_cost), 0)       AS total_purchased,
  COALESCE(SUM(supplier_payments.amount), 0)    AS total_paid,
  COALESCE(SUM(purchases.remaining_amount), 0)  AS total_outstanding,
  COUNT(purchases.id) AS total_purchases_count
FROM suppliers s
  LEFT JOIN purchases ON ... WHERE purchases.is_voided = false
  LEFT JOIN supplier_payments ON ... WHERE supplier_payments.is_voided = false
```

**Used by**: Supplier directory page, supplier ledger detail.

---

## 7. Service Layer Architecture

All database interactions go through `src/services/wholesaleService.ts` (~2000 lines). This is a singleton object exposing methods for every entity:

### Products
- `getProducts(forceRefresh?)` — Fetches all products with variants, uses cache
- `getProductById(id)` — Fetches single product with variants
- `createProduct(data)` — Insert product + variant matrix rows
- `updateProduct(id, data)` — Update product + upsert/delete variant rows
- `deleteProduct(id)` — Hard delete

### Customers
- `getCustomers(forceRefresh?)` — Reads from `customer_balances_view` (includes ledger totals)
- `getCustomerById(id)` — Single customer from view
- `createCustomer(data)` / `updateCustomer(id, data)` / `deleteCustomer(id)`

### Orders
- `getOrders(forceRefresh?)` — Fetches orders with nested `customer` and `items`
- `getOrderById(id)` — Full order with items and payment history
- `createOrder(input: CreateOrderInput)` — Calls `create_wholesale_order` RPC
- `voidOrder(id, reason?)` — Calls `void_wholesale_order` RPC

### Payments
- `getPayments(forceRefresh?)` — All customer payments with allocations
- `recordPayment(input: RecordPaymentInput)` — Calls `record_customer_payment` RPC
- `voidPayment(id, reason?)` — Calls `void_customer_payment` RPC

### Suppliers
- `getSuppliers(forceRefresh?)` — Reads from `supplier_balances_view`
- `getSupplierById(id)` — Single supplier from view
- `createSupplier(data)` / `updateSupplier(id, data)` / `deleteSupplier(id)`

### Purchases
- `getPurchases(forceRefresh?)` — Fetches purchases with nested `supplier` and `items`
- `getPurchaseById(id)` — Full purchase with items and payment history
- `createPurchase(input: CreatePurchaseInput)` — Calls `create_purchase` RPC
- `voidPurchase(id, reason?)` — Calls `void_purchase` RPC

### Supplier Payments
- `getSupplierPayments(forceRefresh?)` — All supplier payments with allocations
- `recordSupplierPayment(input)` — Calls `record_supplier_payment` RPC
- `voidSupplierPayment(id, reason?)` — Calls `void_supplier_payment` RPC

### Settings
- `getSettings()` — Reads single row from `business_settings`
- `updateSettings(data)` — Updates business configuration

### Cache Invalidation Pattern

After every write operation (create, update, void, delete), the service calls:

```typescript
CacheManager.invalidate([
  CacheKeys.ORDERS,
  CacheKeys.CUSTOMERS,
  CacheKeys.PAYMENTS,
  CacheKeys.PRODUCTS,
]);
```

This ensures the next read fetches fresh data from PostgreSQL.

---

## 8. Caching Strategy

The app uses a **dual-tier cache** (`src/lib/cache.ts`):

- **L1: In-Memory** (`Map<string, CacheEnvelope>`) — sub-millisecond reads, lost on page refresh
- **L2: LocalStorage** — persists across page refreshes, slightly slower due to serialization

### TTL Configuration

| Entity | TTL | Rationale |
|--------|-----|-----------|
| Products | 2 min | Catalog changes infrequently |
| Customers | 2 min | Directory changes infrequently |
| Orders | 30 sec | Financial data, needs freshness |
| Payments | 30 sec | Financial data, needs freshness |
| Settings | 10 min | Rarely changes |
| Suppliers | 2 min | Directory changes infrequently |
| Purchases | 30 sec | Financial data, needs freshness |
| Supplier Payments | 30 sec | Financial data, needs freshness |

### Invalidation

- `CacheManager.invalidate(keys[])` — Removes specific cache entries from both tiers
- `CacheManager.invalidateAll()` — Nukes the entire cache (used on settings changes)

---

## 9. Application Routes & Pages

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | **Dashboard** — KPI cards (revenue, orders, receivables, cash collected), bar chart, pie chart, top debtors, recent activity |
| `/products` | Static | **Product Catalog** — Table of all products showing cost price, selling price, stock valuation |
| `/products/new` | Static | **Create Product** — Name, code, cost/selling price, image upload, Color × Size variant matrix editor |
| `/products/[id]/edit` | Dynamic | **Edit Product** — Same form pre-filled, can add/remove variant rows |
| `/customers` | Static | **Customer Directory** — List with outstanding balances, search, filter |
| `/customers/new` | Static | **Create Customer** — Name, phone, address form |
| `/customers/[id]` | Dynamic | **Customer Ledger** — Financial summary cards, chronological order/payment timeline |
| `/customers/[id]/edit` | Dynamic | **Edit Customer** |
| `/orders` | Static | **Orders Register** — Searchable/filterable table of all orders with status badges |
| `/orders/new` | Static | **Order Booking Terminal** — Customer picker, product matrix selector with 2D keyboard navigation, cart, advance payment |
| `/invoices/[id]` | Dynamic | **Invoice Detail** — A4 and 80mm thermal invoice formats with print button |
| `/payments` | Static | **Payments Register** — All customer payments with allocation details |
| `/payments/new` | Static | **Record Payment** — Customer picker, amount, FIFO or targeted order settlement |
| `/suppliers` | Static | **Supplier Directory** — List with Quick Add modal, purchase/loan actions |
| `/suppliers/new` | Static | **Create Supplier** — Full form with name, phone, address |
| `/suppliers/[id]` | Dynamic | **Supplier Ledger** — Financial summary, purchase history, payment history |
| `/suppliers/[id]/edit` | Dynamic | **Edit Supplier** |
| `/purchases` | Static | **Purchases Register** — All stock receipts with cost/loan tracking |
| `/purchases/new` | Static | **Record Purchase** — Supplier + date + product items + payment presets (100%/50%/0%) |
| `/purchases/[id]` | Dynamic | **Purchase Voucher** — Printable supplier invoice with A4/thermal formats |
| `/supplier-payments/new` | Static | **Pay Supplier Loan** — Supplier picker, unpaid purchase selector, FIFO settlement |
| `/settings` | Static | **Business Settings** — Name, phone, address, email, currency, cashier name |

---

## 10. User Experience Flows

### Flow 1: Setting Up the Business (First-Time)

```
Settings Page → Enter business name, phone, address
             → Save configuration
             → This appears on all printed invoices
```

### Flow 2: Adding a Product to the Catalog

```
Products → New Product
  1. Enter Product Code (e.g., "BQ-001")
  2. Enter Product Name (e.g., "Embroidered Cotton Kurta")
  3. Enter Cost Price per Piece (e.g., Rs. 800)
  4. Enter Selling Price per Piece (e.g., Rs. 1,200)
  5. (Optional) Upload product image
  6. Open Color × Size Matrix Editor
     → Type color name (e.g., "Black") + press Enter
     → Matrix row appears with 5 size columns: Small, Medium, Large, Standard, XL
     → Enter stock quantity in each cell
     → Navigate with Arrow Keys (↑↓←→) between cells
     → Press Enter to add another color row
     → Repeat for all colors
  7. Click "Save Product"
     → Total Stock is computed as sum of all variant quantities
     → lot_cost = cost_price × total_stock (auto-computed)
```

### Flow 3: Registering a Supplier

```
Suppliers → Click "+ Quick Add Supplier" button
  1. Enter Supplier Name (e.g., "Al-Madina Weaving Mills")
  2. (Optional) Enter Phone Number
  3. (Optional) Enter Address
  4. Click "Save Supplier"
     → Supplier appears in directory with 0 loan balance
```

### Flow 4: Recording a Stock Purchase from Supplier

```
Suppliers → Click "+ Purchase" on a supplier row
  — OR —
Purchases → New Purchase

  1. Select Supplier from dropdown (shows current outstanding balance)
  2. Select Purchase Date (calendar picker, "Today" shortcut button)
  3. Add Item Lines:
     → Type product name OR click Quick Pick tag from catalog
     → Enter Quantity (pieces)
     → Enter Unit Price (Rs. per piece)
     → Line Total auto-calculates (Qty × Unit Price)
     → Click "+ Add Item Line" for more products
  4. Review Total Lot Summary Banner (items count, total pieces, total lot price)
  5. Choose Payment:
     → Click "100% Full" → pays the full amount, no loan
     → Click "50% Half" → pays half, rest is supplier loan
     → Click "0% Full Loan" → entire purchase is on credit
     → OR manually type any amount
  6. Select Payment Method (Cash / Bank / Other)
  7. (Optional) Add Notes (bill reference, credit terms)
  8. Click "Record Purchase"
     → Purchase invoice generated (PUR-XXXXX)
     → Supplier ledger updated with loan balance
     → Redirects to supplier ledger page
```

### Flow 5: Booking a Wholesale Order for a Customer

```
Orders → New Order

  1. Select Customer (shows their current outstanding debt)
  2. Select Product from dropdown
     → Color × Size matrix appears
     → Enter quantities in the matrix cells
     → Navigate with Arrow Keys (↑↓←→)
     → Press Enter to add items to cart
  3. Cart Table shows:
     → Product name, color, size, qty, selling rate, line total
     → Selling rate defaults to product's configured selling_price
     → Can be overridden per-line
  4. Review Order Summary:
     → Gross Subtotal (sum of all line totals)
     → Enter Advance Payment (can be partial or full)
     → Remaining Balance Due auto-calculates
  5. Click "Book Order & Generate Invoice"
     → Variant stock is atomically deducted
     → Invoice generated (INV-XXXXX)
     → Redirects to printable invoice page (A4 or thermal)
```

### Flow 6: Collecting Customer Payment / Installment

```
Payments → New Payment
  — OR —
Customers → [Customer Ledger] → "Collect Cash" button

  1. Select Customer (shows total outstanding balance)
  2. (Optional) Target a specific order — or leave blank for FIFO
  3. Enter Payment Amount
  4. Select Payment Method (Cash / Bank / Other)
  5. Click "Record Payment"
     → Payment is allocated to oldest unpaid order(s) first (FIFO)
     → Order status transitions: UNPAID → PARTIALLY_PAID → PAID
     → Customer ledger balance updates immediately
```

### Flow 7: Paying Supplier Loan

```
Suppliers → Click "Pay Loan" on a supplier row
  — OR —
Supplier Payments → New Payment

  1. Select Supplier (shows total loan outstanding)
  2. (Optional) Target a specific purchase — or leave blank for FIFO
  3. Enter Payment Amount
  4. Select Payment Method
  5. Click "Record Payment"
     → Payment allocated to oldest unpaid purchase(s) first (FIFO)
     → Purchase status transitions: UNPAID → PARTIALLY_PAID → PAID
     → Supplier loan balance decreases
```

### Flow 8: Voiding / Cancelling a Transaction

```
Any order, payment, purchase, or supplier payment can be voided:

  1. Navigate to the record detail page
  2. Click "Void" button
  3. Confirm in the safety modal
  4. Effects:
     → Order void: restores all variant stock, clears financial records
     → Payment void: re-opens the settled orders, increases outstanding balance
     → Purchase void: removes supplier loan obligation
     → Supplier payment void: re-opens the loan balance
```

### Flow 9: Printing Invoices

```
Orders → Click order row → Invoice Detail Page
  — OR —
Purchases → Click "Voucher" on a purchase row

  1. Toggle between "A4 Format" and "80mm Thermal" modes
  2. Click "Print" button
     → Browser print dialog opens
     → CSS @media print rules hide navigation, format the invoice
```

---

## 11. TypeScript Type Definitions

All types are defined in `src/types/wholesale.ts`. Key enums and types:

```typescript
type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
type PaymentMethod = 'Cash' | 'Bank' | 'Other';
type FixedSize = 'Small' | 'Medium' | 'Large' | 'Standard' | 'XL';
const FIXED_SIZES: FixedSize[] = ['Small', 'Medium', 'Large', 'Standard', 'XL'];
```

Key interfaces: `Product`, `ProductVariant`, `Customer`, `Order`, `OrderItem`, `Payment`, `PaymentAllocation`, `Supplier`, `Purchase`, `PurchaseItem`, `SupplierPayment`, `SupplierPaymentAllocation`, `BusinessSettings`, `AuditLog`.

Input interfaces for mutations: `CreateOrderInput`, `RecordPaymentInput`, `CreatePurchaseInput`, `RecordSupplierPaymentInput`.

---

## 12. UI Design System

### Design Language
- **Theme**: Clean, minimal, enterprise white-on-slate
- **Border Radius**: `rounded-3xl` (24px) for cards, `rounded-2xl` (16px) for buttons, `rounded-xl` (12px) for inputs
- **Typography**: System sans-serif + monospace for numbers
- **Colors**:
  - Primary: `slate-900` (near-black) for headers, buttons, CTA
  - Accent: `violet-900` for purchase actions, `emerald-700` for payment/money actions
  - Danger: `rose-700` for debt amounts, void buttons
  - Neutral: `slate-50/100/200` for backgrounds, borders
- **Number Formatting**: All currency displayed as clean integers via `Math.round(val).toLocaleString()` — no `.00` decimals

### Reusable Components
- `AppLayout` — Sidebar + content shell
- `ConfirmModal` — Destructive action confirmation with details list
- `VariantMatrixEditor` — Color × Size grid with 2D keyboard navigation
- `Toaster` — Success/error/warning toast notifications

### UX Patterns
- **Scroll Safety**: `GlobalScrollFix` in `layout.tsx` prevents mouse wheel from changing numeric input values
- **Spin Buttons**: Native browser up/down arrows enabled on number inputs
- **2D Matrix Navigation**: Arrow keys move focus between cells in the Color × Size grid
- **Enter-Key Workflow**: Press Enter to add color rows, add items to cart, or submit forms
- **Quick Add Modals**: Inline creation of suppliers without page navigation
- **Payment Presets**: One-click buttons for 100%, 50%, 0% payment amounts

---

## 13. Testing & Verification

### Automated Test Suite

Located at `scripts/test-suite.ts`, run via:

```bash
npm test
# or
npx tsx scripts/test-suite.ts
```

**45 automated checks** covering:

1. **Customer & Ledger** (2 checks): Create customer, verify initial balance = 0
2. **Product & Variants** (2 checks): Create product with 10 color×size variants
3. **Order Booking & Stock** (5 checks): Book order via RPC, verify totals, verify each variant stock decremented correctly
4. **Installment Payments** (10 checks): Record partial payment, verify FIFO allocation, record final payment, verify PAID status, verify customer ledger cleared
5. **Payment Reversal** (3 checks): Void payment, verify order re-opened, verify balance restored
6. **Order Voiding** (4 checks): Void order, verify all variant stock restored
7. **Supplier & Ledger** (2 checks): Create supplier, verify initial balance = 0
8. **Purchase Invoicing** (2 checks): Create purchase via RPC, verify lot calculation and loan balance
9. **Supplier FIFO Payment** (2 checks): Pay supplier, verify FIFO allocation across purchases
10. **Supplier Payment Void** (2 checks): Void supplier payment, verify balance restored
11. **Purchase Voiding** (2 checks): Void purchase, verify is_voided and financials cleared

### Build Verification

```bash
npm run build
```

Compiles all 19 static + dynamic routes with TypeScript type checking. Must exit with code 0 and 0 errors.

---

## 14. Environment Configuration

### Required `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

### Running Locally

```bash
npm install
npm run dev          # Development server on http://localhost:3000
npm run build        # Production build
npm start            # Serve production build
npm test             # Run 45-check automated test suite
```

---

## 15. Known Conventions & Rules

1. **All monetary values are integers** — no decimal formatting (`.00`). Use `Math.round(val).toLocaleString()`.
2. **Product total stock** (`products.stock_quantity`) is the sum of all variant quantities. It is updated atomically by stored procedures during order booking and voiding.
3. **lot_cost** is a derived field: `unit_cost × stock_quantity`. It is computed on product create/update, not entered manually.
4. **Purchase product names** are stored as text snapshots, not strict foreign keys. This allows recording purchases for products not yet in the catalog.
5. **Voiding** is a soft operation — records are marked `is_voided = true` but never deleted. All views and queries filter `WHERE is_voided = false`.
6. **FIFO payment allocation** means the oldest unpaid order/purchase gets paid first when no specific target is selected.
7. **Idempotency keys** prevent duplicate submissions from double-clicks or network retries.
8. **5 fixed garment sizes**: Small, Medium, Large, Standard, XL — hardcoded in `FIXED_SIZES` constant.
9. **Timezone**: All dates displayed in Pakistan Standard Time (PKT, UTC+5) via `formatDatePKT()`.
10. **Cache invalidation** is mandatory after every write operation to prevent stale data display.
11. **Row Level Security** is enabled on all tables. The current setup uses permissive policies since there is no multi-user authentication.
12. **Print CSS** uses `@media print` rules to hide navigation and format invoices for A4 or 80mm thermal paper.
