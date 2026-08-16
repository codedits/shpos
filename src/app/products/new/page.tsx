'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { useToast } from '@/context/ToastContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';
import { FIXED_SIZES, FixedSize, VariantMatrixRow } from '@/types/wholesale';
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
    lot_cost: '70000',
  });

  const [matrix, setMatrix] = useState<VariantMatrixRow[]>([
    {
      color: 'Black',
      sizes: {
        Small: 20,
        Medium: 15,
        Large: 10,
        Standard: 12,
        XL: 8,
      },
    },
    {
      color: 'White',
      sizes: {
        Small: 10,
        Medium: 18,
        Large: 14,
        Standard: 5,
        XL: 7,
      },
    },
  ]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Total stock derived dynamically from Color × Size matrix
  const totalVariantStock = matrix.reduce((sum, row) => {
    return sum + Object.values(row.sizes).reduce((s, q) => s + (q || 0), 0);
  }, 0);

  const previewLotCost = parseFloat(formData.lot_cost) || 0;
  const previewUnitCost = totalVariantStock > 0 ? (previewLotCost / totalVariantStock).toFixed(2) : '0.00';

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_code.trim()) {
      errors.product_code = 'Product code is required (e.g. TS-001).';
    }
    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    }
    const lotCost = parseFloat(formData.lot_cost);
    if (isNaN(lotCost) || lotCost < 0) {
      errors.lot_cost = 'Lot cost must be a non-negative number.';
    }
    if (matrix.length === 0) {
      errors.matrix = 'Please add at least one color to the inventory matrix.';
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

    const lotCost = parseFloat(formData.lot_cost) || 0;

    // Convert matrix rows into discrete variant inputs
    const flatVariants: Array<{ color: string; size: FixedSize; stock_quantity: number }> = [];
    matrix.forEach((row) => {
      FIXED_SIZES.forEach((size) => {
        const qty = row.sizes[size] ?? 0;
        flatVariants.push({
          color: row.color.trim(),
          size,
          stock_quantity: qty,
        });
      });
    });

    try {
      setSubmitting(true);

      // 1. Upload compressed image if provided
      let finalImageUrl: string | null = null;
      if (imageFile) {
        finalImageUrl = await wholesaleService.uploadProductImage(
          imageFile,
          formData.product_code.trim().toUpperCase()
        );
      }

      // 2. Create product & variants in database
      const created = await wholesaleService.createProduct(
        {
          product_code: formData.product_code.trim().toUpperCase(),
          name: formData.name.trim(),
          stock_quantity: totalVariantStock,
          lot_cost: lotCost,
          image_url: finalImageUrl,
          is_active: true,
        },
        flatVariants
      );

      toast.success(
        'Product Added Successfully',
        `${created.name} (${created.product_code}) with ${flatVariants.length} variants (${totalVariantStock} pcs) is now active in catalog.`
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Navigation Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/products"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
              title="Back to Products"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
                Add Wholesale Garment Product
              </h1>
              <p className="text-xs text-slate-500">
                Configure garment details, picture, and Color × Size inventory matrix.
              </p>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form & Live Calculation Layout */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Image Upload Component (Optional, compressed to <= 500KB) */}
          <div className="pb-4 border-b border-slate-100">
            <ImageUpload
              value={imagePreview}
              onChange={(file, previewUrl) => {
                setImageFile(file);
                setImagePreview(previewUrl);
              }}
              disabled={submitting}
            />
          </div>

          {/* Core Product Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Product Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
                Product Code / SKU *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KR-01, TS-003, LW-99"
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                className={`w-full p-3 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none transition ${
                  fieldErrors.product_code
                    ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900'
                }`}
              />
              {fieldErrors.product_code && (
                <p className="text-[11px] text-rose-600 font-mono mt-1">{fieldErrors.product_code}</p>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Garment Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cotton Lawn Embroidered Kurta"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full p-3 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                  fieldErrors.name
                    ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>
              )}
            </div>
          </div>

          {/* COLOR × SIZE INVENTORY MATRIX EDITOR */}
          <div className="pt-2">
            <VariantMatrixEditor
              matrix={matrix}
              onChange={setMatrix}
              disabled={submitting}
            />
            {fieldErrors.matrix && (
              <p className="text-[11px] text-rose-600 font-mono mt-1">{fieldErrors.matrix}</p>
            )}
          </div>

          {/* Lot Cost & Valuation Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            {/* Total Lot Cost */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
                Total Lot Purchase Cost (Rs.) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="e.g. 70000"
                value={formData.lot_cost}
                onChange={(e) => setFormData({ ...formData, lot_cost: e.target.value })}
                className={`w-full p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none transition ${
                  fieldErrors.lot_cost
                    ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900'
                }`}
              />
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Total supplier purchase cost for all {totalVariantStock} pieces in this lot.
              </p>
            </div>

            {/* Live Unit Cost Calculation Display */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
                Auto-Calculated Unit Cost / Pc
              </label>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Formula: Lot Cost ÷ Total Pieces</span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    Rs. {previewUnitCost} <span className="text-xs font-normal text-slate-500">/ Piece</span>
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>{totalVariantStock} Pcs Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <Link
              href="/products"
              className="btn-press px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className={`btn-press px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition flex items-center space-x-2 ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Garment Matrix...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Garment & Variants</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
