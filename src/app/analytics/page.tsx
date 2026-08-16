'use client';

import React, { useMemo } from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import {
  BarChart3,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Award,
} from 'lucide-react';
import { usePOS } from '@/context/POSContext';

export default function AnalyticsPage() {
  const { transactions, settings, products } = usePOS();

  const completedTxs = useMemo(
    () => transactions.filter((t) => t.status === 'completed'),
    [transactions]
  );

  const totalRevenue = useMemo(
    () => completedTxs.reduce((sum, t) => sum + t.total, 0),
    [completedTxs]
  );

  const totalOrders = completedTxs.length;

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const netTaxCollected = useMemo(
    () => completedTxs.reduce((sum, t) => sum + t.taxTotal, 0),
    [completedTxs]
  );

  // Top selling products computation
  const topProducts = useMemo(() => {
    const map: Record<string, { product: (typeof products)[0]; qty: number; revenue: number }> = {};

    completedTxs.forEach((tx) => {
      tx.items.forEach((item) => {
        const pId = item.product.id;
        const sub = item.product.price * item.quantity;
        const net = sub - sub * (item.discountPercent / 100);

        if (!map[pId]) {
          map[pId] = { product: item.product, qty: 0, revenue: 0 };
        }
        map[pId].qty += item.quantity;
        map[pId].revenue += net;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedTxs, products]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map = { cash: 0, card: 0, qr: 0, credit: 0 };
    completedTxs.forEach((t) => {
      map[t.paymentMethod] = (map[t.paymentMethod] || 0) + t.total;
    });
    return map;
  }, [completedTxs]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-zinc-950">
      <Navbar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-zinc-200 pb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-black" />
            <h1 className="text-lg font-extrabold uppercase tracking-wide text-zinc-950">Business Analytics & Metrics</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time insights into gross sales revenue, order volumes, and top performing products.
          </p>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-300 p-5 flex items-center space-x-4">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gross Revenue</p>
              <h3 className="text-2xl font-extrabold text-black font-mono mt-0.5">
                {settings.currencySymbol}
                {totalRevenue.toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="bg-white border border-zinc-300 p-5 flex items-center space-x-4">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Completed Orders</p>
              <h3 className="text-2xl font-extrabold text-black font-mono mt-0.5">
                {totalOrders}
              </h3>
            </div>
          </div>

          <div className="bg-white border border-zinc-300 p-5 flex items-center space-x-4">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Order Value</p>
              <h3 className="text-2xl font-extrabold text-black font-mono mt-0.5">
                {settings.currencySymbol}
                {avgOrderValue.toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="bg-white border border-zinc-300 p-5 flex items-center space-x-4">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tax Collected</p>
              <h3 className="text-2xl font-extrabold text-black font-mono mt-0.5">
                {settings.currencySymbol}
                {netTaxCollected.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        {/* Content Section: Top Products & Payment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="bg-white border border-zinc-300 p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-200 pb-3">
              <Award className="w-4 h-4 text-black" />
              <h3 className="font-bold text-zinc-950 text-xs uppercase tracking-wide">Top Selling Collections</h3>
            </div>
            <div className="space-y-4">
              {topProducts.length > 0 ? (
                topProducts.map((tp, idx) => {
                  const maxQty = topProducts[0].qty;
                  const pct = Math.round((tp.qty / maxQty) * 100);

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-zinc-900">
                          #{idx + 1} {tp.product.name}
                        </span>
                        <span className="font-mono text-black">
                          {tp.qty} sold ({settings.currencySymbol}
                          {tp.revenue.toFixed(2)})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 border border-zinc-300 overflow-hidden">
                        <div
                          className="h-full bg-black transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 py-6 text-center font-mono uppercase">
                  No sales recorded yet.
                </p>
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white border border-zinc-300 p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-zinc-200 pb-3">
              <CreditCard className="w-4 h-4 text-black" />
              <h3 className="font-bold text-zinc-950 text-xs uppercase tracking-wide">Sales by Payment Channel</h3>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Cash Payments', key: 'cash' },
                { label: 'Credit Card', key: 'card' },
                { label: 'QR Mobile Wallet', key: 'qr' },
                { label: 'Store Credit / Udhar', key: 'credit' },
              ].map((channel) => {
                const val = paymentBreakdown[channel.key as keyof typeof paymentBreakdown];
                const pct = totalRevenue > 0 ? ((val / totalRevenue) * 100).toFixed(1) : '0';

                return (
                  <div key={channel.key} className="bg-white border border-zinc-200 p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-2.5 h-2.5 bg-black" />
                      <span className="text-xs font-bold text-zinc-900 uppercase">{channel.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs font-mono text-black">
                        {settings.currencySymbol}
                        {val.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-2 font-mono">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
