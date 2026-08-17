'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Supplier, Purchase, SupplierPayment } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDatePKT } from '@/lib/dateUtils';
import {
  Truck,
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  CreditCard,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SupplierProfilePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const supplierId = params?.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Purchase | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidPayTarget, setVoidPayTarget] = useState<SupplierPayment | null>(null);
  const [voidingPay, setVoidingPay] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supplierId) return;
      try {
        setLoading(true);
        const [s, allPurchases, allPayments] = await Promise.all([
          wholesaleService.getSupplierById(supplierId),
          wholesaleService.getPurchases(),
          wholesaleService.getSupplierPayments(),
        ]);
        if (!s) return;
        setSupplier(s);
        setPurchases(allPurchases.filter((p) => p.supplier_id === supplierId));
        setPayments(allPayments.filter((p) => p.supplier_id === supplierId));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supplierId]);

  const handleDelete = async () => {
    if (!supplier) return;
    try {
      setDeleting(true);
      await wholesaleService.deleteSupplier(supplier.id);
      toast.success('Supplier Deleted', `"${supplier.name}" has been removed.`);
      router.push('/suppliers');
    } catch (err: any) {
      toast.error('Could Not Delete', err.message);
      setDeleting(false);
    }
  };

  const handleVoidPurchase = async () => {
    if (!voidTarget) return;
    try {
      setVoiding(true);
      await wholesaleService.voidPurchase(voidTarget.id);
      toast.success('Purchase Voided', `${voidTarget.purchase_number} has been voided. Stock reversed.`);
      setVoidTarget(null);
      // Reload data
      const [s, allP, allPay] = await Promise.all([
        wholesaleService.getSupplierById(supplierId),
        wholesaleService.getPurchases(true),
        wholesaleService.getSupplierPayments(true),
      ]);
      if (s) setSupplier(s);
      setPurchases(allP.filter((p) => p.supplier_id === supplierId));
      setPayments(allPay.filter((p) => p.supplier_id === supplierId));
    } catch (err: any) {
      toast.error('Failed to Void', err.message);
    } finally {
      setVoiding(false);
    }
  };

  const handleVoidPayment = async () => {
    if (!voidPayTarget) return;
    try {
      setVoidingPay(true);
      await wholesaleService.voidSupplierPayment(voidPayTarget.id);
      toast.success('Payment Voided', `Rs. ${voidPayTarget.amount.toLocaleString()} payment reversed.`);
      setVoidPayTarget(null);
      const [s, allP, allPay] = await Promise.all([
        wholesaleService.getSupplierById(supplierId),
        wholesaleService.getPurchases(true),
        wholesaleService.getSupplierPayments(true),
      ]);
      if (s) setSupplier(s);
      setPurchases(allP.filter((p) => p.supplier_id === supplierId));
      setPayments(allPay.filter((p) => p.supplier_id === supplierId));
    } catch (err: any) {
      toast.error('Failed to Void', err.message);
    } finally {
      setVoidingPay(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto p-12 text-center font-mono text-xs uppercase text-slate-400">Loading supplier profile...</div>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-800 mx-auto" />
          <h2 className="font-bold text-sm uppercase">Supplier Not Found</h2>
          <Link href="/suppliers" className="inline-block px-4 py-2 bg-indigo-900 text-white text-xs font-bold rounded-xl">Back to Suppliers</Link>
        </div>
      </AppLayout>
    );
  }

  const hasOutstanding = (supplier.total_outstanding || 0) > 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <Link href="/suppliers" className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {supplier.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">{supplier.name}</h1>
                <Link href={`/suppliers/${supplier.id}/edit`} className="btn-press p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition">
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mt-1">
                {supplier.phone && <span className="flex items-center space-x-1"><Phone className="w-3 h-3 text-slate-400" /><span>{supplier.phone}</span></span>}
                {supplier.address && <span className="flex items-center space-x-1"><MapPin className="w-3 h-3 text-slate-400" /><span>{supplier.address}</span></span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 shrink-0">
            {hasOutstanding && (
              <Link
                href={`/supplier-payments/new?supplier_id=${supplier.id}`}
                className="btn-press px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition shadow-xs"
              >
                <CreditCard className="w-4 h-4" /><span>Make Payment</span>
              </Link>
            )}
            <Link
              href={`/purchases/new?supplier_id=${supplier.id}`}
              className="btn-press px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4" /><span>New Purchase</span>
            </Link>
            <button onClick={() => setDeleteModalOpen(true)} className="btn-press p-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Purchased</span>
            <div className="text-2xl font-black text-slate-900 font-mono">Rs. {(supplier.total_purchased || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 font-mono">{purchases.filter(p => !p.is_voided).length} purchases recorded</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Paid to Supplier</span>
            <div className="text-2xl font-black text-emerald-700 font-mono">Rs. {(supplier.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 font-mono">{payments.filter(p => !p.is_voided).length} payments made</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">We Still Owe</span>
            <div className={`text-2xl font-black font-mono ${hasOutstanding ? 'text-rose-700' : 'text-slate-900'}`}>
              Rs. {(supplier.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 font-mono">{hasOutstanding ? 'Pending settlement' : 'Fully settled'}</p>
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 font-heading">Purchase History</h3>
            <span className="text-xs font-mono text-slate-500">{purchases.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5 pl-4">Purchase #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Total Cost</th>
                  <th className="p-3.5 text-right">Paid</th>
                  <th className="p-3.5 text-right">Balance</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length > 0 ? purchases.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50/60 transition ${p.is_voided ? 'opacity-40 line-through' : ''}`}>
                    <td className="p-3.5 pl-4 font-bold text-slate-900">
                      <Link href={`/purchases/${p.id}`} className="hover:underline">{p.purchase_number}</Link>
                    </td>
                    <td className="p-3.5 text-slate-500">{formatDatePKT(p.purchase_date, false)}</td>
                    <td className="p-3.5 text-right font-bold text-slate-900">Rs. {p.total_cost.toLocaleString()}</td>
                    <td className="p-3.5 text-right text-emerald-700 font-semibold">Rs. {p.amount_paid.toLocaleString()}</td>
                    <td className="p-3.5 text-right font-bold text-rose-700">Rs. {p.remaining_amount.toLocaleString()}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.is_voided ? 'bg-slate-100 text-slate-500' :
                        p.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-800' :
                        p.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-800' :
                        'bg-rose-50 text-rose-800'
                      }`}>
                        {p.is_voided ? 'VOIDED' : p.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      {!p.is_voided && (
                        <button
                          onClick={() => setVoidTarget(p)}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >Void</button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-xs">No purchases recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 font-heading">Payment History</h3>
            <span className="text-xs font-mono text-slate-500">{payments.length} Receipts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5 pl-4">Date</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Note</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length > 0 ? payments.map((pay) => (
                  <tr key={pay.id} className={`hover:bg-slate-50/60 transition ${pay.is_voided ? 'opacity-40 line-through' : ''}`}>
                    <td className="p-3.5 pl-4 text-slate-700">{formatDatePKT(pay.payment_date, false)}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">Rs. {pay.amount.toLocaleString()}</td>
                    <td className="p-3.5 text-slate-600">{pay.payment_method}</td>
                    <td className="p-3.5 text-slate-500">{pay.note || '—'}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${pay.is_voided ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-800'}`}>
                        {pay.is_voided ? 'VOIDED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      {!pay.is_voided && (
                        <button onClick={() => setVoidPayTarget(pay)} className="text-xs font-bold text-rose-600 hover:underline">Void</button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Supplier Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete Supplier: "${supplier.name}"?`}
        message="This will permanently delete this supplier account and all associated purchase and payment history."
        actionDetails={[
          { label: 'Supplier Profile', description: 'All details will be erased.' },
          { label: 'Outstanding Payable', description: `Rs. ${(supplier.total_outstanding || 0).toLocaleString()} balance removed.` },
        ]}
        warningNote="Permanent action: Cannot be undone."
        confirmText="Yes, Delete Supplier"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Void Purchase Modal */}
      {voidTarget && (
        <ConfirmModal
          isOpen={true}
          title={`Void Purchase ${voidTarget.purchase_number}?`}
          message="This will reverse the stock that was added through this purchase and cancel the outstanding balance."
          actionDetails={[
            { label: 'Stock Reversal', description: `${(voidTarget.items || []).reduce((s, i) => s + i.quantity, 0)} pieces will be subtracted from inventory.` },
            { label: 'Balance Impact', description: `Rs. ${voidTarget.remaining_amount.toLocaleString()} payable will be cancelled.` },
          ]}
          warningNote="This action cannot be undone."
          confirmText="Yes, Void Purchase"
          cancelText="Cancel"
          variant="danger"
          isLoading={voiding}
          onConfirm={handleVoidPurchase}
          onCancel={() => setVoidTarget(null)}
        />
      )}

      {/* Void Payment Modal */}
      {voidPayTarget && (
        <ConfirmModal
          isOpen={true}
          title="Void Supplier Payment?"
          message={`This will reverse the Rs. ${voidPayTarget.amount.toLocaleString()} payment and reopen the balance on associated purchases.`}
          warningNote="This action cannot be undone."
          confirmText="Yes, Void Payment"
          cancelText="Cancel"
          variant="danger"
          isLoading={voidingPay}
          onConfirm={handleVoidPayment}
          onCancel={() => setVoidPayTarget(null)}
        />
      )}
    </AppLayout>
  );
}
