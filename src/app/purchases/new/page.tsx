'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Product, Supplier, ProductVariant, FIXED_SIZES, FixedSize } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import {
  ClipboardList,
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  X,
  Save,
  Package,
  Truck,
} from 'lucide-react';

interface PurchaseLineItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  color: string;
  size: string;
  quantity: number;
  cost_per_unit: number;
}

function NewPurchaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | ''>('');
  const [isOtherSource, setIsOtherSource] = useState(false);
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
  const [notes, setNotes] = useState('');

  // Product selection state
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [s, p] = await Promise.all([
          wholesaleService.getSuppliers(),
          wholesaleService.getProducts(),
        ]);
        setSuppliers(s);
        setProducts(p.filter((pr) => pr.is_active));

        const preselectedSupplier = searchParams.get('supplier_id');
        if (preselectedSupplier) setSelectedSupplierId(preselectedSupplier);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.product_code.toLowerCase().includes(q));
  }, [products, productSearch]);

  const subtotal = useMemo(() => lineItems.reduce((s, li) => s + li.quantity * li.cost_per_unit, 0), [lineItems]);
  const totalPieces = useMemo(() => lineItems.reduce((s, li) => s + li.quantity, 0), [lineItems]);

  const addVariantLines = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      // Product without variants — add a single line
      const existing = lineItems.find((li) => li.product_id === product.id && !li.variant_id);
      if (existing) { toast.error('Already Added', `${product.name} is already in the list.`); return; }
      setLineItems([...lineItems, {
        id: crypto.randomUUID(),
        product_id: product.id,
        variant_id: null,
        product_name: product.name,
        color: product.color || '',
        size: product.size || '',
        quantity: 1,
        cost_per_unit: 0,
      }]);
    } else {
      // Add a line for each variant that isn't already present
      const newLines: PurchaseLineItem[] = [];
      for (const v of product.variants) {
        const already = lineItems.find((li) => li.variant_id === v.id);
        if (!already) {
          newLines.push({
            id: crypto.randomUUID(),
            product_id: product.id,
            variant_id: v.id,
            product_name: product.name,
            color: v.color,
            size: v.size,
            quantity: 0,
            cost_per_unit: 0,
          });
        }
      }
      if (newLines.length === 0) { toast.error('Already Added', `All variants of ${product.name} are already in the list.`); return; }
      setLineItems([...lineItems, ...newLines]);
    }
    setShowProductPicker(false);
    setProductSearch('');
  };

  const updateLine = (id: string, field: keyof PurchaseLineItem, value: any) => {
    setLineItems(lineItems.map((li) => li.id === id ? { ...li, [field]: value } : li));
  };

  const removeLine = (id: string) => {
    setLineItems(lineItems.filter((li) => li.id !== id));
  };

  const handleSubmit = async () => {
    const validLines = lineItems.filter((li) => li.quantity > 0 && li.cost_per_unit > 0);
    if (validLines.length === 0) { toast.error('No Items', 'Add at least one item with quantity and cost.'); return; }
    if (!isOtherSource && !selectedSupplierId) { toast.error('Select Supplier', 'Choose a supplier or mark as "Other Source".'); return; }

    try {
      setSubmitting(true);
      const purchase = await wholesaleService.createPurchase({
        supplier_id: isOtherSource ? null : selectedSupplierId || null,
        items: validLines.map((li) => ({
          product_id: li.product_id,
          variant_id: li.variant_id,
          quantity: li.quantity,
          cost_per_unit: li.cost_per_unit,
          color_snapshot: li.color,
          size_snapshot: li.size,
        })),
        amount_paid: advancePayment,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      });
      toast.success('Purchase Created', `${purchase.purchase_number} — ${totalPieces} pcs received. Stock updated.`);
      router.push('/purchases');
    } catch (err: any) {
      toast.error('Failed to Create Purchase', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="max-w-5xl mx-auto p-12 text-center font-mono text-xs text-slate-400 uppercase">Loading purchase terminal...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center space-x-3.5">
          <Link href="/purchases" className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-2xl bg-violet-900 flex items-center justify-center text-white">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">New Purchase / Stock Receipt</h1>
            <p className="text-xs text-slate-500 mt-0.5">Record incoming stock from a supplier or other source.</p>
          </div>
        </div>

        {/* Supplier Selection */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 font-heading flex items-center space-x-2">
            <Truck className="w-4 h-4 text-indigo-700" /><span>Source</span>
          </h3>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" checked={!isOtherSource} onChange={() => setIsOtherSource(false)} className="accent-indigo-900" />
              <span className="text-xs font-bold text-slate-700">From Supplier</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="radio" checked={isOtherSource} onChange={() => setIsOtherSource(true)} className="accent-indigo-900" />
              <span className="text-xs font-bold text-slate-700">Other Source (Local Vendor / Direct)</span>
            </label>
          </div>

          {!isOtherSource && (
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900"
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
              ))}
            </select>
          )}
        </div>

        {/* Product Selection & Line Items */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 font-heading flex items-center space-x-2">
              <Package className="w-4 h-4 text-violet-700" /><span>Purchase Items</span>
            </h3>
            <button
              onClick={() => setShowProductPicker(true)}
              className="btn-press px-3.5 py-2 bg-violet-900 hover:bg-violet-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" /><span>Add Product</span>
            </button>
          </div>

          {/* Product Picker Modal */}
          {showProductPicker && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or code..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-900"
                  autoFocus
                />
                <button onClick={() => { setShowProductPicker(false); setProductSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addVariantLines(p)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 ml-2">{p.product_code}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{p.variants?.length || 0} variants</span>
                  </button>
                )) : (
                  <p className="text-xs text-slate-400 text-center py-3">No products found.</p>
                )}
              </div>
            </div>
          )}

          {/* Line Items Table */}
          {lineItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-3">Product</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Size</th>
                    <th className="p-3 text-center">Quantity</th>
                    <th className="p-3 text-right">Cost/Unit (Rs.)</th>
                    <th className="p-3 text-right">Line Total</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((li) => (
                    <tr key={li.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-bold text-slate-900">{li.product_name}</td>
                      <td className="p-3 text-slate-600 font-mono">{li.color || '—'}</td>
                      <td className="p-3 text-slate-600 font-mono">{li.size || '—'}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={li.quantity || ''}
                          onChange={(e) => updateLine(li.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-center font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-900"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={li.cost_per_unit || ''}
                          onChange={(e) => updateLine(li.id, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-right font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-900"
                        />
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-slate-900">
                        Rs. {(li.quantity * li.cost_per_unit).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => removeLine(li.id)} className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono uppercase border border-dashed border-slate-200 rounded-2xl">
              Click &quot;Add Product&quot; to select items for this purchase.
            </div>
          )}

          {/* Summary */}
          {lineItems.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs font-mono text-slate-500">Total: {totalPieces} pieces</span>
              <span className="text-lg font-black font-mono text-slate-900">Rs. {subtotal.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 font-heading">Advance Payment (Optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</label>
              <input
                type="number"
                min={0}
                max={subtotal}
                value={advancePayment || ''}
                onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-900"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-900"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-900"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          {subtotal > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total Purchase Cost</span><span className="font-bold text-slate-900">Rs. {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Advance Payment</span><span className="font-bold text-emerald-700">Rs. {advancePayment.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-900 font-bold">Balance Due to Supplier</span><span className="font-black text-rose-700 text-sm">Rs. {Math.max(subtotal - advancePayment, 0).toLocaleString()}</span></div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || lineItems.filter(li => li.quantity > 0).length === 0}
            className={`btn-press px-8 py-3 bg-violet-900 hover:bg-violet-800 text-white rounded-2xl text-sm font-extrabold flex items-center space-x-2.5 shadow-md transition ${
              submitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Processing...' : `Receive ${totalPieces} Pieces — Rs. ${subtotal.toLocaleString()}`}</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-5xl mx-auto p-12 text-center font-mono text-xs text-slate-400 uppercase">
            Loading purchase terminal...
          </div>
        </AppLayout>
      }
    >
      <NewPurchaseForm />
    </Suspense>
  );
}
