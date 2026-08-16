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
} from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const loadPayments = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getPayments(forceRefresh);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

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

  const totalCollectedSum = useMemo(
    () => payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                Payments & FIFO Allocation Register
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Track customer payments, payment vouchers, and automatic FIFO allocation across unpaid orders.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadPayments(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Payments"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/payments/new"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Receive Payment</span>
            </Link>
          </div>
        </div>

        {/* 2 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Lifetime Receipts</p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">
              Rs. {totalCollectedSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Transactions Count</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{payments.length} Payments</h3>
          </div>
        </div>

        {/* Toolbar */}
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
            {['all', 'Cash', 'Bank', 'Other'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  methodFilter === m
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m === 'all' ? 'All Methods' : m}
              </button>
            ))}
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4 text-center">Method</th>
                  <th className="p-4">FIFO Invoice Allocations</th>
                  <th className="p-4">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">
                      Loading payment records...
                    </td>
                  </tr>
                ) : filteredPayments.length > 0 ? (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-slate-600">
                        {new Date(p.payment_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 font-sans font-bold text-slate-900">
                        <Link href={`/customers/${p.customer_id}`} className="hover:underline">
                          {p.customer_name || 'Customer'}
                        </Link>
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        Rs. {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-800 uppercase">
                          {p.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="p-4 font-sans">
                        {p.allocations && p.allocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.allocations.map((a, idx) => (
                              <span
                                key={idx}
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 uppercase font-mono">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
