'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatDatePKT } from '@/lib/dateUtils';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceParam = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formatMode, setFormatMode] = useState<'a4' | 'thermal'>('a4');

  useEffect(() => {
    async function loadInvoice() {
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

        const cust = await wholesaleService.getCustomerById(ord.customer_id);
        setCustomer(cust);
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [invoiceParam]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

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
            className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const isFullySettled = order.remaining_amount <= 0;
  const paymentsHistory = order.payments_history || [];

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-8 flex flex-col items-center select-none text-slate-900 print:p-0 print:bg-white print:min-h-0">
      {/* Top Action & Format Toggle Bar (Hidden in Print) */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 no-print">
        <Link
          href="/orders"
          className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>

        {/* Format Toggle (A4 vs Thermal) */}
        <div className="flex items-center space-x-1 p-1 rounded-lg bg-slate-200/80 border border-slate-300">
          <button
            type="button"
            onClick={() => setFormatMode('a4')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
              formatMode === 'a4'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>A4 Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => setFormatMode('thermal')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
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
          {order.remaining_amount > 0 && (
            <Link
              href={`/payments/new?customer_id=${order.customer_id}&order_id=${order.id}`}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Installment (Rs. {order.remaining_amount.toLocaleString()})</span>
            </Link>
          )}

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div id="printable-document" className="w-full flex justify-center">
        {formatMode === 'a4' ? (
          /* ========================================================================= */
          /* 1. OFFICIAL A4 INVOICE FORMAT                                            */
          /* ========================================================================= */
          <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-sm font-sans space-y-6 print:border-none print:shadow-none print:p-0">
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
                  SALES INVOICE
                </span>
                <p className="text-base font-black text-slate-900 mt-1.5">{order.invoice_number}</p>
                <p className="text-xs text-slate-500">
                  Invoice Date: {formatDatePKT(order.order_date, true)}
                </p>
              </div>
            </div>

            {/* Customer & Payment Status Box */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-start text-xs font-mono">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Billed To (Customer):</p>
                <p className="text-sm font-bold uppercase text-slate-900 font-sans mt-0.5">
                  {customer?.name || order.customer?.name || 'Walk-in Customer'}
                </p>
                {customer?.phone && <p className="text-slate-600">Phone: {customer.phone}</p>}
                {customer?.address && <p className="text-slate-600">Address: {customer.address}</p>}
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-slate-400">Payment Status:</p>
                <div className="mt-1">
                  {isFullySettled ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>PAID IN FULL</span>
                    </span>
                  ) : order.amount_paid > 0 ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                      <span>PARTIALLY PAID</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase">
                      <span>UNPAID (CREDIT)</span>
                    </span>
                  )}
                </div>
                {order.notes && <p className="text-slate-500 text-[11px] mt-1">Ref: {order.notes}</p>}
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
                    <th className="p-3 text-right">Unit Price</th>
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
              </table>
            </div>

            {/* Chronological Payment & Installments History */}
            {paymentsHistory.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden space-y-0">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center space-x-2">
                  <History className="w-4 h-4 text-slate-700" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase font-sans">
                    Payment & Installments History
                  </h4>
                </div>
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                      <th className="p-2.5">Date Paid</th>
                      <th className="p-2.5">Payment Method</th>
                      <th className="p-2.5">Remarks / Details</th>
                      <th className="p-2.5 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentsHistory.map((ph, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-700">
                          {formatDatePKT(ph.payment_date, true)}
                        </td>
                        <td className="p-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">
                            {ph.payment_method}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 font-sans text-[11px]">
                          {ph.note || (idx === 0 ? 'Initial Payment' : `Installment #${idx + 1}`)}
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

            {/* Totals & Balance Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-80 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    Rs. {order.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total Invoice Amount:</span>
                  <span>Rs. {order.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between text-slate-700">
                  <span>Total Amount Paid:</span>
                  <span className="font-bold text-emerald-700">
                    Rs. {order.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                  <span>Remaining Balance Due:</span>
                  <span className={order.remaining_amount > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}>
                    Rs. {order.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Customer Account Outstanding Balance */}
                <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 flex justify-between items-center text-xs font-bold text-slate-900 mt-2">
                  <span className="uppercase text-[10px] tracking-wider text-slate-600">
                    Customer Account Balance:
                  </span>
                  <span className="text-sm">
                    Rs.{' '}
                    {(customer?.total_outstanding !== undefined
                      ? customer.total_outstanding
                      : order.remaining_amount
                    ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
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
                <p className="text-[10px]">Thank you for your business!</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Computer-generated official sales voucher</p>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. COMPACT 80MM POS THERMAL RECEIPT FORMAT                                */
          /* ========================================================================= */
          <div className="w-80 bg-white rounded-lg border border-slate-300 p-5 font-mono text-xs space-y-3 shadow-md print:border-none print:shadow-none print:p-0">
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
            {paymentsHistory.length > 0 && (
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-300 text-[10px]">
                <p className="font-bold text-slate-700 uppercase">Payments Log:</p>
                {paymentsHistory.map((ph, idx) => (
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
                <span>TOTAL:</span>
                <span>Rs. {order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>PAID:</span>
                <span>Rs. {order.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>BALANCE DUE:</span>
                <span className={order.remaining_amount > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}>
                  Rs. {order.remaining_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-dashed border-slate-300 pt-1">
                <span>TOTAL ACCOUNT DUE:</span>
                <span>
                  Rs.{' '}
                  {(customer?.total_outstanding !== undefined
                    ? customer.total_outstanding
                    : order.remaining_amount
                  ).toFixed(2)}
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
    </div>
  );
}
