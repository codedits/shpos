'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { wholesaleService } from '@/services/wholesaleService';
import { Order, BusinessSettings, Customer } from '@/types/wholesale';
import {
  Printer,
  ArrowLeft,
  Store,
  AlertCircle,
  CreditCard,
  QrCode,
  Receipt,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  History,
  AlertTriangle,
  Layers,
  Ban,
} from 'lucide-react';
import { formatDatePKT } from '@/lib/dateUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/context/ToastContext';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceParam = params?.id as string;

  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formatMode, setFormatMode] = useState<'a4' | 'thermal'>('a4');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const loadInvoice = async () => {
    if (!invoiceParam) return;
    try {
      setLoading(true);
      const [ord, setts] = await Promise.all([
        wholesaleService.getOrderById(invoiceParam),
        wholesaleService.getSettings(),
      ]);

      if (!ord) {
        setErrorMessage(`Invoice "${invoiceParam}" not found.`);
        return;
      }

      setOrder(ord);
      setSettings(setts);

      if (ord.customer_id) {
        const cust = await wholesaleService.getCustomerById(ord.customer_id);
        setCustomer(cust);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceParam]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleConfirmVoidOrder = async () => {
    if (!order) return;
    try {
      setVoiding(true);
      await wholesaleService.voidOrder(order.id, 'Administrative cancellation requested from voucher');
      toast.success(
        'Invoice Voided',
        `Invoice ${order.invoice_number} cancelled. Stock successfully restored.`
      );
      setVoidModalOpen(false);
      await loadInvoice();
    } catch (err: any) {
      toast.error('Could Not Void Invoice', err.message);
    } finally {
      setVoiding(false);
    }
  };

  // Derive consolidated payment history
  const paymentHistoryList = useMemo(() => {
    if (!order) return [];
    if (order.payments_history && order.payments_history.length > 0) {
      return order.payments_history;
    }
    // If order has amount_paid > 0 but payments_history array is empty, synthesize initial entry
    if (order.amount_paid > 0) {
      return [
        {
          id: 'initial-pay',
          payment_id: 'initial',
          amount_allocated: order.amount_paid,
          payment_date: order.order_date,
          payment_method: 'Advance / Initial Payment',
          note: 'Initial advance booking payment',
        },
      ];
    }
    return [];
  }, [order]);

  // Derived piece count
  const totalPiecesCount = useMemo(() => {
    if (!order || !order.items) return 0;
    return order.items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }, [order]);

  // Balance calculations
  const totalInvoiced = order ? order.total_amount || 0 : 0;
  const totalPaidAgainstThisInvoice = order ? order.amount_paid || 0 : 0;
  const currentInvoiceRemaining = order ? Math.max(0, totalInvoiced - totalPaidAgainstThisInvoice) : 0;
  const isFullySettled = currentInvoiceRemaining <= 0;

  // Multi-order customer balance breakdown
  const customerTotalOutstanding = customer?.total_outstanding !== undefined
    ? customer.total_outstanding
    : currentInvoiceRemaining;
  const previousAccountBalance = Math.max(0, customerTotalOutstanding - currentInvoiceRemaining);
  const netTotalAccountPayable = customerTotalOutstanding;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-600 font-mono text-xs uppercase">
        Loading invoice details...
      </div>
    );
  }

  if (!order || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white p-8 rounded-xl border border-slate-200 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-800 mx-auto" />
          <h2 className="font-bold text-sm uppercase">Invoice Not Found</h2>
          <p className="text-xs text-slate-500 font-mono">{errorMessage || 'Could not locate order details.'}</p>
          <Link
            href="/orders"
            className="btn-press inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-8 flex flex-col items-center select-none text-slate-900 print:p-0 print:bg-white print:min-h-0">
      {/* Top Action & Format Toggle Bar (Hidden in Print) */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 no-print">
        <Link
          href="/invoices"
          className="btn-press px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>

        {/* Format Toggle (A4 vs Thermal) */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-200/80 border border-slate-300">
          <button
            type="button"
            onClick={() => setFormatMode('a4')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              formatMode === 'a4'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A4 Commercial</span>
          </button>
          <button
            type="button"
            onClick={() => setFormatMode('thermal')}
            className={`btn-press flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              formatMode === 'thermal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>80mm POS Thermal</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {!order.is_voided && (
            <button
              onClick={() => setVoidModalOpen(true)}
              className="btn-press px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
              title="Cancel and void this invoice"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void Voucher</span>
            </button>
          )}

          {!order.is_voided && currentInvoiceRemaining > 0 && (
            <Link
              href={`/payments/new?customer_id=${order.customer_id}&order_id=${order.id}`}
              className="btn-press px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Installment (Rs. {currentInvoiceRemaining.toLocaleString()})</span>
            </Link>
          )}

          <button
            onClick={handlePrint}
            className="btn-press px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
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
          /* 1. OFFICIAL A4 COMMERCIAL INVOICE FORMAT                                  */
          /* ========================================================================= */
          <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-sm font-sans space-y-6 print:border-none print:shadow-none print:p-0 relative">
            {/* VOID WATERMARK IF ORDER IS CANCELLED / VOIDED */}
            {order.is_voided && (
              <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 flex items-center justify-between font-mono text-xs mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm uppercase">TRANSACTION VOIDED / CANCELLED</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Reason: {order.void_reason || 'Administrative correction'} • Voided at: {formatDatePKT(order.voided_at, true)}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-rose-600 text-white font-bold text-[10px] rounded uppercase tracking-widest">
                  VOID
                </span>
              </div>
            )}

            {/* Header: Business & Invoice Details */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 font-heading">
                  {settings.business_name}
                </h1>
                {settings.address && (
                  <p className="text-xs text-slate-600 font-mono mt-0.5">{settings.address}</p>
                )}
                {settings.phone && (
                  <p className="text-xs text-slate-600 font-mono">Phone: {settings.phone}</p>
                )}
              </div>

              <div className="text-right font-mono">
                <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-bold text-[11px] rounded tracking-widest uppercase">
                  COMMERCIAL SALES INVOICE
                </span>
                <p className="text-base font-black text-slate-900 mt-1.5">{order.invoice_number}</p>
                <p className="text-xs text-slate-500">
                  Date: {formatDatePKT(order.order_date, true)}
                </p>
              </div>
            </div>

            {/* Customer & Invoice Status Box */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-start text-xs font-mono">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Billed To (Client / Customer):</p>
                <p className="text-sm font-bold uppercase text-slate-900 font-sans mt-0.5">
                  {customer?.name || order.customer?.name || 'Walk-in Buyer'}
                </p>
                {customer?.phone && <p className="text-slate-600">Contact: {customer.phone}</p>}
                {customer?.address && <p className="text-slate-600">Market/City: {customer.address}</p>}
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-slate-400">Invoice Status:</p>
                <div className="mt-1">
                  {order.is_voided ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                      VOIDED
                    </span>
                  ) : isFullySettled ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>PAID IN FULL</span>
                    </span>
                  ) : totalPaidAgainstThisInvoice > 0 ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                      <span>PARTIALLY PAID</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                      <span>UNPAID (CREDIT)</span>
                    </span>
                  )}
                </div>
                {order.notes && <p className="text-slate-500 text-[11px] mt-1">Remarks: {order.notes}</p>}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-sans">
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Product Description</th>
                    <th className="p-3 text-center">Size</th>
                    <th className="p-3 text-center">Color</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Rate / Unit</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-900">{it.product_code_snapshot}</td>
                      <td className="p-3 font-sans font-bold text-slate-900">{it.product_name_snapshot}</td>
                      <td className="p-3 text-center text-slate-700">{it.size_snapshot || '—'}</td>
                      <td className="p-3 text-center text-slate-700">{it.color_snapshot || '—'}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{it.quantity} Pcs</td>
                      <td className="p-3 text-right">Rs. {it.selling_price_per_unit.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        Rs. {it.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <td colSpan={4} className="p-3 font-sans text-xs uppercase tracking-wider text-slate-600">
                      Total Quantity Booked:
                    </td>
                    <td className="p-3 text-right text-xs">{totalPiecesCount} Pcs</td>
                    <td className="p-3 text-right font-sans text-slate-500 text-[11px]">Subtotal:</td>
                    <td className="p-3 text-right text-xs">
                      Rs. {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Chronological Payment & Installments Log */}
            {paymentHistoryList.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden space-y-0">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-slate-700" />
                    <h4 className="font-bold text-xs text-slate-900 uppercase font-sans">
                      Payments & Installments Log
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                    Total Paid: Rs. {totalPaidAgainstThisInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                      <th className="p-2.5">Date Paid</th>
                      <th className="p-2.5">Method</th>
                      <th className="p-2.5">Details / Remarks</th>
                      <th className="p-2.5 text-right">Amount Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentHistoryList.map((ph, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-700">
                          {formatDatePKT(ph.payment_date, true)}
                        </td>
                        <td className="p-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold uppercase">
                            {ph.payment_method}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 font-sans text-[11px]">
                          {ph.note || (idx === 0 ? 'Advance / Deposit' : `Installment #${idx + 1}`)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700">
                          Rs. {ph.amount_allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals & Clear Financial Settlement Breakdown */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-96 space-y-2.5 font-mono text-xs">
                {/* 1. Current Invoice Gross Subtotal */}
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal ({totalPiecesCount} Pcs):</span>
                  <span className="font-bold text-slate-900">
                    Rs. {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 2. Total Invoice Amount */}
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Current Invoice Total:</span>
                  <span>Rs. {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                {/* 3. Total Received Against This Invoice */}
                <div className="flex justify-between text-slate-700">
                  <span>Amount Paid on This Invoice:</span>
                  <span className="font-bold text-emerald-700">
                    - Rs. {totalPaidAgainstThisInvoice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 4. Current Invoice Remaining Balance Due */}
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                  <span>Invoice Balance Due:</span>
                  <span className={currentInvoiceRemaining > 0 ? 'text-rose-700 font-black text-sm' : 'text-emerald-700 font-black'}>
                    Rs. {currentInvoiceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 5. Comprehensive Customer Account Ledger Box */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-sans text-[11px] font-bold uppercase tracking-wider">
                    <span>Customer Ledger Status</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">All Orders</span>
                  </div>

                  {previousAccountBalance > 0 && (
                    <div className="flex justify-between text-slate-600 pt-1">
                      <span>Previous Pending Balance:</span>
                      <span className="font-bold text-slate-800">
                        Rs. {previousAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>This Invoice Due:</span>
                    <span className="font-bold text-slate-800">
                      Rs. {currentInvoiceRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-900 font-black border-t border-slate-200 pt-1.5 text-xs">
                    <span className="uppercase text-[11px] tracking-wide">Net Total Customer Payable:</span>
                    <span className={`text-sm ${netTotalAccountPayable > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Rs. {netTotalAccountPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature & Footer */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs font-mono text-slate-500">
              <div>
                <p className="text-[10px] uppercase text-slate-400">Authorized Signature / Stamp</p>
                <div className="mt-8 w-40 border-b border-slate-300" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-sans font-bold text-slate-700">Thank you for your business!</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Computer-generated official sales voucher • Buraq Wholesale</p>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. COMPACT 80MM POS THERMAL RECEIPT FORMAT                                */
          /* ========================================================================= */
          <div className="w-80 bg-white rounded-lg border border-slate-300 p-5 font-mono text-xs space-y-3 shadow-md print:border-none print:shadow-none print:p-0">
            {order.is_voided && (
              <div className="p-2 rounded bg-rose-50 border border-rose-300 text-rose-800 text-center font-bold text-[11px]">
                *** VOIDED TRANSACTION ***
              </div>
            )}

            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-sm uppercase text-slate-900 tracking-wider font-heading">
                {settings.business_name}
              </h2>
              {settings.address && <p className="text-[10px] text-slate-600">{settings.address}</p>}
              {settings.phone && <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>}
              <p className="text-[11px] font-bold text-slate-900 mt-1">INVOICE: {order.invoice_number}</p>
              <p className="text-[10px] text-slate-500">
                {formatDatePKT(order.order_date, true)}
              </p>
            </div>

            <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
              <p>
                <span className="text-slate-500">Customer:</span>{' '}
                <span className="font-bold text-slate-900">{customer?.name || 'Walk-in'}</span>
              </p>
              {customer?.phone && <p className="text-slate-500">Phone: {customer.phone}</p>}
            </div>

            {/* Items List */}
            <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-300 text-[11px]">
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{it.product_name_snapshot}</span>
                    <span>Rs. {it.line_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {it.quantity} pcs @ Rs. {it.selling_price_per_unit.toFixed(2)}
                    </span>
                    <span>[{it.size_snapshot || '—'}/{it.color_snapshot || '—'}]</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Installments Breakdown in Thermal */}
            {paymentHistoryList.length > 0 && (
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-300 text-[10px]">
                <p className="font-bold text-slate-700 uppercase">Payments Log:</p>
                {paymentHistoryList.map((ph, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>
                      {new Date(ph.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ({ph.payment_method})
                    </span>
                    <span className="font-bold text-slate-900">Rs. {ph.amount_allocated.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>TOTAL ({totalPiecesCount} PCS):</span>
                <span>Rs. {totalInvoiced.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>AMOUNT PAID:</span>
                <span>- Rs. {totalPaidAgainstThisInvoice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-dashed border-slate-300 pt-1">
                <span>INVOICE DUE:</span>
                <span className={currentInvoiceRemaining > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}>
                  Rs. {currentInvoiceRemaining.toFixed(2)}
                </span>
              </div>

              {previousAccountBalance > 0 && (
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>PREVIOUS DUE:</span>
                  <span>Rs. {previousAccountBalance.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-300 pt-1">
                <span>NET TOTAL DUE:</span>
                <span className={netTotalAccountPayable > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}>
                  Rs. {netTotalAccountPayable.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">*** THANK YOU ***</p>
              <p>Official Sales Receipt</p>
            </div>
          </div>
        )}
      </div>

      {/* Screen-Centered "Are You Sure?" Confirmation Modal for Voiding Invoice */}
      <ConfirmModal
        isOpen={voidModalOpen}
        title={`Void Invoice ${order?.invoice_number}?`}
        message={`Are you sure you want to cancel and void sales invoice ${order?.invoice_number} for customer ${customer?.name || 'Walk-in Buyer'}?`}
        actionDetails={[
          {
            label: 'Inventory Return',
            description: 'All garment quantities in this order will be automatically added back to stock inventory.',
          },
          {
            label: 'Customer Ledger Balance',
            description: `This invoice's balance (Rs. ${(order?.remaining_amount || 0).toLocaleString()}) will be removed from customer outstanding debt.`,
          },
          {
            label: 'Audit & Compliance',
            description: 'The voucher will be marked VOIDED and permanently watermarked with cancellation timestamp.',
          },
        ]}
        warningNote="Irreversible Action: Once voided, this invoice cannot be restored or re-opened."
        confirmText="Yes, Void Invoice"
        cancelText="Keep Invoice Active"
        variant="danger"
        isLoading={voiding}
        onConfirm={handleConfirmVoidOrder}
        onCancel={() => setVoidModalOpen(false)}
      />
    </div>
  );
}
