'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  User,
  Clock,
  ChevronRight,
  Percent,
  CreditCard,
  UserPlus,
  X,
} from 'lucide-react';
import { usePOS } from '@/context/POSContext';

interface CartSummaryProps {
  onOpenPaymentModal: () => void;
  onOpenHeldOrdersModal: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  onOpenPaymentModal,
  onOpenHeldOrdersModal,
}) => {
  const {
    cart,
    customers,
    selectedCustomer,
    selectCustomer,
    addCustomer,
    removeFromCart,
    updateCartQuantity,
    updateCartDiscount,
    clearCart,
    holdCart,
    settings,
    cartSubtotal,
    cartDiscountTotal,
    cartTaxTotal,
    cartGrandTotal,
    cartItemCount,
  } = usePOS();

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  const [discountEditId, setDiscountEditId] = useState<string | null>(null);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim(),
    });
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setShowAddCustomerModal(false);
    setShowCustomerDropdown(false);
  };

  return (
    <div className="w-full lg:w-[420px] bg-white border-l border-zinc-200 flex flex-col h-full sticky top-0 z-20 select-none text-zinc-950">
      {/* Customer Header */}
      <div className="p-4 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            <User className="w-3.5 h-3.5 text-zinc-900" />
            <span>Customer Profile</span>
          </div>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="flex items-center space-x-1 text-xs font-bold uppercase text-black hover:underline transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New</span>
          </button>
        </div>

        {/* Customer Select Button */}
        <div className="relative mt-2">
          <button
            onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
            className="w-full flex items-center justify-between p-2.5 bg-white border border-zinc-300 hover:border-black transition text-left"
          >
            <div>
              <p className="text-xs font-bold text-zinc-900">{selectedCustomer.name}</p>
              {selectedCustomer.phone && (
                <p className="text-[11px] font-mono text-zinc-500">{selectedCustomer.phone}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {selectedCustomer.loyaltyPoints > 0 && (
                <span className="px-2 py-0.5 border border-zinc-300 bg-zinc-100 text-zinc-800 font-mono text-[10px] font-bold">
                  {selectedCustomer.loyaltyPoints} PTS
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
          </button>

          {/* Customer Dropdown */}
          {showCustomerDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black shadow-lg max-h-60 overflow-y-auto z-50 p-1 space-y-1">
              {customers.map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => {
                    selectCustomer(cust);
                    setShowCustomerDropdown(false);
                  }}
                  className={`w-full text-left p-2 flex items-center justify-between text-xs transition ${
                    selectedCustomer.id === cust.id
                      ? 'bg-black text-white font-bold'
                      : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{cust.name}</p>
                    {cust.phone && <p className="text-[10px] font-mono opacity-80">{cust.phone}</p>}
                  </div>
                  {cust.loyaltyPoints > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-zinc-400">
                      {cust.loyaltyPoints} PTS
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Title Bar */}
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between bg-zinc-100">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-4 h-4 text-black" />
          <h2 className="font-bold text-zinc-900 text-xs uppercase tracking-wide">Current Order</h2>
          <span className="px-2 py-0.5 bg-black text-white font-mono text-[10px] font-bold">
            {cartItemCount} ITEMS
          </span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center space-x-1 text-xs font-bold uppercase text-zinc-500 hover:text-black transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {cart.length > 0 ? (
          cart.map((item) => {
            const itemTotal = item.product.price * item.quantity;
            const discountAmt = itemTotal * (item.discountPercent / 100);
            const netItemTotal = itemTotal - discountAmt;

            return (
              <div
                key={item.product.id}
                className="bg-white border border-zinc-200 p-3 flex flex-col space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-9 h-9 border border-zinc-200 object-cover bg-zinc-100 shrink-0 grayscale"
                      />
                    ) : (
                      <div className="w-9 h-9 border border-zinc-200 bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-500 font-mono text-[9px] font-bold">
                        {item.product.sku.slice(0, 3)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-zinc-900 text-xs truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-500">
                        {settings.currencySymbol}
                        {item.product.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold font-mono text-xs text-zinc-900">
                      {settings.currencySymbol}
                      {netItemTotal.toFixed(2)}
                    </span>
                    {item.discountPercent > 0 && (
                      <p className="text-[10px] font-mono text-zinc-600 font-semibold">
                        -{item.discountPercent}% (-{settings.currencySymbol}
                        {discountAmt.toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>

                {/* Quantity Controls & Discount edit button */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                  <button
                    onClick={() =>
                      setDiscountEditId(discountEditId === item.product.id ? null : item.product.id)
                    }
                    className="flex items-center space-x-1 text-[10px] font-bold uppercase text-zinc-600 hover:text-black transition"
                  >
                    <Percent className="w-3 h-3 text-black" />
                    <span>{item.discountPercent > 0 ? `${item.discountPercent}% OFF` : 'Discount'}</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 border border-zinc-300 bg-white hover:bg-black hover:text-white text-zinc-800 flex items-center justify-center font-bold transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-xs text-zinc-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 border border-zinc-300 bg-white hover:bg-black hover:text-white text-zinc-800 flex items-center justify-center font-bold transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-zinc-400 hover:text-black transition ml-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Discount Percentage Quick Selector */}
                {discountEditId === item.product.id && (
                  <div className="flex items-center space-x-1 pt-1.5">
                    <span className="text-[9px] font-bold uppercase text-zinc-500">Disc:</span>
                    {[0, 5, 10, 15, 20, 50].map((disc) => (
                      <button
                        key={disc}
                        onClick={() => {
                          updateCartDiscount(item.product.id, disc);
                          setDiscountEditId(null);
                        }}
                        className={`px-1.5 py-0.5 border text-[9px] font-mono font-bold uppercase transition ${
                          item.discountPercent === disc
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-zinc-700 border-zinc-200 hover:border-black'
                        }`}
                      >
                        {disc === 0 ? 'None' : `${disc}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-zinc-300 bg-zinc-50">
            <ShoppingBag className="w-8 h-8 text-zinc-400" />
            <p className="text-xs font-bold uppercase text-zinc-700">Cart is empty</p>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              Click products on the left terminal to add items to this order.
            </p>
          </div>
        )}
      </div>

      {/* Order Totals & Action Footer */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
        <div className="space-y-1 text-xs text-zinc-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono text-zinc-900 font-bold">
              {settings.currencySymbol}
              {cartSubtotal.toFixed(2)}
            </span>
          </div>
          {cartDiscountTotal > 0 && (
            <div className="flex justify-between text-zinc-800 font-semibold">
              <span>Discounts</span>
              <span className="font-mono">
                -{settings.currencySymbol}
                {cartDiscountTotal.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax ({settings.taxRatePercent}%)</span>
            <span className="font-mono text-zinc-900">
              {settings.currencySymbol}
              {cartTaxTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-zinc-300 font-extrabold text-sm text-zinc-950">
            <span className="uppercase">Grand Total</span>
            <span className="font-mono text-base text-black">
              {settings.currencySymbol}
              {cartGrandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            disabled={cart.length === 0}
            onClick={() => holdCart()}
            className="flex flex-col items-center justify-center p-2.5 bg-white border border-zinc-300 hover:border-black disabled:opacity-40 text-zinc-900 text-xs font-bold uppercase transition"
          >
            <Clock className="w-4 h-4 mb-1 text-black" />
            <span>Hold Tab</span>
          </button>
          <button
            onClick={onOpenHeldOrdersModal}
            className="flex flex-col items-center justify-center p-2.5 bg-white border border-zinc-300 hover:border-black text-zinc-900 text-xs font-bold uppercase transition"
          >
            <ShoppingBag className="w-4 h-4 mb-1 text-black" />
            <span>Held ({cartItemCount})</span>
          </button>
          <button
            disabled={cart.length === 0}
            onClick={onOpenPaymentModal}
            className="col-span-1 flex flex-col items-center justify-center p-2.5 bg-black hover:bg-zinc-800 border border-black disabled:opacity-40 font-bold text-white text-xs uppercase tracking-wide shadow-sm transition"
          >
            <CreditCard className="w-4 h-4 mb-1" />
            <span>Pay {settings.currencySymbol}{cartGrandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 border border-black shadow-2xl space-y-4 text-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <h3 className="font-bold uppercase text-sm">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)}>
                <X className="w-4 h-4 text-zinc-500 hover:text-black" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2.5 border border-zinc-300 text-xs focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full p-2.5 border border-zinc-300 text-xs focus:border-black focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full p-2.5 border border-zinc-300 text-xs focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 border border-zinc-300 text-xs font-bold uppercase hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white border border-black text-xs font-bold uppercase hover:bg-zinc-800"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
