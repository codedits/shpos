'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { Product } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'instock' | 'lowstock' | 'outofstock'>('all');

  // Deletion state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getProducts(forceRefresh);
      setProducts(data);
    } catch (err: any) {
      toast.error('Failed to load products', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.product_code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.size && p.size.toLowerCase().includes(q)) ||
        (p.color && p.color.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (statusFilter === 'instock') return p.stock_quantity > 10;
      if (statusFilter === 'lowstock') return p.stock_quantity > 0 && p.stock_quantity <= 10;
      if (statusFilter === 'outofstock') return p.stock_quantity <= 0;
      return true;
    });
  }, [products, searchQuery, statusFilter]);

  const totalStockCount = useMemo(
    () => products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0),
    [products]
  );
  const totalLotCostSum = useMemo(
    () => products.reduce((sum, p) => sum + (p.lot_cost || 0), 0),
    [products]
  );

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      await wholesaleService.deleteProduct(productToDelete.id);
      toast.success(
        'Product Archived/Deleted',
        `${productToDelete.name} (${productToDelete.product_code}) was removed.`
      );
      setProductToDelete(null);
      loadProducts(true);
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Page Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <Package className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                Garment Inventory & Products
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage product codes, sizes, colors, available quantities, and lot purchase costs.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={() => loadProducts(true)}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Products"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/products/new"
              className="btn-press px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs hover:shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-cards">
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-indigo p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Products</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{products.length} Items</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-emerald p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Stock Count</p>
            <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">{totalStockCount.toLocaleString()} Pcs</h3>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 accent-card accent-card-blue p-5 shadow-xs">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stock Valuation (Lot Cost)</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
              Rs. {totalLotCostSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Toolbar: Search + Stock Status Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code (e.g. TS-001), name, size, or color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { label: 'All Items', value: 'all' },
              { label: 'In Stock', value: 'instock' },
              { label: 'Low Stock', value: 'lowstock' },
              { label: 'Out of Stock', value: 'outofstock' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table (Desktop) & Cards (Mobile) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                  <th className="p-4 w-12 text-center">Image</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4 text-center">Size</th>
                  <th className="p-4 text-center">Color</th>
                  <th className="p-4 text-center">Stock Status</th>
                  <th className="p-4">Total Lot Cost</th>
                  <th className="p-4">Unit Cost</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400 uppercase">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isOutOfStock = p.stock_quantity <= 0;
                    const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= 10;

                    return (
                      <tr key={p.id} className={`table-row-hover transition ${filteredProducts.indexOf(p) % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                        {/* Image Thumbnail */}
                        <td className="p-3 text-center">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 mx-auto">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {p.product_code}
                          </span>
                        </td>
                        <td className="p-4 font-sans font-bold text-slate-900">{p.name}</td>
                        <td className="p-4 text-center text-slate-700">{p.size || '—'}</td>
                        <td className="p-4 text-center text-slate-700">{p.color || '—'}</td>
                        <td className="p-4 text-center">
                          {isOutOfStock ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold uppercase inline-flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Out of Stock</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase inline-flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Low: {p.stock_quantity} Pcs</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{p.stock_quantity} Pcs</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          Rs. {p.lot_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-slate-600">
                          Rs. {p.unit_cost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-4 text-right font-sans">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/products/${p.id}/edit`}
                              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 transition btn-press"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 rounded-md border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 transition btn-press"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400 uppercase">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredProducts.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {p.product_code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{p.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Size: {p.size || '—'} • Color: {p.color || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="p-1.5 rounded border border-slate-200 text-slate-700 btn-press"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setProductToDelete(p)}
                      className="p-1.5 rounded border border-slate-200 text-rose-600 btn-press"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock Count</span>
                    <span className="font-bold text-slate-900">{p.stock_quantity} pcs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Lot Cost</span>
                    <span className="font-bold text-slate-900">Rs. {p.lot_cost.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cost / Pc</span>
                    <span className="font-bold text-emerald-700">Rs. {p.unit_cost?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Product Deletion */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title="Delete / Archive Product?"
        message={`Are you sure you want to remove ${productToDelete?.product_code} (${productToDelete?.name})? If the product has previous sales orders, it will be safely archived to preserve invoice history.`}
        confirmText="Yes, Delete Product"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
    </AppLayout>
  );
}
