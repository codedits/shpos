'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Product, Customer, Order, Payment, BusinessSettings } from '@/types/wholesale';
import {
  ArrowUpRight,
  ShoppingCart,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Eye,
  PlusCircle,
  Clock,
  Check,
  User,
  Calendar,
  Layers,
  Inbox,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { isTodayPKT, formatDatePKT } from '@/lib/dateUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: 'Buraq Collection',
    phone: '',
    address: '',
    currency_symbol: 'Rs.',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'month' | 'today' | 'all'>('month');

  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const [pData, cData, oData, payData, sData] = await Promise.all([
        wholesaleService.getProducts(forceRefresh),
        wholesaleService.getCustomers(forceRefresh),
        wholesaleService.getOrders(forceRefresh),
        wholesaleService.getPayments(forceRefresh),
        wholesaleService.getSettings().catch(() => null),
      ]);
      setProducts(pData);
      setCustomers(cData);
      setOrders(oData);
      setPayments(payData);
      if (sData) setSettings(sData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter active (non-voided) orders and payments
  const allActiveOrders = useMemo(() => orders.filter((o) => !o.is_voided), [orders]);
  const allActivePayments = useMemo(() => payments.filter((p) => !p.is_voided), [payments]);

  // Helper to check if a date is within current month
  const isThisMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // Filtered orders based on selected timeframe
  const filteredOrders = useMemo(() => {
    if (timeRange === 'today') {
      return allActiveOrders.filter((o) => isTodayPKT(o.order_date));
    }
    if (timeRange === 'month') {
      return allActiveOrders.filter((o) => isThisMonth(o.order_date));
    }
    return allActiveOrders;
  }, [allActiveOrders, timeRange]);

  // Filtered payments based on selected timeframe
  const filteredPayments = useMemo(() => {
    if (timeRange === 'today') {
      return allActivePayments.filter((p) => isTodayPKT(p.payment_date));
    }
    if (timeRange === 'month') {
      return allActivePayments.filter((p) => isThisMonth(p.payment_date));
    }
    return allActivePayments;
  }, [allActivePayments, timeRange]);

  // Metrics calculated dynamically
  const totalSalesRevenue = useMemo(
    () => filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [filteredOrders]
  );

  const totalCashCollected = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    [filteredPayments]
  );

  const todayOrders = useMemo(
    () => allActiveOrders.filter((o) => isTodayPKT(o.order_date)),
    [allActiveOrders]
  );

  const todaySales = useMemo(
    () => todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [todayOrders]
  );

  const totalOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + (c.total_outstanding || 0), 0),
    [customers]
  );

  const topDebtors = useMemo(
    () =>
      [...customers]
        .filter((c) => (c.total_outstanding || 0) > 0)
        .sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0))
        .slice(0, 5),
    [customers]
  );

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  // 7-day Revenue Bar Chart (Computed 100% from real orders)
  const revenueChartData = useMemo(() => {
    const days: { [key: string]: number } = {};
    const now = new Date();

    // Initialize past 7 days with zero
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      days[label] = 0;
    }

    // Populate with real non-voided order totals
    allActiveOrders.forEach((o) => {
      const d = new Date(o.order_date);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (days[label] !== undefined) {
        days[label] += o.total_amount || 0;
      }
    });

    return Object.entries(days).map(([day, amount]) => ({
      day,
      amount,
    }));
  }, [allActiveOrders]);

  const hasChartRevenue = useMemo(
    () => revenueChartData.some((r) => r.amount > 0),
    [revenueChartData]
  );

  // Real Inventory Stock Breakdown Chart (Computed 100% from products catalog)
  const categoryChartData = useMemo(() => {
    const inStock = products.filter((p) => p.is_active !== false && p.stock_quantity > 10).length;
    const lowStock = products.filter((p) => p.is_active !== false && p.stock_quantity > 0 && p.stock_quantity <= 10).length;
    const outOfStock = products.filter((p) => p.is_active !== false && p.stock_quantity <= 0).length;

    const data = [
      { name: 'In Stock (>10 pcs)', count: inStock, color: '#3b82f6' },
      { name: 'Low Stock (1-10 pcs)', count: lowStock, color: '#f59e0b' },
      { name: 'Out of Stock (0 pcs)', count: outOfStock, color: '#ef4444' },
    ];

    return data;
  }, [products]);

  const totalProductItems = useMemo(
    () => products.filter((p) => p.is_active !== false).length,
    [products]
  );

  const totalGarmentPieces = useMemo(
    () => products.filter((p) => p.is_active !== false).reduce((sum, p) => sum + (p.stock_quantity || 0), 0),
    [products]
  );

  const handleConfirmClear = async () => {
    try {
      await wholesaleService.clearAllData();
      toast.success('Database Cleared', 'All sample records have been purged.');
      setClearModalOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error('Clear Failed', err.message);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-indigo-100 text-indigo-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const timeframeLabel = timeRange === 'today' ? 'today' : timeRange === 'month' ? 'this month' : 'all time';

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* ===== Header Bar matching reference image ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Hello, {settings.business_name || 'Buraq Wholesale'}!</span>
              <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Live overview of sales, orders, and ledger collections for <span className="font-semibold text-slate-700">{timeframeLabel}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Timeframe selector pill */}
            <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-xs font-semibold text-slate-700">
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  timeRange === 'month'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This month
              </button>
              <button
                onClick={() => setTimeRange('today')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  timeRange === 'today'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  timeRange === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All time
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="btn-press p-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 shadow-xs transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Create Order CTA */}
            <Link
              href="/orders/new"
              className="btn-press px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Order</span>
            </Link>
          </div>
        </div>

        {/* ===== Top Grid: 2x2 Metric Cards (with 1 Blue Highlight Box) + Large Revenue Bar Chart ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Side: 2x2 Cards Grid (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Box 1: Highlight Blue Box with Rounded Block & Fine Arrow */}
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 text-white shadow-md hover:shadow-lg transition relative overflow-hidden flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider block">
                    Sales Revenue ({timeframeLabel})
                  </span>
                  <div className="mt-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                      Rs. {totalSalesRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </h3>
                  </div>
                </div>

                {/* Fine Diagonal Arrow Icon Circle Button */}
                <Link
                  href="/orders"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition group-hover:scale-105 shrink-0"
                  title="View All Sales Orders"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                </Link>
              </div>

              <div className="mt-6 pt-3 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs text-blue-100/90 font-mono">
                  {timeRange === 'today' ? `${filteredOrders.length} orders today` : `Today: Rs. ${todaySales.toLocaleString()}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-bold text-white font-mono">
                  {filteredOrders.length > 0 ? '✓ Active' : '0 Orders'}
                </span>
              </div>
            </div>

            {/* Box 2: Total Orders (Light Rounded Block with Fine Arrow) */}
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Orders Booked ({timeframeLabel})
                  </span>
                  <div className="mt-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                      {filteredOrders.length}
                    </h3>
                  </div>
                </div>

                {/* Fine Diagonal Arrow Button */}
                <Link
                  href="/orders"
                  className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 transition group-hover:scale-105 shrink-0"
                  title="View Orders Register"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                </Link>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  {filteredOrders.filter((o) => o.payment_status === 'PAID').length} fully paid
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
                  {filteredOrders.filter((o) => o.payment_status === 'PARTIALLY_PAID').length} partial
                </span>
              </div>
            </div>

            {/* Box 3: Outstanding Receivables (Light Rounded Block with Fine Arrow) */}
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Market Receivables
                  </span>
                  <div className="mt-4">
                    <h3 className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${totalOutstanding > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                      Rs. {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </h3>
                  </div>
                </div>

                {/* Fine Diagonal Arrow Button */}
                <Link
                  href="/customers"
                  className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 transition group-hover:scale-105 shrink-0"
                  title="View Client Accounts"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                </Link>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  {topDebtors.length} accounts with balance
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold font-mono">
                  {totalOutstanding > 0 ? 'Pending' : 'Cleared'}
                </span>
              </div>
            </div>

            {/* Box 4: Cash Collected (Light Rounded Block with Fine Arrow) */}
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Cash Realized ({timeframeLabel})
                  </span>
                  <div className="mt-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                      Rs. {totalCashCollected.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </h3>
                  </div>
                </div>

                {/* Fine Diagonal Arrow Button */}
                <Link
                  href="/payments"
                  className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700 transition group-hover:scale-105 shrink-0"
                  title="View Payments Register"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                </Link>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">
                  {filteredPayments.length} receipts logged
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">
                  ↑ Realized
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Large Revenue Bar Chart Block (5 Cols) matching the reference */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-heading">
                  Revenue
                </h3>
                <p className="text-xs text-slate-400 font-medium">Daily Sales (Past 7 Days)</p>
              </div>

              {/* Fine Arrow Circle Button */}
              <Link
                href="/orders"
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition hover:scale-105"
                title="View Sales Orders"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
              </Link>
            </div>

            {/* Recharts Bar Chart with Rounded Blue Bars */}
            <div className="h-56 w-full pt-4 relative">
              {!hasChartRevenue && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-2xs z-10 text-slate-400 text-xs">
                  <Inbox className="w-8 h-8 text-slate-300 mb-1" />
                  <span>No sales recorded in the past 7 days</span>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                    }}
                    formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== Bottom Row: 2 Highlight Overview Cards + Stock Distribution Donut Chart ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: Orders Overview Pill Block (3.5 Cols) */}
          <div className="lg:col-span-3 rounded-3xl bg-slate-900 text-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            {/* Background subtle icon */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <ShoppingCart className="w-32 h-32 text-white transform translate-x-4 translate-y-4" />
            </div>

            <div className="flex items-center justify-between">
              {/* Top circle icon */}
              <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>

              {/* Fine Arrow */}
              <Link
                href="/orders"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition hover:scale-105"
                title="View Orders"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              </Link>
            </div>

            <div className="mt-8 space-y-1">
              <h4 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {allActiveOrders.length}{' '}
                <span className="text-base sm:text-lg font-medium text-slate-300">orders</span>
              </h4>
              <p className="text-xs text-slate-400">
                {allActiveOrders.filter((o) => o.payment_status === 'UNPAID').length} invoices awaiting payment.
              </p>
            </div>
          </div>

          {/* Card 2: Customers Overview Pill Block (3.5 Cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900 text-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            {/* Background subtle icon */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Users className="w-32 h-32 text-white transform translate-x-4 translate-y-4" />
            </div>

            <div className="flex items-center justify-between">
              {/* Top circle icon */}
              <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-white">
                <User className="w-5 h-5 stroke-[2.2]" />
              </div>

              {/* Fine Arrow */}
              <Link
                href="/customers"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition hover:scale-105"
                title="View Customers"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              </Link>
            </div>

            <div className="mt-8 space-y-1">
              <h4 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {customers.length}{' '}
                <span className="text-base sm:text-lg font-medium text-slate-300">customers</span>
              </h4>
              <p className="text-xs text-slate-400">
                {topDebtors.length} accounts with pending balance due.
              </p>
            </div>
          </div>

          {/* Card 3: Real Inventory Stock Health Donut Chart (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-heading">
                  Stock Health
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {totalProductItems} active items • {totalGarmentPieces.toLocaleString()} pcs total
                </p>
              </div>

              {/* Fine Arrow */}
              <Link
                href="/products"
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition hover:scale-105"
                title="View Inventory Catalog"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
              </Link>
            </div>

            {/* Donut Chart and Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="w-36 h-36 relative shrink-0">
                {totalProductItems === 0 ? (
                  <div className="w-full h-full rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono text-center p-2">
                    No items in catalog
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={58}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs font-mono w-full">
                {categoryChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700 font-sans text-xs">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.count} items</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Operational Register: Recent Orders & Top Debtors ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left: Recent Orders Table (7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">Recent Orders</h3>
                <p className="text-xs text-slate-400">Latest wholesale sales transactions</p>
              </div>
              <Link
                href="/orders"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition btn-press"
                title="View All Orders"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                    <th className="p-4 font-mono">Invoice #</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4 font-mono">Amount</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {recentOrders.length > 0 ? (
                    recentOrders.map((o, idx) => (
                      <tr
                        key={o.id}
                        className={`table-row-hover transition ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                      >
                        <td className="p-4 font-bold text-slate-900">
                          <Link href={`/invoices/${o.invoice_number}`} className="hover:underline">
                            {o.invoice_number}
                          </Link>
                        </td>
                        <td className="p-4 font-sans font-semibold text-slate-800">
                          {o.customer?.name || 'Walk-in Buyer'}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          Rs. {o.total_amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 inline-block transition btn-press"
                            title="View Voucher"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 font-sans">
                        No orders recorded yet. Click &quot;New Order&quot; to create your first sale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Top Outstanding Balances & Low Stock (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">Top Receivables</h3>
                  <p className="text-xs text-slate-400">Clients with pending credit due</p>
                </div>
                <Link
                  href="/customers"
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition btn-press"
                  title="View All Customers"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
                </Link>
              </div>

              {topDebtors.length > 0 ? (
                <div className="space-y-2.5">
                  {topDebtors.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-2xl border border-slate-100 hover:border-rose-200 bg-slate-50/50 hover:bg-rose-50/30 flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(d.name)}`}>
                          {getInitials(d.name)}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/customers/${d.id}`} className="font-bold text-xs text-slate-900 hover:underline block truncate">
                            {d.name}
                          </Link>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{d.phone || d.address || 'Pakistan'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-xs text-rose-700 font-mono">
                          Rs. {(d.total_outstanding || 0).toLocaleString()}
                        </p>
                        <Link
                          href={`/payments/new?customer_id=${d.id}`}
                          className="text-[10px] font-bold text-emerald-700 hover:underline btn-press"
                        >
                          Collect →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center space-y-1 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p>All accounts are cleared! No outstanding receivables.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>Pakistani Wholesale POS System • Built for Azam Market & Cloth Wholesalers</span>
          <button
            onClick={() => setClearModalOpen(true)}
            className="text-slate-400 hover:text-rose-600 text-[11px] font-semibold transition btn-press"
          >
            Clear Sample Data
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={clearModalOpen}
        title="Wipe & Reset Demo Database?"
        message="This action will permanently delete all demo records from your database so you can start fresh with your real wholesale shop data."
        actionDetails={[
          {
            label: 'Garments & Stock Catalog',
            description: 'All demo products, lot costs, and stock quantities will be deleted.',
          },
          {
            label: 'Client Accounts & Receivables',
            description: 'All customer profiles and their historical account ledgers will be wiped.',
          },
          {
            label: 'Sales Invoices & Cash Log',
            description: 'All generated orders, vouchers, and installment receipts will be permanently cleared.',
          },
        ]}
        warningNote="Permanent action: This database reset cannot be reversed."
        confirmText="Yes, Wipe All Data"
        cancelText="Cancel & Keep Data"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearModalOpen(false)}
      />
    </AppLayout>
  );
}
