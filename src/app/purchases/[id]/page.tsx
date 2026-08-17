'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Purchase } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDatePKT } from '@/lib/dateUtils';
import {
  ClipboardList,
  ArrowLeft,
  AlertCircle,
  Truck,
} from 'lucide-react';

export default function PurchaseDetailPage() {
  const params = useParams();
  const toast = useToast();
  const purchaseId = params?.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    async function load() {
      if (!purchaseId) return;
      try {
        setLoading(true);
        const p = await wholesaleService.getPurchaseById(purchaseId);
        setPurchase(p);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [purchaseId]);

  const handleVoid = async () => {
    if (!purchase) return;
    try {
      setVoiding(true);
      await wholesaleService.voidPurchase(purchase.id);
      toast.success('Purchase Voided', `${purchase.purchase_number} has been voided. Stock reversed.`);
      const updated = await wholesaleService.getPurchaseById(purchaseId);
      setPurchase(updated);
      setVoidModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to Void', err.message);
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return <AppLayout><div className="max-w-4xl mx-auto p-12 text-center font-mono text-xs text-slate-400 uppercase">Loading purchase details...</div></AppLayout>;
  }

  if (!purchase) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-800 mx-auto" />
          <h2 className="font-bold text-sm uppercase">Purchase Not Found</h2>
          <Link href="/purchases" className="inline-block px-4 py-2 bg-violet-900 text-white text-xs font-bold rounded-xl">Back to Purchases</Link>
        </div>
      </AppLayout>
    );
  }

  const totalPieces = (purchase.items || []).reduce((s, i) => s + i.quantity, 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <Link href="/purchases" className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-violet-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">{purchase.purchase_number}</h1>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500 mt-1">
                <span>{formatDatePKT(purchase.purchase_date, true)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  purchase.is_voided ? 'bg-slate-100 text-slate-500' :
                  purchase.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-800' :
                  purchase.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-800' :
                  'bg-rose-50 text-rose-800'
                }`}>{purchase.is_voided ? 'VOIDED' : purchase.payment_status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            {!purchase.is_voided && (
              <button onClick={() => setVoidModalOpen(true)} className="btn-press px-4 py-2 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition">
                Void Purchase
              </button>
            )}
          </div>
        </div>

        {/* Supplier Info */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-900 text-white flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</span>
              <p className="text-sm font-bold text-slate-900">
                {purchase.supplier ? (
                  <Link href={`/suppliers/${purchase.supplier_id}`} className="hover:underline">{purchase.supplier.name}</Link>
                ) : 'Other Source'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Cost</span>
            <div className="text-2xl font-black text-slate-900 font-mono">Rs. {purchase.total_cost.toLocaleString()}</div>
            <p className="text-xs text-slate-500 font-mono">{totalPieces} pieces received</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Paid</span>
            <div className="text-2xl font-black text-emerald-700 font-mono">Rs. {purchase.amount_paid.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Balance Due</span>
            <div className={`text-2xl font-black font-mono ${purchase.remaining_amount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              Rs. {purchase.remaining_amount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 font-heading">Purchase Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5 pl-4">Product</th>
                  <th className="p-3.5">Color</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5 text-center">Qty</th>
                  <th className="p-3.5 text-right">Cost/Unit</th>
                  <th className="p-3.5 text-right pr-4">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(purchase.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="p-3.5 pl-4 font-bold text-slate-900">{item.product_name_snapshot}</td>
                    <td className="p-3.5 text-slate-600">{item.color_snapshot || '—'}</td>
                    <td className="p-3.5 text-slate-600">{item.size_snapshot || '—'}</td>
                    <td className="p-3.5 text-center font-bold">{item.quantity}</td>
                    <td className="p-3.5 text-right">Rs. {item.cost_per_unit.toLocaleString()}</td>
                    <td className="p-3.5 text-right pr-4 font-bold text-slate-900">Rs. {item.line_total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {purchase.notes && (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</span>
            <p className="text-sm text-slate-700 mt-1">{purchase.notes}</p>
          </div>
        )}
      </div>

      {/* Void Modal */}
      {voidModalOpen && purchase && (
        <ConfirmModal
          isOpen={true}
          title={`Void ${purchase.purchase_number}?`}
          message="This will reverse all stock that was added through this purchase."
          actionDetails={[
            { label: 'Stock Reversal', description: `${totalPieces} pieces will be subtracted from inventory.` },
            { label: 'Balance', description: `Rs. ${purchase.remaining_amount.toLocaleString()} payable will be cancelled.` },
          ]}
          warningNote="This action cannot be undone."
          confirmText="Yes, Void Purchase"
          cancelText="Cancel"
          variant="danger"
          isLoading={voiding}
          onConfirm={handleVoid}
          onCancel={() => setVoidModalOpen(false)}
        />
      )}
    </AppLayout>
  );
}
