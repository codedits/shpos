'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Settings,
  Store,
  Receipt,
  User,
  RotateCcw,
  Save,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { wholesaleService } from '@/services/wholesaleService';
import { BusinessSettings } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const INITIAL_FORM_STATE: BusinessSettings = {
  business_name: 'BURAQ COLLECTION',
  phone: '+92 300 1234567',
  email: 'sales@buraqcollection.pk',
  address: 'Azam Cloth Market, Circular Road, Lahore, Pakistan',
  tax_rate_percent: 0,
  currency_symbol: 'Rs.',
  cashier_name: 'Tariq Mahmood',
};

export default function SettingsPage() {
  const toast = useToast();

  const [formSettings, setFormSettings] = useState<BusinessSettings>(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Modal State
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Load real business settings from database/cache
  const loadSettings = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await wholesaleService.getSettings(forceRefresh);
      if (data) {
        setFormSettings({
          business_name: data.business_name || INITIAL_FORM_STATE.business_name,
          phone: data.phone || INITIAL_FORM_STATE.phone,
          email: data.email || INITIAL_FORM_STATE.email,
          address: data.address || INITIAL_FORM_STATE.address,
          tax_rate_percent:
            data.tax_rate_percent !== undefined && data.tax_rate_percent !== null
              ? data.tax_rate_percent
              : 0,
          currency_symbol: data.currency_symbol || 'Rs.',
          cashier_name: data.cashier_name || INITIAL_FORM_STATE.cashier_name,
        });
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load settings', err?.message || 'Could not fetch configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSettings.business_name.trim()) {
      toast.warning('Business Name Required', 'Please enter a valid wholesale business name.');
      return;
    }

    try {
      setSaving(true);
      const saved = await wholesaleService.updateSettings({
        business_name: formSettings.business_name.trim(),
        phone: formSettings.phone.trim(),
        email: formSettings.email?.trim() || null,
        address: formSettings.address.trim(),
        tax_rate_percent: Number(formSettings.tax_rate_percent) || 0,
        currency_symbol: formSettings.currency_symbol.trim() || 'Rs.',
        cashier_name: formSettings.cashier_name?.trim() || 'Tariq Mahmood',
      });

      setFormSettings(saved);
      toast.success(
        'Settings Saved Successfully',
        'Business profile, receipt headers, and currency configuration are now updated live.'
      );
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to Save Settings', err?.message || 'Database error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmClear = async () => {
    try {
      setClearing(true);
      setClearModalOpen(false);
      await wholesaleService.clearAllData();
      toast.info('Database Emptied', 'All sample products, customers, and past orders have been cleared.');
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err: any) {
      console.error('Error clearing data:', err);
      toast.error('Failed to Clear Data', err?.message || 'Database error.');
    } finally {
      setClearing(false);
    }
  };

  const handleConfirmReset = async () => {
    try {
      setResetModalOpen(false);
      await wholesaleService.updateSettings(INITIAL_FORM_STATE);
      setFormSettings(INITIAL_FORM_STATE);
      toast.success('Default Configuration Restored', 'Standard store parameters restored.');
    } catch (err: any) {
      toast.error('Reset Failed', err?.message || 'Could not reset settings.');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 font-heading">
                System & Business Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure wholesale store profile, phone numbers, currency symbol, and receipt headers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadSettings(true)}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition self-start sm:self-auto shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Config</span>
          </button>
        </div>

        {/* Data Maintenance Utility Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-heading">
              Start Fresh (Empty Database)
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Wipe all demo clothing products, sample customers, and past orders to start entering real business data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            disabled={clearing}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-bold text-xs flex items-center space-x-1.5 shrink-0 transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>{clearing ? 'Clearing Data...' : 'Clear Sample Data'}</span>
          </button>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-slate-700 mb-3" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Loading Store Configuration...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 w-full">
            {/* 2-Column Grid for Settings Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Store Info Panel */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                  <Store className="w-4.5 h-4.5 text-slate-800" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-heading">
                    Business & Store Profile
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Wholesale Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.business_name}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, business_name: e.target.value })
                      }
                      placeholder="e.g. BURAQ COLLECTION"
                      className="w-full p-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formSettings.phone}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, phone: e.target.value })
                        }
                        placeholder="e.g. +92 300 1234567"
                        className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={formSettings.email || ''}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, email: e.target.value })
                        }
                        placeholder="e.g. sales@buraqcollection.pk"
                        className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Market Location / Address *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={formSettings.address}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, address: e.target.value })
                      }
                      placeholder="e.g. Azam Cloth Market, Circular Road, Lahore, Pakistan"
                      className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Currency & Cashier Session */}
              <div className="space-y-6">
                {/* Tax & Currency */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
                  <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                    <Receipt className="w-4.5 h-4.5 text-slate-800" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-heading">
                      Tax & Currency Configuration
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Default Sales Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formSettings.tax_rate_percent ?? 0}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            tax_rate_percent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Currency Symbol (e.g. Rs., $, €) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formSettings.currency_symbol}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, currency_symbol: e.target.value })
                        }
                        placeholder="Rs."
                        className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Cashier Session */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                    <User className="w-4.5 h-4.5 text-slate-800" />
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-heading">
                      Active Cashier Session
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Active Cashier / Manager Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.cashier_name || ''}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, cashier_name: e.target.value })
                      }
                      placeholder="e.g. Tariq Mahmood"
                      className="w-full p-3 rounded-lg border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase flex items-center justify-center space-x-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Demo Seed Data</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md ${
                  saving ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Settings to Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>Save System Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={clearModalOpen}
        title="Wipe All Sample Data?"
        message="This will delete all sample products, customers, and past orders, giving you a clean slate to begin entering your live inventory. This cannot be undone."
        confirmText="Yes, Wipe Sample Data"
        cancelText="Keep Data"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearModalOpen(false)}
      />

      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset to Factory Demo Data?"
        message="This will restore all default clothing sample catalog items, clients, and custom settings back to factory seed data."
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
      />
    </AppLayout>
  );
}
