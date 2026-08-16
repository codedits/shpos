'use client';

import React, { useState, useMemo } from 'react';
import { Navbar } from '@/components/navigation/Navbar';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ScanBarcode,
} from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { Product } from '@/types/pos';

export default function InventoryPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct, settings } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    costPrice: '',
    categoryId: 'cat-unstitched',
    barcode: '',
    stock: '',
    unit: 'Bale (10 Suits)',
    sku: '',
    image: '',
    description: '',
    isTaxable: true,
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      costPrice: '',
      categoryId: categories[1]?.id || 'cat-unstitched',
      barcode: `890200${Math.floor(100000 + Math.random() * 900000)}`,
      stock: '50',
      unit: 'Bale (10 Suits)',
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      image: '',
      description: '',
      isTaxable: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      costPrice: product.costPrice ? product.costPrice.toString() : '',
      categoryId: product.categoryId,
      barcode: product.barcode,
      stock: product.stock.toString(),
      unit: product.unit || 'Pcs',
      sku: product.sku,
      image: product.image || '',
      description: product.description || '',
      isTaxable: product.isTaxable !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const productPayload = {
      name: formData.name.trim(),
      price: parseFloat(formData.price) || 0,
      costPrice: parseFloat(formData.costPrice) || 0,
      categoryId: formData.categoryId,
      barcode: formData.barcode.trim(),
      stock: parseInt(formData.stock, 10) || 0,
      unit: formData.unit.trim(),
      sku: formData.sku.trim(),
      image: formData.image.trim(),
      description: formData.description.trim(),
      isTaxable: formData.isTaxable,
    };

    if (editingProduct) {
      updateProduct({ ...productPayload, id: editingProduct.id });
    } else {
      addProduct(productPayload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-zinc-950">
      <Navbar />

      <main className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-black" />
              <h1 className="text-lg font-extrabold uppercase tracking-wide text-zinc-950">Clothing Wholesale Inventory</h1>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage garment collections, wholesale prices per bale/set, barcodes, and stock levels.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wide border border-black flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Wholesale Suit/Fabric</span>
          </button>
        </div>

        {/* Toolbar: Search & Category filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search fabric by suit name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 bg-white text-xs font-mono focus:border-black focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-3 py-2 border border-zinc-300 bg-white text-xs font-bold uppercase text-zinc-800 focus:border-black"
            >
              <option value="all">All Collections ({products.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="flex-1 overflow-y-auto border border-zinc-300 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                <th className="p-3.5">Suit / Fabric Collection</th>
                <th className="p-3.5">SKU / Barcode</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Wholesale Rate</th>
                <th className="p-3.5">Stock Available</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= 10;
                  const unitLabel = p.unit || 'Pcs';

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 transition">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-9 h-9 border border-zinc-200 object-cover bg-zinc-100 grayscale"
                            />
                          ) : (
                            <div className="w-9 h-9 border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 font-mono text-[9px] font-bold">
                              NO IMG
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-zinc-900">{p.name}</p>
                            <p className="text-[11px] text-zinc-500 line-clamp-1">
                              {p.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <p className="font-bold text-zinc-900">{p.sku}</p>
                        <p className="text-[10px] text-zinc-500 flex items-center space-x-1">
                          <ScanBarcode className="w-3 h-3 text-zinc-400" />
                          <span>{p.barcode}</span>
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 border border-zinc-300 bg-zinc-50 text-zinc-800 text-[10px] font-bold uppercase">
                          {cat?.name || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-black">
                        {settings.currencySymbol}
                        {p.price.toFixed(2)} / {unitLabel}
                      </td>
                      <td className="p-3.5">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 border border-zinc-300 bg-white text-zinc-400 text-[10px] font-bold uppercase line-through">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Out of Stock (0)</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase">
                            <AlertTriangle className="w-3 h-3 text-white" />
                            <span>Low Stock ({p.stock} {unitLabel})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 border border-zinc-300 bg-zinc-100 text-zinc-900 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3 text-zinc-700" />
                            <span>In Stock ({p.stock} {unitLabel})</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 border border-zinc-300 bg-white hover:border-black text-zinc-800 transition"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 border border-zinc-300 bg-white hover:bg-black hover:text-white hover:border-black text-zinc-800 transition"
                            title="Delete Item"
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
                  <td colSpan={6} className="p-10 text-center text-zinc-500 font-mono text-xs uppercase">
                    No garments matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Product Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-none z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl border border-black shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-zinc-950">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <h3 className="font-extrabold uppercase text-sm">
                  {editingProduct ? 'Edit Wholesale Item' : 'Add Wholesale Clothing Product'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 border border-zinc-300 text-zinc-500 hover:text-black hover:border-black"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Suit / Fabric Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Designer Lawn 3-Pc"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full p-2 border border-zinc-300 bg-white text-xs font-bold uppercase focus:border-black"
                    >
                      {categories
                        .filter((c) => c.id !== 'cat-all')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Wholesale Price ({settings.currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Cost Rate ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Stock Qty *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Measurement Unit
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bale (10 Suits), Set (6 Pcs)"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                      Barcode Number
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full p-2 border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                    Fabric Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full p-2 border border-zinc-300 text-xs focus:border-black focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 mb-1">
                    Fabric Details / Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 border border-zinc-300 text-xs focus:border-black focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-zinc-300 text-xs font-bold uppercase hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase border border-black"
                  >
                    {editingProduct ? 'Save Suit' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
