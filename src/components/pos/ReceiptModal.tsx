'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Printer, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { Transaction } from '@/types/pos';
import { usePOS } from '@/context/POSContext';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const { settings } = usePOS();

  useEffect(() => {
    if (transaction) {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#000000', '#52525b', '#a1a1aa'],
      });
    }
  }, [transaction]);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md border border-black shadow-2xl overflow-hidden flex flex-col my-8 text-zinc-950">
        {/* Header Banner */}
        <div className="p-4 bg-black text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">Sale Complete</h3>
              <p className="text-[11px] font-mono text-zinc-300">
                Order #{transaction.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Thermal Card Preview */}
        <div className="p-6 bg-zinc-100 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full bg-white text-zinc-950 p-6 border border-zinc-300 font-mono text-xs space-y-4 select-text"
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-400">
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-zinc-950">
                {settings.name}
              </h2>
              <p className="text-[11px] text-zinc-600">{settings.address}</p>
              <p className="text-[11px] text-zinc-600">TEL: {settings.phone}</p>
              <p className="text-[10px] text-zinc-500 pt-1 font-sans uppercase">{settings.receiptHeader}</p>
            </div>

            {/* Transaction Info */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-400 pb-3">
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{new Date(transaction.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>RECEIPT #:</span>
                <span className="font-bold">{transaction.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span>{transaction.customer?.name || 'Walk-in Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT:</span>
                <span className="uppercase font-bold">{transaction.paymentMethod}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 border-b border-dashed border-zinc-400 pb-3">
              <div className="flex justify-between font-bold text-[11px]">
                <span>ITEM</span>
                <span>QTY x PRICE</span>
                <span>TOTAL</span>
              </div>
              {transaction.items.map((item, idx) => {
                const itemTotal = item.product.price * item.quantity;
                const discAmt = itemTotal * (item.discountPercent / 100);
                const finalAmt = itemTotal - discAmt;

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-bold">
                      <span className="truncate pr-2">{item.product.name}</span>
                      <span className="shrink-0">{settings.currencySymbol}{finalAmt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>
                        {item.quantity} @ {settings.currencySymbol}{item.product.price.toFixed(2)}
                        {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{settings.currencySymbol}{transaction.subtotal.toFixed(2)}</span>
              </div>
              {transaction.discountTotal > 0 && (
                <div className="flex justify-between font-bold">
                  <span>DISCOUNT:</span>
                  <span>-{settings.currencySymbol}{transaction.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TAX ({settings.taxRatePercent}%):</span>
                <span>{settings.currencySymbol}{transaction.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-zinc-950">
                <span>TOTAL:</span>
                <span>{settings.currencySymbol}{transaction.total.toFixed(2)}</span>
              </div>
              {transaction.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between pt-1">
                    <span>TENDERED:</span>
                    <span>{settings.currencySymbol}{transaction.amountTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>CHANGE DUE:</span>
                    <span>{settings.currencySymbol}{transaction.changeDue.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-dashed border-zinc-400 text-[10px] text-zinc-500 font-sans uppercase">
              <p>{settings.receiptFooter}</p>
              <p className="font-mono text-[9px] pt-1">*** END OF RECEIPT ***</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 border border-zinc-300 bg-white hover:border-black text-zinc-900 font-bold text-xs uppercase flex items-center justify-center space-x-2 transition"
          >
            <Printer className="w-4 h-4 text-black" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wide border border-black flex items-center justify-center space-x-2 transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
