'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Supplier, Purchase } from '@/types/wholesale';
import {
  CreditCard,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

function RecordSupplierPaymentForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const defaultSupplierId = searchParams.get('supplier_id');
  const defaultPurchaseId = searchParams.get('purchase_id');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(defaultSupplierId || '');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>(defaultPurchaseId || '');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [sData, pData] = await Promise.all([
          wholesaleService.getSuppliers(),
          wholesaleService.getPurchases(),
        ]);
        setSuppliers(sData);
        setPurchases(pData.filter((p) => !p.is_voided));

        const targetSuppId = defaultSupplierId || (sData.length > 0 ? sData[0].id : '');
        setSelectedSupplierId(targetSuppId);

        if (defaultPurchaseId) {
          setSelectedPurchaseId(defaultPurchaseId);
          const targetPur = pData.find((p) => p.id === defaultPurchaseId || p.purchase_number === defaultPurchaseId);
          if (targetPur) {
            setAmountStr(targetPur.remaining_amount.toString());
          }
        } else {
          const supp = sData.find((s) => s.id === targetSuppId);
          if (supp && supp.total_outstanding) {
            setAmountStr(supp.total_outstanding.toString());
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [defaultSupplierId, defaultPurchaseId]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [suppliers, selectedSupplierId]
  );

  const supplierUnpaidPurchases = useMemo(() => {
    if (!selectedSupplierId) return [];
    return purchases.filter(
      (p) => p.supplier_id === selectedSupplierId && p.remaining_amount > 0
    );
  }, [purchases, selectedSupplierId]);

  const handleSupplierChange = (id: string) => {
    setSelectedSupplierId(id);
    setSelectedPurchaseId('');
    const supp = suppliers.find((s) => s.id === id);
    if (supp && supp.total_outstanding) {
      setAmountStr(Math.round(supp.total_outstanding).toString());
    } else {
      setAmountStr('');
    }
  };

  const handlePurchaseChange = (purId: string) => {
    setSelectedPurchaseId(purId);
    if (purId) {
      const target = purchases.find((p) => p.id === purId || p.purchase_number === purId);
      if (target) {
        setAmountStr(Math.round(target.remaining_amount).toString());
      }
    } else if (selectedSupplier && selectedSupplier.total_outstanding) {
      setAmountStr(Math.round(selectedSupplier.total_outstanding).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (!selectedSupplierId) {
      setErrorMessage('Please select a supplier.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await wholesaleService.recordSupplierPayment({
        supplier_id: selectedSupplierId,
        amount,
        payment_method: paymentMethod,
        purchase_id: selectedPurchaseId || undefined,
        note: note.trim() || undefined,
      });

      toast.success(
        'Payment Recorded Successfully',
        `Payment of Rs. ${amount.toLocaleString()} has been logged for ${selectedSupplier?.name}.`
      );

      router.push(`/suppliers/${selectedSupplierId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving the payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-12 text-center text-slate-400 font-mono text-xs uppercase">
          Loading Supplier Payment Terminal...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center space-x-3.5">
          <Link
            href="/suppliers"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-2xl bg-emerald-700 flex items-center justify-center text-white">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
              Record Supplier Payment
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pay off supplier balances and settle outstanding stock receipts.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center space-x-3 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Supplier Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5" />
              <span>Select Supplier *</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
              required
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Owed: Rs. {Math.round(s.total_outstanding || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Summary Banner */}
          {selectedSupplier && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Current Balance We Owe</span>
                <span className={`text-xl font-black ${(selectedSupplier.total_outstanding || 0) > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  Rs. {Math.round(selectedSupplier.total_outstanding || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-slate-500">
                <span>{supplierUnpaidPurchases.length} Unsettled Purchase(s)</span>
              </div>
            </div>
          )}

          {/* Target Purchase Selection (Optional FIFO override) */}
          {supplierUnpaidPurchases.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Apply to Specific Purchase (Optional)</span>
              </label>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handlePurchaseChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Auto-allocate across oldest purchases (FIFO)</option>
                {supplierUnpaidPurchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.purchase_number} — Remaining: Rs. {Math.round(p.remaining_amount).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Payment Amount (Rs.) *</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Note / Reference
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bank Ref # 98124, Paid via Habib Bank"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Link
              href="/suppliers"
              className="btn-press px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={`btn-press px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-sm transition ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Processing Payment...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function RecordSupplierPaymentPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-4xl mx-auto p-12 text-center text-slate-400 font-mono text-xs uppercase">
            Loading Payment Terminal...
          </div>
        </AppLayout>
      }
    >
      <RecordSupplierPaymentForm />
    </Suspense>
  );
}
