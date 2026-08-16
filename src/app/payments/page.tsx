'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Payment } from '@/types/wholesale';
import {
  CreditCard,
  Plus,
  Search,
  Receipt,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { formatDatePKT } from '@/lib/dateUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/context/ToastContext';

export default function PaymentsPage() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [paymentToVoid, setPaymentToVoid] = useState<Payment | null>(null);
  const [voiding, setVoiding] = useState(false);

  const loadPayments = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await wholesaleService.getPayments(forceRefresh);
      setPayments(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleConfirmVoidPayment = async () => {
    if (!paymentToVoid) return;
    try {
      setVoiding(true);
      await wholesaleService.voidPayment(paymentToVoid.id, 'Payment receipt reversed by administrator');
      toast.success(
        'Payment Reversed',
        `Rs. ${paymentToVoid.amount.toLocaleString()} payment reversed. Invoice balances restored.`
      );
      setPaymentToVoid(null);
      await loadPayments(true);
    } catch (err: any) {
      toast.error('Could Not Void Payment', err.message);
    } finally {
      setVoiding(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.customer_name && p.customer_name.toLowerCase().includes(q)) ||
        (p.note && p.note.toLowerCase().includes(q)) ||
        (p.allocations && p.allocations.some((a) => a.invoice_number?.toLowerCase().includes(q)));
      return matchMethod && matchSearch;
    });
  }, [payments, methodFilter, searchQuery]);

  const totalCollectedSum = useMemo(() => {
    return payments
      .filter((p) => !p.is_voided)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-heading">
              Customer Payment Register
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Historical ledger of all cash receipts, bank transfers, and installment allocations.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadPayments(true)}
              disabled={refreshing}
              className="btn-press p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs"
              title="Refresh Payments"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/payments/new"
              className="btn-press px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </Link>
          </div>
        </div>

        {/* 2 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-emerald p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Cash Realized</p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">
              Rs. {totalCollectedSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-blue p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payment Receipts</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              {payments.filter((p) => !p.is_voided).length} Transactions
            </h3>
          </div>
        </div>

        {/* Toolbar: Search + Method Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, invoice #, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { label: 'All Methods', value: 'all' },
              { label: 'Cash', value: 'Cash' },
              { label: 'Bank Transfer', value: 'Bank Transfer' },
              { label: 'Cheque', value: 'Cheque' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setMethodFilter(tab.value)}
                className={`btn-press px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  methodFilter === tab.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                  <th className="p-4">Receipt Date</th>
                  <th className="p-4">Customer Account</th>
                  <th className="p-4">Amount Received</th>
                  <th className="p-4 text-center">Payment Method</th>
                  <th className="p-4">Applied Invoices (FIFO)</th>
                  <th className="p-4">Note</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={`table-row-hover transition ${
                        p.is_voided
                          ? 'bg-rose-50/40 opacity-70'
                          : idx % 2 === 1
                          ? 'bg-slate-50/40'
                          : ''
                      }`}
                    >
                      <td className="p-4 text-slate-600">
                        {formatDatePKT(p.payment_date, false)}
                      </td>
                      <td className="p-4 font-sans font-bold text-slate-900">
                        <Link href={`/customers/${p.customer_id}`} className="hover:underline">
                          {p.customer_name || 'Customer'}
                        </Link>
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        {p.is_voided ? (
                          <span className="line-through text-slate-400">
                            Rs. {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          `Rs. ${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-800 uppercase">
                          {p.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="p-4 font-sans">
                        {p.is_voided ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase font-mono">
                            VOIDED / REVERSED
                          </span>
                        ) : p.allocations && p.allocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.allocations.map((a, aIdx) => (
                              <span
                                key={aIdx}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-mono font-bold"
                              >
                                {a.invoice_number || 'Order'}: Rs. {a.amount_allocated.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-mono">Unallocated Credit</span>
                        )}
                      </td>
                      <td className="p-4 font-sans text-slate-600 text-[11px]">
                        {p.note || '—'}
                      </td>
                      <td className="p-4 text-right font-sans">
                        {!p.is_voided ? (
                          <button
                            type="button"
                            onClick={() => setPaymentToVoid(p)}
                            className="btn-press p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-700 transition"
                            title="Reverse / Void Payment"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 uppercase font-mono">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Screen-Centered "Are You Sure?" Modal for Voiding Payment */}
      <ConfirmModal
        isOpen={Boolean(paymentToVoid)}
        title="Reverse / Void Payment Receipt?"
        message={`Are you sure you want to reverse payment of Rs. ${paymentToVoid?.amount.toLocaleString()} received from ${paymentToVoid?.customer_name || 'Customer'}?`}
        actionDetails={[
          {
            label: 'Invoice Balances Restored',
            description: 'All allocations on associated invoices will be reversed, re-opening their unpaid amounts.',
          },
          {
            label: 'Customer Ledger Impact',
            description: `The customer's outstanding balance will immediately increase by Rs. ${paymentToVoid?.amount.toLocaleString()}.`,
          },
          {
            label: 'Audit Log Retention',
            description: 'This receipt will be marked VOIDED to maintain tax & bookkeeping transparency.',
          },
        ]}
        warningNote="Financial Notice: This reverses recorded cash inflow in your ledger."
        confirmText="Yes, Reverse Payment"
        cancelText="Cancel & Keep Receipt"
        variant="danger"
        isLoading={voiding}
        onConfirm={handleConfirmVoidPayment}
        onCancel={() => setPaymentToVoid(null)}
      />
    </AppLayout>
  );
}
