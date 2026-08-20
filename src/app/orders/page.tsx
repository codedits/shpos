'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Order } from '@/types/wholesale';
import { Pagination } from '@/components/ui/Pagination';
import {
  ShoppingCart,
  Plus,
  Search,
  Receipt,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const loadOrders = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getOrders(forceRefresh);
      setOrders(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.payment_status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.invoice_number.toLowerCase().includes(q) ||
        (o.customer && o.customer.name.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const activeOrders = useMemo(() => orders.filter((o) => !o.is_voided), [orders]);

  const totalSalesSum = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [activeOrders]
  );
  const totalPaidSum = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0),
    [activeOrders]
  );
  const totalRemainingSum = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.remaining_amount || 0), 0),
    [activeOrders]
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <ShoppingCart className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                Wholesale Orders & Sales Register
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review all confirmed wholesale orders, amounts paid, remaining credit, and printable invoices.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadOrders(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Orders"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/orders/new"
              className="btn-press px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Order</span>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-cards">
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-blue p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sales Booked</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              Rs. {Math.round(totalSalesSum).toLocaleString()}
            </h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-emerald p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Cash Received</p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">
              Rs. {Math.round(totalPaidSum).toLocaleString()}
            </h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-rose p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Unpaid Credit</p>
            <h3 className="text-2xl font-black text-rose-700 font-mono mt-1">
              Rs. {Math.round(totalRemainingSum).toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Toolbar: Search & Status Filter */}
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
              { label: 'All Orders', value: 'all' },
              { label: 'Paid', value: 'PAID' },
              { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
              { label: 'Unpaid (Credit)', value: 'UNPAID' },
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

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                  <th className="p-4 font-mono">Invoice #</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4 font-mono">Booking Date</th>
                  <th className="p-4 font-mono">Total Due</th>
                  <th className="p-4 font-mono">Paid</th>
                  <th className="p-4 font-mono">Remaining</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">
                      Loading orders register...
                    </td>
                  </tr>
                ) : paginatedOrders.length > 0 ? (
                  paginatedOrders.map((o, idx) => (
                    <tr key={o.id} className={`table-row-hover transition ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="p-4 font-bold text-slate-900">
                        <Link href={`/invoices/${o.invoice_number}`} className="hover:underline">
                          {o.invoice_number}
                        </Link>
                      </td>
                      <td className="p-4 font-sans font-bold text-slate-900">
                        {o.customer?.name || 'Walk-in Customer'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(o.order_date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        Rs. {Math.round(o.total_amount).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        Rs. {Math.round(o.amount_paid).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-rose-700">
                        Rs. {Math.round(o.remaining_amount).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
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
                      </td>
                      <td className="p-4 text-right font-sans">
                        <Link
                          href={`/invoices/${o.invoice_number}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 inline-block transition btn-press"
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 uppercase font-mono">
                      No matching orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredOrders.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredOrders.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[15, 30, 50]}
              itemLabel="orders"
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
