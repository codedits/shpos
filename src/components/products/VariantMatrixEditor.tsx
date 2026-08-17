'use client';

import React, { useState } from 'react';
import { FIXED_SIZES, FixedSize, VariantMatrixRow } from '@/types/wholesale';
import { Plus, Trash2, Layers, AlertCircle, Copy, Sparkles } from 'lucide-react';

interface VariantMatrixEditorProps {
  matrix: VariantMatrixRow[];
  onChange: (newMatrix: VariantMatrixRow[]) => void;
  disabled?: boolean;
}

export const VariantMatrixEditor: React.FC<VariantMatrixEditorProps> = ({
  matrix,
  onChange,
  disabled = false,
}) => {
  const [newColorInput, setNewColorInput] = useState('');
  const [showAddColor, setShowAddColor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddColor = () => {
    const trimmed = newColorInput.trim();
    if (!trimmed) {
      setError('Please enter a color name (e.g. Black, White, Maroon).');
      return;
    }

    // Check case-insensitive duplicate
    const exists = matrix.some((m) => m.color.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError(`Color "${trimmed}" already exists in the matrix.`);
      return;
    }

    const defaultSizes: Record<FixedSize, number> = {
      Small: 0,
      Medium: 0,
      Large: 0,
      Standard: 0,
      XL: 0,
    };

    const newMatrix = [...matrix, { color: trimmed, sizes: defaultSizes }];
    onChange(newMatrix);
    setNewColorInput('');
    setShowAddColor(true); // Keep color input open for fast consecutive entries
    setError(null);

    // Focus newly created row's first input (Small size) after DOM render
    setTimeout(() => {
      const nextRowFirstInput = document.querySelector(
        `input[data-vm-row="${newMatrix.length - 1}"][data-vm-col="0"]`
      ) as HTMLInputElement;
      if (nextRowFirstInput) {
        nextRowFirstInput.focus();
        nextRowFirstInput.select?.();
      }
    }, 50);
  };

  const handleKeyDownMatrixCell = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    const totalRows = matrix.length;
    const totalCols = FIXED_SIZES.length;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const targetCol = Math.min(totalCols - 1, colIdx + 1);
      const targetEl = document.querySelector(
        `input[data-vm-row="${rowIdx}"][data-vm-col="${targetCol}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const targetCol = Math.max(0, colIdx - 1);
      const targetEl = document.querySelector(
        `input[data-vm-row="${rowIdx}"][data-vm-col="${targetCol}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const targetRow = Math.min(totalRows - 1, rowIdx + 1);
      const targetEl = document.querySelector(
        `input[data-vm-row="${targetRow}"][data-vm-col="${colIdx}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const targetRow = Math.max(0, rowIdx - 1);
      const targetEl = document.querySelector(
        `input[data-vm-row="${targetRow}"][data-vm-col="${colIdx}"]`
      ) as HTMLInputElement;
      if (targetEl) {
        targetEl.focus();
        targetEl.select?.();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIdx < totalRows - 1) {
        // Focus next row's same size input
        const nextEl = document.querySelector(
          `input[data-vm-row="${rowIdx + 1}"][data-vm-col="${colIdx}"]`
        ) as HTMLInputElement;
        if (nextEl) {
          nextEl.focus();
          nextEl.select?.();
        }
      } else {
        // If on last row, open/focus Add Color input
        setShowAddColor(true);
        setTimeout(() => {
          const colorInput = document.querySelector('input[data-add-color-input="true"]') as HTMLInputElement;
          if (colorInput) {
            colorInput.focus();
          }
        }, 50);
      }
    }
  };

  const handleRemoveColor = (index: number) => {
    const updated = matrix.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleQuantityChange = (colorIdx: number, size: FixedSize, valStr: string) => {
    const qty = parseInt(valStr, 10);
    const safeQty = isNaN(qty) || qty < 0 ? 0 : qty;

    const updated = matrix.map((row, idx) => {
      if (idx !== colorIdx) return row;
      return {
        ...row,
        sizes: {
          ...row.sizes,
          [size]: safeQty,
        },
      };
    });

    onChange(updated);
  };

  const getRowTotal = (row: VariantMatrixRow) => {
    return Object.values(row.sizes).reduce((sum, q) => sum + (q || 0), 0);
  };

  const grandTotalPieces = matrix.reduce((sum, row) => sum + getRowTotal(row), 0);

  return (
    <div className="space-y-4 font-sans">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold font-heading tracking-tight">
              Color × Size Inventory Matrix
            </h4>
            <p className="text-[11px] text-slate-400">
              Use ↑ ↓ ← → arrow keys to navigate matrix. Press Enter on Color field to add continuously.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-right">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Colors</span>
            <span className="text-sm font-bold font-mono">{matrix.length}</span>
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Pieces</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              {grandTotalPieces.toLocaleString()} pcs
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Matrix Table */}
      {matrix.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 font-mono uppercase tracking-wider">
                <th className="p-3.5 pl-4 w-36 sm:w-44">Color</th>
                {FIXED_SIZES.map((size) => (
                  <th key={size} className="p-3.5 text-center min-w-[70px] sm:min-w-[85px]">
                    {size}
                  </th>
                ))}
                <th className="p-3.5 text-center font-mono w-24">Row Total</th>
                <th className="p-3.5 text-right pr-4 w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {matrix.map((row, rowIdx) => {
                const rowTotal = getRowTotal(row);
                return (
                  <tr key={rowIdx} className="hover:bg-slate-50/60 transition">
                    {/* Color Name */}
                    <td className="p-3 pl-4 font-sans">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs">{row.color}</span>
                      </div>
                    </td>

                    {/* 5 Fixed Size Input Cells with 2D Keyboard Navigation */}
                    {FIXED_SIZES.map((size, colIdx) => {
                      const qty = row.sizes[size] ?? 0;
                      return (
                        <td key={size} className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            disabled={disabled}
                            data-vm-row={rowIdx}
                            data-vm-col={colIdx}
                            value={qty === 0 ? '' : qty}
                            placeholder="0"
                            onChange={(e) => handleQuantityChange(rowIdx, size, e.target.value)}
                            onKeyDown={(e) => handleKeyDownMatrixCell(e, rowIdx, colIdx)}
                            className={`w-14 sm:w-16 p-1.5 text-center text-xs font-mono font-bold rounded-lg border focus:outline-none transition ${
                              qty > 0
                                ? 'border-slate-900 bg-slate-50 text-slate-900 focus:ring-1 focus:ring-slate-900'
                                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 focus:border-slate-900'
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* Row Total */}
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${rowTotal > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-400'}`}>
                        {rowTotal} pcs
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(rowIdx)}
                        disabled={disabled}
                        className="btn-press p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                        title={`Remove color ${row.color}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">No Colors Added Yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add garment colors (e.g. Black, White, Maroon) to populate the 5-size inventory matrix.
            </p>
          </div>
        </div>
      )}

      {/* Add Color Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {showAddColor ? (
          <div className="flex items-center space-x-2 bg-white border border-slate-300 p-1.5 rounded-xl shadow-xs animate-scale-in">
            <input
              type="text"
              autoFocus
              data-add-color-input="true"
              placeholder="Enter color name (e.g. Maroon, Off-White)..."
              value={newColorInput}
              onChange={(e) => setNewColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddColor();
                } else if (e.key === 'Escape') {
                  setShowAddColor(false);
                  setNewColorInput('');
                }
              }}
              className="px-3 py-1 text-xs text-slate-900 font-bold focus:outline-none w-56 sm:w-64"
            />
            <button
              type="button"
              onClick={handleAddColor}
              className="btn-press px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
            >
              Add Color
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddColor(false);
                setNewColorInput('');
                setError(null);
              }}
              className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddColor(true)}
            disabled={disabled}
            className="btn-press px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-slate-900" />
            <span>+ Add Color to Matrix</span>
          </button>
        )}
      </div>
    </div>
  );
};
