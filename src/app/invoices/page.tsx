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
  Eye,
  RefreshCw,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';

export default function InvoicesListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadInvoices = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getOrders(forceRefresh);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Filter out voided orders for metric sums
  const activeOrders = useMemo(() => orders.filter((o) => !o.is_voided), [orders]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      let matchStatus = true;
      if (statusFilter === 'all') matchStatus = true;
      else if (statusFilter === 'VOIDED') matchStatus = Boolean(o.is_voided);
      else matchStatus = !o.is_voided && o.payment_status === statusFilter;

      const matchQuery =
        !q ||
        o.invoice_number.toLowerCase().includes(q) ||
        (o.customer && o.customer.name.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [orders, searchQuery, statusFilter]);

  const totalInvoicedAmount = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [activeOrders]
  );

  const totalCollectedAmount = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0),
    [activeOrders]
  );

  const totalOutstandingDue = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.remaining_amount || 0), 0),
    [activeOrders]
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                Commercial Invoices Directory
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Search, view, and print standard professional A4 commercial sales vouchers and 80mm thermal receipts.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadInvoices(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Invoices"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/orders/new"
              className="btn-press px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Invoice</span>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-cards">
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-blue p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sales Invoiced</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              Rs. {totalInvoicedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{activeOrders.length} active invoices</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-emerald p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Cash Collected</p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">
              Rs. {totalCollectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-emerald-600/70 font-mono mt-0.5">Realized revenue</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-rose p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Unpaid Balance</p>
            <h3 className="text-2xl font-black text-rose-700 font-mono mt-1">
              Rs. {totalOutstandingDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-rose-600/70 font-mono mt-0.5">Pending market credit</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number (e.g. INV-00001) or customer name..."
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
              { label: 'All Invoices', value: 'all' },
              { label: 'Paid', value: 'PAID' },
              { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
              { label: 'Unpaid', value: 'UNPAID' },
              { label: 'Voided', value: 'VOIDED' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans sticky top-0 z-10">
                  <th className="p-4 font-mono">Invoice #</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4 font-mono">Date</th>
                  <th className="p-4 font-mono">Total Amount</th>
                  <th className="p-4 font-mono">Paid</th>
                  <th className="p-4 font-mono">Balance Due</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">
                      Loading invoices...
                    </td>
                  </tr>
                ) : filteredInvoices.length > 0 ? (
                  filteredInvoices.map((o, idx) => {
                    const isVoided = Boolean(o.is_voided);
                    const remainingDue = isVoided ? 0 : o.remaining_amount;

                    return (
                      <tr
                        key={o.id}
                        className={`table-row-hover transition ${isVoided ? 'opacity-60 bg-slate-100/50' : idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                      >
                        <td className="p-4 font-bold text-slate-900">
                          <Link href={`/invoices/${o.invoice_number}`} className="hover:underline">
                            {o.invoice_number}
                          </Link>
                        </td>
                        <td className="p-4 font-sans font-bold text-slate-900">
                          {o.customer?.name || 'Walk-in Buyer'}
                        </td>
                        <td className="p-4 text-slate-600">
                          {new Date(o.order_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className={`p-4 font-bold ${isVoided ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          Rs. {o.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 font-bold text-emerald-700">
                          Rs. {o.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-4 font-bold ${remainingDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          Rs. {remainingDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          {isVoided ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                              VOIDED
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                o.payment_status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : o.payment_status === 'PARTIALLY_PAID'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                o.payment_status === 'PAID' ? 'bg-emerald-500' :
                                o.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-500' : 'bg-rose-500'
                              }`} />
                              <span>{o.payment_status.replace('_', ' ')}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-sans">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/invoices/${o.invoice_number}`}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 inline-block transition btn-press"
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 uppercase font-mono">
                      No invoices found.
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
