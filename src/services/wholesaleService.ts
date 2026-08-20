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
  Supplier,
  Purchase,
  PurchaseItem,
  PurchasePaymentHistory,
  SupplierPayment,
  CreatePurchaseInput,
  RecordSupplierPaymentInput,
  StaffMember,
  StaffSalaryPayment,
  CreateStaffInput,
  RecordSalaryPaymentInput,
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
  STAFF: 'wholesale_pos_staff_v2',
  STAFF_PAYMENTS: 'wholesale_pos_staff_payments_v2',
};

// Initial Seed Data for offline fallback
const DEFAULT_PRODUCTS: Product[] = [];

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
            .select(`
              *,
              variants:product_variants(*)
            `)
            .eq('is_active', true)
            .order('name', { ascending: true });

          if (!error && data && data.length > 0) {
            products = data;
          }
        }

        if (products.length === 0) {
          products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
        }

        return products.map((p) => {
          const variants = (p.variants || []).map((v: any) => ({
            id: v.id,
            product_id: v.product_id,
            color: v.color,
            size: v.size,
            stock_quantity: parseInt(v.stock_quantity as any, 10) || 0,
            created_at: v.created_at,
            updated_at: v.updated_at,
          }));

          // Calculate authoritative total stock from variants if present
          const totalVariantStock = variants.length > 0
            ? variants.reduce((sum: number, v: any) => sum + v.stock_quantity, 0)
            : parseInt(p.stock_quantity as any, 10) || 0;

          const unitCost = parseInt(p.unit_cost as any, 10) || (totalVariantStock > 0 ? Math.round(parseFloat(p.lot_cost as any) / totalVariantStock) : 0);
          const sellingPrice = parseInt(p.selling_price as any, 10) || Math.round(unitCost * 1.2);

          return {
            ...p,
            lot_cost: parseFloat(p.lot_cost as any) || (unitCost * totalVariantStock),
            stock_quantity: totalVariantStock,
            variants,
            unit_cost: unitCost,
            selling_price: sellingPrice,
          };
        });
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
      const fileName = `${productCode}_${Date.now()}.${compressedFile.type.split('/')[1] || 'jpg'}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        return urlData.publicUrl;
      }
    }

    return dataUrl;
  },

  async getProductById(id: string): Promise<Product | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(*)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        const variants = (data.variants || []).map((v: any) => ({
          id: v.id,
          product_id: v.product_id,
          color: v.color,
          size: v.size,
          stock_quantity: parseInt(v.stock_quantity as any, 10) || 0,
          created_at: v.created_at,
          updated_at: v.updated_at,
        }));

        const totalVariantStock = variants.length > 0
          ? variants.reduce((sum: number, v: any) => sum + v.stock_quantity, 0)
          : parseInt(data.stock_quantity as any, 10) || 0;

        const unitCost = parseInt(data.unit_cost as any, 10) || (totalVariantStock > 0 ? Math.round(parseFloat(data.lot_cost as any) / totalVariantStock) : 0);
        const sellingPrice = parseInt(data.selling_price as any, 10) || Math.round(unitCost * 1.2);

        return {
          ...data,
          lot_cost: parseFloat(data.lot_cost as any) || (unitCost * totalVariantStock),
          stock_quantity: totalVariantStock,
          variants,
          unit_cost: unitCost,
          selling_price: sellingPrice,
        };
      }
    }

    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  async createProduct(
    input: Omit<Product, 'id' | 'created_at' | 'updated_at'>,
    variantsInput?: Array<{ color: string; size: any; stock_quantity: number }>
  ): Promise<Product> {
    const id = generateUUID();

    // Compute total stock from variant list if supplied
    const initialVariants = variantsInput && variantsInput.length > 0 ? variantsInput : [];
    const totalStock = initialVariants.length > 0
      ? initialVariants.reduce((sum, v) => sum + (parseInt(v.stock_quantity as any, 10) || 0), 0)
      : parseInt(input.stock_quantity as any, 10) || 0;

    const unitCost = parseInt(input.unit_cost as any, 10) || 0;
    const sellingPrice = parseInt(input.selling_price as any, 10) || Math.round(unitCost * 1.2);
    const lotCost = unitCost * totalStock;

    const newProduct: Product = {
      ...input,
      id,
      unit_cost: unitCost,
      selling_price: sellingPrice,
      lot_cost: lotCost,
      stock_quantity: totalStock,
      is_active: input.is_active ?? true,
      image_url: input.image_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      // 1. Insert product record
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
            unit_cost: newProduct.unit_cost,
            selling_price: newProduct.selling_price,
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

      // 2. Insert variant records
      if (initialVariants.length > 0) {
        const variantInserts = initialVariants.map((v) => ({
          id: generateUUID(),
          product_id: newProduct.id,
          color: v.color.trim(),
          size: v.size,
          stock_quantity: parseInt(v.stock_quantity as any, 10) || 0,
        }));

        const { data: vData, error: vErr } = await supabase
          .from('product_variants')
          .insert(variantInserts)
          .select();

        if (vErr) throw new Error(`Failed to save product variants: ${vErr.message}`);
        if (vData) {
          newProduct.variants = vData;
        }
      }
    } else {
      // Local storage variants
      if (initialVariants.length > 0) {
        newProduct.variants = initialVariants.map((v) => ({
          id: generateUUID(),
          product_id: newProduct.id,
          color: v.color.trim(),
          size: v.size,
          stock_quantity: parseInt(v.stock_quantity as any, 10) || 0,
          created_at: newProduct.created_at,
          updated_at: newProduct.updated_at,
        }));
      }
    }

    const localProducts = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    setLocal(STORAGE_KEYS.PRODUCTS, [newProduct, ...localProducts]);

    // Invalidate cache
    CacheManager.invalidate([CacheKeys.PRODUCTS]);

    return newProduct;
  },

  async updateProduct(
    id: string,
    input: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>,
    variantsInput?: Array<{ id?: string; color: string; size: any; stock_quantity: number }>
  ): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) throw new Error('Product not found.');

    const initialVariants = variantsInput && variantsInput.length > 0 ? variantsInput : (existing.variants || []);
    const totalStock = initialVariants.length > 0
      ? initialVariants.reduce((sum, v) => sum + (parseInt(v.stock_quantity as any, 10) || 0), 0)
      : input.stock_quantity !== undefined ? parseInt(input.stock_quantity as any, 10) || 0 : existing.stock_quantity;

    const unitCost = input.unit_cost !== undefined ? parseInt(input.unit_cost as any, 10) || 0 : existing.unit_cost;
    const sellingPrice = input.selling_price !== undefined ? parseInt(input.selling_price as any, 10) || 0 : existing.selling_price;
    const lotCost = unitCost * totalStock;

    const updated: Product = {
      ...existing,
      ...input,
      unit_cost: unitCost,
      selling_price: sellingPrice,
      lot_cost: lotCost,
      stock_quantity: totalStock,
      image_url: input.image_url !== undefined ? input.image_url : existing.image_url,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      // 1. Update product table
      const { error } = await supabase
        .from('products')
        .update({
          product_code: updated.product_code,
          name: updated.name,
          size: updated.size || null,
          color: updated.color || null,
          stock_quantity: updated.stock_quantity,
          unit_cost: updated.unit_cost,
          selling_price: updated.selling_price,
          lot_cost: updated.lot_cost,
          is_active: updated.is_active,
          image_url: updated.image_url,
          updated_at: updated.updated_at,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);

      // 2. Upsert/sync variants in product_variants table
      if (variantsInput && variantsInput.length > 0) {
        // Delete variants not in updated list
        const currentVariantIds = variantsInput.filter((v) => v.id).map((v) => v.id);
        if (currentVariantIds.length > 0) {
          await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', id)
            .not('id', 'in', `(${currentVariantIds.join(',')})`);
        } else {
          await supabase.from('product_variants').delete().eq('product_id', id);
        }

        const upsertRows = variantsInput.map((v) => ({
          id: v.id || generateUUID(),
          product_id: id,
          color: v.color.trim(),
          size: v.size,
          stock_quantity: parseInt(v.stock_quantity as any, 10) || 0,
          updated_at: new Date().toISOString(),
        }));

        const { data: upData, error: upErr } = await supabase
          .from('product_variants')
          .upsert(upsertRows, { onConflict: 'product_id, color, size' })
          .select();

        if (upErr) throw new Error(`Failed to update variants: ${upErr.message}`);
        if (upData) {
          updated.variants = upData;
        }
      }
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

  async deleteCustomer(id: string): Promise<void> {
    if (supabase) {
      // Check if customer has associated active orders or payments
      const { data: orderCheck } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', id)
        .limit(1);

      if (orderCheck && orderCheck.length > 0) {
        // Cascade delete allocations, payments, items and orders for this customer
        const { data: custOrders } = await supabase.from('orders').select('id').eq('customer_id', id);
        const orderIds = (custOrders || []).map((o) => o.id);

        if (orderIds.length > 0) {
          await supabase.from('payment_allocations').delete().in('order_id', orderIds);
          await supabase.from('order_items').delete().in('order_id', orderIds);
          await supabase.from('orders').delete().eq('customer_id', id);
        }
        await supabase.from('payments').delete().eq('customer_id', id);
      }

      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }

    const local = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, DEFAULT_CUSTOMERS);
    setLocal(STORAGE_KEYS.CUSTOMERS, local.filter((c) => c.id !== id));

    // Invalidate caches
    CacheManager.invalidate([CacheKeys.CUSTOMERS, CacheKeys.ORDERS, CacheKeys.PAYMENTS]);
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
              due_date: o.due_date || null,
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
            due_date: data.due_date || null,
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
          variant_id: it.variant_id || null,
          quantity: it.quantity,
          selling_price_per_unit: it.selling_price_per_unit,
        })),
        p_amount_paid: input.amount_paid,
        p_payment_method: input.payment_method || 'Cash',
        p_notes: input.notes || null,
        p_order_date: input.order_date || new Date().toISOString(),
        p_idempotency_key: idempotencyKey,
        p_due_date: input.due_date || null,
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
      due_date: input.due_date || null,
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

  async updateOrderDueDate(orderId: string, dueDate: string | null): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('orders')
        .update({ due_date: dueDate, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw new Error(error.message);
    }

    const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
    const updatedList = localOrders.map((o) => (o.id === orderId ? { ...o, due_date: dueDate } : o));
    setLocal(STORAGE_KEYS.ORDERS, updatedList);

    CacheManager.invalidate([CacheKeys.ORDERS, CacheKeys.CUSTOMERS]);
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

  // ==========================================
  // SUPPLIERS & PAYABLE LEDGER
  // ==========================================
  async getSuppliers(forceRefresh = false): Promise<Supplier[]> {
    return CacheManager.fetchWithCache<Supplier[]>(
      CacheKeys.SUPPLIERS,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('supplier_balances_view')
            .select('*')
            .order('name', { ascending: true });

          if (!error && data) {
            return data.map((s: any) => ({
              id: s.supplier_id || s.id,
              name: s.name,
              phone: s.phone,
              address: s.address,
              notes: s.notes,
              is_active: s.is_active ?? true,
              created_at: s.created_at,
              updated_at: s.updated_at,
              total_purchased: parseFloat(s.total_purchased) || 0,
              total_paid: parseFloat(s.total_paid) || 0,
              total_outstanding: parseFloat(s.total_outstanding) || 0,
              total_purchases_count: parseInt(s.total_purchases_count) || 0,
            }));
          }
        }
        return [];
      },
      {
        ttlMs: CACHE_TTL.SUPPLIERS,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async getSupplierById(id: string): Promise<Supplier | null> {
    const suppliers = await this.getSuppliers();
    return suppliers.find((s) => s.id === id) || null;
  },

  async createSupplier(input: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Supplier> {
    const id = generateUUID();
    const newSupplier: Supplier = {
      ...input,
      id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_outstanding: 0,
      total_purchases_count: 0,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          id: newSupplier.id,
          name: newSupplier.name,
          phone: newSupplier.phone || null,
          address: newSupplier.address || null,
          notes: newSupplier.notes || null,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (data) {
        newSupplier.created_at = data.created_at;
        newSupplier.updated_at = data.updated_at;
      }
    }

    CacheManager.invalidate([CacheKeys.SUPPLIERS]);
    return newSupplier;
  },

  async updateSupplier(id: string, input: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>): Promise<Supplier> {
    const existing = await this.getSupplierById(id);
    if (!existing) throw new Error('Supplier not found.');

    const updated: Supplier = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          notes: updated.notes,
          updated_at: updated.updated_at,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    CacheManager.invalidate([CacheKeys.SUPPLIERS]);
    return updated;
  },

  async deleteSupplier(id: string): Promise<void> {
    if (supabase) {
      // Cascade delete supplier payment allocations, payments, purchase items, purchases
      const { data: supplierPurchases } = await supabase.from('purchases').select('id').eq('supplier_id', id);
      const purchaseIds = (supplierPurchases || []).map((p) => p.id);

      if (purchaseIds.length > 0) {
        await supabase.from('supplier_payment_allocations').delete().in('purchase_id', purchaseIds);
        await supabase.from('purchase_items').delete().in('purchase_id', purchaseIds);
        await supabase.from('purchases').delete().eq('supplier_id', id);
      }
      await supabase.from('supplier_payments').delete().eq('supplier_id', id);

      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }

    CacheManager.invalidate([CacheKeys.SUPPLIERS, CacheKeys.PURCHASES, CacheKeys.SUPPLIER_PAYMENTS, CacheKeys.PRODUCTS]);
  },

  // ==========================================
  // PURCHASES (STOCK RECEIPTS)
  // ==========================================
  async getPurchases(forceRefresh = false): Promise<Purchase[]> {
    return CacheManager.fetchWithCache<Purchase[]>(
      CacheKeys.PURCHASES,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('purchases')
            .select(`
              *,
              supplier:suppliers(*),
              items:purchase_items(*)
            `)
            .order('purchase_date', { ascending: false });

          if (!error && data) {
            return data.map((p: any) => ({
              id: p.id,
              purchase_number: p.purchase_number,
              supplier_id: p.supplier_id,
              supplier: p.supplier || null,
              purchase_date: p.purchase_date,
              total_cost: parseFloat(p.total_cost) || 0,
              amount_paid: parseFloat(p.amount_paid) || 0,
              remaining_amount: parseFloat(p.remaining_amount) || 0,
              payment_status: p.payment_status,
              notes: p.notes,
              idempotency_key: p.idempotency_key,
              is_voided: p.is_voided ?? false,
              voided_at: p.voided_at,
              void_reason: p.void_reason,
              created_at: p.created_at,
              updated_at: p.updated_at,
              items: (p.items || []).map((it: any) => ({
                id: it.id,
                purchase_id: it.purchase_id,
                product_id: it.product_id,
                variant_id: it.variant_id,
                product_name_snapshot: it.product_name_snapshot,
                color_snapshot: it.color_snapshot,
                size_snapshot: it.size_snapshot,
                quantity: it.quantity,
                cost_per_unit: parseFloat(it.cost_per_unit) || 0,
                line_total: parseFloat(it.line_total) || 0,
                created_at: it.created_at,
              })),
            }));
          }
        }
        return [];
      },
      {
        ttlMs: CACHE_TTL.PURCHASES,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async getPurchaseById(idOrNumber: string): Promise<Purchase | null> {
    if (supabase) {
      const isUUID = idOrNumber.includes('-') && idOrNumber.length > 20;
      const query = supabase
        .from('purchases')
        .select(`
          *,
          supplier:suppliers(*),
          items:purchase_items(*)
        `);

      const { data, error } = isUUID
        ? await query.eq('id', idOrNumber).single()
        : await query.eq('purchase_number', idOrNumber).single();

      if (!error && data) {
        // Fetch payment allocations for this purchase
        const { data: allocData } = await supabase
          .from('supplier_payment_allocations')
          .select(`
            id,
            supplier_payment_id,
            purchase_id,
            amount_allocated,
            created_at,
            payment:supplier_payments(id, amount, payment_date, payment_method, note, is_voided)
          `)
          .eq('purchase_id', data.id)
          .order('created_at', { ascending: true });

        const paymentsHistory: PurchasePaymentHistory[] = (allocData || [])
          .filter((a: any) => !a.payment?.is_voided)
          .map((a: any) => ({
            id: a.id,
            payment_id: a.supplier_payment_id,
            amount_allocated: parseFloat(a.amount_allocated) || 0,
            payment_date: a.payment?.payment_date || a.created_at,
            payment_method: a.payment?.payment_method || 'Cash',
            note: a.payment?.note || null,
          }));

        return {
          id: data.id,
          purchase_number: data.purchase_number,
          supplier_id: data.supplier_id,
          supplier: data.supplier || null,
          purchase_date: data.purchase_date,
          total_cost: parseFloat(data.total_cost) || 0,
          amount_paid: parseFloat(data.amount_paid) || 0,
          remaining_amount: parseFloat(data.remaining_amount) || 0,
          payment_status: data.payment_status,
          notes: data.notes,
          idempotency_key: data.idempotency_key,
          is_voided: data.is_voided ?? false,
          voided_at: data.voided_at,
          void_reason: data.void_reason,
          created_at: data.created_at,
          updated_at: data.updated_at,
          items: (data.items || []).map((it: any) => ({
            id: it.id,
            purchase_id: it.purchase_id,
            product_id: it.product_id,
            variant_id: it.variant_id,
            product_name_snapshot: it.product_name_snapshot,
            color_snapshot: it.color_snapshot,
            size_snapshot: it.size_snapshot,
            quantity: it.quantity,
            cost_per_unit: parseFloat(it.cost_per_unit) || 0,
            line_total: parseFloat(it.line_total) || 0,
            created_at: it.created_at,
          })),
          payments_history: paymentsHistory,
        };
      }
    }

    const purchases = await this.getPurchases();
    return purchases.find((p) => p.id === idOrNumber || p.purchase_number === idOrNumber) || null;
  },

  async createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
    const idempotencyKey = input.idempotency_key || generateUUID();

    if (supabase) {
      const { data, error } = await supabase.rpc('create_purchase', {
        p_supplier_id: input.supplier_id || null,
        p_items: input.items.map((it) => ({
          product_name: it.product_name,
          product_id: it.product_id || null,
          variant_id: it.variant_id || null,
          quantity: it.quantity,
          cost_per_unit: it.cost_per_unit,
          color_snapshot: it.color_snapshot || null,
          size_snapshot: it.size_snapshot || null,
        })),
        p_amount_paid: input.amount_paid,
        p_payment_method: input.payment_method || 'Cash',
        p_notes: input.notes || null,
        p_purchase_date: input.purchase_date || new Date().toISOString(),
        p_idempotency_key: idempotencyKey,
      });

      if (error) throw new Error(error.message);

      if (data && data.purchase_id) {
        CacheManager.invalidate([CacheKeys.PURCHASES, CacheKeys.PRODUCTS, CacheKeys.SUPPLIERS, CacheKeys.SUPPLIER_PAYMENTS]);
        const fullPurchase = await this.getPurchaseById(data.purchase_id);
        if (fullPurchase) return fullPurchase;
      }
    }

    throw new Error('Failed to create purchase. Database connection required.');
  },

  async voidPurchase(purchaseId: string, reason?: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.rpc('void_purchase', {
        p_purchase_id: purchaseId,
        p_void_reason: reason || 'Voided by admin',
      });
      if (error) throw new Error(error.message);
    }
    CacheManager.invalidate([CacheKeys.PURCHASES, CacheKeys.PRODUCTS, CacheKeys.SUPPLIERS, CacheKeys.SUPPLIER_PAYMENTS]);
  },

  // ==========================================
  // SUPPLIER PAYMENTS
  // ==========================================
  async getSupplierPayments(forceRefresh = false): Promise<SupplierPayment[]> {
    return CacheManager.fetchWithCache<SupplierPayment[]>(
      CacheKeys.SUPPLIER_PAYMENTS,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('supplier_payments')
            .select(`
              *,
              supplier:suppliers(name),
              allocations:supplier_payment_allocations(
                *,
                purchase:purchases(purchase_number)
              )
            `)
            .order('payment_date', { ascending: false });

          if (!error && data) {
            return data.map((p: any) => ({
              id: p.id,
              supplier_id: p.supplier_id,
              supplier_name: p.supplier?.name,
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
                supplier_payment_id: a.supplier_payment_id,
                purchase_id: a.purchase_id,
                purchase_number: a.purchase?.purchase_number,
                amount_allocated: parseFloat(a.amount_allocated) || 0,
                created_at: a.created_at,
              })),
              created_at: p.created_at,
            }));
          }
        }
        return [];
      },
      {
        ttlMs: CACHE_TTL.SUPPLIER_PAYMENTS,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async recordSupplierPayment(input: RecordSupplierPaymentInput): Promise<SupplierPayment> {
    if (input.amount <= 0) throw new Error('Payment amount must be greater than zero.');

    const idempotencyKey = input.idempotency_key || generateUUID();
    const paymentDate = input.payment_date || new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase.rpc('record_supplier_payment', {
        p_supplier_id: input.supplier_id,
        p_amount: input.amount,
        p_payment_method: input.payment_method || 'Cash',
        p_note: input.note || null,
        p_payment_date: paymentDate,
        p_idempotency_key: idempotencyKey,
        p_target_purchase_id: input.purchase_id || null,
      });

      if (error) throw new Error(error.message);

      CacheManager.invalidate([CacheKeys.SUPPLIER_PAYMENTS, CacheKeys.PURCHASES, CacheKeys.SUPPLIERS]);

      if (data && data.payment_id) {
        const { data: pData } = await supabase
          .from('supplier_payments')
          .select(`
            *,
            supplier:suppliers(name),
            allocations:supplier_payment_allocations(
              *,
              purchase:purchases(purchase_number)
            )
          `)
          .eq('id', data.payment_id)
          .single();

        if (pData) {
          return {
            id: pData.id,
            supplier_id: pData.supplier_id,
            supplier_name: pData.supplier?.name,
            amount: parseFloat(pData.amount) || 0,
            payment_date: pData.payment_date,
            payment_method: pData.payment_method,
            note: pData.note,
            idempotency_key: pData.idempotency_key,
            is_voided: pData.is_voided ?? false,
            allocations: (pData.allocations || []).map((a: any) => ({
              id: a.id,
              supplier_payment_id: a.supplier_payment_id,
              purchase_id: a.purchase_id,
              purchase_number: a.purchase?.purchase_number,
              amount_allocated: parseFloat(a.amount_allocated) || 0,
              created_at: a.created_at,
            })),
            created_at: pData.created_at,
          };
        }
      }
    }

    throw new Error('Failed to record supplier payment. Database connection required.');
  },

  async voidSupplierPayment(paymentId: string, reason?: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.rpc('void_supplier_payment', {
        p_payment_id: paymentId,
        p_void_reason: reason || 'Voided by admin',
      });
      if (error) throw new Error(error.message);
    }
    CacheManager.invalidate([CacheKeys.SUPPLIER_PAYMENTS, CacheKeys.PURCHASES, CacheKeys.SUPPLIERS]);
  },

  // ==========================================
  // STAFF & SALARY TRACKER
  // ==========================================
  async getStaffMembers(forceRefresh = false): Promise<StaffMember[]> {
    return CacheManager.fetchWithCache<StaffMember[]>(
      CacheKeys.STAFF,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('staff_members')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Also fetch salary payments to calculate total_paid and total_advances per staff
            const { data: paymentsData } = await supabase
              .from('staff_salary_payments')
              .select('staff_id, amount_paid, transaction_type');

            const paymentsMap: Record<string, number> = {};
            const advancesMap: Record<string, number> = {};
            (paymentsData || []).forEach((p) => {
              const amount = parseFloat(p.amount_paid) || 0;
              const type = p.transaction_type || 'SALARY';
              if (type === 'ADVANCE') {
                advancesMap[p.staff_id] = (advancesMap[p.staff_id] || 0) + amount;
              } else {
                paymentsMap[p.staff_id] = (paymentsMap[p.staff_id] || 0) + amount;
              }
            });

            return data.map((s: any) => ({
              id: s.id,
              name: s.name,
              phone: s.phone,
              role: s.role || 'Salesman',
              monthly_salary: parseFloat(s.monthly_salary) || 0,
              joining_date: s.joining_date,
              is_active: s.is_active ?? true,
              photo_url: s.photo_url || null,
              documents: Array.isArray(s.documents) ? s.documents : [],
              total_paid: paymentsMap[s.id] || 0,
              total_advances: advancesMap[s.id] || 0,
              created_at: s.created_at,
              updated_at: s.updated_at,
            }));
          }
        }

        const localStaff = getLocal<StaffMember[]>(STORAGE_KEYS.STAFF, []);
        const localPayments = getLocal<StaffSalaryPayment[]>(STORAGE_KEYS.STAFF_PAYMENTS, []);

        return localStaff.map((s) => {
          const staffPays = localPayments.filter((p) => p.staff_id === s.id);
          const totalPaid = staffPays
            .filter((p) => (p.transaction_type || 'SALARY') !== 'ADVANCE')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
          const totalAdvances = staffPays
            .filter((p) => p.transaction_type === 'ADVANCE')
            .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

          return {
            ...s,
            photo_url: s.photo_url || null,
            documents: s.documents || [],
            total_paid: totalPaid,
            total_advances: totalAdvances,
          };
        });
      },
      {
        ttlMs: CACHE_TTL.STAFF,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async uploadStaffDocument(file: File, staffName = 'staff'): Promise<string> {
    const { file: compressedFile, dataUrl } = await compressImage(file, 600 * 1024, 1400);

    if (supabase) {
      const sanitized = staffName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `staff_${sanitized}_${Date.now()}.${compressedFile.type.split('/')[1] || 'jpg'}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        return urlData.publicUrl;
      }
    }

    return dataUrl;
  },

  async getStaffMemberById(id: string): Promise<StaffMember | null> {
    const staff = await this.getStaffMembers();
    return staff.find((s) => s.id === id) || null;
  },

  async createStaffMember(input: CreateStaffInput): Promise<StaffMember> {
    const id = generateUUID();
    const newStaff: StaffMember = {
      id,
      name: input.name,
      phone: input.phone || null,
      role: input.role || 'Salesman',
      monthly_salary: input.monthly_salary || 0,
      joining_date: input.joining_date || new Date().toISOString().split('T')[0],
      is_active: true,
      photo_url: input.photo_url || null,
      documents: input.documents || [],
      total_paid: 0,
      total_advances: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('staff_members')
        .insert([
          {
            id: newStaff.id,
            name: newStaff.name,
            phone: newStaff.phone,
            role: newStaff.role,
            monthly_salary: newStaff.monthly_salary,
            joining_date: newStaff.joining_date,
            is_active: newStaff.is_active,
            photo_url: newStaff.photo_url,
            documents: newStaff.documents,
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (data) {
        newStaff.created_at = data.created_at;
        newStaff.updated_at = data.updated_at;
      }
    }

    const local = getLocal<StaffMember[]>(STORAGE_KEYS.STAFF, []);
    setLocal(STORAGE_KEYS.STAFF, [newStaff, ...local]);

    CacheManager.invalidate([CacheKeys.STAFF]);
    return newStaff;
  },

  async updateStaffMember(id: string, input: Partial<CreateStaffInput & { is_active?: boolean }>): Promise<StaffMember> {
    const existing = await this.getStaffMemberById(id);
    if (!existing) throw new Error('Staff member not found.');

    const updated: StaffMember = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase
        .from('staff_members')
        .update({
          name: updated.name,
          phone: updated.phone,
          role: updated.role,
          monthly_salary: updated.monthly_salary,
          joining_date: updated.joining_date,
          is_active: updated.is_active,
          photo_url: updated.photo_url,
          documents: updated.documents,
          updated_at: updated.updated_at,
        })
        .eq('id', id);

      if (error) throw new Error(error.message);
    }

    const local = getLocal<StaffMember[]>(STORAGE_KEYS.STAFF, []);
    const updatedList = local.map((s) => (s.id === id ? updated : s));
    setLocal(STORAGE_KEYS.STAFF, updatedList);

    CacheManager.invalidate([CacheKeys.STAFF]);
    return updated;
  },

  async deleteStaffMember(id: string): Promise<void> {
    if (supabase) {
      await supabase.from('staff_salary_payments').delete().eq('staff_id', id);
      const { error } = await supabase.from('staff_members').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }

    const localStaff = getLocal<StaffMember[]>(STORAGE_KEYS.STAFF, []);
    setLocal(STORAGE_KEYS.STAFF, localStaff.filter((s) => s.id !== id));

    const localPayments = getLocal<StaffSalaryPayment[]>(STORAGE_KEYS.STAFF_PAYMENTS, []);
    setLocal(STORAGE_KEYS.STAFF_PAYMENTS, localPayments.filter((p) => p.staff_id !== id));

    CacheManager.invalidate([CacheKeys.STAFF, CacheKeys.STAFF_PAYMENTS]);
  },

  async getSalaryPayments(forceRefresh = false): Promise<StaffSalaryPayment[]> {
    return CacheManager.fetchWithCache<StaffSalaryPayment[]>(
      CacheKeys.STAFF_PAYMENTS,
      async () => {
        if (supabase) {
          const { data, error } = await supabase
            .from('staff_salary_payments')
            .select(`
              *,
              staff:staff_members(name)
            `)
            .order('payment_date', { ascending: false });

          if (!error && data) {
            return data.map((p: any) => ({
              id: p.id,
              staff_id: p.staff_id,
              staff_name: p.staff?.name || 'Staff Member',
              salary_month: p.salary_month,
              amount_paid: parseFloat(p.amount_paid) || 0,
              payment_date: p.payment_date,
              payment_method: p.payment_method || 'Cash',
              transaction_type: p.transaction_type || 'SALARY',
              notes: p.notes,
              created_at: p.created_at,
            }));
          }
        }

        const localPayments = getLocal<StaffSalaryPayment[]>(STORAGE_KEYS.STAFF_PAYMENTS, []);
        const localStaff = getLocal<StaffMember[]>(STORAGE_KEYS.STAFF, []);

        return localPayments.map((p) => ({
          ...p,
          transaction_type: p.transaction_type || 'SALARY',
          staff_name: localStaff.find((s) => s.id === p.staff_id)?.name || 'Staff Member',
        }));
      },
      {
        ttlMs: CACHE_TTL.STAFF_PAYMENTS,
        fallback: [],
        forceRefresh,
      }
    );
  },

  async recordSalaryPayment(input: RecordSalaryPaymentInput): Promise<StaffSalaryPayment> {
    const id = generateUUID();
    const paymentDate = input.payment_date || new Date().toISOString();
    const paymentMethod = input.payment_method || 'Cash';
    const transactionType = input.transaction_type || 'SALARY';

    const newPayment: StaffSalaryPayment = {
      id,
      staff_id: input.staff_id,
      salary_month: input.salary_month,
      amount_paid: input.amount_paid,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      transaction_type: transactionType,
      notes: input.notes || null,
      created_at: paymentDate,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('staff_salary_payments')
        .insert([
          {
            id: newPayment.id,
            staff_id: newPayment.staff_id,
            salary_month: newPayment.salary_month,
            amount_paid: newPayment.amount_paid,
            payment_date: newPayment.payment_date,
            payment_method: newPayment.payment_method,
            transaction_type: newPayment.transaction_type,
            notes: newPayment.notes,
          },
        ])
        .select(`
          *,
          staff:staff_members(name)
        `)
        .single();

      if (error) throw new Error(error.message);
      if (data) {
        newPayment.staff_name = data.staff?.name;
        newPayment.created_at = data.created_at;
      }

      // If cash payment, log in active register session cash movements
      if (paymentMethod === 'Cash') {
        const { data: session } = await supabase
          .from('register_sessions')
          .select('id')
          .eq('status', 'OPEN')
          .order('opened_at', { ascending: false })
          .limit(1)
          .single();

        if (session) {
          const typeLabel = transactionType === 'ADVANCE' ? 'Staff Cash Advance' : 'Staff Salary Payment';
          await supabase.from('register_cash_movements').insert([
            {
              session_id: session.id,
              movement_type: 'PAYOUT',
              amount: newPayment.amount_paid,
              reference_id: newPayment.id,
              note: `${typeLabel} (${newPayment.salary_month}) - ${newPayment.notes || ''}`.trim(),
            },
          ]);
        }
      }
    }

    const localPayments = getLocal<StaffSalaryPayment[]>(STORAGE_KEYS.STAFF_PAYMENTS, []);
    setLocal(STORAGE_KEYS.STAFF_PAYMENTS, [newPayment, ...localPayments]);

    CacheManager.invalidate([CacheKeys.STAFF_PAYMENTS, CacheKeys.STAFF]);
    return newPayment;
  },

  async deleteSalaryPayment(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('staff_salary_payments').delete().eq('id', id);
      if (error) throw new Error(error.message);
    }

    const localPayments = getLocal<StaffSalaryPayment[]>(STORAGE_KEYS.STAFF_PAYMENTS, []);
    setLocal(STORAGE_KEYS.STAFF_PAYMENTS, localPayments.filter((p) => p.id !== id));

    CacheManager.invalidate([CacheKeys.STAFF_PAYMENTS, CacheKeys.STAFF]);
  },

  // ==========================================
  // DATA MANAGEMENT
  // ==========================================
  async clearAllData(): Promise<void> {
    if (supabase) {
      // Staff-side cleanup
      await supabase.from('staff_salary_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('staff_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Supplier-side cleanup
      await supabase.from('supplier_payment_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('supplier_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchase_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Customer-side cleanup
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
      localStorage.removeItem(STORAGE_KEYS.STAFF);
      localStorage.removeItem(STORAGE_KEYS.STAFF_PAYMENTS);
    }

    CacheManager.invalidateAll();
  },
};
