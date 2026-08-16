'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Product } from '@/types/pos';
import { usePOS } from '@/context/POSContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, settings } = usePOS();
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const unitLabel = product.unit || 'Pcs';

  return (
    <div
      onClick={() => !isOutOfStock && addToCart(product, 1)}
      className={`group relative bg-white border border-zinc-200 p-3 flex flex-col justify-between select-none transition-all duration-150 ${
        isOutOfStock
          ? 'opacity-50 bg-zinc-50 border-zinc-200 cursor-not-allowed'
          : 'hover:border-black hover:shadow-md cursor-pointer'
      }`}
    >
      {/* Top Media & Badges */}
      <div className="relative w-full h-36 border border-zinc-200 overflow-hidden mb-2.5 bg-zinc-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-mono font-bold">
            {product.sku}
          </div>
        )}

        {/* Price Tag Overlay */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-white font-mono font-bold text-xs shadow-sm">
          {settings.currencySymbol}
          {product.price.toFixed(2)} / {unitLabel}
        </div>

        {/* Stock Badge Overlay */}
        <div className="absolute bottom-2 left-2">
          {isOutOfStock ? (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white text-zinc-950 border border-zinc-300 text-[9px] font-bold uppercase">
              <AlertTriangle className="w-2.5 h-2.5 text-zinc-600" />
              <span>Out of Stock</span>
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-black text-white text-[9px] font-bold uppercase">
              <AlertTriangle className="w-2.5 h-2.5 text-white" />
              <span>Low ({product.stock} {unitLabel})</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-zinc-100 text-zinc-900 border border-zinc-300 text-[9px] font-semibold uppercase">
              <CheckCircle2 className="w-2.5 h-2.5 text-zinc-700" />
              <span>{product.stock} {unitLabel}</span>
            </span>
          )}
        </div>
      </div>

      {/* Info & Title */}
      <div>
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
          {product.sku} • {unitLabel}
        </span>
        <h3 className="font-bold text-zinc-900 text-xs line-clamp-1 group-hover:text-black transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
            {product.description}
          </p>
        )}
      </div>

      {/* Action Footer: Bulk Quantity Add Buttons */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono text-zinc-400">
          BAR: {product.barcode.slice(-4)}
        </span>

        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={isOutOfStock}
            onClick={() => !isOutOfStock && addToCart(product, 1)}
            className="px-1.5 py-0.5 border border-zinc-300 bg-white hover:bg-black hover:text-white disabled:opacity-40 text-[10px] font-bold font-mono transition"
            title="Add 1 unit"
          >
            +1
          </button>
          <button
            disabled={isOutOfStock}
            onClick={() => !isOutOfStock && addToCart(product, 5)}
            className="px-1.5 py-0.5 border border-zinc-300 bg-white hover:bg-black hover:text-white disabled:opacity-40 text-[10px] font-bold font-mono transition"
            title="Add 5 units bulk"
          >
            +5
          </button>
          <button
            disabled={isOutOfStock}
            onClick={() => !isOutOfStock && addToCart(product, 10)}
            className="px-1.5 py-0.5 border border-black bg-black text-white hover:bg-zinc-800 disabled:opacity-40 text-[10px] font-bold font-mono transition"
            title="Add 10 units bulk"
          >
            +10
          </button>
        </div>
      </div>
    </div>
  );
};
