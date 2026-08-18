'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Product, Customer, FixedSize, FIXED_SIZES, ProductVariant } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  DollarSign,
  User,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  CreditCard,
  Receipt,
  Grid,
  List,
  Check,
  Clock,
} from 'lucide-react';
import { wholesaleService } from '@/services/wholesaleService';

interface CartItem {
  key: string; // unique key combining product_id, color, size
  product_id: string;
  variant_id?: string | null;
  product_code: string;
  product_name: string;
  color: string;
  size: FixedSize | string;
  available_stock: number;
  quantity: number;
  unit_cost: number;
  selling_price: number;
}

function CreateOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get('customer_id');
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId || '');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [amountPaidStr, setAmountPaidStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
  const [dueDate, setDueDate] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');

  const setPresetDueDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  // Bulk Matrix Entry Temporary State per product: { [productId]: { [color]: { [size]: qty } } }
  const [matrixInputs, setMatrixInputs] = useState<Record<string, Record<string, Record<FixedSize, string>>>>({});
  const [expandedProductMap, setExpandedProductMap] = useState<Record<string, boolean>>({});

  // Product Search & Filter
  const [productSearch, setProductSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [cData, pData] = await Promise.all([
          wholesaleService.getCustomers(),
          wholesaleService.getProducts(),
        ]);
        setCustomers(cData);
        setProducts(pData);

        const targetCustId = defaultCustomerId || (cData.length > 0 ? cData[0].id : '');
        setSelectedCustomerId(targetCustId);

        // Auto-expand first 2 products
        const initialExpanded: Record<string, boolean> = {};
        pData.slice(0, 2).forEach((p) => {
          initialExpanded[p.id] = true;
        });
        setExpandedProductMap(initialExpanded);
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [defaultCustomerId]);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => {
      const matchCode = p.product_code.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      const matchVariant = (p.variants || []).some(
        (v) => v.color.toLowerCase().includes(q) || v.size.toLowerCase().includes(q)
      );
      return matchCode || matchName || matchVariant;
    });
  }, [products, productSearch]);

  // Handle matrix quantity input change
  const handleMatrixInputChange = (productId: string, color: string, size: FixedSize, val: string) => {
    setMatrixInputs((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [color]: {
          ...(prev[productId]?.[color] || { Small: '', Medium: '', Large: '', Standard: '', XL: '' }),
          [size]: val,
        },
      },
    }));
  };

  const handleOrderMatrixKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    prodId: string,
    colorIdx: number,
    sizeIdx: number,
    prod: Product,
    color: string,
    colorVars: ProductVariant[],
    totalColors: number
  ) => {
    const totalCols = FIXED_SIZES.length;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const targetCol = Math.min(totalCols - 1, sizeIdx + 1);
      const targetEl = document.querySelector(
        `input[data-ord-prod="${prodId}"][data-ord-color="${colorIdx}"][data-ord-size="${targetCol}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const targetCol = Math.max(0, sizeIdx - 1);
      const targetEl = document.querySelector(
        `input[data-ord-prod="${prodId}"][data-ord-color="${colorIdx}"][data-ord-size="${targetCol}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const targetRow = Math.min(totalColors - 1, colorIdx + 1);
      const targetEl = document.querySelector(
        `input[data-ord-prod="${prodId}"][data-ord-color="${targetRow}"][data-ord-size="${sizeIdx}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const targetRow = Math.max(0, colorIdx - 1);
      const targetEl = document.querySelector(
        `input[data-ord-prod="${prodId}"][data-ord-color="${targetRow}"][data-ord-size="${sizeIdx}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Automatically add this color row to the order cart on Enter!
      const colorInputs = matrixInputs[prodId]?.[color] || ({} as Record<FixedSize, string>);
      const totalRowQtyEntered = FIXED_SIZES.reduce(
        (sum, s) => sum + (parseInt(colorInputs[s], 10) || 0),
        0
      );

      if (totalRowQtyEntered > 0) {
        handleAddMatrixRowToCart(prod, color, colorVars);
      }

      // Automatically move focus to next color row if available
      if (colorIdx < totalColors - 1) {
        setTimeout(() => {
          const nextRowInput = document.querySelector(
            `input[data-ord-prod="${prodId}"][data-ord-color="${colorIdx + 1}"][data-ord-size="0"]`
          ) as HTMLInputElement;
          if (nextRowInput) {
            nextRowInput.focus();
            nextRowInput.select?.();
          }
        }, 50);
      }
    }
  };

  // Add all non-zero quantities from a color row into the cart
  const handleAddMatrixRowToCart = (prod: Product, color: string, variants: ProductVariant[]) => {
    const colorInputs = matrixInputs[prod.id]?.[color] || ({} as Record<FixedSize, string>);
    const baseCost = prod.unit_cost || (prod.stock_quantity > 0 ? Math.round(prod.lot_cost / prod.stock_quantity) : 0);
    const defaultSellingPrice = prod.selling_price || Math.round(baseCost * 1.2);

    let addedCount = 0;
    const newItems: CartItem[] = [];

    FIXED_SIZES.forEach((size) => {
      const inputVal = colorInputs[size];
      const qty = parseInt(inputVal, 10);
      if (!isNaN(qty) && qty > 0) {
        const variant = variants.find(
          (v) => v.color.toLowerCase() === color.toLowerCase() && v.size === size
        );
        const avail = variant ? variant.stock_quantity : prod.stock_quantity;

        if (qty > avail) {
          toast.error(
            'Insufficient Stock',
            `Only ${avail} pcs available for ${prod.name} (${color} / ${size}).`
          );
          return;
        }

        const itemKey = `${prod.id}_${color}_${size}`;
        newItems.push({
          key: itemKey,
          product_id: prod.id,
          variant_id: variant?.id || null,
          product_code: prod.product_code,
          product_name: prod.name,
          color,
          size,
          available_stock: avail,
          quantity: qty,
          unit_cost: baseCost,
          selling_price: defaultSellingPrice,
        });
        addedCount += qty;
      }
    });

    if (newItems.length === 0) {
      toast.warning('No Quantities Entered', `Please enter quantities for ${color} before adding.`);
      return;
    }

    setCartItems((prev) => {
      const copy = [...prev];
      newItems.forEach((newItem) => {
        const existingIdx = copy.findIndex((it) => it.key === newItem.key);
        if (existingIdx !== -1) {
          copy[existingIdx].quantity = newItem.quantity;
        } else {
          copy.push(newItem);
        }
      });
      return copy;
    });

    // Reset inputs for this color row
    setMatrixInputs((prev) => ({
      ...prev,
      [prod.id]: {
        ...(prev[prod.id] || {}),
        [color]: { Small: '', Medium: '', Large: '', Standard: '', XL: '' },
      },
    }));

    toast.success(
      'Added to Order',
      `Added ${addedCount} pcs of ${prod.name} (${color}) across ${newItems.length} size variants.`
    );
  };

  // Add individual variant directly to cart (Normal entry)
  const handleAddSingleVariant = (prod: Product, variant: ProductVariant, qty = 1) => {
    if (variant.stock_quantity < qty) {
      toast.error('Out of Stock', `Only ${variant.stock_quantity} pcs available for ${variant.color} / ${variant.size}.`);
      return;
    }

    const itemKey = `${prod.id}_${variant.color}_${variant.size}`;
    const baseCost = prod.unit_cost || (prod.stock_quantity > 0 ? Math.round(prod.lot_cost / prod.stock_quantity) : 0);
    const defaultSellingPrice = prod.selling_price || Math.round(baseCost * 1.2);

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.key === itemKey);
      if (existingIdx !== -1) {
        const nextQty = prev[existingIdx].quantity + qty;
        if (nextQty > variant.stock_quantity) {
          toast.warning('Max Stock Limit', `Cannot exceed available ${variant.stock_quantity} pieces.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx].quantity = nextQty;
        return updated;
      }
      return [
        ...prev,
        {
          key: itemKey,
          product_id: prod.id,
          variant_id: variant.id,
          product_code: prod.product_code,
          product_name: prod.name,
          color: variant.color,
          size: variant.size,
          available_stock: variant.stock_quantity,
          quantity: qty,
          unit_cost: baseCost,
          selling_price: defaultSellingPrice,
        },
      ];
    });

    toast.success('Added to Cart', `${prod.name} (${variant.color} / ${variant.size}) × ${qty}`);
  };

  const handleUpdateCartQuantity = (key: string, newQty: number, maxStock: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(key);
      return;
    }
    if (newQty > maxStock) {
      toast.warning('Stock Limit', `Cannot exceed available stock of ${maxStock} pcs.`);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, quantity: newQty } : item))
    );
  };

  const handleUpdateCartSellingPrice = (key: string, price: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selling_price: Math.max(0, Math.round(price)) } : item))
    );
  };

  const handleApplyMarkup = (key: string, markupPercent: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          const newPrice = Math.round(item.unit_cost * (1 + markupPercent / 100));
          return { ...item, selling_price: newPrice };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (key: string) => {
    setCartItems((prev) => prev.filter((it) => it.key !== key));
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.quantity * it.selling_price, 0);
  }, [cartItems]);

  const totalPiecesCount = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.quantity, 0);
  }, [cartItems]);

  const totalInternalCost = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + it.quantity * it.unit_cost, 0);
  }, [cartItems]);

  const estimatedProfit = subtotal - totalInternalCost;

  const amountPaid = parseInt(amountPaidStr, 10) || 0;
  const remainingAmount = Math.max(0, subtotal - amountPaid);

  const handleQuickPay = (ratio: number) => {
    const val = Math.round(subtotal * ratio);
    setAmountPaidStr(val.toString());
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer account.');
      toast.warning('Customer Required', 'Please select a customer before booking order.');
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage('Please add at least one garment variant to the order.');
      toast.warning('Cart Empty', 'Please add items before submitting.');
      return;
    }

    if (amountPaid < 0) {
      setErrorMessage('Amount paid cannot be negative.');
      return;
    }

    if (amountPaid > subtotal) {
      setErrorMessage(`Amount paid (Rs. ${amountPaid}) cannot exceed order total (Rs. ${subtotal}).`);
      toast.error('Payment Error', 'Amount paid exceeds order total.');
      return;
    }

    try {
      setSubmitting(true);
      const newOrder = await wholesaleService.createOrder({
        customer_id: selectedCustomerId,
        items: cartItems.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity: it.quantity,
          selling_price_per_unit: it.selling_price,
        })),
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        notes: orderNotes.trim() || undefined,
        idempotency_key: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      toast.success(
        'Order Booked Successfully',
        `Invoice ${newOrder.invoice_number} created for Rs. ${newOrder.total_amount.toLocaleString()}.`
      );
      router.push(`/invoices/${newOrder.invoice_number}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete order.');
      toast.error('Order Submission Failed', err.message);
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/orders"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
              title="Back to Orders"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
                New Wholesale Sales Order
              </h1>
              <p className="text-xs text-slate-500">
                Color × Size variant inventory selection with wholesale bulk matrix entry.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block uppercase">Items in Cart</span>
              <span className="text-sm font-extrabold text-slate-900">
                {cartItems.length} lines ({totalPiecesCount} pcs)
              </span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main 2-Column POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: PRODUCT CATALOG WITH BULK MATRIX ENTRY (7 COLS)             */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search garments by code, name, or color..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Product Cards with Color × Size Matrix */}
            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const isExpanded = expandedProductMap[prod.id] ?? false;
                  const variants = prod.variants || [];
                  const cost = prod.unit_cost || (prod.stock_quantity > 0 ? prod.lot_cost / prod.stock_quantity : 0);

                  // Group variants by color
                  const colorGroups: Record<string, ProductVariant[]> = {};
                  if (variants.length > 0) {
                    variants.forEach((v) => {
                      if (!colorGroups[v.color]) colorGroups[v.color] = [];
                      colorGroups[v.color].push(v);
                    });
                  } else {
                    // Fallback for product without variant rows
                    const defaultColor = prod.color || 'Standard';
                    colorGroups[defaultColor] = [
                      {
                        id: prod.id,
                        product_id: prod.id,
                        color: defaultColor,
                        size: (prod.size as FixedSize) || 'Standard',
                        stock_quantity: prod.stock_quantity,
                      },
                    ];
                  }

                  const totalProdStock = variants.length > 0
                    ? variants.reduce((s, v) => s + v.stock_quantity, 0)
                    : prod.stock_quantity;

                  return (
                    <div
                      key={prod.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition hover:border-slate-300"
                    >
                      {/* Product Header Row */}
                      <div className="p-4 sm:p-5 flex items-start justify-between gap-3 bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-start space-x-3.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                            {prod.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded-lg">
                                {prod.product_code}
                              </span>
                              <span className="font-extrabold text-sm text-slate-900">{prod.name}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                              <span className="text-slate-700 font-semibold">
                                {Object.keys(colorGroups).length} Colors Available
                              </span>
                              <span>•</span>
                              <span className={totalProdStock <= 10 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                                {totalProdStock} pcs total stock
                              </span>
                              <span>•</span>
                              <span>Cost: Rs. {cost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedProductMap((prev) => ({ ...prev, [prod.id]: !isExpanded }))
                          }
                          className="btn-press px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold font-mono transition shrink-0"
                        >
                          {isExpanded ? 'Hide Matrix ▲' : 'Open Matrix ▼'}
                        </button>
                      </div>

                      {/* Expanded Matrix Wholesale Entry View */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-4 bg-white animate-fade-in">
                          {Object.entries(colorGroups).map(([color, colorVars], colorIdx, colorEntries) => {
                            const colorInputs = matrixInputs[prod.id]?.[color] || ({} as Record<FixedSize, string>);
                            const totalRowQtyEntered = FIXED_SIZES.reduce(
                              (sum, s) => sum + (parseInt(colorInputs[s], 10) || 0),
                              0
                            );

                            return (
                              <div
                                key={color}
                                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-3 h-3 rounded-full bg-slate-900 shrink-0" />
                                    <span className="font-extrabold text-xs text-slate-900">{color}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      ({colorVars.reduce((s, v) => s + v.stock_quantity, 0)} pcs in color)
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAddMatrixRowToCart(prod, color, colorVars)}
                                    disabled={totalRowQtyEntered === 0}
                                    className={`btn-press px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center space-x-1.5 ${
                                      totalRowQtyEntered > 0
                                        ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>
                                      {totalRowQtyEntered > 0
                                        ? `Add ${totalRowQtyEntered} Pcs to Order`
                                        : 'Enter Quantities'}
                                    </span>
                                  </button>
                                </div>

                                {/* 5 Fixed Size Input Boxes for Wholesale Matrix Entry */}
                                <div className="grid grid-cols-5 gap-2">
                                  {FIXED_SIZES.map((size, sizeIdx) => {
                                    const variant = colorVars.find((v) => v.size === size);
                                    const avail = variant ? variant.stock_quantity : 0;
                                    const inputVal = colorInputs[size] || '';
                                    const isOutOfStock = avail <= 0;

                                    return (
                                      <div
                                        key={size}
                                        className={`p-2 rounded-xl border text-center transition ${
                                          isOutOfStock
                                            ? 'bg-slate-100/60 border-slate-200 opacity-60'
                                            : inputVal
                                            ? 'bg-white border-slate-900 shadow-2xs'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                      >
                                        <span className="text-[10px] font-bold uppercase text-slate-600 block font-mono">
                                          {size}
                                        </span>

                                        <input
                                          type="number"
                                          min="0"
                                          max={avail}
                                          disabled={isOutOfStock}
                                          placeholder="0"
                                          data-ord-prod={prod.id}
                                          data-ord-color={colorIdx}
                                          data-ord-size={sizeIdx}
                                          value={inputVal}
                                          onChange={(e) =>
                                            handleMatrixInputChange(prod.id, color, size, e.target.value)
                                          }
                                          onKeyDown={(e) =>
                                            handleOrderMatrixKeyDown(
                                              e,
                                              prod.id,
                                              colorIdx,
                                              sizeIdx,
                                              prod,
                                              color,
                                              colorVars,
                                              colorEntries.length
                                            )
                                          }
                                          className="w-full p-1 text-center text-xs font-mono font-black text-slate-900 focus:outline-none bg-transparent"
                                        />

                                        <span
                                          className={`text-[9px] font-mono block ${
                                            isOutOfStock
                                              ? 'text-rose-600 font-bold'
                                              : avail <= 5
                                              ? 'text-amber-700 font-bold'
                                              : 'text-slate-400'
                                          }`}
                                        >
                                          {isOutOfStock ? '0 avail' : `${avail} avail`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 font-mono text-xs">
                  No garments matching &quot;{productSearch}&quot; found.
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: ORDER CART & SETTLEMENT PANEL (5 COLS)                      */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            <form onSubmit={handleSubmitOrder} className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
              {/* Customer Account Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Wholesale Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                >
                  <option value="">-- Select Buyer Account --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} — Outstanding: Rs. {(c.total_outstanding || 0).toLocaleString()}
                    </option>
                  ))}
                </select>

                {activeCustomer && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Account Debt Balance:</span>
                    <span className={`font-bold ${(activeCustomer.total_outstanding || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Rs. {(activeCustomer.total_outstanding || 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Order Line Items Cart */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 font-heading">
                    Order Lines ({cartItems.length})
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    Total: {totalPiecesCount} Pcs
                  </span>
                </div>

                {cartItems.length > 0 ? (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {cartItems.map((it) => {
                      const lineTotal = it.quantity * it.selling_price;
                      return (
                        <div
                          key={it.key}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs font-mono"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                                  {it.product_code}
                                </span>
                                <span className="font-bold text-slate-900 font-sans">{it.product_name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
                                <span className="font-bold text-slate-800">{it.color}</span>
                                <span>/</span>
                                <span className="font-bold text-blue-700">{it.size}</span>
                                <span>•</span>
                                <span>Cost: Rs. {it.unit_cost.toFixed(2)}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(it.key)}
                              className="btn-press p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quantity Stepper & Selling Rate Input */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                            {/* Quantity Stepper */}
                            <div>
                              <span className="text-[9px] uppercase text-slate-400 block">Quantity (Pcs)</span>
                              <div className="flex items-center space-x-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(it.key, it.quantity - 1, it.available_stock)}
                                  className="btn-press w-6 h-6 rounded border border-slate-300 bg-white flex items-center justify-center font-bold text-slate-700"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={it.available_stock}
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleUpdateCartQuantity(it.key, parseInt(e.target.value, 10) || 1, it.available_stock)
                                  }
                                  className="w-12 p-0.5 text-center text-xs font-bold rounded border border-slate-300 bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQuantity(it.key, it.quantity + 1, it.available_stock)}
                                  className="btn-press w-6 h-6 rounded border border-slate-300 bg-white flex items-center justify-center font-bold text-slate-700"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Selling Price */}
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] uppercase text-slate-400">Rate / Pc (Rs.)</span>
                                <button
                                  type="button"
                                  onClick={() => handleApplyMarkup(it.key, 20)}
                                  className="text-[8px] bg-slate-200 text-slate-700 px-1 rounded hover:bg-slate-300"
                                >
                                  +20%
                                </button>
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={it.selling_price}
                                onChange={(e) =>
                                  handleUpdateCartSellingPrice(it.key, parseInt(e.target.value, 10) || 0)
                                }
                                className="w-full p-1 mt-0.5 text-right text-xs font-bold rounded border border-slate-300 bg-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="text-right font-bold text-xs text-slate-900 pt-0.5 font-mono">
                            Line Total: Rs. {Math.round(lineTotal).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-mono">
                    Select garments and quantities from the left panel to populate order.
                  </div>
                )}
              </div>

              {/* Settlement & Financial Breakdown */}
              <div className="border-t border-slate-200 pt-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Gross Order Subtotal:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    Rs. {Math.round(subtotal).toLocaleString()}
                  </span>
                </div>

                {/* Advance Payment Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase font-sans">
                      Advance Amount Paid (Rs.)
                    </label>
                    <div className="flex items-center space-x-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleQuickPay(1)}
                        className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                      >
                        100% Full
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPay(0.5)}
                        className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPay(0)}
                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold"
                      >
                        Credit
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="1"
                    value={amountPaidStr}
                    onChange={(e) => setAmountPaidStr(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-emerald-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Cash', 'Bank', 'Other'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`btn-press p-2 rounded-xl border text-xs font-bold transition ${
                          paymentMethod === method
                            ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remaining Credit Due Display */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Remaining Balance Due:</span>
                  <span className={`font-black text-sm ${remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    Rs. {Math.round(remainingAmount).toLocaleString()}
                  </span>
                </div>

                {/* Optional Payment Deadline / Promise Date (Enabled if Remaining Balance > 0) */}
                {remainingAmount > 0 && (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-950 uppercase font-sans flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Payment Deadline / Promise Date</span>
                      </label>
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate('')}
                          className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-amber-300 bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="flex items-center space-x-1 text-[10px] font-mono">
                      <span className="text-amber-800 font-semibold mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setPresetDueDate(7)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition"
                      >
                        +7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetDueDate(15)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition"
                      >
                        +15 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetDueDate(30)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold transition"
                      >
                        +30 Days
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <textarea
                    rows={2}
                    placeholder="Optional order voucher notes or delivery details..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Complete Order Button */}
              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className={`btn-press w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                  submitting || cartItems.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Wholesale Sale...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Sale & Print Voucher</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-7xl mx-auto p-12 text-center text-slate-400 font-mono text-xs">
            Loading order terminal...
          </div>
        </AppLayout>
      }
    >
      <CreateOrderForm />
    </Suspense>
  );
}
