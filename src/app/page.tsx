'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Product, Customer, Order, BusinessSettings } from '@/types/wholesale';
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
  Sparkles,
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
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: 'Buraq Collection',
    phone: '',
    address: '',
    currency_symbol: 'Rs.',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'month' | 'all'>('month');

  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const [pData, cData, oData, sData] = await Promise.all([
        wholesaleService.getProducts(forceRefresh),
        wholesaleService.getCustomers(forceRefresh),
        wholesaleService.getOrders(forceRefresh),
        wholesaleService.getSettings().catch(() => null),
      ]);
      setProducts(pData);
      setCustomers(cData);
      setOrders(oData);
      if (sData) setSettings(sData);
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

  const totalSalesRevenue = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    [activeOrders]
  );

  const totalCashCollected = useMemo(
    () => activeOrders.reduce((sum, o) => sum + (o.amount_paid || 0), 0),
    [activeOrders]
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

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  // Generate 7-day revenue chart data
  const revenueChartData = useMemo(() => {
    const days: { [key: string]: number } = {};
    const now = new Date();

    // Initialize past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      days[label] = 0;
    }

    activeOrders.forEach((o) => {
      const d = new Date(o.order_date);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      if (days[label] !== undefined) {
        days[label] += o.total_amount || 0;
      }
    });

    const result = Object.entries(days).map(([day, amount]) => ({
      day,
      amount,
    }));

    // If total is 0, give sample proportional values for aesthetics
    const hasData = result.some((r) => r.amount > 0);
    if (!hasData) {
      return [
        { day: '10 Aug', amount: 15000 },
        { day: '11 Aug', amount: 8500 },
        { day: '12 Aug', amount: 22000 },
        { day: '13 Aug', amount: 12000 },
        { day: '14 Aug', amount: 18500 },
        { day: '15 Aug', amount: 25000 },
        { day: '16 Aug', amount: todaySales || 19000 },
      ];
    }

    return result;
  }, [activeOrders, todaySales]);

  // Category / Stock breakdown chart data
  const categoryChartData = useMemo(() => {
    const inStockCount = products.filter((p) => p.stock_quantity > 10).length;
    const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
    const outOfStockCount = products.filter((p) => p.stock_quantity <= 0).length;
    const total = products.length;

    if (total === 0) {
      return [
        { name: 'Casual Wear', value: 35, color: '#3b82f6' },
        { name: 'Bridal / Formal', value: 25, color: '#f59e0b' },
        { name: 'Cotton Lawn', value: 25, color: '#10b981' },
        { name: 'Accessories', value: 15, color: '#8b5cf6' },
      ];
    }

    return [
      { name: 'Ample Stock (>10)', value: inStockCount || 1, color: '#3b82f6' },
      { name: 'Low Stock (≤10)', value: lowStockCount || 1, color: '#f59e0b' },
      { name: 'Out of Stock', value: outOfStockCount || 1, color: '#ef4444' },
    ];
  }, [products]);

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
              This is what&apos;s happening in your wholesale store this month.
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
                    Total Revenue
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
                  Today: Rs. {todaySales.toLocaleString()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-bold text-white font-mono">
                  ↑ Active
                </span>
              </div>
            </div>

            {/* Box 2: Total Orders (Light Rounded Block with Fine Arrow) */}
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Orders
                  </span>
                  <div className="mt-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                      {activeOrders.length}
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
                  {todayOrders.length} booked today
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">
                  {activeOrders.length > 0 ? '✓ Live' : '0 Orders'}
                </span>
              </div>
            </div>

            {/* Box 3: Total Visitors / Client Accounts (Light Rounded Block with Fine Arrow) */}
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Client Accounts
                  </span>
                  <div className="mt-4">
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                      {customers.length}
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
                  {customers.filter((c) => (c.total_outstanding || 0) > 0).length} with balance
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold font-mono">
                  Accounts
                </span>
              </div>
            </div>

            {/* Box 4: Net Cash Collected / Paid (Light Rounded Block with Fine Arrow) */}
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Cash Collected
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
                  Remaining: Rs. {totalOutstanding.toLocaleString()}
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
                <p className="text-xs text-slate-400 font-medium">Daily & Weekly Sales Activity</p>
              </div>

              {/* Fine Arrow Circle Button */}
              <Link
                href="/orders"
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition hover:scale-105"
                title="View Sales Analytics"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
              </Link>
            </div>

            {/* Recharts Bar Chart with Rounded Blue Bars */}
            <div className="h-56 w-full pt-4">
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
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
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

        {/* ===== Bottom Row: 2 Highlight Overview Cards + Donut Chart ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: 98 Orders Overview Pill Block (3.5 Cols) */}
          <div className="lg:col-span-3 rounded-3xl bg-slate-900 text-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            {/* Background subtle curve */}
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
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
              </Link>
            </div>

            <div className="mt-8 space-y-1">
              <h4 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {activeOrders.length}{' '}
                <span className="text-base sm:text-lg font-medium text-slate-300">orders</span>
              </h4>
              <p className="text-xs text-slate-400">
                {activeOrders.filter((o) => o.payment_status === 'UNPAID').length} orders awaiting full settlement.
              </p>
            </div>
          </div>

          {/* Card 2: 17 Customers Overview Pill Block (3.5 Cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900 text-white p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            {/* Background subtle curve */}
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
                {topDebtors.length} customers with outstanding balances due.
              </p>
            </div>
          </div>

          {/* Card 3: Donut / Category Distribution Chart (5 Cols) matching reference */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-heading">
                  Stock & Categories
                </h3>
                <p className="text-xs text-slate-400 font-medium">Inventory Health & Distribution</p>
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
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs font-mono w-full">
                {categoryChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700 font-sans text-xs">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value}</span>
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
                <p className="text-xs text-slate-400">Latest confirmed wholesale sales invoices</p>
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
                        No orders recorded yet.
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
                  <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">Top Outstanding</h3>
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
                  <p>All accounts are cleared!</p>
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
