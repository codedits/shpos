'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Customer, Order } from '@/types/wholesale';
import {
  CreditCard,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  User,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

function RecordPaymentForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const defaultCustomerId = searchParams.get('customer_id');
  const defaultOrderId = searchParams.get('order_id');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId || '');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(defaultOrderId || '');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank' | 'Other'>('Cash');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [cData, oData] = await Promise.all([
          wholesaleService.getCustomers(),
          wholesaleService.getOrders(),
        ]);
        setCustomers(cData);
        setOrders(oData);

        const targetCustId = defaultCustomerId || (cData.length > 0 ? cData[0].id : '');
        setSelectedCustomerId(targetCustId);

        if (defaultOrderId) {
          setSelectedOrderId(defaultOrderId);
          const targetOrd = oData.find((o) => o.id === defaultOrderId || o.invoice_number === defaultOrderId);
          if (targetOrd) {
            setAmountStr(targetOrd.remaining_amount.toString());
          }
        } else {
          const cust = cData.find((c) => c.id === targetCustId);
          if (cust && cust.total_outstanding) {
            setAmountStr(cust.total_outstanding.toString());
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [defaultCustomerId, defaultOrderId]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const customerUnpaidOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return orders.filter(
      (o) => o.customer_id === selectedCustomerId && o.remaining_amount > 0
    );
  }, [orders, selectedCustomerId]);

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    setSelectedOrderId('');
    const cust = customers.find((c) => c.id === id);
    if (cust && cust.total_outstanding) {
      setAmountStr(cust.total_outstanding.toString());
    } else {
      setAmountStr('');
    }
  };

  const handleOrderChange = (ordId: string) => {
    setSelectedOrderId(ordId);
    if (ordId) {
      const target = orders.find((o) => o.id === ordId || o.invoice_number === ordId);
      if (target) {
        setAmountStr(target.remaining_amount.toString());
      }
    } else if (selectedCustomer && selectedCustomer.total_outstanding) {
      setAmountStr(selectedCustomer.total_outstanding.toString());
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer.');
      toast.warning('Customer Required', 'Please select a customer account.');
      return;
    }
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Payment amount must be greater than zero.');
      toast.error('Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await wholesaleService.recordPayment({
        customer_id: selectedCustomerId,
        amount: amt,
        payment_method: paymentMethod,
        order_id: selectedOrderId || undefined,
        note: note.trim() || undefined,
      });

      toast.success(
        'Payment Recorded Successfully',
        `Rs. ${amt.toLocaleString()} received and allocated via FIFO.`
      );
      router.push(`/customers/${selectedCustomerId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record payment.');
      toast.error('Could Not Record Payment', err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
      {/* Navigation Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href={selectedCustomerId ? `/customers/${selectedCustomerId}` : '/payments'}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
              Record Customer Payment / Installment
            </h1>
            <p className="text-xs text-slate-500">
              Record incoming cash or bank transfer and automatically allocate against oldest unpaid invoices (FIFO).
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleRecordPayment} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Customer Account Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Select Customer Account *
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            required
            className="w-full p-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''} — Outstanding Balance: Rs. {(c.total_outstanding || 0).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Balance Overview Banner */}
        {selectedCustomer && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Total Outstanding Balance:</span>
              <span className={`text-xl font-black ${(selectedCustomer.total_outstanding || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                Rs. {(selectedCustomer.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Unpaid Invoices:</span>
              <span className="font-bold text-slate-900">{customerUnpaidOrders.length} Invoices Pending</span>
            </div>
          </div>
        )}

        {/* Target Invoice Selector (Optional, defaults to automatic FIFO) */}
        {customerUnpaidOrders.length > 0 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Apply to Specific Invoice (Optional / Defaults to Oldest FIFO)
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => handleOrderChange(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Auto FIFO Allocation (Recommended across oldest invoices)</option>
              {customerUnpaidOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.invoice_number} — Remaining Due: Rs. {o.remaining_amount.toLocaleString()} (Date: {new Date(o.order_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount Paid & Quick Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Payment Amount Received (Rs.) *
            </label>
            {selectedCustomer && (selectedCustomer.total_outstanding || 0) > 0 && (
              <button
                type="button"
                onClick={() => setAmountStr((selectedCustomer.total_outstanding || 0).toString())}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Pay Full Outstanding Balance (Rs. {(selectedCustomer.total_outstanding || 0).toLocaleString()})
              </button>
            )}
          </div>
          <input
            type="number"
            step="1"
            min="1"
            required
            placeholder="e.g. 50000"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full p-3 rounded-lg border-2 border-slate-900 text-lg font-black font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Payment Method Pills */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['Cash', 'Bank', 'Other'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-2.5 rounded-lg text-xs font-bold border transition ${
                  paymentMethod === m
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Remarks / Note */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Remarks / Cheque / Bank Reference Note
          </label>
          <input
            type="text"
            placeholder="e.g. Online transfer to HBL, Meezan cheque #4492, Cash received by cashier..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md ${
            submitting
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-lg'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{submitting ? 'Recording Payment...' : 'Record Payment & Settle Invoices'}</span>
        </button>
      </form>
    </div>
  );
}

export default function RecordPaymentPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto p-12 text-center text-xs font-mono uppercase text-slate-400">
            Loading payment form...
          </div>
        }
      >
        <RecordPaymentForm />
      </Suspense>
    </AppLayout>
  );
}
