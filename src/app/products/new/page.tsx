'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { useToast } from '@/context/ToastContext';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Calculator,
} from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();

  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    size: 'L',
    color: 'Black',
    stock_quantity: '100',
    lot_cost: '70000',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewStock = parseInt(formData.stock_quantity, 10) || 0;
  const previewLotCost = parseFloat(formData.lot_cost) || 0;
  const previewUnitCost = previewStock > 0 ? (previewLotCost / previewStock).toFixed(2) : '0.00';

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_code.trim()) {
      errors.product_code = 'Product code is required (e.g. TS-001).';
    }
    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    }
    const stock = parseInt(formData.stock_quantity, 10);
    if (isNaN(stock) || stock < 0) {
      errors.stock_quantity = 'Stock quantity must be a non-negative number.';
    }
    const lotCost = parseFloat(formData.lot_cost);
    if (isNaN(lotCost) || lotCost < 0) {
      errors.lot_cost = 'Lot cost must be a non-negative number.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      toast.warning('Please fix the form errors before saving.');
      return;
    }

    const stock = parseInt(formData.stock_quantity, 10);
    const lotCost = parseFloat(formData.lot_cost);

    try {
      setSubmitting(true);
      const created = await wholesaleService.createProduct({
        product_code: formData.product_code.trim().toUpperCase(),
        name: formData.name.trim(),
        size: formData.size.trim() || null,
        color: formData.color.trim() || null,
        stock_quantity: stock,
        lot_cost: lotCost,
        is_active: true,
      });

      toast.success(
        'Product Added Successfully',
        `${created.name} (${created.product_code}) is now active in the catalog.`
      );
      router.push('/products');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create product.');
      toast.error('Could Not Save Product', err.message);
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Navigation Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/products"
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Back to Products"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                Add Wholesale Garment Product
              </h1>
              <p className="text-xs text-slate-500">
                Enter product code, initial quantity in pieces, and total lot purchase valuation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form & Live Calculation Layout */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Product Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Product Code * (Unique)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TS-001"
                value={formData.product_code}
                onChange={(e) => {
                  setFormData({ ...formData, product_code: e.target.value });
                  if (fieldErrors.product_code) setFieldErrors({ ...fieldErrors, product_code: '' });
                }}
                className={`w-full p-3 rounded-lg border text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 ${
                  fieldErrors.product_code
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-300 focus:ring-slate-900 bg-white'
                }`}
              />
              {fieldErrors.product_code ? (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.product_code}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Unique SKU printed on invoice vouchers</p>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cotton Polo T-Shirt"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                className={`w-full p-3 rounded-lg border text-xs font-medium focus:outline-none focus:ring-2 ${
                  fieldErrors.name
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                    : 'border-slate-300 focus:ring-slate-900 bg-white'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Size */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Size / Cut
              </label>
              <input
                type="text"
                placeholder="e.g. L, M, XL, 32, 34, Free Size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Color / Shade
              </label>
              <input
                type="text"
                placeholder="e.g. Navy Blue, White, Black, Multi"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Stock Quantity */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Initial Stock Quantity (Pieces) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                placeholder="e.g. 100"
                value={formData.stock_quantity}
                onChange={(e) => {
                  setFormData({ ...formData, stock_quantity: e.target.value });
                  if (fieldErrors.stock_quantity) setFieldErrors({ ...fieldErrors, stock_quantity: '' });
                }}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
              {fieldErrors.stock_quantity && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.stock_quantity}</p>
              )}
            </div>

            {/* Total Lot Cost */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Total Lot Purchase Cost (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="e.g. 70000"
                value={formData.lot_cost}
                onChange={(e) => {
                  setFormData({ ...formData, lot_cost: e.target.value });
                  if (fieldErrors.lot_cost) setFieldErrors({ ...fieldErrors, lot_cost: '' });
                }}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
              {fieldErrors.lot_cost && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.lot_cost}</p>
              )}
            </div>
          </div>

          {/* Real-time Calculation Breakdown Preview Card */}
          <div className="p-5 rounded-xl bg-slate-900 text-white space-y-3 font-mono text-xs shadow-xs">
            <div className="flex items-center space-x-2 text-slate-300 pb-2 border-b border-slate-800">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs uppercase font-sans">Automated Valuation Preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Pieces in Lot</span>
                <span className="text-base font-bold text-white">{previewStock} Pcs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Lot Cost</span>
                <span className="text-base font-bold text-white">Rs. {previewLotCost.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Calculated Unit Cost / Pc</span>
                <span className="text-base font-black text-emerald-400">Rs. {previewUnitCost}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Link
              href="/products"
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className={`px-7 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-xs ${
                submitting
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-sm'
              }`}
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
