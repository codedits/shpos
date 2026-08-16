'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Product, Customer } from '@/types/wholesale';
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
} from 'lucide-react';
import { wholesaleService } from '@/services/wholesaleService';

interface SelectedProductState {
  quantity: number;
  sellingPrice: number;
}

function CreateOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get('customer_id');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId || '');
  const [selectedProductMap, setSelectedProductMap] = useState<Record<string, SelectedProductState>>({});
  const [amountPaidStr, setAmountPaidStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
  const [orderNotes, setOrderNotes] = useState<string>('');

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
    return products.filter(
      (p) =>
        p.product_code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.size && p.size.toLowerCase().includes(q)) ||
        (p.color && p.color.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Toggle or add item to cart
  const handleToggleProduct = (prod: Product) => {
    setSelectedProductMap((prev) => {
      const copy = { ...prev };
      if (copy[prod.id]) {
        delete copy[prod.id];
      } else {
        const cost = prod.unit_cost || (prod.stock_quantity > 0 ? prod.lot_cost / prod.stock_quantity : 0);
        const defaultPrice = cost > 0 ? Math.round(cost * 1.25) : 850;
        copy[prod.id] = {
          quantity: 1,
          sellingPrice: defaultPrice,
        };
      }
      return copy;
    });
  };

  // Update item quantity
  const handleUpdateQuantity = (prodId: string, maxStock: number, newQty: number) => {
    if (newQty <= 0) {
      setSelectedProductMap((prev) => {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      });
      return;
    }
    const clampedQty = Math.min(newQty, maxStock);
    setSelectedProductMap((prev) => ({
      ...prev,
      [prodId]: {
        ...prev[prodId],
        quantity: clampedQty,
      },
    }));
  };

  // Update item selling price
  const handleUpdatePrice = (prodId: string, newPrice: number) => {
    setSelectedProductMap((prev) => ({
      ...prev,
      [prodId]: {
        ...prev[prodId],
        sellingPrice: Math.max(0, newPrice),
      },
    }));
  };

  // Quick Markup Preset
  const applyMarkupPreset = (prodId: string, markupPercent: number) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const cost = prod.unit_cost || (prod.stock_quantity > 0 ? prod.lot_cost / prod.stock_quantity : 0);
    const calculatedPrice = Math.round(cost * (1 + markupPercent / 100));
    handleUpdatePrice(prodId, calculatedPrice);
  };

  // Calculated Totals
  const selectedProductList = useMemo(() => {
    return Object.entries(selectedProductMap)
      .map(([prodId, state]) => {
        const prod = products.find((p) => p.id === prodId)!;
        return {
          product: prod,
          quantity: state.quantity,
          sellingPrice: state.sellingPrice,
          lineTotal: state.quantity * state.sellingPrice,
        };
      })
      .filter((item) => item.product !== undefined);
  }, [selectedProductMap, products]);

  const totalPiecesCount = useMemo(
    () => selectedProductList.reduce((sum, item) => sum + item.quantity, 0),
    [selectedProductList]
  );

  const orderTotal = useMemo(
    () => selectedProductList.reduce((sum, item) => sum + item.lineTotal, 0),
    [selectedProductList]
  );

  const parsedPaid = parseFloat(amountPaidStr) || 0;
  const remainingCredit = Math.max(0, orderTotal - parsedPaid);

  const toast = useToast();

  // Quick Payment Preset Handlers
  const handleSetFullPayment = () => {
    setAmountPaidStr(orderTotal.toString());
  };

  const handleSetZeroPayment = () => {
    setAmountPaidStr('0');
  };

  const handleConfirmOrder = async () => {
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer account.');
      toast.warning('Customer Account Required', 'Please select a customer before booking.');
      return;
    }
    if (selectedProductList.length === 0) {
      setErrorMessage('Please select at least one garment product.');
      toast.warning('Cart is Empty', 'Please select garments to include in the order.');
      return;
    }
    if (parsedPaid < 0) {
      setErrorMessage('Amount paid cannot be negative.');
      toast.error('Invalid Payment Amount', 'Payment amount cannot be negative.');
      return;
    }
    if (parsedPaid > orderTotal) {
      const msg = `Amount paid (Rs. ${parsedPaid.toLocaleString()}) cannot exceed Order Total (Rs. ${orderTotal.toLocaleString()}).`;
      setErrorMessage(msg);
      toast.error('Payment Exceeds Total', msg);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const newOrder = await wholesaleService.createOrder({
        customer_id: selectedCustomerId,
        items: selectedProductList.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          selling_price_per_unit: l.sellingPrice,
        })),
        amount_paid: parsedPaid,
        payment_method: paymentMethod,
        notes: orderNotes.trim() || undefined,
      });

      toast.success(
        'Order Booked Successfully',
        `Invoice ${newOrder.invoice_number} created with ${totalPiecesCount} pieces.`
      );
      router.push(`/invoices/${newOrder.invoice_number}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create order.');
      toast.error('Could Not Create Order', err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
      {/* Header & Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/orders"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Back to Orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 font-heading">
              Wholesale POS Order Creation
            </h1>
            <p className="text-xs text-slate-500">
              Pick garments, set customized wholesale rates per bale/piece, and record initial advance payments.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold font-mono">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            {selectedProductList.length} Items
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white">
            {totalPiecesCount} Pcs
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2-Column POS Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols): Customer Selector & Product Catalog Picker */}
        <div className="lg:col-span-7 space-y-5">
          {/* Customer Account Picker Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-800" />
                <span>Customer Account</span>
              </label>
              <Link href="/customers/new" className="text-[11px] font-bold text-slate-900 hover:underline">
                + New Customer
              </Link>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} — Outstanding Balance: Rs. {(c.total_outstanding || 0).toLocaleString()}
                </option>
              ))}
            </select>

            {activeCustomer && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600">Current Outstanding Balance:</span>
                <span className={`font-bold ${(activeCustomer.total_outstanding || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  Rs. {(activeCustomer.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Product Catalog Picker Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-slate-800" />
                <h3 className="font-bold text-sm text-slate-900">Garment Inventory</h3>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, name, size..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Product Items List */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredProducts.map((prod) => {
                const isSelected = Boolean(selectedProductMap[prod.id]);
                const state = selectedProductMap[prod.id];
                const cost = prod.unit_cost || (prod.stock_quantity > 0 ? prod.lot_cost / prod.stock_quantity : 0);

                return (
                  <div
                    key={prod.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleProduct(prod)}
                          className="w-4 h-4 mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-900">
                              {prod.product_code}
                            </span>
                            <span className="font-bold text-sm text-slate-900">{prod.name}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono mt-1">
                            <span>Size: {prod.size || 'Standard'}</span>
                            <span>•</span>
                            <span>Color: {prod.color || 'Standard'}</span>
                            <span>•</span>
                            <span className={prod.stock_quantity <= 10 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-semibold'}>
                              {prod.stock_quantity} pcs in stock
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <span className="text-[10px] text-slate-400 block uppercase">Internal Unit Cost</span>
                        <span className="text-xs font-semibold text-slate-700">Rs. {cost.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Quantity & Selling Rate Controls (Active when selected) */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                        {/* Quantity Stepper */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                            Quantity (Pcs)
                          </label>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod.id, prod.stock_quantity, state.quantity - 1)}
                              className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-800 font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={prod.stock_quantity}
                              value={state.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(prod.id, prod.stock_quantity, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-16 p-1.5 text-center rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(prod.id, prod.stock_quantity, state.quantity + 1)}
                              className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-800 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">Max: {prod.stock_quantity}</span>
                          </div>
                        </div>

                        {/* Selling Price & Markup Presets */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold uppercase text-slate-600">
                              Selling Rate / Pc (Rs.)
                            </label>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => applyMarkupPreset(prod.id, 15)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-mono font-bold text-slate-700"
                                title="+15% Markup"
                              >
                                +15%
                              </button>
                              <button
                                type="button"
                                onClick={() => applyMarkupPreset(prod.id, 25)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-mono font-bold text-slate-700"
                                title="+25% Markup"
                              >
                                +25%
                              </button>
                              <button
                                type="button"
                                onClick={() => applyMarkupPreset(prod.id, 35)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-mono font-bold text-slate-700"
                                title="+35% Markup"
                              >
                                +35%
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={state.sellingPrice}
                              onChange={(e) => handleUpdatePrice(prod.id, parseFloat(e.target.value) || 0)}
                              className="w-full p-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <span className="text-xs font-mono font-bold text-slate-900 shrink-0">
                              = Rs. {(state.quantity * state.sellingPrice).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Cart Summary & Instant Checkout */}
        <div className="lg:col-span-5 space-y-5 sticky top-20">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4.5 h-4.5 text-slate-800" />
                <h3 className="font-bold text-sm text-slate-900">Order Summary & Booking</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">{selectedProductList.length} items</span>
            </div>

            {/* Selected Items Breakdown List */}
            {selectedProductList.length > 0 ? (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {selectedProductList.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.quantity} pcs @ Rs. {item.sellingPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center space-x-2">
                      <span className="font-bold text-slate-900">Rs. {item.lineTotal.toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleProduct(item.product)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No garments selected yet.</p>
                <p className="text-[10px] text-slate-400">Check boxes in catalog on left to add items.</p>
              </div>
            )}

            {/* Totals Calculation Card */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 font-mono text-xs shadow-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Pieces:</span>
                <span className="font-bold text-white">{totalPiecesCount} Pcs</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Gross Subtotal:</span>
                <span className="font-bold text-white">Rs. {orderTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-white border-t border-slate-800 pt-2">
                <span className="font-sans font-bold">Order Total Due:</span>
                <span className="text-emerald-400">Rs. {orderTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Settlement Method */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Payment Received (Rs.)
                </label>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleSetFullPayment}
                    className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-100"
                  >
                    100% Paid
                  </button>
                  <button
                    type="button"
                    onClick={handleSetZeroPayment}
                    className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200 hover:bg-rose-100"
                  >
                    Full Credit / Pay Later
                  </button>
                </div>
              </div>

              <input
                type="number"
                step="1"
                min="0"
                max={orderTotal}
                value={amountPaidStr}
                onChange={(e) => setAmountPaidStr(e.target.value)}
                className="w-full p-3 rounded-lg border-2 border-slate-900 text-lg font-black font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />

              {/* Payment Method Pills */}
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Bank', 'Other'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-lg text-xs font-bold border transition ${
                      paymentMethod === m
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Remaining Balance Due Banner */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between text-xs font-mono">
                <span className="text-slate-600">Remaining Balance Due:</span>
                <span className={`font-black ${remainingCredit > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  Rs. {remainingCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Order Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Order notes, transport details, or parcel remarks..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Complete Order CTA */}
            <button
              type="button"
              disabled={submitting || selectedProductList.length === 0}
              onClick={handleConfirmOrder}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md ${
                submitting || selectedProductList.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{submitting ? 'Generating Invoice...' : 'Confirm & Print Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto p-12 text-center text-xs font-mono uppercase text-slate-400">
            Loading order terminal...
          </div>
        }
      >
        <CreateOrderForm />
      </Suspense>
    </AppLayout>
  );
}
