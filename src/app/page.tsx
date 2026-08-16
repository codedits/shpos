'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Product, Customer, Order } from '@/types/wholesale';
import {
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  FileText,
  PlusCircle,
  CreditCard,
  Trash2,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { isTodayPKT, formatDatePKT } from '@/lib/dateUtils';

export default function DashboardPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const [pData, cData, oData] = await Promise.all([
        wholesaleService.getProducts(forceRefresh),
        wholesaleService.getCustomers(forceRefresh),
        wholesaleService.getOrders(forceRefresh),
      ]);
      setProducts(pData);
      setCustomers(cData);
      setOrders(oData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter active (non-voided) orders
  const activeOrders = useMemo(() => orders.filter((o) => !o.is_voided), [orders]);

  const todayOrders = useMemo(
    () => activeOrders.filter((o) => isTodayPKT(o.order_date)),
    [activeOrders]
  );
  const todaySales = useMemo(
    () => todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [todayOrders]
  );

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + (c.total_outstanding || 0), 0),
    [customers]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock_quantity <= 10),
    [products]
  );

  const topDebtors = useMemo(
    () =>
      [...customers]
        .filter((c) => (c.total_outstanding || 0) > 0)
        .sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0))
        .slice(0, 5),
    [customers]
  );

  const recentOrders = useMemo(() => orders.slice(0, 7), [orders]);

  const handleConfirmClear = async () => {
    try {
      await wholesaleService.clearAllData();
      toast.success('Database Cleared', 'All sample products, orders, and clients have been removed.');
      setClearModalOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error('Clear Failed', err.message);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Hero Header & Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold tracking-wide uppercase">
                Wholesale Portal
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-heading">
              Executive Wholesale Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Live operational metrics for garment inventory, daily booking volume, and customer account balances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/payments/new"
              className="px-3.5 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Receive Payment</span>
            </Link>

            <Link
              href="/orders/new"
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Create Order</span>
            </Link>
          </div>
        </div>

        {/* 6 Modern KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Today's Orders */}
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-blue-500 p-5 shadow-xs transition hover:shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Bookings</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {todayOrders.length} Orders
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lifetime: {orders.length} total orders
              </p>
            </div>
          </div>

          {/* Today's Sales Volume */}
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-emerald-500 p-5 shadow-xs transition hover:shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-emerald-700 font-mono">
                Rs. {todaySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Gross: Rs. {orders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Outstanding Receivables / Credit */}
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-rose-500 p-5 shadow-xs transition hover:shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Balance</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-rose-700 font-mono">
                Rs. {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Across {customers.filter((c) => (c.total_outstanding || 0) > 0).length} client accounts
              </p>
            </div>
          </div>

          {/* Total Product Inventory */}
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-indigo-500 p-5 shadow-xs transition hover:shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Catalog Inventory</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {products.length} Products
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {products.reduce((s, p) => s + p.stock_quantity, 0).toLocaleString()} total available pieces
              </p>
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-purple-500 p-5 shadow-xs transition hover:shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Client Accounts</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 font-mono">
                {customers.length} Accounts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered retail & wholesale buyers
              </p>
            </div>
          </div>

          {/* Low Stock Watchlist */}
          <div className="bg-white rounded-xl border border-slate-200 border-t-4 border-t-amber-500 p-5 shadow-xs transition hover:shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Low Stock Watchlist</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-amber-700 font-mono">
                {lowStockProducts.length} Items
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Critical items with 10 or fewer pieces
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recent Orders (7 Cols on desktop) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4.5 h-4.5 text-slate-800" />
                <h3 className="font-bold text-sm text-slate-900">Recent Wholesale Orders</h3>
              </div>
              <Link
                href="/orders"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-3.5 font-mono">Invoice #</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5 font-mono">Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Loading orders...
                      </td>
                    </tr>
                  ) : recentOrders.length > 0 ? (
                    recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-900">
                          <Link href={`/invoices/${o.invoice_number}`} className="hover:underline">
                            {o.invoice_number}
                          </Link>
                        </td>
                        <td className="p-3.5 font-sans font-medium text-slate-800">
                          {o.customer?.name || 'Walk-in Customer'}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          Rs. {o.total_amount.toLocaleString()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              o.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : o.payment_status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {o.payment_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-sans">
                          <Link
                            href={`/invoices/${o.invoice_number}`}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 inline-block"
                            title="Invoice Details"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No orders recorded yet. Create your first sale!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Top Outstanding Balances & Low Stock Watchlist (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Top Balances Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4.5 h-4.5 text-rose-600" />
                  <h3 className="font-bold text-sm text-slate-900">Top Outstanding Balances</h3>
                </div>
                <Link href="/customers" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  All Clients →
                </Link>
              </div>

              {topDebtors.length > 0 ? (
                <div className="space-y-2.5">
                  {topDebtors.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50/50 flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0">
                        <Link href={`/customers/${d.id}`} className="font-bold text-xs text-slate-900 hover:underline block truncate">
                          {d.name}
                        </Link>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{d.phone || d.address || 'Pakistan'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-xs text-rose-700 font-mono">
                          Rs. {(d.total_outstanding || 0).toLocaleString()}
                        </p>
                        <Link
                          href={`/payments/new?customer_id=${d.id}`}
                          className="text-[10px] font-bold text-emerald-700 hover:underline"
                        >
                          Collect →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">All customer accounts are clear!</p>
              )}
            </div>

            {/* Low Stock Alerts */}
            {lowStockProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                    <h3 className="font-bold text-sm text-slate-900">Low Stock Warnings</h3>
                  </div>
                  <Link href="/products" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                    Inventory →
                  </Link>
                </div>

                <div className="space-y-2">
                  {lowStockProducts.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 ml-1.5">({p.product_code})</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold font-mono">
                        {p.stock_quantity} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Data Management Utility */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>Pakistani Wholesale POS System • Built for Azam Market & Cloth Wholesalers</span>
          <button
            onClick={() => setClearModalOpen(true)}
            className="text-slate-400 hover:text-rose-600 text-[11px] font-semibold transition"
          >
            Clear Sample Data
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={clearModalOpen}
        title="Wipe All Sample Data?"
        message="This will permanently delete all demo products, customer profiles, and order history, leaving you with a fresh empty store to enter your real business catalog."
        confirmText="Yes, Wipe Data"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearModalOpen(false)}
      />
    </AppLayout>
  );
}
