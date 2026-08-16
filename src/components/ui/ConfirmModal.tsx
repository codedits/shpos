'use client';

import React, { useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  CheckCircle2,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export interface ActionImpact {
  label: string;
  description: string;
  badge?: string;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  actionDetails?: string | string[] | ActionImpact[];
  warningNote?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  actionDetails,
  warningNote,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-50 border border-rose-200 text-rose-600 ring-4 ring-rose-500/10',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          badgeText: 'CRITICAL ACTION',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          panelBg: 'bg-rose-50/50 border-rose-200/80',
          icon: <Trash2 className="w-6 h-6 stroke-[2.2]" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 border border-amber-200 text-amber-600 ring-4 ring-amber-500/10',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          badgeText: 'CONFIRMATION REQUIRED',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          panelBg: 'bg-amber-50/50 border-amber-200/80',
          icon: <AlertTriangle className="w-6 h-6 stroke-[2.2]" />,
        };
      default:
        return {
          iconBg: 'bg-blue-50 border border-blue-200 text-blue-600 ring-4 ring-blue-500/10',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          badgeText: 'ACTION REVIEW',
          confirmBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20',
          panelBg: 'bg-slate-50 border-slate-200',
          icon: <ShieldAlert className="w-6 h-6 stroke-[2.2]" />,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      {/* Backdrop Dismiss Target */}
      <div
        className="fixed inset-0"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />

      {/* Modal Dialog Card (Living precisely in the center of the screen) */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in z-10 font-sans">
        {/* Header with Icon, Badge & Close Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${vStyles.iconBg}`}>
              {vStyles.icon}
            </div>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${vStyles.badgeBg}`}>
                {vStyles.badgeText}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Primary Message Description */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {message}
        </p>

        {/* Clear Action Impact Box (What action will do what) */}
        {actionDetails && (
          <div className={`p-4 rounded-2xl border ${vStyles.panelBg} space-y-2 text-xs`}>
            <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wider">
              <AlertCircle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>What will happen:</span>
            </div>

            {Array.isArray(actionDetails) ? (
              <ul className="space-y-1.5 pl-1 text-slate-700">
                {actionDetails.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    {typeof item === 'string' ? (
                      <span className="leading-snug">{item}</span>
                    ) : (
                      <div className="flex-1">
                        <span className="font-bold text-slate-900">{item.label}: </span>
                        <span className="text-slate-600">{item.description}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-700 leading-relaxed pl-1">{actionDetails}</p>
            )}
          </div>
        )}

        {/* Warning / Irreversibility Notice */}
        {warningNote ? (
          <div className="flex items-center space-x-2 text-[11px] font-mono font-semibold text-rose-700 bg-rose-50/70 border border-rose-200 px-3 py-2 rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{warningNote}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 px-1">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold">Esc</kbd> to cancel safely.</span>
          </div>
        )}

        {/* Action Button Controls */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-press px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`btn-press px-6 py-2.5 rounded-2xl font-extrabold text-xs shadow-md transition flex items-center space-x-2 ${vStyles.confirmBtn} ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
