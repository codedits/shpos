'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { wholesaleService } from '@/services/wholesaleService';
import { Purchase, BusinessSettings, Supplier } from '@/types/wholesale';
import {
  Printer,
  ArrowLeft,
  Truck,
  AlertCircle,
  CreditCard,
  Receipt,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  History,
  AlertTriangle,
  Package,
  Ban,
  Phone,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { formatDatePKT } from '@/lib/dateUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/context/ToastContext';

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseParam = params?.id as string;

  const toast = useToast();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formatMode, setFormatMode] = useState<'a4' | 'thermal'>('a4');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const loadPurchase = async () => {
    if (!purchaseParam) return;
    try {
      setLoading(true);
      const [pur, setts] = await Promise.all([
        wholesaleService.getPurchaseById(purchaseParam),
        wholesaleService.getSettings(),
      ]);

      if (!pur) {
        setErrorMessage(`Purchase Invoice "${purchaseParam}" not found.`);
        return;
      }

      setPurchase(pur);
      setSettings(setts);

      if (pur.supplier_id) {
        const supp = await wholesaleService.getSupplierById(pur.supplier_id);
        setSupplier(supp);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchase();
  }, [purchaseParam]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleConfirmVoidPurchase = async () => {
    if (!purchase) return;
    try {
      setVoiding(true);
      await wholesaleService.voidPurchase(purchase.id, 'Administrative cancellation requested from voucher');
      toast.success(
        'Purchase Voided',
        `Purchase ${purchase.purchase_number} cancelled. Supplier ledger adjusted.`
      );
      setVoidModalOpen(false);
      await loadPurchase();
    } catch (err: any) {
      toast.error('Could Not Void Purchase', err.message);
    } finally {
      setVoiding(false);
    }
  };

  // Payment history for this purchase
  const paymentHistoryList = useMemo(() => {
    if (!purchase) return [];
    if (purchase.payments_history && purchase.payments_history.length > 0) {
      return purchase.payments_history;
    }
    if (purchase.amount_paid > 0) {
      return [
        {
          id: 'initial-pay',
          payment_id: 'initial',
          amount_allocated: purchase.amount_paid,
          payment_date: purchase.purchase_date,
          payment_method: 'Advance / Initial Payment',
          note: 'Initial payment at invoice creation',
        },
      ];
    }
    return [];
  }, [purchase]);

  // Derived piece count
  const totalPiecesCount = useMemo(() => {
    if (!purchase || !purchase.items) return 0;
    return purchase.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }, [purchase]);

  // Balance calculations
  const totalCost = purchase ? Math.round(purchase.total_cost || 0) : 0;
  const totalPaid = purchase ? Math.round(purchase.amount_paid || 0) : 0;
  const currentLoanRemaining = purchase ? Math.round(purchase.remaining_amount || 0) : 0;
  const isFullySettled = currentLoanRemaining <= 0;

  // Supplier multi-invoice debt breakdown
  const supplierTotalDebt = supplier?.total_outstanding !== undefined
    ? Math.round(supplier.total_outstanding)
    : currentLoanRemaining;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-600 font-mono text-xs uppercase">
        Loading purchase invoice details...
      </div>
    );
  }

  if (!purchase || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-800 mx-auto" />
          <h2 className="font-bold text-sm uppercase font-heading">Purchase Invoice Not Found</h2>
          <p className="text-xs text-slate-500 font-mono">{errorMessage || 'Could not locate purchase record.'}</p>
          <Link
            href="/purchases"
            className="btn-press inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            Back to Purchases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-8 flex flex-col items-center select-none text-slate-900 print:p-0 print:bg-white print:min-h-0 font-sans">
      {/* Top Action & Format Toggle Bar (Hidden in Print) */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 no-print">
        <Link
          href="/purchases"
          className="btn-press px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Purchases</span>
        </Link>

        {/* Format Toggle (A4 vs Thermal) */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-200/80 border border-slate-300">
          <button
            type="button"
            onClick={() => setFormatMode('a4')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              formatMode === 'a4'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A4 Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => setFormatMode('thermal')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              formatMode === 'thermal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>80mm Thermal</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {!purchase.is_voided && (
            <button
              onClick={() => setVoidModalOpen(true)}
              className="btn-press px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-xs"
              title="Cancel and void this purchase"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void Voucher</span>
            </button>
          )}

          {!purchase.is_voided && currentLoanRemaining > 0 && purchase.supplier_id && (
            <Link
              href={`/supplier-payments/new?supplier_id=${purchase.supplier_id}&purchase_id=${purchase.id}`}
              className="btn-press px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Loan (Rs. {currentLoanRemaining.toLocaleString()})</span>
            </Link>
          )}

          <button
            onClick={handlePrint}
            className="btn-press px-5 py-2 bg-violet-900 hover:bg-violet-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div id="printable-document" className="w-full flex justify-center">
        {formatMode === 'a4' ? (
          /* ========================================================================= */
          /* 1. OFFICIAL A4 COMMERCIAL PURCHASE VOUCHER                                */
          /* ========================================================================= */
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm font-sans space-y-6 print:border-none print:shadow-none print:p-0 relative">
            {/* VOID WATERMARK */}
            {purchase.is_voided && (
              <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-center justify-between font-mono text-xs mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-black text-sm uppercase block">Purchase Voided / Cancelled</span>
                    <span>This invoice was cancelled on {purchase.voided_at ? formatDatePKT(purchase.voided_at, true) : 'N/A'}.</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-rose-200 text-rose-900 font-bold rounded-lg uppercase text-[10px]">
                  Void Record
                </span>
              </div>
            )}

            {/* Business & Document Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-heading">
                  {settings.business_name || 'BURAQ WHOLESALE'}
                </h1>
                <p className="text-xs text-slate-500 font-mono">{settings.invoice_footer_note || 'Garments & Wholesale Supply Chain'}</p>
                <div className="text-xs text-slate-600 space-y-0.5 pt-1 font-mono">
                  {settings.address && <p>{settings.address}</p>}
                  {settings.phone && <p>Phone: {settings.phone}</p>}
                </div>
              </div>
              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 rounded-lg bg-violet-900 text-white font-mono font-black text-xs uppercase tracking-wider">
                  Goods Receipt Voucher
                </span>
                <div className="text-xl font-black font-mono text-slate-900 pt-1">
                  {purchase.purchase_number}
                </div>
                <div className="text-xs text-slate-500 font-mono flex items-center justify-end space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDatePKT(purchase.purchase_date, false)}</span>
                </div>
              </div>
            </div>

            {/* Supplier & Delivery Info Banner */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Supplier / Vendor
                </span>
                <p className="font-extrabold text-sm text-slate-900">{supplier?.name || purchase.supplier?.name || 'Cash / Direct Supplier'}</p>
                {supplier?.phone && <p className="font-mono text-slate-600">Phone: {supplier.phone}</p>}
                {supplier?.address && <p className="text-slate-600">{supplier.address}</p>}
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  Payment & Loan Status
                </span>
                <div className="pt-0.5">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                      purchase.is_voided
                        ? 'bg-slate-200 text-slate-700'
                        : isFullySettled
                        ? 'bg-emerald-100 text-emerald-800'
                        : totalPaid > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isFullySettled ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>
                      {purchase.is_voided ? 'VOIDED' : isFullySettled ? 'PAID IN FULL' : totalPaid > 0 ? 'PARTIAL PAYMENT' : '100% SUPPLIER LOAN'}
                    </span>
                  </span>
                </div>
                {purchase.notes && <p className="text-[11px] text-slate-500 font-mono italic pt-1">Note: {purchase.notes}</p>}
              </div>
            </div>

            {/* Itemized Purchased Lot Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Purchased Garment Lots & Stock
              </span>
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-y border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Lot (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(purchase.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                        {item.product_name_snapshot}
                        {(item.color_snapshot || item.size_snapshot) && (
                          <span className="block text-[10px] font-mono text-slate-500 font-normal">
                            {[item.color_snapshot, item.size_snapshot].filter(Boolean).join(' / ')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.quantity} pcs</td>
                      <td className="py-2.5 px-3 text-right text-slate-700">Rs. {Math.round(item.cost_per_unit).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        Rs. {Math.round(item.line_total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Calculation & Supplier Ledger */}
            <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-6 text-xs font-mono">
              <div className="space-y-2">
                {/* Multi-Invoice Supplier Account Standing */}
                {supplier && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Supplier Ledger Summary
                    </span>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Purchased to Date:</span>
                      <span className="font-bold">Rs. {Math.round(supplier.total_purchased || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Paid to Date:</span>
                      <span className="font-bold text-emerald-700">Rs. {Math.round(supplier.total_paid || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-1 text-slate-900 font-black">
                      <span>Total Debt We Owe Supplier:</span>
                      <span className={supplierTotalDebt > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        Rs. {supplierTotalDebt.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Specific Invoice Calculation */}
              <div className="space-y-1.5 text-right font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Total Garments Received:</span>
                  <span className="font-bold">{totalPiecesCount} pcs</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1 text-sm">
                  <span>Total Lot Invoiced:</span>
                  <span className="font-black text-slate-900">Rs. {totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Amount Paid:</span>
                  <span>- Rs. {totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900 text-white p-2.5 rounded-lg text-sm font-black mt-2">
                  <span>Balance Due / Loan:</span>
                  <span className={currentLoanRemaining > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    Rs. {currentLoanRemaining.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Consolidated Payment Logs History */}
            {paymentHistoryList.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <History className="w-4 h-4 text-violet-700" />
                  <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Payment Log & Installment History</h4>
                </div>
                <table className="w-full text-left border-collapse text-[11px] font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px]">
                      <th className="py-1.5 px-3">Date</th>
                      <th className="py-1.5 px-3">Method</th>
                      <th className="py-1.5 px-3">Reference / Note</th>
                      <th className="py-1.5 px-3 text-right">Amount Paid (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentHistoryList.map((pay, i) => (
                      <tr key={pay.id || i} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-3 font-semibold text-slate-800">
                          {formatDatePKT(pay.payment_date, false)}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">{pay.payment_method}</td>
                        <td className="py-1.5 px-3 text-slate-500 italic">{pay.note || '—'}</td>
                        <td className="py-1.5 px-3 text-right font-black text-emerald-700">
                          Rs. {Math.round(pay.amount_allocated).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures & Footer */}
            <div className="border-t border-slate-200 pt-10 grid grid-cols-2 gap-12 text-center text-xs font-mono">
              <div>
                <div className="border-t border-dashed border-slate-400 w-48 mx-auto mb-1"></div>
                <span className="text-slate-500 text-[10px] uppercase font-bold">Goods Received & Verified By</span>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 w-48 mx-auto mb-1"></div>
                <span className="text-slate-500 text-[10px] uppercase font-bold">Authorized Signatory</span>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. 80mm POS THERMAL RECEIPT FORMAT                                        */
          /* ========================================================================= */
          <div className="w-80 bg-white p-4 shadow-sm border border-slate-200 text-[11px] font-mono space-y-3 print:border-none print:shadow-none print:p-0 print:w-full">
            <div className="text-center space-y-0.5">
              <h2 className="text-sm font-black uppercase font-heading">{settings.business_name || 'BURAQ WHOLESALE'}</h2>
              <p className="text-[10px] text-slate-500">{settings.invoice_footer_note || 'Garments & Supply Chain'}</p>
              {settings.phone && <p className="text-[10px]">Phone: {settings.phone}</p>}
              <div className="border-b border-dashed border-slate-400 my-2"></div>
              <p className="font-black text-xs uppercase">PURCHASE RECEIPT</p>
              <p className="font-bold">{purchase.purchase_number}</p>
              <p className="text-[10px] text-slate-500">{formatDatePKT(purchase.purchase_date, false)}</p>
            </div>

            <div className="border-y border-dashed border-slate-300 py-1.5 space-y-0.5 text-[10px]">
              <p className="font-bold">Supplier: {supplier?.name || purchase.supplier?.name || 'Direct Supplier'}</p>
              {supplier?.phone && <p>Phone: {supplier.phone}</p>}
            </div>

            {/* Line items */}
            <div className="space-y-1 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between font-bold text-[10px] uppercase">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              {(purchase.items || []).map((it, idx) => (
                <div key={it.id || idx} className="flex justify-between items-start text-[10px]">
                  <span className="truncate max-w-[120px] font-sans font-semibold">{it.product_name_snapshot}</span>
                  <span>{it.quantity} x {Math.round(it.cost_per_unit)}</span>
                  <span className="font-bold">Rs. {Math.round(it.line_total).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Total Pieces:</span>
                <span className="font-bold">{totalPiecesCount} pcs</span>
              </div>
              <div className="flex justify-between font-black text-sm">
                <span>Total Lot Cost:</span>
                <span>Rs. {totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Amount Paid:</span>
                <span>Rs. {totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black border-t border-dashed border-slate-400 pt-1 text-rose-700">
                <span>Remaining Loan:</span>
                <span>Rs. {currentLoanRemaining.toLocaleString()}</span>
              </div>
              {supplier && (
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>Supplier Total Debt:</span>
                  <span className="font-bold">Rs. {supplierTotalDebt.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Payment logs */}
            {paymentHistoryList.length > 0 && (
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[10px]">
                <p className="font-bold uppercase text-[9px] text-slate-500">Payments Log:</p>
                {paymentHistoryList.map((p, i) => (
                  <div key={p.id || i} className="flex justify-between">
                    <span>{formatDatePKT(p.payment_date, false)} ({p.payment_method})</span>
                    <span className="font-bold text-emerald-700">Rs. {Math.round(p.amount_allocated).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[9px] text-slate-500">
              <p>System Generated Goods Voucher</p>
              <p>{new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Void Modal */}
      {voidModalOpen && purchase && (
        <ConfirmModal
          isOpen={true}
          title={`Void Purchase ${purchase.purchase_number}?`}
          message="This will reverse this purchase transaction and adjust the supplier's balance."
          actionDetails={[
            { label: 'Invoice Lot Total', description: `Rs. ${totalCost.toLocaleString()} lot value will be removed.` },
            { label: 'Remaining Loan', description: `Rs. ${currentLoanRemaining.toLocaleString()} loan payable will be cancelled.` },
          ]}
          warningNote="This action cannot be undone."
          confirmText="Yes, Void Purchase"
          cancelText="Cancel"
          onConfirm={handleConfirmVoidPurchase}
          onCancel={() => setVoidModalOpen(false)}
          isLoading={voiding}
        />
      )}
    </div>
  );
}
