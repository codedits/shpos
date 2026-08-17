'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Product, Supplier } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import {
  ClipboardList,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Truck,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface PurchaseRow {
  id: string;
  product_name: string;
  product_id?: string | null;
  quantity: number | '';
  cost_per_unit: number | '';
}

function NewPurchaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rows, setRows] = useState<PurchaseRow[]>([
    {
      id: crypto.randomUUID(),
      product_name: '',
      product_id: null,
      quantity: '',
      cost_per_unit: '',
    },
  ]);
  const [amountPaidStr, setAmountPaidStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [sList, pList] = await Promise.all([
          wholesaleService.getSuppliers(),
          wholesaleService.getProducts(),
        ]);
        setSuppliers(sList);
        setProducts(pList.filter((p) => p.is_active));

        const preselectedSupplier = searchParams.get('supplier_id');
        if (preselectedSupplier) {
          setSelectedSupplierId(preselectedSupplier);
        } else if (sList.length > 0) {
          setSelectedSupplierId(sList[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [searchParams]);

  // Selected supplier details
  const currentSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  // Row operations
  const addRow = () => {
    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        product_name: '',
        product_id: null,
        quantity: '',
        cost_per_unit: '',
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([
        {
          id: crypto.randomUUID(),
          product_name: '',
          product_id: null,
          quantity: '',
          cost_per_unit: '',
        },
      ]);
    } else {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof PurchaseRow, value: any) => {
    setRows(
      rows.map((r) => {
        if (r.id !== id) return r;
        return { ...r, [field]: value };
      })
    );
  };

  const handleSelectProduct = (rowId: string, product: Product) => {
    setRows(
      rows.map((r) => {
        if (r.id !== rowId) return r;
        const defaultUnitCost =
          product.unit_cost ||
          (product.stock_quantity > 0
            ? Math.round(product.lot_cost / product.stock_quantity)
            : '');
        return {
          ...r,
          product_name: product.name,
          product_id: product.id,
          cost_per_unit: defaultUnitCost,
        };
      })
    );
  };

  // Calculations
  const calculatedRows = useMemo(() => {
    return rows.map((r) => {
      const q = typeof r.quantity === 'number' ? r.quantity : 0;
      const c = typeof r.cost_per_unit === 'number' ? r.cost_per_unit : 0;
      return {
        ...r,
        numericQty: q,
        numericCost: c,
        lineTotal: q * c,
      };
    });
  }, [rows]);

  const totalLotPrice = useMemo(() => {
    return calculatedRows.reduce((sum, r) => sum + r.lineTotal, 0);
  }, [calculatedRows]);

  const totalPieces = useMemo(() => {
    return calculatedRows.reduce((sum, r) => sum + r.numericQty, 0);
  }, [calculatedRows]);

  const amountPaid = parseInt(amountPaidStr, 10) || 0;
  const loanBalance = Math.max(0, totalLotPrice - amountPaid);

  const handleQuickPayFull = () => {
    setAmountPaidStr(totalLotPrice.toString());
  };

  const handleQuickPayZero = () => {
    setAmountPaidStr('0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      toast.error('Supplier Required', 'Please select a supplier for this purchase.');
      return;
    }

    const validRows = calculatedRows.filter(
      (r) => r.product_name.trim() && r.numericQty > 0 && r.numericCost > 0
    );

    if (validRows.length === 0) {
      toast.error(
        'Validation Error',
        'Please enter at least one item with Product Name, Quantity > 0, and Unit Price > 0.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const purchase = await wholesaleService.createPurchase({
        supplier_id: selectedSupplierId,
        purchase_date: new Date(purchaseDate).toISOString(),
        items: validRows.map((r) => ({
          product_name: r.product_name.trim(),
          product_id: r.product_id || null,
          quantity: r.numericQty,
          cost_per_unit: r.numericCost,
        })),
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      });

      const message =
        amountPaid >= totalLotPrice
          ? `Invoice ${purchase.purchase_number} recorded. Paid in full (Rs. ${totalLotPrice.toLocaleString()}).`
          : amountPaid > 0
          ? `Invoice ${purchase.purchase_number} recorded. Paid Rs. ${amountPaid.toLocaleString()}, Loan Rs. ${loanBalance.toLocaleString()}.`
          : `Invoice ${purchase.purchase_number} recorded. Full Loan of Rs. ${totalLotPrice.toLocaleString()}.`;

      toast.success('Purchase Invoice Created', message);
      router.push(`/suppliers/${selectedSupplierId}`);
    } catch (err: any) {
      toast.error('Failed to Create Purchase', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto p-12 text-center font-mono text-xs text-slate-400 uppercase">
          Loading purchase terminal...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center space-x-3.5">
          <Link
            href="/purchases"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-2xl bg-violet-900 flex items-center justify-center text-white shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
              Record Supplier Purchase
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create an invoice for incoming goods, track lot pricing, and manage supplier credit/loan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Supplier & Date Info */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-violet-700" />
                  <span>Supplier Account *</span>
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-900"
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
                {currentSupplier && (
                  <p className="text-[11px] font-mono text-slate-500 pl-1">
                    Current Outstanding Balance:{' '}
                    <span className="font-bold text-rose-700">
                      Rs. {(currentSupplier.total_outstanding || 0).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              {/* Date with Calendar UI & Today Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-violet-700" />
                    <span>Purchase Date *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPurchaseDate(new Date().toISOString().split('T')[0])}
                    className="text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded-md transition btn-press font-mono"
                  >
                    Today
                  </button>
                </div>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-900 cursor-pointer"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items (Product Name, Quantity, Unit Price, Total Lot) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 font-heading flex items-center space-x-2">
                <Package className="w-4 h-4 text-violet-700" />
                <span>Purchase Items & Lot Breakdown</span>
              </h3>
              <button
                type="button"
                onClick={addRow}
                className="btn-press px-3 py-1.5 rounded-xl bg-violet-50 text-violet-900 border border-violet-200 hover:bg-violet-100 text-xs font-bold flex items-center space-x-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    <th className="p-3 pl-4 min-w-[220px]">Product Name</th>
                    <th className="p-3 text-center w-28">Quantity</th>
                    <th className="p-3 text-right w-36">Unit Price (Rs.)</th>
                    <th className="p-3 text-right w-36">Total Lot (Rs.)</th>
                    <th className="p-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {calculatedRows.map((r, index) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                      {/* Product Name (Input with quick catalog selector) */}
                      <td className="p-2.5 pl-4">
                        <div className="space-y-1">
                          <input
                            type="text"
                            placeholder="e.g. Cotton Kurta, Lawn Mexi, Silk Shirt..."
                            value={r.product_name}
                            onChange={(e) => updateRow(r.id, 'product_name', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 font-sans text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-900"
                            required
                          />
                          {/* Quick selection tags from existing product catalog */}
                          {products.length > 0 && !r.product_name && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              <span className="text-[10px] text-slate-400 font-sans mr-1">Quick pick:</span>
                              {products.slice(0, 4).map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(r.id, p)}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-violet-100 hover:text-violet-900 text-slate-600 transition"
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={r.quantity}
                          onChange={(e) =>
                            updateRow(
                              r.id,
                              'quantity',
                              e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-24 px-2.5 py-2 text-center rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-900"
                          required
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={r.cost_per_unit}
                          onChange={(e) =>
                            updateRow(
                              r.id,
                              'cost_per_unit',
                              e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-32 px-2.5 py-2 text-right rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-900"
                          required
                        />
                      </td>

                      {/* Line Total (Unit Price × Quantity) */}
                      <td className="p-2.5 text-right">
                        <div className="px-2 py-2 font-mono font-black text-slate-900 text-xs">
                          Rs. {Math.round(r.lineTotal).toLocaleString()}
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Lot Summary Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Total Items</span>
                  <span className="text-sm font-bold">{calculatedRows.length} Product(s)</span>
                </div>
                <div className="w-px h-6 bg-slate-700" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Total Quantity</span>
                  <span className="text-sm font-bold">{totalPieces.toLocaleString()} Pieces</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Total Lot Price</span>
                <span className="text-xl font-black text-emerald-400">
                  Rs. {Math.round(totalLotPrice).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Payment, Credit & Loan Management */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 font-heading flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>Payment & Loan (Pay Later)</span>
              </h3>
              <div className="flex items-center space-x-1.5 font-mono">
                <button
                  type="button"
                  onClick={handleQuickPayFull}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition btn-press"
                >
                  100% Full
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaidStr(Math.round(totalLotPrice / 2).toString())}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold hover:bg-amber-100 transition btn-press"
                >
                  50% Half
                </button>
                <button
                  type="button"
                  onClick={handleQuickPayZero}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 transition btn-press"
                >
                  0% Full Loan
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Amount Paid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Amount Paid Now (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalLotPrice}
                  step="1"
                  value={amountPaidStr}
                  onChange={(e) => setAmountPaidStr(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bill # 4921, 30 days credit..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Financial Ledger Impact Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Lot Amount</span>
                <span className="font-bold text-slate-900">
                  Rs. {Math.round(totalLotPrice).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Amount Paid Now</span>
                <span className="font-bold text-emerald-700">
                  - Rs. {Math.round(amountPaid).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-sm font-black">
                <span className="text-slate-900">Remaining Loan / Debt Owed to Supplier</span>
                <span className={loanBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  Rs. {Math.round(loanBalance).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Action Controls */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Link
              href="/purchases"
              className="btn-press px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || totalLotPrice <= 0}
              className={`btn-press px-8 py-3 bg-violet-900 hover:bg-violet-800 text-white rounded-2xl text-xs font-extrabold flex items-center space-x-2 shadow-md transition ${
                submitting || totalLotPrice <= 0 ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {submitting && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <Save className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Saving Purchase Invoice...'
                  : `Save Purchase Invoice (Rs. ${totalLotPrice.toLocaleString()})`}
              </span>
            </button>
          </div>
        </form>
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
