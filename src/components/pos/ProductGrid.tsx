'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ScanBarcode, Grid, ShoppingBag, Utensils, Cake, Pizza, Coffee } from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { ProductCard } from './ProductCard';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Grid,
  ShoppingBag,
  Utensils,
  Cake,
  Pizza,
  Coffee,
};

export const ProductGrid: React.FC = () => {
  const { products, categories } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('cat-all');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl + K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== searchInputRef.current)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCat =
        selectedCatId === 'cat-all' || prod.categoryId === selectedCatId;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.barcode.includes(query) ||
        prod.sku.toLowerCase().includes(query) ||
        (prod.description && prod.description.toLowerCase().includes(query));

      let matchesStock = true;
      if (stockFilter === 'instock') matchesStock = prod.stock > 0;
      if (stockFilter === 'lowstock') matchesStock = prod.stock > 0 && prod.stock <= 10;

      return matchesCat && matchesSearch && matchesStock;
    });
  }, [products, selectedCatId, searchQuery, stockFilter]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-4 bg-white text-zinc-950">
      {/* Top Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar with Ctrl+K shortcut */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search suit name, SKU, barcode (Press Ctrl+K or /)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-2 bg-white border border-zinc-300 text-xs font-mono focus:border-black focus:outline-none"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-zinc-400 hover:text-black transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="hidden md:inline-flex items-center space-x-1 px-1.5 py-0.2 border border-zinc-300 bg-zinc-100 text-[9px] font-mono font-bold text-zinc-600">
              <span>CTRL+K</span>
            </span>
          </div>
        </div>

        {/* Stock Level Quick Filters */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-2.5 py-1.5 border text-[10px] font-bold uppercase transition ${
              stockFilter === 'all'
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-700 border-zinc-300 hover:border-black'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setStockFilter('instock')}
            className={`px-2.5 py-1.5 border text-[10px] font-bold uppercase transition ${
              stockFilter === 'instock'
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-700 border-zinc-300 hover:border-black'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setStockFilter('lowstock')}
            className={`px-2.5 py-1.5 border text-[10px] font-bold uppercase transition ${
              stockFilter === 'lowstock'
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-700 border-zinc-300 hover:border-black'
            }`}
          >
            Low Stock
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const IconComponent = (cat.iconName && CATEGORY_ICONS[cat.iconName]) || Grid;
          const isActive = selectedCatId === cat.id;
          const itemCount =
            cat.id === 'cat-all'
              ? products.length
              : products.filter((p) => p.categoryId === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 border font-bold text-xs uppercase tracking-wide whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-black hover:text-black'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                  isActive ? 'bg-white text-black' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}
              >
                {itemCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 text-center p-8 bg-zinc-50 space-y-2">
            <ScanBarcode className="w-8 h-8 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase text-zinc-800">No matching clothing items</h3>
            <p className="text-[11px] text-zinc-500 max-w-sm">
              We couldn&apos;t find any item matching your query. Add your own products using the Inventory tab.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wide transition hover:bg-zinc-800"
              >
                Reset Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
