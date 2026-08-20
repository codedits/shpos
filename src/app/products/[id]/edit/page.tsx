'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { useToast } from '@/context/ToastContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { VariantMatrixEditor } from '@/components/products/VariantMatrixEditor';
import { FIXED_SIZES, FixedSize, VariantMatrixRow, ProductVariant } from '@/types/wholesale';
import {
  Package,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Calculator,
  RefreshCw,
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
    unit_cost: '',
    selling_price: '',
  });

  const [matrix, setMatrix] = useState<VariantMatrixRow[]>([]);
  const [existingVariants, setExistingVariants] = useState<ProductVariant[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

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
          unit_cost: (p.unit_cost || 0).toString(),
          selling_price: (p.selling_price || Math.round((p.unit_cost || 0) * 1.2)).toString(),
        });

        if (p.image_url) {
          setImagePreview(p.image_url);
          setExistingImageUrl(p.image_url);
        }

        // Build matrix from existing variants
        const vars = p.variants || [];
        setExistingVariants(vars);

        if (vars.length > 0) {
          // Group variants by color
          const colorMap: Record<string, Record<FixedSize, number>> = {};
          vars.forEach((v) => {
            if (!colorMap[v.color]) {
              colorMap[v.color] = { Small: 0, Medium: 0, Large: 0, Standard: 0, XL: 0 };
            }
            if (FIXED_SIZES.includes(v.size as FixedSize)) {
              colorMap[v.color][v.size as FixedSize] = v.stock_quantity;
            }
          });

          const initialMatrix: VariantMatrixRow[] = Object.entries(colorMap).map(([color, sizes]) => ({
            color,
            sizes,
          }));
          setMatrix(initialMatrix);
        } else {
          // Default single color row from product fields
          const defaultColor = p.color || 'Standard';
          setMatrix([
            {
              color: defaultColor,
              sizes: {
                Small: 0,
                Medium: 0,
                Large: 0,
                Standard: p.stock_quantity || 0,
                XL: 0,
              },
            },
          ]);
        }
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId]);

  // Total stock calculated dynamically from matrix
  const totalVariantStock = matrix.reduce((sum, row) => {
    return sum + Object.values(row.sizes).reduce((s, q) => s + (q || 0), 0);
  }, 0);

  const costPrice = parseInt(formData.unit_cost, 10) || 0;
  const sellingPrice = parseInt(formData.selling_price, 10) || 0;
  const previewLotValuation = costPrice * totalVariantStock;
  const expectedProfitPerPc = sellingPrice - costPrice;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.product_code.trim()) {
      errors.product_code = 'Product code is required.';
    }
    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    }
    if (isNaN(costPrice) || costPrice < 0) {
      errors.unit_cost = 'Cost price must be a non-negative number.';
    }
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      errors.selling_price = 'Selling price must be a non-negative number.';
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

    // Convert matrix rows into discrete variant inputs matching existing IDs if present
    const flatVariants: Array<{ id?: string; color: string; size: FixedSize; stock_quantity: number }> = [];
    matrix.forEach((row) => {
      FIXED_SIZES.forEach((size) => {
        const qty = row.sizes[size] ?? 0;
        const matchedExisting = existingVariants.find(
          (v) => v.color.toLowerCase() === row.color.toLowerCase() && v.size === size
        );
        flatVariants.push({
          ...(matchedExisting ? { id: matchedExisting.id } : {}),
          color: row.color.trim(),
          size,
          stock_quantity: qty,
        });
      });
    });

    try {
      setSubmitting(true);

      let finalImageUrl = existingImageUrl;
      if (imageFile) {
        finalImageUrl = await wholesaleService.uploadProductImage(
          imageFile,
          formData.product_code.trim().toUpperCase()
        );
      }

      await wholesaleService.updateProduct(
        productId,
        {
          product_code: formData.product_code.trim().toUpperCase(),
          name: formData.name.trim(),
          stock_quantity: totalVariantStock,
          lot_cost: previewLotValuation,
          unit_cost: costPrice,
          selling_price: sellingPrice,
          image_url: finalImageUrl,
        },
        flatVariants
      );

      toast.success(
        `Product "${formData.name.trim()}" updated successfully!`
      );
      router.push('/products');
    } catch (err: any) {
      console.error('Failed to update product:', err);
      setErrorMessage(err.message || 'An error occurred while updating the product.');
      toast.error('Failed to update product.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-slate-800 animate-spin" />
          <p className="text-xs font-bold text-slate-600 font-mono">Loading garment details & variants...</p>
        </div>
      </AppLayout>
    );
  }

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
                Edit Product: {formData.product_code || 'Garment'}
              </h1>
              <p className="text-xs text-slate-500">
                Update garment details, picture, and Color × Size inventory matrix.
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

        {/* Form Layout */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Image Upload Component */}
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

          {/* Product Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Garment Product Name *
              </label>
              <input
                type="text"
                required
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
                Product Code / SKU *
              </label>
              <input
                type="text"
                required
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

          {/* Cost Price & Wholesale Selling Price Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Cost Price (Unit Cost) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
                  Cost Price / Piece (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 500"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none transition ${
                    fieldErrors.unit_cost
                      ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Supplier purchase cost per individual piece.
                </p>
              </div>

              {/* Wholesale Selling Price */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
                  Wholesale Selling Price / Piece (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 700"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  className={`w-full p-3 rounded-xl border text-xs font-mono font-bold focus:outline-none transition ${
                    fieldErrors.selling_price
                      ? 'border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Default wholesale selling price per piece for customer orders.
                </p>
              </div>
            </div>

            {/* Live Financial & Stock Summary Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Stock Quantity</span>
                <span className="text-sm font-extrabold text-slate-900">{totalVariantStock} Pcs Total</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Stock Valuation</span>
                <span className="text-sm font-extrabold text-slate-900">
                  Rs. {previewLotValuation.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">({costPrice} × {totalVariantStock} pcs)</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Expected Profit / Pc</span>
                <span className={`text-sm font-extrabold ${expectedProfitPerPc >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Rs. {expectedProfitPerPc.toLocaleString()} / pc
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({sellingPrice} - {costPrice})
                </span>
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
                  <span>Updating Garment Matrix...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Garment & Variants</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
