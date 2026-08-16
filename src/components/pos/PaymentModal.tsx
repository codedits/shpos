'use client';

import React, { useState } from 'react';
import {
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  X,
  CheckCircle2,
  Delete,
} from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { PaymentMethod, Transaction } from '@/types/pos';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { cartGrandTotal, processCheckout, settings, selectedCustomer } = usePOS();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const numericTendered =
    selectedMethod === 'cash'
      ? parseFloat(amountTenderedStr) || 0
      : cartGrandTotal;

  const changeDue = Math.max(0, numericTendered - cartGrandTotal);
  const isSufficient = numericTendered >= cartGrandTotal;

  const handlePresetCash = (val: number) => {
    setAmountTenderedStr(val.toFixed(2));
  };

  const handleNumpadPress = (char: string) => {
    if (char === 'C') {
      setAmountTenderedStr('');
      return;
    }
    if (char === 'DEL') {
      setAmountTenderedStr((prev) => prev.slice(0, -1));
      return;
    }
    if (char === '.' && amountTenderedStr.includes('.')) return;
    setAmountTenderedStr((prev) => prev + char);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSufficient && selectedMethod === 'cash') return;

    const createdTx = processCheckout(selectedMethod, numericTendered, notes);
    onSuccess(createdTx);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl border border-black shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-950">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div>
            <h2 className="font-extrabold uppercase text-sm tracking-wider text-black">Process Checkout</h2>
            <p className="text-xs text-zinc-600">
              Customer: <span className="font-bold text-black">{selectedCustomer.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-zinc-300 bg-white hover:bg-black hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Amount Due Banner */}
          <div className="p-4 bg-zinc-100 border border-zinc-300 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Amount Due</p>
              <p className="text-3xl font-extrabold text-black font-mono mt-0.5">
                {settings.currencySymbol}
                {cartGrandTotal.toFixed(2)}
              </p>
            </div>
            {selectedMethod === 'cash' && (
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Change Due</p>
                <p
                  className={`text-2xl font-extrabold font-mono mt-0.5 ${
                    isSufficient ? 'text-black' : 'text-zinc-400 line-through'
                  }`}
                >
                  {settings.currencySymbol}
                  {changeDue.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'card', label: 'Credit Card', icon: CreditCard },
                { id: 'qr', label: 'QR / Wallet', icon: QrCode },
                { id: 'credit', label: 'Store Credit', icon: Wallet },
              ].map((method) => {
                const Icon = method.icon;
                const isActive = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                    className={`p-4 flex flex-col items-center justify-center space-y-2 border uppercase font-bold text-xs transition ${
                      isActive
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-zinc-300 text-zinc-800 hover:border-black'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tender & Keypad Section */}
          {selectedMethod === 'cash' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                  Amount Tendered ({settings.currencySymbol})
                </label>
                <input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={amountTenderedStr}
                  className="w-full text-right text-2xl font-bold font-mono p-3 bg-white border border-black text-black"
                />
              </div>

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetCash(cartGrandTotal)}
                  className="px-3.5 py-2 border border-black bg-black text-white text-xs font-bold font-mono uppercase hover:bg-zinc-800"
                >
                  Exact ({settings.currencySymbol}
                  {cartGrandTotal.toFixed(2)})
                </button>
                {[5, 10, 20, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetCash(preset)}
                    className="px-3 py-2 border border-zinc-300 bg-white text-xs font-bold font-mono text-zinc-900 hover:border-black"
                  >
                    {settings.currencySymbol}
                    {preset}
                  </button>
                ))}
              </div>

              {/* Touch Numpad */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', 'DEL'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleNumpadPress(key)}
                    className="p-3 border border-zinc-300 bg-white hover:bg-black hover:text-white font-bold font-mono text-sm text-zinc-900 flex items-center justify-center transition"
                  >
                    {key === 'DEL' ? <Delete className="w-4 h-4" /> : key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
              Order Notes / Ref (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Table #4 / Special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-zinc-300 text-xs focus:border-black focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-zinc-300 text-xs font-bold uppercase hover:bg-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isSufficient && selectedMethod === 'cash'}
            onClick={handleCheckoutSubmit}
            className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-wide border border-black disabled:opacity-40 flex items-center space-x-2 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
