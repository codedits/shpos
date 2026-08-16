'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Customer } from '@/types/wholesale';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Edit2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'debtors' | 'cleared'>('all');

  const loadCustomers = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getCustomers(forceRefresh);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      const hasDebt = (c.total_outstanding || 0) > 0;
      if (filterMode === 'debtors') return hasDebt;
      if (filterMode === 'cleared') return !hasDebt;
      return true;
    });
  }, [customers, searchQuery, filterMode]);

  const totalMarketDebt = useMemo(
    () => customers.reduce((sum, c) => sum + (c.total_outstanding || 0), 0),
    [customers]
  );
  const debtorsCount = useMemo(
    () => customers.filter((c) => (c.total_outstanding || 0) > 0).length,
    [customers]
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                Customer Accounts & Receivables Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Maintain customer directories, track outstanding credit balances, and record payments.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadCustomers(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Customers"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/customers/new"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Customer</span>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Customer Accounts</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{customers.length} Accounts</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Receivables</p>
            <h3 className="text-2xl font-black text-rose-700 font-mono mt-1">
              Rs. {totalMarketDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Accounts With Balance</p>
            <h3 className="text-2xl font-black text-amber-700 font-mono mt-1">
              {debtorsCount} Active Debtors
            </h3>
          </div>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by buyer name, phone, city..."
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
              { label: 'All Clients', value: 'all' },
              { label: `Debtors (${debtorsCount})`, value: 'debtors' },
              { label: 'Cleared Accounts', value: 'cleared' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterMode(tab.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterMode === tab.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">City / Market</th>
                  <th className="p-4 font-mono text-center">Orders Count</th>
                  <th className="p-4 font-mono">Outstanding Balance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">
                      Loading customer directory...
                    </td>
                  </tr>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => {
                    const hasDebt = (c.total_outstanding || 0) > 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-900">
                          <Link href={`/customers/${c.id}`} className="hover:underline flex items-center space-x-1.5">
                            <span>{c.name}</span>
                          </Link>
                        </td>
                        <td className="p-4 font-mono text-slate-600">
                          {c.phone ? (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{c.phone}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4 text-slate-600 font-mono">
                          {c.address ? (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{c.address}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-700">
                          {c.total_orders_count || 0} Orders
                        </td>
                        <td className="p-4 font-mono font-bold">
                          {hasDebt ? (
                            <span className="text-rose-700">
                              Rs. {(c.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Cleared</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {hasDebt && (
                              <Link
                                href={`/payments/new?customer_id=${c.id}`}
                                className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </Link>
                            )}
                            <Link
                              href={`/customers/${c.id}`}
                              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                            >
                              Ledger →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 uppercase font-mono">
                      No customer accounts found.
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
