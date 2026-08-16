'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Customer, Order, Payment } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Users,
  ArrowLeft,
  Phone,
  MapPin,
  Plus,
  CreditCard,
  Receipt,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
} from 'lucide-react';
import { formatDatePKT } from '@/lib/dateUtils';

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!customerId) return;
      try {
        setLoading(true);
        const [c, allOrders, allPayments] = await Promise.all([
          wholesaleService.getCustomerById(customerId),
          wholesaleService.getOrders(),
          wholesaleService.getPayments(),
        ]);
        if (!c) {
          setErrorMessage('Customer not found.');
          return;
        }
        setCustomer(c);
        setOrders(allOrders.filter((o) => o.customer_id === customerId));
        setPayments(allPayments.filter((p) => p.customer_id === customerId));
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customerId]);

  const handleDeleteConfirm = async () => {
    if (!customer) return;
    try {
      setDeleting(true);
      await wholesaleService.deleteCustomer(customer.id);
      toast.success(
        'Customer Deleted',
        `Account for "${customer.name}" has been permanently deleted.`
      );
      router.push('/customers');
    } catch (err: any) {
      toast.error('Could Not Delete Customer', err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto p-12 text-center font-mono text-xs uppercase text-slate-400">
          Loading client profile & chronological ledger...
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-800 mx-auto" />
          <h2 className="font-bold text-sm uppercase">Customer Not Found</h2>
          <Link href="/customers" className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">
            Back to Customers
          </Link>
        </div>
      </AppLayout>
    );
  }

  const hasOutstanding = (customer.total_outstanding || 0) > 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header & Navigation */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/customers"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
              title="Back to Customers"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {customer.name.trim().split(' ').length >= 2
                ? (customer.name.trim().split(' ')[0][0] + customer.name.trim().split(' ')[1][0]).toUpperCase()
                : customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
                  {customer.name}
                </h1>
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="btn-press p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Edit Customer Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mt-1">
                {customer.phone && (
                  <span className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{customer.phone}</span>
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {hasOutstanding && (
              <Link
                href={`/payments/new?customer_id=${customer.id}`}
                className="btn-press px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>Collect Payment</span>
              </Link>
            )}
            <Link
              href={`/orders/new?customer_id=${customer.id}`}
              className="btn-press px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </Link>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="btn-press p-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
              title={`Delete ${customer.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Total Billed (Invoiced)
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              Rs. {(customer.total_billed || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 font-mono">{orders.length} total orders booked</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Total Cash Collected
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              Rs. {(customer.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 font-mono">{payments.length} receipts recorded</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Net Outstanding Balance Due
            </span>
            <div className={`text-2xl font-black font-mono ${hasOutstanding ? 'text-rose-700' : 'text-slate-900'}`}>
              Rs. {(customer.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              {hasOutstanding ? 'Pending settlement' : 'Account fully cleared'}
            </p>
          </div>
        </div>

        {/* Ledger & Transactions */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 font-heading">Order History</h3>
            <span className="text-xs font-mono text-slate-500">{orders.length} Invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5 pl-4">Invoice #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Total Amount</th>
                  <th className="p-3.5 text-right">Paid</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length > 0 ? (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3.5 pl-4 font-bold text-slate-900">
                        <Link href={`/invoices/${o.invoice_number}`} className="hover:underline">
                          {o.invoice_number}
                        </Link>
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDatePKT(o.order_date, false)}</td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        Rs. {o.total_amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right text-emerald-700 font-semibold">
                        Rs. {o.amount_paid.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold text-rose-700">
                        Rs. {o.remaining_amount.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          o.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800'
                            : o.payment_status === 'PARTIALLY_PAID'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}>
                          {o.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <Link
                          href={`/invoices/${o.invoice_number}`}
                          className="text-xs font-bold text-slate-900 hover:underline"
                        >
                          View Voucher →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No invoices recorded for this client yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Screen-Centered Delete Customer Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete Customer: "${customer.name}"?`}
        message="This action will permanently delete this customer account, contact information, and account ledger."
        actionDetails={[
          {
            label: 'Client Profile',
            description: 'Name, phone, address, and account record will be removed.',
          },
          {
            label: 'Outstanding Balance',
            description: `Pending receivables of Rs. ${(customer.total_outstanding || 0).toLocaleString()} will be cleared.`,
          },
        ]}
        warningNote="Permanent action: This deletion cannot be undone."
        confirmText="Yes, Delete Customer Account"
        cancelText="Cancel & Keep Account"
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </AppLayout>
  );
}
