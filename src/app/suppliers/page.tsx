'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Supplier } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Truck,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Trash2,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';

export default function SuppliersPage() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'creditors' | 'cleared'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSuppliers = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getSuppliers(forceRefresh);
      setSuppliers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await wholesaleService.deleteSupplier(deleteTarget.id);
      toast.success('Supplier Deleted', `"${deleteTarget.name}" has been permanently removed.`);
      setDeleteTarget(null);
      loadSuppliers(true);
    } catch (err: any) {
      toast.error('Failed to Delete Supplier', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q));
      if (!matchesQuery) return false;
      const hasDebt = (s.total_outstanding || 0) > 0;
      if (filterMode === 'creditors') return hasDebt;
      if (filterMode === 'cleared') return !hasDebt;
      return true;
    });
  }, [suppliers, searchQuery, filterMode]);

  const totalPayables = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.total_outstanding || 0), 0),
    [suppliers]
  );
  const creditorsCount = useMemo(
    () => suppliers.filter((s) => (s.total_outstanding || 0) > 0).length,
    [suppliers]
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-900 flex items-center justify-center text-white">
                <Truck className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
                Supplier Accounts & Payables Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage supplier directory, track purchase payables, and record supplier payments.
            </p>
          </div>
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadSuppliers(true)}
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
              title="Refresh Suppliers"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/suppliers/new"
              className="btn-press px-4 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Suppliers</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{suppliers.length}</div>
            <p className="text-xs text-slate-500">Registered suppliers</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Payables</span>
            <div className={`text-2xl font-black font-mono ${totalPayables > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              Rs. {totalPayables.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-slate-500">Outstanding amount we owe</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Active Creditors</span>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {creditorsCount} <span className="text-xs font-normal text-slate-500">/ {suppliers.length}</span>
            </div>
            <p className="text-xs text-slate-500">Suppliers with balance due</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            {[
              { label: 'All Suppliers', value: 'all' },
              { label: 'We Owe Them', value: 'creditors' },
              { label: 'Cleared (0 Due)', value: 'cleared' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterMode(tab.value as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterMode === tab.value ? 'bg-indigo-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Supplier Name</th>
                  <th className="p-4 font-mono">Contact</th>
                  <th className="p-4 font-mono">Address</th>
                  <th className="p-4 font-mono text-center">Purchases</th>
                  <th className="p-4 font-mono">We Owe</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">Loading supplier directory...</td>
                  </tr>
                ) : filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((s) => {
                    const hasDebt = (s.total_outstanding || 0) > 0;
                    return (
                      <tr key={s.id} className={`table-row-hover transition ${hasDebt ? 'hover:bg-rose-50/30' : ''}`}>
                        <td className="p-4 font-bold text-slate-900">
                          <Link href={`/suppliers/${s.id}`} className="hover:underline flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{s.name}</span>
                          </Link>
                        </td>
                        <td className="p-4 font-mono text-slate-600">
                          {s.phone ? (
                            <span className="flex items-center space-x-1"><Phone className="w-3 h-3 text-slate-400" /><span>{s.phone}</span></span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-slate-600 font-mono">
                          {s.address ? (
                            <span className="flex items-center space-x-1"><MapPin className="w-3 h-3 text-slate-400" /><span>{s.address}</span></span>
                          ) : '—'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-700">{s.total_purchases_count || 0}</td>
                        <td className="p-4 font-mono font-bold">
                          {hasDebt ? (
                            <span className="text-rose-700">Rs. {Math.round(s.total_outstanding || 0).toLocaleString()}</span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" /><span>Cleared</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {hasDebt && (
                              <Link
                                href={`/supplier-payments/new?supplier_id=${s.id}`}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1 btn-press"
                              >
                                <CreditCard className="w-3 h-3" /><span>Pay</span>
                              </Link>
                            )}
                            <Link href={`/suppliers/${s.id}`} className="px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition btn-press">
                              Ledger →
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(s)}
                              className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition btn-press"
                              title={`Delete ${s.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 uppercase font-mono">
                      No suppliers found. Click &quot;Add Supplier&quot; to register one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title={`Delete Supplier: "${deleteTarget.name}"?`}
          message="This will permanently delete this supplier account, purchase history, and payment records."
          actionDetails={[
            { label: 'Supplier Profile', description: 'Name, contact, and address will be erased.' },
            { label: 'Outstanding Payable', description: `Balance of Rs. ${(deleteTarget.total_outstanding || 0).toLocaleString()} will be removed.` },
          ]}
          warningNote="Permanent action: This deletion cannot be reversed."
          confirmText="Yes, Delete Supplier"
          cancelText="Cancel & Keep"
          variant="danger"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppLayout>
  );
}
