'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import {
  Receipt,
  Search,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { Transaction } from '@/types/pos';
import { ReceiptModal } from '@/components/pos/ReceiptModal';

export default function TransactionsPage() {
  const { transactions, refundTransaction, settings } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    const matchStatus = selectedStatus === 'all' || tx.status === selectedStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      tx.orderNumber.toLowerCase().includes(q) ||
      (tx.customer && tx.customer.name.toLowerCase().includes(q)) ||
      tx.cashierName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-zinc-950">
      <Navbar />

      <main className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-6">
        {/* Page Header */}
        <div className="border-b border-zinc-200 pb-4">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-black" />
            <h1 className="text-lg font-extrabold uppercase tracking-wide text-zinc-950">Transactions & Orders Log</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Review sales history, inspect order itemization, reprint thermal receipts, or issue refunds.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by order #, customer, or cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 bg-white text-xs font-mono focus:border-black focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-zinc-300 bg-white text-xs font-bold uppercase text-zinc-800 focus:border-black"
            >
              <option value="all">All Statuses ({transactions.length})</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto border border-zinc-300 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                <th className="p-3.5">Order # & Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items Count</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Grand Total</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-50 transition">
                    <td className="p-3.5 font-mono">
                      <p className="font-bold text-zinc-950">{tx.orderNumber}</p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-zinc-900">
                        {tx.customer?.name || 'Walk-in Buyer'}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-mono">Cashier: {tx.cashierName}</p>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-zinc-700">
                      {tx.items.reduce((sum, item) => sum + item.quantity, 0)} ITEMS
                    </td>
                    <td className="p-3.5">
                      <span className="uppercase px-2 py-0.5 border border-zinc-300 bg-zinc-50 text-[10px] font-mono font-bold text-zinc-800">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-sm text-black">
                      {settings.currencySymbol}
                      {tx.total.toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      {tx.status === 'completed' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 border border-zinc-300 bg-zinc-100 text-zinc-900 text-[10px] font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3 text-zinc-900" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 border border-zinc-300 bg-white text-zinc-400 text-[10px] font-bold uppercase line-through">
                          <XCircle className="w-3 h-3 text-zinc-400" />
                          <span>Refunded</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-1.5 border border-zinc-300 bg-white hover:border-black text-zinc-800 transition"
                          title="View & Print Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {tx.status === 'completed' && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Are you sure you want to refund order #${tx.orderNumber}? Stock will be returned to inventory.`
                                )
                              ) {
                                refundTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 border border-zinc-300 bg-white hover:bg-black hover:text-white hover:border-black text-zinc-800 transition"
                            title="Issue Full Refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-zinc-500 font-mono text-xs uppercase">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Receipt Modal */}
        <ReceiptModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
      </main>
    </div>
  );
}
