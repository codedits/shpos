'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Customer } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  CreditCard,
  Edit2,
  Trash2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

export default function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'debtors' | 'cleared'>('all');

  // Customer Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Wipe All Modal State
  const [wipeAllModalOpen, setWipeAllModalOpen] = useState(false);
  const [wiping, setWiping] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await wholesaleService.deleteCustomer(deleteTarget.id);
      toast.success(
        'Customer Deleted',
        `Account for "${deleteTarget.name}" has been permanently removed.`
      );
      setDeleteTarget(null);
      loadCustomers(true);
    } catch (err: any) {
      toast.error('Failed to Delete Customer', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleWipeAllConfirm = async () => {
    try {
      setWiping(true);
      await wholesaleService.clearAllData();
      toast.success(
        'All Accounts Wiped',
        'All customer records, ledgers, and sales data have been permanently cleared.'
      );
      setWipeAllModalOpen(false);
      loadCustomers(true);
    } catch (err: any) {
      toast.error('Failed to Wipe Data', err.message);
    } finally {
      setWiping(false);
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
                Customer Accounts & Receivables Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Maintain customer directory, track outstanding credit balances, and record payments.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadCustomers(true)}
              className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
              title="Refresh Customers"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {customers.length > 0 && (
              <button
                onClick={() => setWipeAllModalOpen(true)}
                className="btn-press px-3.5 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center space-x-1.5"
                title="Wipe all customer records"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wipe All Accounts</span>
              </button>
            )}

            <Link
              href="/customers/new"
              className="btn-press px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </Link>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Total Client Accounts
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">{customers.length}</div>
            <p className="text-xs text-slate-500">Registered wholesale buyers</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Market Receivables
            </span>
            <div className={`text-2xl font-black font-mono ${totalMarketDebt > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              Rs. {totalMarketDebt.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-slate-500">Pending customer debt balance</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Active Debtors
            </span>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {debtorsCount}{' '}
              <span className="text-xs font-normal text-slate-500">/ {customers.length}</span>
            </div>
            <p className="text-xs text-slate-500">Accounts with balance due</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or market..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              { label: 'All Accounts', value: 'all' },
              { label: 'With Balance Due', value: 'debtors' },
              { label: 'Cleared (0 Debt)', value: 'cleared' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterMode(tab.value as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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

        {/* Customers Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4 font-mono">Contact</th>
                  <th className="p-4 font-mono">Market Address</th>
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
                      <tr key={c.id} className={`table-row-hover transition ${hasDebt ? 'hover:bg-rose-50/30' : ''}`}>
                        <td className="p-4 font-bold text-slate-900">
                          <Link href={`/customers/${c.id}`} className="hover:underline flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {c.name.trim().split(' ').length >= 2
                                ? (c.name.trim().split(' ')[0][0] + c.name.trim().split(' ')[1][0]).toUpperCase()
                                : c.name.slice(0, 2).toUpperCase()}
                            </div>
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
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
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
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1 btn-press"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Collect Pay</span>
                              </Link>
                            )}
                            <Link
                              href={`/customers/${c.id}`}
                              className="px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition btn-press"
                            >
                              Ledger →
                            </Link>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition btn-press"
                              title={`Delete ${c.name}`}
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
                      No customer accounts found. Click &quot;Add Customer&quot; to create a profile.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Screen-Centered Delete Single Customer Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title={`Delete Customer: "${deleteTarget.name}"?`}
          message="Are you sure you want to permanently delete this customer account and ledger from the system?"
          actionDetails={[
            {
              label: 'Client Account Ledger',
              description: 'Customer profile, contact info, and market address will be erased.',
            },
            {
              label: 'Outstanding Credit Balance',
              description: `Pending balance of Rs. ${(deleteTarget.total_outstanding || 0).toLocaleString()} will be removed.`,
            },
          ]}
          warningNote="Permanent action: This deletion cannot be reversed."
          confirmText="Yes, Delete Customer"
          cancelText="Cancel & Keep Account"
          variant="danger"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Screen-Centered Wipe All Accounts Modal */}
      {wipeAllModalOpen && (
        <ConfirmModal
          isOpen={true}
          title="Wipe All Customers & Ledger History?"
          message="This action will permanently erase all wholesale client profiles, order history, and payment ledgers so you can start completely clean."
          actionDetails={[
            {
              label: 'All Customer Profiles',
              description: 'All wholesale client accounts will be permanently deleted.',
            },
            {
              label: 'Sales Invoices & Orders',
              description: 'All past invoices, vouchers, and installment payments will be purged.',
            },
          ]}
          warningNote="Critical action: All database data will be reset to zero."
          confirmText="Yes, Wipe Everything"
          cancelText="Cancel & Keep Data"
          variant="danger"
          isLoading={wiping}
          onConfirm={handleWipeAllConfirm}
          onCancel={() => setWipeAllModalOpen(false)}
        />
      )}
    </AppLayout>
  );
}
