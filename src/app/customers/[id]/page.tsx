'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Customer, Order, Payment } from '@/types/wholesale';
import {
  Users,
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  CreditCard,
  Receipt,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react';

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!customerId) return;
      try {
        setLoading(true);
        const [c, allOrders, allPayments] = await Promise.all([
          wholesaleService.getCustomerById(customerId),
          wholesaleService.getOrders(),
          wholesaleService.getPayments(),
        ]);
        if (!c) {
          setErrorMessage('Customer not found.');
          return;
        }
        setCustomer(c);
        setOrders(allOrders.filter((o) => o.customer_id === customerId));
        setPayments(allPayments.filter((p) => p.customer_id === customerId));
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customerId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto p-12 text-center font-mono text-xs uppercase text-slate-400">
          Loading client profile & chronological ledger...
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl border border-slate-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-800 mx-auto" />
          <h2 className="font-bold text-sm uppercase">Customer Not Found</h2>
          <Link href="/customers" className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg">
            Back to Customers
          </Link>
        </div>
      </AppLayout>
    );
  }

  const hasOutstanding = (customer.total_outstanding || 0) > 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Header & Navigation */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/customers"
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Back to Customers"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                  {customer.name}
                </h1>
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="p-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Edit Customer Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mt-1">
                {customer.phone && (
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{customer.phone}</span>
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {hasOutstanding && (
              <Link
                href={`/payments/new?customer_id=${customer.id}`}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Receive Payment</span>
              </Link>
            )}
            <Link
              href={`/orders/new?customer_id=${customer.id}`}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Sale</span>
            </Link>
          </div>
        </div>

        {/* Customer Balance Banner */}
        <div
          className={`p-6 sm:p-8 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs ${
            hasOutstanding ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Outstanding Account Balance
            </span>
            <h2
              className={`text-3xl sm:text-4xl font-black font-mono mt-1 ${
                hasOutstanding ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              Rs. {(customer.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-slate-600 font-mono mt-1">
              {hasOutstanding
                ? 'Pending credit balance due across outstanding invoices.'
                : 'Account is fully settled with zero balance due.'}
            </p>
          </div>

          {hasOutstanding && (
            <Link
              href={`/payments/new?customer_id=${customer.id}`}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition shadow-xs text-center shrink-0"
            >
              Record Payment / Installment
            </Link>
          )}
        </div>

        {/* Chronological Orders History */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4.5 h-4.5 text-slate-800" />
              <h3 className="font-bold text-sm text-slate-900">
                Order & Invoice History ({orders.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Chronological Transactions</span>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-900 text-sm">{ord.invoice_number}</span>
                      <span className="text-slate-500">
                        {new Date(ord.order_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ord.payment_status === 'PARTIALLY_PAID'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {ord.payment_status.replace('_', ' ')}
                      </span>
                      <Link
                        href={`/invoices/${ord.invoice_number}`}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-800 font-sans"
                      >
                        View Voucher →
                      </Link>
                    </div>
                  </div>

                  {/* Order Items Breakdown */}
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono space-y-1.5">
                    {(ord.items || []).map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <div>
                          <span className="font-bold text-slate-900">{it.product_code_snapshot}</span>
                          <span className="ml-2 font-medium text-slate-800">{it.product_name_snapshot}</span>
                          <span className="text-slate-400 ml-1.5">
                            [{it.size_snapshot || '—'} / {it.color_snapshot || '—'}]
                          </span>
                          <span className="text-slate-600 ml-2">
                            ({it.quantity} pcs @ Rs. {it.selling_price_per_unit.toFixed(2)})
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          Rs. {it.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Order Total</p>
                      <p className="text-sm font-bold text-slate-900">
                        Rs. {ord.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Amount Paid</p>
                      <p className="text-sm font-bold text-emerald-700">
                        Rs. {ord.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Remaining Credit</p>
                      <p className="text-sm font-bold text-rose-700">
                        Rs. {ord.remaining_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6 font-mono">
              No previous orders recorded for this customer.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
