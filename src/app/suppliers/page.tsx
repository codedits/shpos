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
  ShoppingBag,
  ArrowRight,
  UserCheck,
  Building2,
} from 'lucide-react';

export default function SuppliersPage() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'creditors' | 'cleared'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Add Supplier Modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickFormData, setQuickFormData] = useState({ name: '', phone: '', address: '' });
  const [quickSubmitting, setQuickSubmitting] = useState(false);

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

  const handleQuickAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFormData.name.trim()) {
      toast.warning('Supplier Name is required');
      return;
    }
    try {
      setQuickSubmitting(true);
      const created = await wholesaleService.createSupplier({
        name: quickFormData.name.trim(),
        phone: quickFormData.phone.trim() || undefined,
        address: quickFormData.address.trim() || undefined,
      });
      toast.success(`Supplier "${created.name}" created successfully!`);
      setQuickFormData({ name: '', phone: '', address: '' });
      setQuickAddOpen(false);
      loadSuppliers(true);
    } catch (err: any) {
      toast.error('Failed to create supplier', err.message);
    } finally {
      setQuickSubmitting(false);
    }
  };

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
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Truck className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
                  Supplier Directory & Accounts
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">
                  Manage garment suppliers, record stock purchases, and track loan payables.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadSuppliers(true)}
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press shadow-2xs"
              title="Refresh Directory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setQuickAddOpen(true)}
              className="btn-press px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Quick Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Registered Suppliers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Total Suppliers
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono">{suppliers.length}</div>
              <p className="text-xs text-slate-500 font-sans">Active supply accounts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Total Supplier Payables / Loan Owed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Supplier Loans Owed
              </span>
              <div className={`text-2xl font-black font-mono ${totalPayables > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                Rs. {Math.round(totalPayables).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 font-sans">
                {totalPayables > 0 ? 'Outstanding loan balance' : 'All accounts fully settled'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${totalPayables > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Active Creditors Count */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Active Loan Accounts
              </span>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {creditorsCount} <span className="text-xs font-normal text-slate-500">/ {suppliers.length}</span>
              </div>
              <p className="text-xs text-slate-500 font-sans">Suppliers pending payment</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Toolbar: Search + Filter Chips */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by supplier name, phone, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            {[
              { label: 'All Suppliers', value: 'all' },
              { label: 'Loans Owed', value: 'creditors' },
              { label: 'Cleared Accounts', value: 'cleared' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterMode(tab.value as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap btn-press ${
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

        {/* Suppliers Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  <th className="p-4 pl-5">Supplier Name</th>
                  <th className="p-4 font-mono">Contact Phone</th>
                  <th className="p-4 font-mono">Address</th>
                  <th className="p-4 font-mono text-center">Purchases Count</th>
                  <th className="p-4 font-mono">Loan Outstanding</th>
                  <th className="p-4 text-right pr-5">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-mono text-xs uppercase">
                      Loading supplier directory...
                    </td>
                  </tr>
                ) : filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((s) => {
                    const hasDebt = (s.total_outstanding || 0) > 0;
                    return (
                      <tr
                        key={s.id}
                        className={`table-row-hover transition ${hasDebt ? 'hover:bg-rose-50/20' : ''}`}
                      >
                        <td className="p-4 pl-5 font-bold text-slate-900 font-sans">
                          <Link href={`/suppliers/${s.id}`} className="hover:underline flex items-center space-x-3 group">
                            <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0 font-mono group-hover:scale-105 transition">
                              {s.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 group-hover:text-blue-700 transition">
                                {s.name}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="p-4 text-slate-600">
                          {s.phone ? (
                            <a href={`tel:${s.phone}`} className="flex items-center space-x-1 hover:text-slate-900">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{s.phone}</span>
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4 text-slate-600 font-sans">
                          {s.address ? (
                            <span className="flex items-center space-x-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{s.address}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700">
                          {s.total_purchases_count || 0} Receipts
                        </td>
                        <td className="p-4 font-bold">
                          {hasDebt ? (
                            <span className="text-rose-700 font-extrabold">
                              Rs. {Math.round(s.total_outstanding || 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Cleared</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right pr-5">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/purchases/new?supplier_id=${s.id}`}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center space-x-1 btn-press"
                              title="Record New Stock Purchase"
                            >
                              <ShoppingBag className="w-3 h-3 text-slate-600" />
                              <span>+ Purchase</span>
                            </Link>

                            {hasDebt && (
                              <Link
                                href={`/supplier-payments/new?supplier_id=${s.id}`}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1 btn-press"
                                title="Pay Supplier Loan"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay Loan</span>
                              </Link>
                            )}

                            <Link
                              href={`/suppliers/${s.id}`}
                              className="px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center space-x-1 btn-press"
                            >
                              <span>Ledger</span>
                              <ArrowRight className="w-3 h-3" />
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
                    <td colSpan={6} className="p-12 text-center text-slate-400 uppercase font-mono text-xs">
                      No suppliers found matching query &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Truck className="w-4 h-4 text-indigo-300" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 font-heading">
                  Quick Add Supplier
                </h3>
              </div>
              <button
                onClick={() => setQuickAddOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                  Supplier / Factory Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Al-Madina Weaving Mills"
                  value={quickFormData.name}
                  onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0300-1234567"
                  value={quickFormData.phone}
                  onChange={(e) => setQuickFormData({ ...quickFormData, phone: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                  Address / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Azam Cloth Market, Lahore"
                  value={quickFormData.address}
                  onChange={(e) => setQuickFormData({ ...quickFormData, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(false)}
                  className="btn-press px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="btn-press px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm transition flex items-center space-x-1.5"
                >
                  {quickSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Supplier</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title={`Delete Supplier: "${deleteTarget.name}"?`}
          message="This will permanently delete this supplier account, purchase history, and payment records."
          actionDetails={[
            { label: 'Supplier Profile', description: 'Name, contact, and address will be erased.' },
            { label: 'Outstanding Payable', description: `Balance of Rs. ${Math.round(deleteTarget.total_outstanding || 0).toLocaleString()} will be removed.` },
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
