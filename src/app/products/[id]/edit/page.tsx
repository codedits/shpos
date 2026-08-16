'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { useToast } from '@/context/ToastContext';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Calculator,
} from 'lucide-react';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    size: '',
    color: '',
    stock_quantity: '',
    lot_cost: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!productId) return;
      try {
        setLoading(true);
        const p = await wholesaleService.getProductById(productId);
        if (!p) {
          setErrorMessage('Product not found.');
          return;
        }
        setFormData({
          product_code: p.product_code,
          name: p.name,
          size: p.size || '',
          color: p.color || '',
          stock_quantity: p.stock_quantity.toString(),
          lot_cost: p.lot_cost.toString(),
        });
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId]);

  const previewStock = parseInt(formData.stock_quantity, 10) || 0;
  const previewLotCost = parseFloat(formData.lot_cost) || 0;
  const previewUnitCost = previewStock > 0 ? (previewLotCost / previewStock).toFixed(2) : '0.00';

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_code.trim()) {
      errors.product_code = 'Product code is required.';
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
      await wholesaleService.updateProduct(productId, {
        product_code: formData.product_code.trim().toUpperCase(),
        name: formData.name.trim(),
        size: formData.size.trim() || null,
        color: formData.color.trim() || null,
        stock_quantity: stock,
        lot_cost: lotCost,
      });

      toast.success(
        'Product Updated Successfully',
        `${formData.name} (${formData.product_code}) changes were saved to catalog.`
      );
      router.push('/products');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update product.');
      toast.error('Could Not Update Product', err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto p-12 text-center text-xs font-mono uppercase text-slate-400">
          Loading product information...
        </div>
      </AppLayout>
    );
  }

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
                Edit Product: {formData.product_code}
              </h1>
              <p className="text-xs text-slate-500">
                Update product names, specifications, stock count, and total lot purchase costs.
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Product Code *
              </label>
              <input
                type="text"
                required
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
              {fieldErrors.product_code && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1">{fieldErrors.product_code}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Size / Cut
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Color / Shade
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Stock Quantity (Pieces) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formData.stock_quantity}
                onChange={(e) => {
                  setFormData({ ...formData, stock_quantity: e.target.value });
                  if (fieldErrors.stock_quantity) setFieldErrors({ ...fieldErrors, stock_quantity: '' });
                }}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Total Lot Purchase Cost (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.lot_cost}
                onChange={(e) => {
                  setFormData({ ...formData, lot_cost: e.target.value });
                  if (fieldErrors.lot_cost) setFieldErrors({ ...fieldErrors, lot_cost: '' });
                }}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Automated Valuation Preview */}
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
                <span className="text-[10px] text-slate-400 block uppercase">Unit Cost / Pc</span>
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
                  <span>Updating Product...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
