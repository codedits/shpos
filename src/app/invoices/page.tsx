'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Order } from '@/types/wholesale';
import {
  FileText,
  Search,
  Printer,
  X,
  Plus,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function InvoicesListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await wholesaleService.getOrders();
        setOrders(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.invoice_number.toLowerCase().includes(q) ||
        (o.customer && o.customer.name.toLowerCase().includes(q))
    );
  }, [orders, searchQuery]);

  const totalInvoicedAmount = useMemo(
    () => orders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [orders]
  );

  return (
    <AppLayout>
      <div className="p-8 sm:p-10 space-y-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-zinc-200 pb-6 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-black" />
              <h1 className="text-xl font-black uppercase tracking-wide text-zinc-950">
                Commercial Invoices Directory
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Search, view, and print standard professional A4 commercial invoices for all orders.
            </p>
          </div>

          <Link
            href="/orders/new"
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wide border-2 border-black flex items-center space-x-2 transition shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </Link>
        </div>

        {/* 2 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white border-2 border-zinc-300 border-t-4 border-t-black p-6 space-y-1 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Invoices Issued</p>
            <h3 className="text-3xl font-black text-black font-mono mt-1">{orders.length} Invoices</h3>
          </div>
          <div className="bg-white border-2 border-zinc-300 border-t-4 border-t-emerald-600 p-6 space-y-1 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Invoiced Amount</p>
            <h3 className="text-3xl font-black text-emerald-800 font-mono mt-1">
              Rs. {totalInvoicedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 border-2 border-zinc-300 flex items-center space-x-3 shadow-sm">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by invoice number (e.g. INV-00001) or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-mono focus:outline-none text-zinc-900"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-black">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Invoices List Table */}
        <div className="bg-white border-2 border-zinc-300 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-300 bg-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-700">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4 text-center">Items (Pcs)</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4 text-center">Payment Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-500 font-mono text-xs uppercase">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50 transition">
                    <td className="p-4 font-bold text-black text-sm">
                      <span className="bg-zinc-100 border border-zinc-300 px-2 py-0.5">{o.invoice_number}</span>
                    </td>
                    <td className="p-4 text-zinc-600">
                      {new Date(o.order_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-4 font-sans font-bold text-zinc-900">
                      {o.customer?.name || 'Walk-in'}
                    </td>
                    <td className="p-4 text-center text-zinc-800 font-bold">
                      {(o.items || []).reduce((s, it) => s + it.quantity, 0)} Pcs
                    </td>
                    <td className="p-4 font-bold text-black">
                      Rs. {o.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 border text-[10px] font-bold uppercase inline-flex items-center space-x-1 ${
                          o.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : o.payment_status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {o.payment_status === 'PAID' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{o.payment_status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/invoices/${o.invoice_number}`}
                        className="px-4 py-2 bg-black hover:bg-zinc-800 text-white text-[11px] font-bold uppercase transition inline-flex items-center space-x-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print A4 Invoice</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-500 font-mono text-xs uppercase">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
