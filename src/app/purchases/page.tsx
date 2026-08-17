'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Purchase } from '@/types/wholesale';
import { formatDatePKT } from '@/lib/dateUtils';
import {
  ClipboardList,
  Plus,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'paid' | 'voided'>('all');

  const loadPurchases = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getPurchases(forceRefresh);
      setPurchases(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPurchases(); }, []);

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return purchases.filter((p) => {
      const matchesQuery =
        !q ||
        p.purchase_number.toLowerCase().includes(q) ||
        (p.supplier?.name && p.supplier.name.toLowerCase().includes(q));
      if (!matchesQuery) return false;
      if (filterMode === 'unpaid') return !p.is_voided && p.remaining_amount > 0;
      if (filterMode === 'paid') return !p.is_voided && p.payment_status === 'PAID';
      if (filterMode === 'voided') return p.is_voided;
      return true;
    });
  }, [purchases, searchQuery, filterMode]);

  const totalPurchased = useMemo(() => purchases.filter(p => !p.is_voided).reduce((s, p) => s + p.total_cost, 0), [purchases]);
  const totalOwed = useMemo(() => purchases.filter(p => !p.is_voided).reduce((s, p) => s + p.remaining_amount, 0), [purchases]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-violet-900 flex items-center justify-center text-white">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">Purchases & Stock Receipts</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">Track stock-in transactions, purchase costs, and supplier balances.</p>
          </div>
          <div className="flex items-center space-x-2.5 shrink-0">
            <button onClick={() => loadPurchases(true)} className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link href="/purchases/new" className="btn-press px-4 py-2.5 bg-violet-900 hover:bg-violet-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition">
              <Plus className="w-4 h-4" /><span>New Purchase</span>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Purchases</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{purchases.filter(p => !p.is_voided).length}</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Cost</span>
            <div className="text-2xl font-black text-slate-900 font-mono">Rs. {totalPurchased.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Outstanding Balance</span>
            <div className={`text-2xl font-black font-mono ${totalOwed > 0 ? 'text-rose-700' : 'text-slate-900'}`}>Rs. {totalOwed.toLocaleString()}</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by purchase number or supplier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-900" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="flex items-center space-x-1.5">
            {[
              { label: 'All', value: 'all' },
              { label: 'Unpaid', value: 'unpaid' },
              { label: 'Paid', value: 'paid' },
              { label: 'Voided', value: 'voided' },
            ].map((tab) => (
              <button key={tab.value} onClick={() => setFilterMode(tab.value as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${filterMode === tab.value ? 'bg-violet-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Purchase #</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 font-mono">Date</th>
                  <th className="p-4 font-mono text-right">Total Cost</th>
                  <th className="p-4 font-mono text-right">Paid</th>
                  <th className="p-4 font-mono text-right">Balance</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">Loading purchases...</td></tr>
                ) : filteredPurchases.length > 0 ? filteredPurchases.map((p) => (
                  <tr key={p.id} className={`table-row-hover transition ${p.is_voided ? 'opacity-40' : ''}`}>
                    <td className="p-4 font-bold text-slate-900 font-mono">
                      <Link href={`/purchases/${p.id}`} className="hover:underline">{p.purchase_number}</Link>
                    </td>
                    <td className="p-4 text-slate-700">
                      {p.supplier ? (
                        <Link href={`/suppliers/${p.supplier_id}`} className="hover:underline font-semibold">{p.supplier.name}</Link>
                      ) : <span className="text-slate-400 italic">Other Source</span>}
                    </td>
                    <td className="p-4 font-mono text-slate-500">{formatDatePKT(p.purchase_date, false)}</td>
                    <td className="p-4 text-right font-mono font-bold text-slate-900">Rs. {p.total_cost.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono text-emerald-700 font-semibold">Rs. {p.amount_paid.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-rose-700">Rs. {p.remaining_amount.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.is_voided ? 'bg-slate-100 text-slate-500' :
                        p.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-800' :
                        p.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-800' :
                        'bg-rose-50 text-rose-800'
                      }`}>{p.is_voided ? 'VOIDED' : p.payment_status.replace('_', ' ')}</span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/purchases/${p.id}`} className="text-xs font-bold text-slate-900 hover:underline">View →</Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="p-10 text-center text-slate-400 uppercase font-mono">No purchases found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
