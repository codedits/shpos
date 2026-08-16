'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Category,
  CartItem,
  Customer,
  Transaction,
  HeldOrder,
  BusinessSettings,
  PaymentMethod,
} from '../types/pos';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  DEFAULT_BUSINESS_SETTINGS,
} from '../data/seedData';
import { supabase } from '../lib/supabase';
import { wholesaleService } from '../services/wholesaleService';

interface POSContextType {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer;
  transactions: Transaction[];
  heldOrders: HeldOrder[];
  settings: BusinessSettings;
  cashierName: string;
  isDbConnected: boolean;

  // Cart Actions
  addToCart: (product: Product, quantity?: number, discountPercent?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discountPercent: number) => void;
  clearCart: () => void;

  // Held Orders Actions
  holdCart: (note?: string) => void;
  restoreHeldOrder: (heldOrderId: string) => void;
  deleteHeldOrder: (heldOrderId: string) => void;

  // Customer Actions
  selectCustomer: (customer: Customer) => void;
  addCustomer: (customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent' | 'outstandingBalance'>) => Customer;
  updateCustomer: (customer: Customer) => void;
  payCustomerCredit: (customerId: string, amount: number) => void;

  // Checkout Actions
  processCheckout: (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    notes?: string
  ) => Transaction;
  refundTransaction: (transactionId: string) => void;

  // Inventory Management
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;

  // Business & Cashier Settings
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  setCashierName: (name: string) => void;
  resetToDefaults: () => void;
  clearAllSampleData: () => void;

  // Calculated Values
  cartSubtotal: number;
  cartDiscountTotal: number;
  cartTaxTotal: number;
  cartGrandTotal: number;
  cartItemCount: number;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'apex_pos_products',
  TRANSACTIONS: 'apex_pos_transactions',
  CUSTOMERS: 'apex_pos_customers',
  HELD_ORDERS: 'apex_pos_held_orders',
  SETTINGS: 'apex_pos_settings',
  CASHIER: 'apex_pos_cashier',
  CLEARED: 'apex_pos_cleared',
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(INITIAL_CUSTOMERS[0]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [cashierName, setCashierNameState] = useState<string>('Tariq Mahmood');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Initial Load
  useEffect(() => {
    async function loadData() {
      const isCleared = localStorage.getItem(STORAGE_KEYS.CLEARED) === 'true';

      if (supabase) {
        try {
          setIsDbConnected(true);

          // 1. Load Products from wholesaleService
          const wholesaleProducts = await wholesaleService.getProducts();
          if (wholesaleProducts.length > 0) {
            setProducts(
              wholesaleProducts.map((p) => {
                const unitCost = p.unit_cost || (p.stock_quantity > 0 ? p.lot_cost / p.stock_quantity : 0);
                const sellingPrice = unitCost > 0 ? Math.round(unitCost * 1.25) : 850;
                return {
                  id: p.id,
                  name: p.name,
                  price: sellingPrice,
                  costPrice: unitCost,
                  categoryId: 'cat-unstitched',
                  barcode: p.product_code,
                  stock: p.stock_quantity,
                  unit: p.size ? `${p.size} (${p.color || 'Standard'})` : 'Pcs',
                  sku: p.product_code,
                  image: '',
                  description: `Wholesale Item [Size: ${p.size || 'N/A'}, Color: ${p.color || 'N/A'}]`,
                  isTaxable: false,
                };
              })
            );
          }

          // 2. Load Customers from wholesaleService
          const wholesaleCustomers = await wholesaleService.getCustomers();
          if (wholesaleCustomers.length > 0) {
            setCustomers(
              wholesaleCustomers.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone || '',
                email: '',
                city: 'Pakistan',
                address: c.address || '',
                loyaltyPoints: 0,
                totalSpent: 0,
                outstandingBalance: c.total_outstanding || 0,
                creditLimit: 500000,
              }))
            );
          }

          // 3. Load Orders as Transactions
          const wholesaleOrders = await wholesaleService.getOrders();
          if (wholesaleOrders.length > 0) {
            setTransactions(
              wholesaleOrders.map((o) => ({
                id: o.id,
                orderNumber: o.invoice_number,
                items: (o.items || []).map((it) => ({
                  product: {
                    id: it.product_id,
                    name: it.product_name_snapshot,
                    price: it.selling_price_per_unit,
                    costPrice: it.unit_cost,
                    categoryId: 'cat-unstitched',
                    barcode: it.product_code_snapshot,
                    stock: it.quantity,
                    unit: 'Pcs',
                    sku: it.product_code_snapshot,
                    image: '',
                    description: '',
                    isTaxable: false,
                  },
                  quantity: it.quantity,
                  discountPercent: 0,
                })),
                subtotal: o.subtotal,
                taxTotal: 0,
                discountTotal: 0,
                total: o.total_amount,
                paymentMethod: (o.amount_paid > 0 ? 'cash' : 'credit') as PaymentMethod,
                amountTendered: o.amount_paid,
                changeDue: 0,
                cashierName: 'Admin Cashier',
                status: 'completed',
                createdAt: o.order_date,
                notes: o.notes || undefined,
              }))
            );
          }

          // 4. Load Business Settings
          const wholesaleSettings = await wholesaleService.getSettings();
          if (wholesaleSettings) {
            setSettings((prev) => ({
              ...prev,
              name: wholesaleSettings.business_name || prev.name,
              phone: wholesaleSettings.phone || prev.phone,
              address: wholesaleSettings.address || prev.address,
              currencySymbol: wholesaleSettings.currency_symbol || prev.currencySymbol,
            }));
          }
        } catch (e) {
          console.warn('Could not sync with Supabase wholesale database:', e);
        }
      }

      // Local storage check fallback
      try {
        if (isCleared) {
          const savedProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
          const savedCusts = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
          const savedTxs = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
          if (savedProds) setProducts(JSON.parse(savedProds)); else setProducts([]);
          if (savedCusts) setCustomers(JSON.parse(savedCusts)); else setCustomers([INITIAL_CUSTOMERS[0]]);
          if (savedTxs) setTransactions(JSON.parse(savedTxs)); else setTransactions([]);
        } else {
          const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
          if (savedProducts && !isDbConnected) setProducts(JSON.parse(savedProducts));

          const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
          if (savedTransactions && !isDbConnected) setTransactions(JSON.parse(savedTransactions));

          const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
          if (savedCustomers && !isDbConnected) setCustomers(JSON.parse(savedCustomers));
        }

        const savedHeld = localStorage.getItem(STORAGE_KEYS.HELD_ORDERS);
        if (savedHeld) setHeldOrders(JSON.parse(savedHeld));

        const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (savedSettings) setSettings(JSON.parse(savedSettings));

        const savedCashier = localStorage.getItem(STORAGE_KEYS.CASHIER);
        if (savedCashier) setCashierNameState(savedCashier);
      } catch (e) {
        console.error('Error loading state:', e);
      } finally {
        setIsLoaded(true);
      }
    }

    loadData();
  }, [isDbConnected]);

  // Save changes locally
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.HELD_ORDERS, JSON.stringify(heldOrders));
  }, [heldOrders, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings, isLoaded]);

  // Cart Operations
  const addToCart = (product: Product, quantity = 1, discountPercent = 0) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(updated[existingIndex].quantity + quantity, product.stock);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          product,
          quantity: Math.min(quantity, product.stock),
          discountPercent,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const validQty = Math.min(quantity, item.product.stock);
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const updateCartDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.min(100, Math.max(0, discountPercent));
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, discountPercent: validDiscount };
        }
        return item;
      })
    );
  };

  const clearCart = () => setCart([]);

  // Held Orders Actions
  const holdCart = (note?: string) => {
    if (cart.length === 0) return;

    const newHeldOrder: HeldOrder = {
      id: `hold-${Date.now()}`,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      items: [...cart],
      createdAt: new Date().toISOString(),
      note: note || `Held by ${cashierName}`,
    };

    setHeldOrders((prev) => [newHeldOrder, ...prev]);
    clearCart();
    setSelectedCustomer(customers[0] || INITIAL_CUSTOMERS[0]);
  };

  const restoreHeldOrder = (heldOrderId: string) => {
    const held = heldOrders.find((h) => h.id === heldOrderId);
    if (!held) return;

    setCart(held.items);
    const foundCust = customers.find((c) => c.name === held.customerName);
    if (foundCust) setSelectedCustomer(foundCust);
    deleteHeldOrder(heldOrderId);
  };

  const deleteHeldOrder = (heldOrderId: string) => {
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldOrderId));
  };

  // Customer Operations
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const addCustomer = (
    customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent' | 'outstandingBalance'>
  ): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      loyaltyPoints: 0,
      totalSpent: 0,
      outstandingBalance: 0,
      creditLimit: customerData.creditLimit || 300000,
    };

    setCustomers((prev) => [newCustomer, ...prev]);

    // Also sync to wholesaleService
    wholesaleService.createCustomer({
      name: newCustomer.name,
      phone: newCustomer.phone || null,
      address: newCustomer.address || null,
    }).catch(console.error);

    return newCustomer;
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
    if (selectedCustomer.id === updatedCustomer.id) {
      setSelectedCustomer(updatedCustomer);
    }

    wholesaleService.updateCustomer(updatedCustomer.id, {
      name: updatedCustomer.name,
      phone: updatedCustomer.phone || null,
      address: updatedCustomer.address || null,
    }).catch(console.error);
  };

  const payCustomerCredit = (customerId: string, amount: number) => {
    if (amount <= 0) return;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const newOutstanding = Math.max(0, c.outstandingBalance - amount);
          return { ...c, outstandingBalance: newOutstanding };
        }
        return c;
      })
    );

    wholesaleService.recordPayment({
      customer_id: customerId,
      amount,
      payment_method: 'Cash',
    }).catch(console.error);
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);

  const cartDiscountTotal = cart.reduce((sum, item) => {
    const originalSub = item.quantity * item.product.price;
    return sum + (originalSub * (item.discountPercent / 100));
  }, 0);

  const cartTaxTotal = cart.reduce((sum, item) => {
    if (item.product.isTaxable) {
      const netItem = (item.quantity * item.product.price) * (1 - item.discountPercent / 100);
      return sum + (netItem * (settings.taxRatePercent / 100));
    }
    return sum;
  }, 0);

  const cartGrandTotal = cartSubtotal - cartDiscountTotal + cartTaxTotal;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Checkout Operations
  const processCheckout = (
    paymentMethod: PaymentMethod,
    amountTendered: number,
    notes?: string
  ): Transaction => {
    const changeDue = Math.max(0, amountTendered - cartGrandTotal);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      orderNumber,
      items: [...cart],
      subtotal: cartSubtotal,
      taxTotal: cartTaxTotal,
      discountTotal: cartDiscountTotal,
      total: cartGrandTotal,
      paymentMethod,
      amountTendered,
      changeDue,
      customer: selectedCustomer,
      cashierName,
      status: 'completed',
      createdAt: new Date().toISOString(),
      notes,
    };

    // Deduct stock locally
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((item) => item.product.id === p.id);
        if (cartItem) {
          const newStock = Math.max(0, p.stock - cartItem.quantity);
          return { ...p, stock: newStock };
        }
        return p;
      })
    );

    // Sync order to wholesaleService
    wholesaleService.createOrder({
      customer_id: selectedCustomer.id,
      items: cart.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity,
        selling_price_per_unit: it.product.price,
      })),
      amount_paid: paymentMethod === 'credit' ? 0 : Math.min(amountTendered, cartGrandTotal),
      payment_method: paymentMethod === 'card' ? 'Bank' : 'Cash',
      notes,
    }).catch(console.error);

    setTransactions((prev) => [newTransaction, ...prev]);
    clearCart();
    return newTransaction;
  };

  const refundTransaction = (transactionId: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx || tx.status === 'refunded') return;

    setProducts((prev) =>
      prev.map((p) => {
        const txItem = tx.items.find((item) => item.product.id === p.id);
        if (txItem) {
          const restoredStock = p.stock + txItem.quantity;
          return { ...p, stock: restoredStock };
        }
        return p;
      })
    );

    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? { ...t, status: 'refunded' } : t))
    );
  };

  // Inventory Actions
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      unit: productData.unit || 'Pcs',
    };

    setProducts((prev) => [newProd, ...prev]);

    wholesaleService.createProduct({
      product_code: newProd.sku || `PRD-${Date.now().toString().slice(-4)}`,
      name: newProd.name,
      stock_quantity: newProd.stock,
      lot_cost: (newProd.costPrice || 0) * newProd.stock,
      is_active: true,
    }).catch(console.error);

    return newProd;
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    wholesaleService.updateProduct(updated.id, {
      name: updated.name,
      stock_quantity: updated.stock,
      lot_cost: (updated.costPrice || 0) * updated.stock,
    }).catch(console.error);
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    wholesaleService.deleteProduct(productId).catch(console.error);
  };

  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      }

      wholesaleService.updateSettings({
        business_name: updated.name,
        phone: updated.phone,
        address: updated.address,
        currency_symbol: updated.currencySymbol,
      }).catch(console.error);

      return updated;
    });
  };

  const setCashierName = (name: string) => {
    setCashierNameState(name);
    localStorage.setItem(STORAGE_KEYS.CASHIER, name);
  };

  const resetToDefaults = () => {
    localStorage.clear();
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setTransactions([]);
    setHeldOrders([]);
    setSettings(DEFAULT_BUSINESS_SETTINGS);
    setSelectedCustomer(INITIAL_CUSTOMERS[0]);
    setCart([]);
  };

  const clearAllSampleData = () => {
    localStorage.setItem(STORAGE_KEYS.CLEARED, 'true');
    setProducts([]);
    setCustomers([INITIAL_CUSTOMERS[0]]);
    setTransactions([]);
    setHeldOrders([]);
    setSelectedCustomer(INITIAL_CUSTOMERS[0]);
    setCart([]);

    wholesaleService.clearAllData().catch(console.error);
  };

  return (
    <POSContext.Provider
      value={{
        products,
        categories,
        cart,
        customers,
        selectedCustomer,
        transactions,
        heldOrders,
        settings,
        cashierName,
        isDbConnected,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        clearCart,
        holdCart,
        restoreHeldOrder,
        deleteHeldOrder,
        selectCustomer,
        addCustomer,
        updateCustomer,
        payCustomerCredit,
        processCheckout,
        refundTransaction,
        addProduct,
        updateProduct,
        deleteProduct,
        updateSettings,
        setCashierName,
        resetToDefaults,
        clearAllSampleData,
        cartSubtotal,
        cartDiscountTotal,
        cartTaxTotal,
        cartGrandTotal,
        cartItemCount,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
