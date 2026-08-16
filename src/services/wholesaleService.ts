import { supabase } from '@/lib/supabase';
import { CacheManager, CacheKeys, CACHE_TTL } from '@/lib/cache';
import { compressImage } from '@/lib/imageCompression';
import {
  Product,
  Customer,
  Order,
  OrderItem,
  Payment,
  PaymentAllocation,
  BusinessSettings,
  CreateOrderInput,
  RecordPaymentInput,
  PaymentStatus,
  AuditLog,
  RegisterSession,
  RegisterCashMovement,
} from '@/types/wholesale';

// Browser Local Storage Keys (Resilient Offline Fallback Layer)
const STORAGE_KEYS = {
  PRODUCTS: 'wholesale_pos_products_v2',
  CUSTOMERS: 'wholesale_pos_customers_v2',
  ORDERS: 'wholesale_pos_orders_v2',
  ORDER_ITEMS: 'wholesale_pos_order_items_v2',
  PAYMENTS: 'wholesale_pos_payments_v2',
  PAYMENT_ALLOCATIONS: 'wholesale_pos_allocations_v2',
  SETTINGS: 'wholesale_pos_settings_v2',
  INVOICE_SEQ: 'wholesale_pos_inv_seq_v2',
  REGISTER_SESSIONS: 'wholesale_pos_register_sessions_v2',
  AUDIT_LOGS: 'wholesale_pos_audit_logs_v2',
};

// Initial Seed Data for offline fallback
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: '1027ba5f-6ab1-4386-85a4-9eab55d54d59',
    product_code: 'TS03',
    name: 'lehnga',
    size: 'L',
    color: 'Black',
    stock_quantity: 30,
    lot_cost: 60000,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b391ea3f-355a-493a-94b6-99b809acf590',
    product_code: 'RH11',
    name: 'mexi',
    size: 'M',
    color: 'White',
    stock_quantity: 40,
    lot_cost: 40000,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [];

const DEFAULT_SETTINGS: BusinessSettings = {
  business_name: 'BURAQ COLLECTION',
  phone: '+92 300 1234567',
  email: 'sales@buraqcollection.pk',
  address: 'Azam Cloth Market, Circular Road, Lahore, Pakistan',
  tax_rate_percent: 0,
  currency_symbol: 'Rs.',
  cashier_name: 'Tariq Mahmood',
};

/**
 * Generates a standard RFC4122 v4 compliant UUID
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Local Storage Helper Utilities
function getLocal<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    console.warn(`LocalStorage read error for ${key}:`, e);
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn(`LocalStorage write error for ${key}:`, e);
  }
}

export const wholesaleService = {
  // ==========================================
  // PRODUCTS & INVENTORY
  // ==========================================
  async getProducts(forceRefresh = false): Promise<Product[]> {
    return CacheManager.fetchWithCache<Product[]>(
      CacheKeys.PRODUCTS,
      async () => {
        let products: Product[] = [];

        if (supabase) {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

          if (!error && data && data.length > 0) {
            products = data;
          }
        }

        if (products.length === 0) {
          products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
        }

        return products.map((p) => ({
          ...p,
          lot_cost: parseFloat(p.lot_cost as any) || 0,
          stock_quantity: parseInt(p.stock_quantity as any, 10) || 0,
          unit_cost:
            p.stock_quantity > 0
              ? parseFloat(((p.lot_cost as any) / (p.stock_quantity as any)).toFixed(2))
              : 0,
        }));
      },
      {
        ttlMs: CACHE_TTL.PRODUCTS,
        fallback: DEFAULT_PRODUCTS,
        forceRefresh,
      }
    );
  },

  async uploadProductImage(file: File, productCode = 'prod'): Promise<string> {
    // 1. Compress image to strictly <= 500KB (maxDimension 1200px)
    const { file: compressedFile, dataUrl } = await compressImage(file, 500 * 1024, 1200);

    if (supabase) {
      try {
        const ext = compressedFile.name.split('.').pop() || 'webp';
        const cleanCode = productCode.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'item';
        const fileName = `${cleanCode}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const filePath = `products/${fileName}`;

        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: compressedFile.type || 'image/webp',
          });

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

          if (publicUrlData && publicUrlData.publicUrl) {
            return publicUrlData.publicUrl;
          }
        } else if (error) {
          console.warn('Supabase storage upload error:', error.message);
        }
      } catch (uploadErr) {
        console.warn('Upload error, falling back to dataUrl:', uploadErr);
      }
    }

    // Fallback to compressed dataUrl if storage is offline / local mode
    return dataUrl;
  },

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'unit_cost'>): Promise<Product> {
    const id = generateUUID();
    const newProduct: Product = {
      ...input,
      id,
      lot_cost: parseFloat(input.lot_cost as any) || 0,
      stock_quantity: parseInt(input.stock_quantity as any, 10) || 0,
      is_active: input.is_active ?? true,
      image_url: input.image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            id: newProduct.id,
            product_code: newProduct.product_code,
            name: newProduct.name,
            size: newProduct.size || null,
            color: newProduct.color || null,
            stock_quantity: newProduct.stock_quantity,
            lot_cost: newProduct.lot_cost,
            is_active: newProduct.is_active,
            image_url: newProduct.image_url,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (data) {
        newProduct.created_at = data.created_at;
        newProduct.updated_at = data.updated_at;
      }
    }

    const localProducts = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    setLocal(STORAGE_KEYS.PRODUCTS, [newProduct, ...localProducts]);

    // Invalidate cache
    CacheManager.invalidate([CacheKeys.PRODUCTS]);

    return {
      ...newProduct,
      unit_cost:
        newProduct.stock_quantity > 0
          ? parseFloat((newProduct.lot_cost / newProduct.stock_quantity).toFixed(2))
          : 0,
    };
  },

  async updateProduct(id: string, input: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) throw new Error('Product not found.');

    const updated: Product = {
      ...existing,
      ...input,
      image_url: input.image_url !== undefined ? input.image_url : existing.image_url,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase
        .from('products')
        .update({
          product_code: updated.product_code,
          name: updated.name,
          size: updated.size || null,
          color: updated.color || null,
          stock_quantity: updated.stock_quantity,
          lot_cost: updated.lot_cost,
          is_active: updated.is_active,
          image_url: updated.image_url,
          updated_at: updated.updated_at,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    const localProducts = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const updatedList = localProducts.map((p) => (p.id === id ? updated : p));
    setLocal(STORAGE_KEYS.PRODUCTS, updatedList);

    // Invalidate cache
    CacheManager.invalidate([CacheKeys.PRODUCTS]);

    return updated;
  },

  async deleteProduct(id: string): Promise<void> {
    let hasOrders = false;

    if (supabase) {
      const { data: orderItemCheck, error: oiErr } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', id)
        .limit(1);

      if (!oiErr && orderItemCheck && orderItemCheck.length > 0) {
        hasOrders = true;
      }
    } else {
      const orderItems = getLocal<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []);
      hasOrders = orderItems.some((item) => item.product_id === id);
    }

    if (hasOrders) {
      // Soft-delete to preserve historical invoices and prevent FK violations
      await this.updateProduct(id, { is_active: false });
    } else {
      if (supabase) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          await this.updateProduct(id, { is_active: false });
          return;
        }
      }
      const localProducts = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      setLocal(STORAGE_KEYS.PRODUCTS, localProducts.filter((p) => p.id !== id));
    }

    // Invalidate cache
    CacheManager.invalidate([CacheKeys.PRODUCTS]);
  },

  // ==========================================
  // CUSTOMERS & DETERMINISTIC LEDGER BALANCES (Requirement 1 & 11)
  // ==========================================
  async getCustomers(forceRefresh = false): Promise<Customer[]> {
    return CacheManager.fetchWithCache<Customer[]>(
      CacheKeys.CUSTOMERS,
      async () => {
        let customers: Customer[] = [];

        // 1. Try fetching from deterministic view in Supabase
        if (supabase) {
          const { data: viewData, error: viewErr } = await supabase
            .from('customer_balances_view')
            .select('*')
            .order('name', { ascending: true });

          if (!viewErr && viewData && viewData.length > 0) {
            return viewData.map((c: any) => ({
              id: c.customer_id,
              name: c.name,
              phone: c.phone,
              address: c.address,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              total_billed: parseFloat(c.total_billed) || 0,
              total_paid: parseFloat(c.total_paid) || 0,
              total_outstanding: parseFloat(c.total_outstanding) || 0,
              total_orders_count: parseInt(c.total_orders_count, 10) || 0,
            }));
          }

          // Fallback table fetch
          const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
          if (!error && data && data.length > 0) {
            customers = data;
          }
        }

        if (customers.length === 0) {
          customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
        }

        // Compute outstanding balances deterministically from active, non-voided orders
        const orders = await this.getOrders();
        return customers.map((c) => {
          const customerOrders = orders.filter((o) => o.customer_id === c.id && !o.is_voided);
          const totalBilled = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          const totalPaid = customerOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
          const totalOutstanding = customerOrders.reduce((sum, o) => sum + (o.remaining_amount || 0), 0);

          return {
            ...c,
            total_billed: totalBilled,
            total_paid: totalPaid,
            total_outstanding: totalOutstanding,
            total_orders_count: customerOrders.length,
          };
        });
      },
      {
        ttlMs: CACHE_TTL.CUSTOMERS,
        fallback: DEFAULT_CUSTOMERS,
        forceRefresh,
      }
    );
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  },

  async createCustomer(input: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const id = generateUUID();
    const newCustomer: Customer = {
      ...input,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_outstanding: 0,
      total_orders_count: 0,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            id: newCustomer.id,
            name: newCustomer.name,
            phone: newCustomer.phone || null,
            address: newCustomer.address || null,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (data) {
        newCustomer.created_at = data.created_at;
        newCustomer.updated_at = data.updated_at;
      }
    }

    const local = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    setLocal(STORAGE_KEYS.CUSTOMERS, [newCustomer, ...local]);

    // Invalidate cache
    CacheManager.invalidate([CacheKeys.CUSTOMERS]);

    return newCustomer;
  },

  async updateCustomer(id: string, input: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>): Promise<Customer> {
    const existing = await this.getCustomerById(id);
    if (!existing) throw new Error('Customer not found.');

    const updated: Customer = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase
        .from('customers')
        .update({
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          updated_at: updated.updated_at,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    const local = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    const updatedList = local.map((c) => (c.id === id ? updated : c));
    setLocal(STORAGE_KEYS.CUSTOMERS, updatedList);

    // Invalidate cache
    CacheManager.invalidate([CacheKeys.CUSTOMERS]);

    return updated;
  },

  // ==========================================
  // ORDERS, ATOMIC CHECKOUT & CONCURRENCY
  // ==========================================
  async getOrders(forceRefresh = false): Promise<Order[]> {
    return CacheManager.fetchWithCache<Order[]>(
      CacheKeys.ORDERS,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              customer:customers(*),
              items:order_items(*)
            `)
            .order('order_date', { ascending: false });

          if (!error && data) {
            return data.map((o: any) => ({
              id: o.id,
              invoice_number: o.invoice_number,
              customer_id: o.customer_id,
              customer: o.customer,
              order_date: o.order_date,
              subtotal: parseFloat(o.subtotal) || 0,
              total_amount: parseFloat(o.total_amount) || 0,
              amount_paid: parseFloat(o.amount_paid) || 0,
              remaining_amount: parseFloat(o.remaining_amount) || 0,
              payment_status: o.payment_status,
              notes: o.notes,
              idempotency_key: o.idempotency_key,
              is_voided: o.is_voided ?? false,
              voided_at: o.voided_at,
              void_reason: o.void_reason,
              voided_by: o.voided_by,
              items: (o.items || []).map((it: any) => ({
                id: it.id,
                order_id: it.order_id,
                product_id: it.product_id,
                product_code_snapshot: it.product_code_snapshot,
                product_name_snapshot: it.product_name_snapshot,
                size_snapshot: it.size_snapshot,
                color_snapshot: it.color_snapshot,
                quantity: it.quantity,
                selling_price_per_unit: parseFloat(it.selling_price_per_unit) || 0,
                line_total: parseFloat(it.line_total) || 0,
                unit_cost: parseFloat(it.unit_cost || 0),
                total_cost: parseFloat(it.total_cost || 0),
                created_at: it.created_at,
              })),
              created_at: o.created_at,
              updated_at: o.updated_at,
            }));
          }
        }

        const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
        const localItems = getLocal<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []);
        const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);

        return localOrders.map((o) => ({
          ...o,
          customer: customers.find((c) => c.id === o.customer_id),
          items: localItems.filter((it) => it.order_id === o.id),
        }));
      },
      {
        ttlMs: CACHE_TTL.ORDERS,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async getOrderById(idOrInvoice: string): Promise<Order | null> {
    let order: Order | null = null;

    if (supabase) {
      try {
        const isUUID = idOrInvoice.includes('-') && idOrInvoice.length > 20;
        const query = supabase
          .from('orders')
          .select(`
            *,
            customer:customers(*),
            items:order_items(*)
          `);

        const { data, error } = isUUID
          ? await query.eq('id', idOrInvoice).single()
          : await query.eq('invoice_number', idOrInvoice).single();

        if (!error && data) {
          // Fetch payment allocations & installments for this order
          const { data: allocData } = await supabase
            .from('payment_allocations')
            .select(`
              id,
              payment_id,
              order_id,
              amount_allocated,
              created_at,
              payment:payments(id, amount, payment_date, payment_method, note, is_voided)
            `)
            .eq('order_id', data.id)
            .order('created_at', { ascending: true });

          const paymentsHistory: any[] = (allocData || [])
            .filter((a: any) => !a.payment?.is_voided)
            .map((a: any) => ({
              id: a.id,
              payment_id: a.payment_id,
              amount_allocated: parseFloat(a.amount_allocated) || 0,
              payment_date: a.payment?.payment_date || a.created_at,
              payment_method: a.payment?.payment_method || 'Cash',
              note: a.payment?.note || null,
            }));

          // Dynamically calculate remaining balance from allocated payments (Requirement 10)
          const totalAllocated = paymentsHistory.reduce((sum, p) => sum + p.amount_allocated, 0);
          const totalAmt = parseFloat(data.total_amount) || 0;
          const dynamicRemaining = Math.max(0, totalAmt - totalAllocated);

          order = {
            id: data.id,
            invoice_number: data.invoice_number,
            customer_id: data.customer_id,
            customer: data.customer,
            order_date: data.order_date,
            subtotal: parseFloat(data.subtotal) || 0,
            total_amount: totalAmt,
            amount_paid: totalAllocated,
            remaining_amount: dynamicRemaining,
            payment_status: data.is_voided
              ? 'UNPAID'
              : dynamicRemaining === 0
              ? 'PAID'
              : totalAllocated > 0
              ? 'PARTIALLY_PAID'
              : 'UNPAID',
            notes: data.notes,
            idempotency_key: data.idempotency_key,
            is_voided: data.is_voided ?? false,
            voided_at: data.voided_at,
            void_reason: data.void_reason,
            voided_by: data.voided_by,
            items: (data.items || []).map((it: any) => ({
              id: it.id,
              order_id: it.order_id,
              product_id: it.product_id,
              product_code_snapshot: it.product_code_snapshot,
              product_name_snapshot: it.product_name_snapshot,
              size_snapshot: it.size_snapshot,
              color_snapshot: it.color_snapshot,
              quantity: it.quantity,
              selling_price_per_unit: parseFloat(it.selling_price_per_unit) || 0,
              line_total: parseFloat(it.line_total) || 0,
              unit_cost: parseFloat(it.unit_cost || 0),
              total_cost: parseFloat(it.total_cost || 0),
              created_at: it.created_at,
            })),
            payments_history: paymentsHistory,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('Error fetching order by ID from Supabase:', err);
      }
    }

    if (!order) {
      const orders = await this.getOrders();
      order = orders.find((o) => o.id === idOrInvoice || o.invoice_number === idOrInvoice) || null;
      if (order) {
        const localAllocations = getLocal<any[]>(STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
        const localPayments = getLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
        const orderAllocs = localAllocations.filter((a) => a.order_id === order!.id);

        order.payments_history = orderAllocs
          .map((a) => {
            const pay = localPayments.find((p) => p.id === a.payment_id && !p.is_voided);
            if (!pay) return null;
            return {
              id: a.id,
              payment_id: a.payment_id,
              amount_allocated: a.amount_allocated,
              payment_date: pay.payment_date || a.created_at,
              payment_method: pay.payment_method || 'Cash',
              note: pay.note || null,
            };
          })
          .filter(Boolean) as any;
      }
    }

    return order;
  },

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const idempotencyKey = input.idempotency_key || generateUUID();

    // 1. If Supabase is available, call the hardened PostgreSQL stored procedure
    if (supabase) {
      const { data, error } = await supabase.rpc('create_wholesale_order', {
        p_customer_id: input.customer_id,
        p_items: input.items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          selling_price_per_unit: it.selling_price_per_unit,
        })),
        p_amount_paid: input.amount_paid,
        p_payment_method: input.payment_method || 'Cash',
        p_notes: input.notes || null,
        p_order_date: input.order_date || new Date().toISOString(),
        p_idempotency_key: idempotencyKey,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.order_id) {
        CacheManager.invalidate([CacheKeys.ORDERS, CacheKeys.PRODUCTS, CacheKeys.CUSTOMERS, CacheKeys.PAYMENTS]);
        const fullOrder = await this.getOrderById(data.order_id);
        if (fullOrder) return fullOrder;
      }
    }

    // 2. Local Fallback Atomic Workflow
    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    const customer = customers.find((c) => c.id === input.customer_id);
    if (!customer) throw new Error('Customer not found.');

    if (!input.items || input.items.length === 0) {
      throw new Error('Order must contain at least one product.');
    }

    // Stock Validation & Subtotal Calculation
    let subtotal = 0;
    for (const it of input.items) {
      if (it.quantity <= 0) throw new Error('Quantity must be greater than zero.');
      if (it.selling_price_per_unit < 0) throw new Error('Selling price cannot be negative.');

      const product = products.find((p) => p.id === it.product_id && p.is_active);
      if (!product) throw new Error('Selected product not found.');

      if (product.stock_quantity < it.quantity) {
        throw new Error(
          `Insufficient stock. Only ${product.stock_quantity} pieces available for ${product.name} (${product.product_code}).`
        );
      }

      subtotal += it.quantity * it.selling_price_per_unit;
    }

    const totalAmount = subtotal;
    if (input.amount_paid < 0) throw new Error('Amount paid cannot be negative.');
    if (input.amount_paid > totalAmount) {
      throw new Error(`Amount paid (Rs. ${input.amount_paid}) cannot exceed Order Total (Rs. ${totalAmount}).`);
    }

    const remainingAmount = Math.max(0, totalAmount - input.amount_paid);
    let paymentStatus: PaymentStatus = 'UNPAID';
    if (remainingAmount === 0) paymentStatus = 'PAID';
    else if (input.amount_paid > 0) paymentStatus = 'PARTIALLY_PAID';

    // Generate Invoice Number
    const seq = getLocal<number>(STORAGE_KEYS.INVOICE_SEQ, 1);
    const invoiceNumber = `INV-${String(seq).padStart(5, '0')}`;
    setLocal(STORAGE_KEYS.INVOICE_SEQ, seq + 1);

    const orderId = generateUUID();
    const orderDate = input.order_date || new Date().toISOString();

    const orderItems: OrderItem[] = [];
    const updatedProducts = [...products];

    // Insert Order Items & Deduct Stock with remaining lot cost update
    for (const it of input.items) {
      const prodIdx = updatedProducts.findIndex((p) => p.id === it.product_id);
      const prod = updatedProducts[prodIdx];

      const unitCost = prod.stock_quantity > 0 ? prod.lot_cost / prod.stock_quantity : 0;
      const lineTotal = it.quantity * it.selling_price_per_unit;
      const totalCost = unitCost * it.quantity;

      const orderItem: OrderItem = {
        id: generateUUID(),
        order_id: orderId,
        product_id: prod.id,
        product_code_snapshot: prod.product_code,
        product_name_snapshot: prod.name,
        size_snapshot: prod.size,
        color_snapshot: prod.color,
        quantity: it.quantity,
        selling_price_per_unit: it.selling_price_per_unit,
        line_total: lineTotal,
        unit_cost: unitCost,
        total_cost: totalCost,
        created_at: orderDate,
      };
      orderItems.push(orderItem);

      const newStock = prod.stock_quantity - it.quantity;
      const newLotCost = newStock > 0 ? newStock * unitCost : 0;
      updatedProducts[prodIdx] = {
        ...prod,
        stock_quantity: newStock,
        lot_cost: newLotCost,
        updated_at: orderDate,
      };
    }

    const newOrder: Order = {
      id: orderId,
      invoice_number: invoiceNumber,
      customer_id: input.customer_id,
      customer,
      order_date: orderDate,
      subtotal,
      total_amount: totalAmount,
      amount_paid: input.amount_paid,
      remaining_amount: remainingAmount,
      payment_status: paymentStatus,
      notes: input.notes,
      items: orderItems,
      idempotency_key: idempotencyKey,
      is_voided: false,
      created_at: orderDate,
      updated_at: orderDate,
    };

    // Record initial payment if paid > 0
    if (input.amount_paid > 0) {
      const paymentId = generateUUID();
      const newPayment: Payment = {
        id: paymentId,
        customer_id: input.customer_id,
        customer_name: customer.name,
        amount: input.amount_paid,
        payment_date: orderDate,
        payment_method: input.payment_method,
        note: `Initial payment for ${invoiceNumber}`,
        idempotency_key: `${idempotencyKey}_init_pay`,
        is_voided: false,
        created_at: orderDate,
      };

      const localPayments = getLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
      setLocal(STORAGE_KEYS.PAYMENTS, [newPayment, ...localPayments]);

      const localAllocations = getLocal<any[]>(STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);
      setLocal(STORAGE_KEYS.PAYMENT_ALLOCATIONS, [
        {
          id: generateUUID(),
          payment_id: paymentId,
          order_id: orderId,
          amount_allocated: input.amount_paid,
          created_at: orderDate,
        },
        ...localAllocations,
      ]);
    }

    // Persist changes locally
    setLocal(STORAGE_KEYS.PRODUCTS, updatedProducts);
    const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
    setLocal(STORAGE_KEYS.ORDERS, [newOrder, ...localOrders]);
    const localAllItems = getLocal<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []);
    setLocal(STORAGE_KEYS.ORDER_ITEMS, [...orderItems, ...localAllItems]);

    // Invalidate all related caches
    CacheManager.invalidate([CacheKeys.ORDERS, CacheKeys.PRODUCTS, CacheKeys.CUSTOMERS, CacheKeys.PAYMENTS]);

    return newOrder;
  },

  // ==========================================
  // TRANSACTIONAL VOIDING / REVERSALS (Requirement 6)
  // ==========================================
  async voidOrder(orderId: string, reason = 'Order Voided', userId = 'system'): Promise<void> {
    if (supabase) {
      const { error } = await supabase.rpc('void_wholesale_order', {
        p_order_id: orderId,
        p_reason: reason,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
    } else {
      const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
      const order = localOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found.');
      if (order.is_voided) throw new Error('Order is already voided.');

      // Restore product stock
      const localProducts = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      const localItems = getLocal<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []).filter((it) => it.order_id === orderId);

      localItems.forEach((it) => {
        const pIdx = localProducts.findIndex((p) => p.id === it.product_id);
        if (pIdx !== -1) {
          localProducts[pIdx].stock_quantity += it.quantity;
          localProducts[pIdx].lot_cost += it.total_cost;
        }
      });
      setLocal(STORAGE_KEYS.PRODUCTS, localProducts);

      order.is_voided = true;
      order.payment_status = 'UNPAID';
      order.remaining_amount = 0;
      order.voided_at = new Date().toISOString();
      order.void_reason = reason;
      setLocal(STORAGE_KEYS.ORDERS, localOrders);
    }

    CacheManager.invalidate([CacheKeys.ORDERS, CacheKeys.PRODUCTS, CacheKeys.CUSTOMERS, CacheKeys.PAYMENTS]);
  },

  async voidPayment(paymentId: string, reason = 'Payment Reversed', userId = 'system'): Promise<void> {
    if (supabase) {
      const { error } = await supabase.rpc('void_customer_payment', {
        p_payment_id: paymentId,
        p_reason: reason,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
    } else {
      const localPayments = getLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
      const payment = localPayments.find((p) => p.id === paymentId);
      if (!payment) throw new Error('Payment not found.');
      if (payment.is_voided) throw new Error('Payment is already voided.');

      payment.is_voided = true;
      payment.voided_at = new Date().toISOString();
      payment.void_reason = reason;
      setLocal(STORAGE_KEYS.PAYMENTS, localPayments);
    }

    CacheManager.invalidate([CacheKeys.PAYMENTS, CacheKeys.ORDERS, CacheKeys.CUSTOMERS]);
  },

  // ==========================================
  // PAYMENTS & FIFO ALLOCATION (Requirement 2 & 3)
  // ==========================================
  async getPayments(forceRefresh = false): Promise<Payment[]> {
    return CacheManager.fetchWithCache<Payment[]>(
      CacheKeys.PAYMENTS,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('payments')
            .select(`
              *,
              customer:customers(name),
              allocations:payment_allocations(
                *,
                order:orders(invoice_number)
              )
            `)
            .order('payment_date', { ascending: false });

          if (!error && data) {
            return data.map((p: any) => ({
              id: p.id,
              customer_id: p.customer_id,
              customer_name: p.customer?.name,
              amount: parseFloat(p.amount) || 0,
              payment_date: p.payment_date,
              payment_method: p.payment_method,
              note: p.note,
              idempotency_key: p.idempotency_key,
              is_voided: p.is_voided ?? false,
              voided_at: p.voided_at,
              void_reason: p.void_reason,
              allocations: (p.allocations || []).map((a: any) => ({
                id: a.id,
                payment_id: a.payment_id,
                order_id: a.order_id,
                invoice_number: a.order?.invoice_number,
                amount_allocated: parseFloat(a.amount_allocated) || 0,
                created_at: a.created_at,
              })),
              created_at: p.created_at,
            }));
          }
        }

        const localPayments = getLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
        const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
        return localPayments.map((p) => ({
          ...p,
          customer_name: customers.find((c) => c.id === p.customer_id)?.name,
        }));
      },
      {
        ttlMs: CACHE_TTL.PAYMENTS,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async recordPayment(input: RecordPaymentInput): Promise<Payment> {
    if (input.amount <= 0) throw new Error('Payment amount must be greater than zero.');

    const idempotencyKey = input.idempotency_key || generateUUID();
    const paymentDate = input.payment_date || new Date().toISOString();

    // 1. If Supabase is connected, call the atomic PostgreSQL stored procedure
    if (supabase) {
      const { data, error } = await supabase.rpc('record_customer_payment', {
        p_customer_id: input.customer_id,
        p_amount: input.amount,
        p_payment_method: input.payment_method || 'Cash',
        p_note: input.note || null,
        p_payment_date: paymentDate,
        p_idempotency_key: idempotencyKey,
        p_target_order_id: input.order_id || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Invalidate relevant caches immediately
      CacheManager.invalidate([CacheKeys.PAYMENTS, CacheKeys.ORDERS, CacheKeys.CUSTOMERS]);

      if (data && data.payment_id) {
        const { data: pData, error: fetchErr } = await supabase
          .from('payments')
          .select(`
            *,
            customer:customers(name),
            allocations:payment_allocations(
              *,
              order:orders(invoice_number)
            )
          `)
          .eq('id', data.payment_id)
          .single();

        if (!fetchErr && pData) {
          return {
            id: pData.id,
            customer_id: pData.customer_id,
            customer_name: pData.customer?.name,
            amount: parseFloat(pData.amount) || 0,
            payment_date: pData.payment_date,
            payment_method: pData.payment_method,
            note: pData.note,
            idempotency_key: pData.idempotency_key,
            is_voided: pData.is_voided ?? false,
            allocations: (pData.allocations || []).map((a: any) => ({
              id: a.id,
              payment_id: a.payment_id,
              order_id: a.order_id,
              invoice_number: a.order?.invoice_number,
              amount_allocated: parseFloat(a.amount_allocated) || 0,
              created_at: a.created_at,
            })),
            created_at: pData.created_at,
          };
        }
      }
    }

    // 2. Local Fallback Atomic Workflow
    const paymentId = generateUUID();
    const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    const customer = customers.find((c) => c.id === input.customer_id);
    if (!customer) throw new Error('Customer not found.');

    const newPayment: Payment = {
      id: paymentId,
      customer_id: input.customer_id,
      customer_name: customer.name,
      amount: input.amount,
      payment_date: paymentDate,
      payment_method: input.payment_method,
      note: input.note,
      idempotency_key: idempotencyKey,
      is_voided: false,
      allocations: [],
      created_at: paymentDate,
    };

    const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
    const localAllocations = getLocal<PaymentAllocation[]>(STORAGE_KEYS.PAYMENT_ALLOCATIONS, []);

    let remainingToAllocate = input.amount;
    const newAllocations: PaymentAllocation[] = [];

    // Target order prioritization or FIFO order
    const candidateOrders = localOrders
      .filter((o) => o.customer_id === input.customer_id && !o.is_voided && o.remaining_amount > 0)
      .sort((a, b) => {
        if (input.order_id) {
          if (a.id === input.order_id) return -1;
          if (b.id === input.order_id) return 1;
        }
        return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
      });

    for (const ord of candidateOrders) {
      if (remainingToAllocate <= 0) break;

      const allocAmount = Math.min(ord.remaining_amount, remainingToAllocate);
      ord.amount_paid += allocAmount;
      ord.remaining_amount -= allocAmount;

      if (ord.remaining_amount === 0) ord.payment_status = 'PAID';
      else ord.payment_status = 'PARTIALLY_PAID';

      ord.updated_at = paymentDate;

      const allocRecord: PaymentAllocation = {
        id: generateUUID(),
        payment_id: paymentId,
        order_id: ord.id,
        invoice_number: ord.invoice_number,
        amount_allocated: allocAmount,
        created_at: paymentDate,
      };

      newAllocations.push(allocRecord);
      remainingToAllocate -= allocAmount;
    }

    newPayment.allocations = newAllocations;

    // Persist
    const localPayments = getLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    setLocal(STORAGE_KEYS.PAYMENTS, [newPayment, ...localPayments]);
    setLocal(STORAGE_KEYS.ORDERS, localOrders);
    setLocal(STORAGE_KEYS.PAYMENT_ALLOCATIONS, [...newAllocations, ...localAllocations]);

    // Invalidate
    CacheManager.invalidate([CacheKeys.PAYMENTS, CacheKeys.ORDERS, CacheKeys.CUSTOMERS]);

    return newPayment;
  },

  // ==========================================
  // CASH REGISTER & SESSIONS (Requirement 12)
  // ==========================================
  async getActiveRegisterSession(): Promise<RegisterSession | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('register_sessions')
        .select('*')
        .eq('status', 'OPEN')
        .order('opened_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const s = data[0];
        return {
          id: s.id,
          opened_at: s.opened_at,
          closed_at: s.closed_at,
          opening_cash: parseFloat(s.opening_cash) || 0,
          closing_cash_actual: s.closing_cash_actual ? parseFloat(s.closing_cash_actual) : null,
          expected_cash: parseFloat(s.expected_cash) || 0,
          cash_sales_total: parseFloat(s.cash_sales_total) || 0,
          cash_payments_total: parseFloat(s.cash_payments_total) || 0,
          cash_expenses_total: parseFloat(s.cash_expenses_total) || 0,
          difference: s.difference ? parseFloat(s.difference) : 0,
          status: s.status,
          opened_by: s.opened_by,
          closed_by: s.closed_by,
          notes: s.notes,
          created_at: s.created_at,
          updated_at: s.updated_at,
        };
      }
    }

    const localSessions = getLocal<RegisterSession[]>(STORAGE_KEYS.REGISTER_SESSIONS, []);
    return localSessions.find((s) => s.status === 'OPEN') || null;
  },

  async openRegisterSession(openingCash: number, openedBy = 'Cashier'): Promise<RegisterSession> {
    const newSession: RegisterSession = {
      id: generateUUID(),
      opened_at: new Date().toISOString(),
      opening_cash: openingCash,
      expected_cash: openingCash,
      cash_sales_total: 0,
      cash_payments_total: 0,
      cash_expenses_total: 0,
      status: 'OPEN',
      opened_by: openedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('register_sessions')
        .insert([
          {
            id: newSession.id,
            opened_at: newSession.opened_at,
            opening_cash: openingCash,
            expected_cash: openingCash,
            status: 'OPEN',
            opened_by: openedBy,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
    }

    const localSessions = getLocal<RegisterSession[]>(STORAGE_KEYS.REGISTER_SESSIONS, []);
    setLocal(STORAGE_KEYS.REGISTER_SESSIONS, [newSession, ...localSessions]);

    return newSession;
  },

  async closeRegisterSession(
    sessionId: string,
    actualClosingCash: number,
    closedBy = 'Cashier',
    notes?: string
  ): Promise<RegisterSession> {
    const closedAt = new Date().toISOString();

    if (supabase) {
      // Calculate movements
      const { data: movements } = await supabase
        .from('register_cash_movements')
        .select('movement_type, amount')
        .eq('session_id', sessionId);

      let cashSales = 0;
      let cashPayments = 0;
      let cashExpenses = 0;

      (movements || []).forEach((m: any) => {
        const amt = parseFloat(m.amount) || 0;
        if (m.movement_type === 'CASH_SALE') cashSales += amt;
        else if (m.movement_type === 'CUSTOMER_PAYMENT') cashPayments += amt;
        else if (m.movement_type === 'EXPENSE') cashExpenses += amt;
      });

      const { data: sessionData } = await supabase.from('register_sessions').select('*').eq('id', sessionId).single();
      const opening = parseFloat(sessionData?.opening_cash || '0');
      const expected = opening + cashSales + cashPayments - cashExpenses;
      const difference = actualClosingCash - expected;

      const { data: updated, error } = await supabase
        .from('register_sessions')
        .update({
          closed_at: closedAt,
          closing_cash_actual: actualClosingCash,
          expected_cash: expected,
          cash_sales_total: cashSales,
          cash_payments_total: cashPayments,
          cash_expenses_total: cashExpenses,
          difference: difference,
          status: 'CLOSED',
          closed_by: closedBy,
          notes: notes || null,
          updated_at: closedAt,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated;
    }

    const localSessions = getLocal<RegisterSession[]>(STORAGE_KEYS.REGISTER_SESSIONS, []);
    const sIdx = localSessions.findIndex((s) => s.id === sessionId);
    if (sIdx === -1) throw new Error('Session not found.');

    const s = localSessions[sIdx];
    s.status = 'CLOSED';
    s.closed_at = closedAt;
    s.closing_cash_actual = actualClosingCash;
    s.difference = actualClosingCash - s.expected_cash;
    s.closed_by = closedBy;
    s.notes = notes;

    setLocal(STORAGE_KEYS.REGISTER_SESSIONS, localSessions);
    return s;
  },

  // ==========================================
  // AUDIT LOGS (Requirement 7)
  // ==========================================
  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) return data;
    }
    return getLocal<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  },

  // ==========================================
  // BUSINESS SETTINGS
  // ==========================================
  async getSettings(forceRefresh = false): Promise<BusinessSettings> {
    return CacheManager.fetchWithCache<BusinessSettings>(
      CacheKeys.SETTINGS,
      async () => {
        if (supabase) {
          const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).single();
          if (!error && data) {
            return {
              business_name: data.business_name || DEFAULT_SETTINGS.business_name,
              phone: data.phone || DEFAULT_SETTINGS.phone,
              email: data.email || DEFAULT_SETTINGS.email,
              address: data.address || DEFAULT_SETTINGS.address,
              tax_rate_percent:
                data.tax_rate_percent !== null && data.tax_rate_percent !== undefined
                  ? parseFloat(data.tax_rate_percent)
                  : 0,
              currency_symbol: data.currency_symbol || 'Rs.',
              cashier_name: data.cashier_name || DEFAULT_SETTINGS.cashier_name,
            };
          }
        }
        return getLocal<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      },
      {
        ttlMs: CACHE_TTL.SETTINGS,
        fallback: DEFAULT_SETTINGS,
        forceRefresh,
      }
    );
  },

  async updateSettings(input: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const existing = await this.getSettings(true);
    const updated: BusinessSettings = { ...existing, ...input };

    if (supabase) {
      const { data, error } = await supabase
        .from('business_settings')
        .upsert({
          id: 1,
          business_name: updated.business_name,
          phone: updated.phone,
          email: updated.email || null,
          address: updated.address,
          tax_rate_percent: updated.tax_rate_percent ?? 0,
          currency_symbol: updated.currency_symbol || 'Rs.',
          cashier_name: updated.cashier_name || 'Tariq Mahmood',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (data) {
        updated.business_name = data.business_name;
        updated.phone = data.phone;
        updated.email = data.email;
        updated.address = data.address;
        updated.tax_rate_percent = parseFloat(data.tax_rate_percent) || 0;
        updated.currency_symbol = data.currency_symbol;
        updated.cashier_name = data.cashier_name;
      }
    }

    setLocal(STORAGE_KEYS.SETTINGS, updated);
    CacheManager.invalidate([CacheKeys.SETTINGS]);

    return updated;
  },

  async clearAllData(): Promise<void> {
    if (supabase) {
      await supabase.from('register_cash_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('register_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('payment_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.ORDER_ITEMS);
      localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
      localStorage.removeItem(STORAGE_KEYS.PAYMENT_ALLOCATIONS);
      localStorage.removeItem(STORAGE_KEYS.REGISTER_SESSIONS);
    }

    CacheManager.invalidateAll();
  },
};
