'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { useToast } from '@/context/ToastContext';
import { Truck, ArrowLeft, Save } from 'lucide-react';

export default function NewSupplierPage() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Validation Error', 'Supplier name is required.'); return; }

    try {
      setSaving(true);
      await wholesaleService.createSupplier({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success('Supplier Created', `"${form.name}" has been added to the directory.`);
      router.push('/suppliers');
    } catch (err: any) {
      toast.error('Failed to Create Supplier', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center space-x-3.5">
          <Link href="/suppliers" className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-2xl bg-indigo-900 flex items-center justify-center text-white">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">Add New Supplier</h1>
            <p className="text-xs text-slate-500 mt-0.5">Register a new factory, distributor, or vendor.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Factory ABC, Distributor XYZ"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g., 0300-1234567"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g., Faisalabad, Punjab"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional details about this supplier..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-900 resize-none"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className={`btn-press px-6 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-2xl text-xs font-extrabold flex items-center space-x-2 shadow-sm transition ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
