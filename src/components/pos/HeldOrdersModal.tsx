'use client';

import React from 'react';
import { Clock, X, ArrowRight, Trash2, ShoppingBag } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({ isOpen, onClose }) => {
  const { heldOrders, restoreHeldOrder, deleteHeldOrder, settings } = usePOS();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl border border-black shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-zinc-950">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center text-white">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold uppercase text-xs tracking-wider text-black">Parked & Held Orders</h2>
              <p className="text-xs text-zinc-500">{heldOrders.length} order tabs active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-zinc-300 bg-white hover:bg-black hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {heldOrders.length > 0 ? (
            heldOrders.map((held) => {
              const totalItems = held.items.reduce((acc, i) => acc + i.quantity, 0);
              const totalVal = held.items.reduce((acc, i) => {
                const sub = i.product.price * i.quantity;
                return acc + (sub - sub * (i.discountPercent / 100));
              }, 0);

              return (
                <div
                  key={held.id}
                  className="bg-white p-4 border border-zinc-200 hover:border-black transition flex flex-col space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-zinc-900 text-xs uppercase">{held.customerName}</h4>
                      <p className="text-[11px] font-mono text-zinc-500">
                        {new Date(held.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-black font-mono text-sm">
                        {settings.currencySymbol}
                        {totalVal.toFixed(2)}
                      </span>
                      <p className="text-[10px] font-mono text-zinc-500">{totalItems} ITEMS</p>
                    </div>
                  </div>

                  {/* Items Preview */}
                  <div className="text-xs text-zinc-800 bg-zinc-50 border border-zinc-200 p-2.5 space-y-1 font-mono">
                    {held.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.product.name}
                        </span>
                        <span className="text-zinc-600">
                          {settings.currencySymbol}
                          {(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      onClick={() => deleteHeldOrder(held.id)}
                      className="px-3 py-1.5 border border-zinc-300 bg-white hover:border-black text-xs font-bold uppercase flex items-center space-x-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>
                    <button
                      onClick={() => {
                        restoreHeldOrder(held.id);
                        onClose();
                      }}
                      className="px-4 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase flex items-center space-x-1 border border-black transition"
                    >
                      <span>Recall Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-zinc-300 bg-zinc-50">
              <ShoppingBag className="w-8 h-8 text-zinc-400" />
              <p className="text-xs font-bold uppercase text-zinc-700">No held orders found</p>
              <p className="text-[11px] text-zinc-500">
                You can park active register orders to retrieve them later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
