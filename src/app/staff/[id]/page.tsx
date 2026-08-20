'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { StaffMember, StaffSalaryPayment, PaymentMethod, StaffTransactionType } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDatePKT } from '@/lib/dateUtils';
import {
  Users,
  ArrowLeft,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  Receipt,
  UserCheck,
  CreditCard,
  Printer,
  Plus,
  ShieldCheck,
  Eye,
  X,
  Camera,
  Coins,
  TrendingDown,
  FileText,
  AlertCircle,
} from 'lucide-react';

const COMMON_ROLES = [
  'Salesman',
  'Counter Cashier',
  'Packer / Helper',
  'Store Manager',
  'Master / Tailor',
  'Cutting Master',
  'Accountant',
];

const DOC_PRESETS = [
  'CNIC Front',
  'CNIC Back',
  'Employee Photo',
  'Police / Agreement Document',
];

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const staffId = params?.id as string;

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [payments, setPayments] = useState<StaffSalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Current Month String
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Modals state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form states for Salary Payment
  const [payForm, setPayForm] = useState({
    salary_month: currentMonthStr,
    amount_paid: '',
    payment_method: 'Cash' as PaymentMethod,
    payment_date: '',
    deduct_advances: true,
    notes: '',
  });

  // Form states for Advance Payment
  const [advanceForm, setAdvanceForm] = useState({
    salary_month: currentMonthStr,
    amount: '',
    payment_method: 'Cash' as PaymentMethod,
    payment_date: '',
    notes: '',
  });

  // Form states for Edit Staff
  const [staffForm, setStaffForm] = useState<{
    name: string;
    phone: string;
    role: string;
    monthly_salary: string;
    joining_date: string;
    is_active: boolean;
    photo_url: string | null;
    documents: string[];
  }>({
    name: '',
    phone: '',
    role: 'Salesman',
    monthly_salary: '',
    joining_date: '',
    is_active: true,
    photo_url: null,
    documents: [],
  });

  const loadData = async (force = false) => {
    try {
      setLoading(true);
      const [staffData, allPays] = await Promise.all([
        wholesaleService.getStaffMemberById(staffId),
        wholesaleService.getSalaryPayments(force),
      ]);

      if (!staffData) {
        toast.error('Staff Not Found', 'Employee account does not exist.');
        router.push('/staff');
        return;
      }

      setStaff(staffData);
      setPayments(allPays.filter((p) => p.staff_id === staffId));
    } catch (err: any) {
      toast.error('Failed to load staff records', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) loadData();
  }, [staffId]);

  const formatMonthLabel = (monthKey: string) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Monthly stats for staff member
  const currentMonthTransactions = useMemo(() => {
    return payments.filter((p) => p.salary_month === selectedMonth);
  }, [payments, selectedMonth]);

  const currentMonthAdvances = useMemo(() => {
    return currentMonthTransactions
      .filter((p) => p.transaction_type === 'ADVANCE')
      .reduce((sum, p) => sum + p.amount_paid, 0);
  }, [currentMonthTransactions]);

  const currentMonthSalaryPaid = useMemo(() => {
    return currentMonthTransactions
      .filter((p) => (p.transaction_type || 'SALARY') !== 'ADVANCE')
      .reduce((sum, p) => sum + p.amount_paid, 0);
  }, [currentMonthTransactions]);

  const totalLifetimePaid = useMemo(() => {
    return payments
      .filter((p) => (p.transaction_type || 'SALARY') !== 'ADVANCE')
      .reduce((sum, p) => sum + p.amount_paid, 0);
  }, [payments]);

  const totalLifetimeAdvances = useMemo(() => {
    return payments
      .filter((p) => p.transaction_type === 'ADVANCE')
      .reduce((sum, p) => sum + p.amount_paid, 0);
  }, [payments]);

  // Open Salary Payment Modal
  const handleOpenPayModal = () => {
    if (!staff) return;
    const baseSalary = staff.monthly_salary || 0;
    const advances = currentMonthAdvances;
    const netDue = Math.max(0, baseSalary - advances - currentMonthSalaryPaid);

    setPayForm({
      salary_month: selectedMonth,
      amount_paid: netDue.toString(),
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      deduct_advances: true,
      notes: `Salary payment for ${formatMonthLabel(selectedMonth)}`,
    });
    setPayModalOpen(true);
  };

  // Submit Salary Payment
  const handleSubmitPaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    const amount = parseFloat(payForm.amount_paid) || 0;
    if (amount <= 0) {
      toast.warning('Payment Amount Required', 'Please enter a valid salary amount.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.recordSalaryPayment({
        staff_id: staff.id,
        salary_month: payForm.salary_month,
        amount_paid: amount,
        payment_method: payForm.payment_method,
        transaction_type: 'SALARY',
        payment_date: payForm.payment_date ? new Date(payForm.payment_date).toISOString() : undefined,
        notes: payForm.notes.trim() || undefined,
      });

      toast.success(
        'Salary Disbursed',
        `Rs. ${amount.toLocaleString()} paid to ${staff.name} for ${formatMonthLabel(payForm.salary_month)}.`
      );
      setPayModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Payment Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Advance Modal
  const handleOpenAdvanceModal = () => {
    setAdvanceForm({
      salary_month: selectedMonth,
      amount: '',
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Advance Kharcha for ${formatMonthLabel(selectedMonth)}`,
    });
    setAdvanceModalOpen(true);
  };

  // Submit Advance Payment
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    const amount = parseFloat(advanceForm.amount) || 0;
    if (amount <= 0) {
      toast.warning('Advance Amount Required', 'Please enter a valid advance amount.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.recordSalaryPayment({
        staff_id: staff.id,
        salary_month: advanceForm.salary_month,
        amount_paid: amount,
        payment_method: advanceForm.payment_method,
        transaction_type: 'ADVANCE',
        payment_date: advanceForm.payment_date ? new Date(advanceForm.payment_date).toISOString() : undefined,
        notes: advanceForm.notes.trim() || `Cash Advance (${formatMonthLabel(advanceForm.salary_month)})`,
      });

      toast.success(
        'Advance Recorded',
        `Rs. ${amount.toLocaleString()} advance given to ${staff.name}.`
      );
      setAdvanceModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Advance Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!staff) return;
    setStaffForm({
      name: staff.name,
      phone: staff.phone || '',
      role: staff.role || 'Salesman',
      monthly_salary: staff.monthly_salary.toString(),
      joining_date: staff.joining_date || '',
      is_active: staff.is_active,
      photo_url: staff.photo_url || null,
      documents: staff.documents || [],
    });
    setEditModalOpen(true);
  };

  // Document Upload for Edit Modal
  const handleDocumentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (staffForm.documents.length >= 4) {
      toast.warning('Limit Reached', 'You can upload up to 4 photos per staff.');
      return;
    }

    try {
      setUploadingDoc(true);
      const file = files[0];
      const uploadedUrl = await wholesaleService.uploadStaffDocument(file, staffForm.name || 'staff_doc');

      const updatedDocs = [...staffForm.documents, uploadedUrl];
      setStaffForm((prev) => ({
        ...prev,
        documents: updatedDocs,
        photo_url: prev.photo_url || uploadedUrl,
      }));

      toast.success('Photo Uploaded', 'Document added to profile.');
    } catch (err: any) {
      toast.error('Upload Failed', err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDocument = (idxToRemove: number) => {
    setStaffForm((prev) => {
      const newDocs = prev.documents.filter((_, idx) => idx !== idxToRemove);
      return {
        ...prev,
        documents: newDocs,
        photo_url: newDocs.length > 0 ? newDocs[0] : null,
      };
    });
  };

  // Submit Edit Staff
  const handleSubmitEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    if (!staffForm.name.trim()) {
      toast.warning('Staff Name Required', 'Please enter employee name.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.updateStaffMember(staff.id, {
        name: staffForm.name.trim(),
        phone: staffForm.phone.trim() || undefined,
        role: staffForm.role.trim() || 'Salesman',
        monthly_salary: parseFloat(staffForm.monthly_salary) || 0,
        joining_date: staffForm.joining_date || undefined,
        is_active: staffForm.is_active,
        photo_url: staffForm.photo_url || null,
        documents: staffForm.documents,
      });

      toast.success('Staff Updated', 'Profile updated successfully.');
      setEditModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (voucherId: string) => {
    try {
      await wholesaleService.deleteSalaryPayment(voucherId);
      toast.success('Record Deleted', 'Voucher removed from ledger.');
      await loadData(true);
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  // Confirm Delete Staff
  const handleConfirmDeleteStaff = async () => {
    if (!staff) return;
    try {
      setSaving(true);
      await wholesaleService.deleteStaffMember(staff.id);
      toast.success('Staff Removed', `"${staff.name}" has been deleted.`);
      router.push('/staff');
    } catch (err: any) {
      toast.error('Could Not Delete Staff', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !staff) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 font-mono text-xs">
          Loading employee ledger...
        </div>
      </AppLayout>
    );
  }

  const docs = staff.documents || [];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <Link
              href="/staff"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition btn-press"
              title="Back to Staff Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Avatar / Lightbox Click */}
            {staff.photo_url ? (
              <button
                type="button"
                onClick={() =>
                  setLightboxImage({
                    src: staff.photo_url!,
                    title: `${staff.name} - Profile Photo`,
                  })
                }
                className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:opacity-90 hover:ring-2 hover:ring-slate-900 transition cursor-zoom-in group relative"
                title="Click to zoom photo"
              >
                <img src={staff.photo_url} alt={staff.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                  <Eye className="w-4 h-4" />
                </div>
              </button>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-sm shrink-0 font-mono shadow-xs">
                {staff.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
                  {staff.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                  {staff.role}
                </span>
                {!staff.is_active && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                {staff.phone && (
                  <a href={`tel:${staff.phone}`} className="flex items-center space-x-1 hover:text-slate-900">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{staff.phone}</span>
                  </a>
                )}
                {staff.joining_date && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Joined: {staff.joining_date}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Filter */}
            <div className="flex items-center space-x-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-bold font-mono">
              <Calendar className="w-4 h-4 text-slate-500 ml-1" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-900 font-extrabold focus:outline-none cursor-pointer pr-1 text-xs"
                title="Select Period"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAdvanceModal}
              className="btn-press px-3.5 py-2.5 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Coins className="w-4 h-4 text-blue-700" />
              <span>+ Give Advance</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPayModal}
              className="btn-press px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Pay Salary</span>
            </button>

            <button
              type="button"
              onClick={handleOpenEditModal}
              className="btn-press p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="btn-press p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Monthly Base Salary */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Monthly Salary
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono tracking-tight text-white">
                Rs. {Math.round(staff.monthly_salary).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Fixed monthly package
              </p>
            </div>
          </div>

          {/* Card 2: Advances for Selected Month */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Advances ({formatMonthLabel(selectedMonth)})
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono tracking-tight text-blue-700">
                Rs. {Math.round(currentMonthAdvances).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Lifetime advances: Rs. {Math.round(totalLifetimeAdvances).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Card 3: Salary Paid for Selected Month */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Salary Paid ({formatMonthLabel(selectedMonth)})
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono tracking-tight text-emerald-700">
                Rs. {Math.round(currentMonthSalaryPaid).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Lifetime salary: Rs. {Math.round(totalLifetimePaid).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Card 4: Net Balance Due for Month */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Net Salary Due ({selectedMonth})
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              {(() => {
                const netRemaining = Math.max(
                  0,
                  staff.monthly_salary - currentMonthAdvances - currentMonthSalaryPaid
                );
                return (
                  <>
                    <div
                      className={`text-2xl font-black font-mono tracking-tight ${
                        netRemaining > 0 ? 'text-amber-700' : 'text-slate-900'
                      }`}
                    >
                      Rs. {Math.round(netRemaining).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      {netRemaining === 0 ? 'Fully settled this month' : 'Salary minus advances taken'}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* CNIC Documents Gallery Banner (if present) */}
        {docs.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 font-heading flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-slate-700" />
                <span>CNIC & Verification Documents ({docs.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Click any photo to zoom in Lightbox</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {docs.map((docUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setLightboxImage({
                      src: docUrl,
                      title: `${staff.name} - ${DOC_PRESETS[idx] || `Document ${idx + 1}`}`,
                    })
                  }
                  className="w-24 h-24 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden hover:ring-2 hover:ring-slate-900 transition group relative cursor-zoom-in shadow-2xs shrink-0"
                >
                  <img src={docUrl} alt={`Doc ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono font-bold">
                    {DOC_PRESETS[idx] || `#${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Complete Financial Account Ledger */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                Staff Account Ledger & Financial Statement
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Complete chronological record of all salary disbursements and cash advances.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="btn-press px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Ledger</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4 pl-6">Date</th>
                  <th className="p-4">Transaction Type</th>
                  <th className="p-4">Month / Period</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4 text-right">Amount (Rs.)</th>
                  <th className="p-4 font-sans">Notes / Remarks</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length > 0 ? (
                  payments.map((p, idx) => {
                    const isAdvance = p.transaction_type === 'ADVANCE';
                    return (
                      <tr
                        key={p.id}
                        className={`table-row-hover transition ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                      >
                        <td className="p-4 pl-6 font-bold text-slate-900">
                          {formatDatePKT(p.payment_date, false)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isAdvance
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAdvance ? 'bg-blue-500' : 'bg-emerald-500'
                              }`}
                            />
                            <span>{isAdvance ? 'CASH ADVANCE' : 'SALARY PAYMENT'}</span>
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {formatMonthLabel(p.salary_month)}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {p.payment_method}
                          </span>
                        </td>
                        <td
                          className={`p-4 text-right font-black text-xs ${
                            isAdvance ? 'text-blue-700' : 'text-emerald-700'
                          }`}
                        >
                          Rs. {Math.round(p.amount_paid).toLocaleString()}
                        </td>
                        <td className="p-4 text-slate-600 font-sans text-xs max-w-xs truncate">
                          {p.notes || '—'}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-mono text-xs">
                      No financial transactions recorded for {staff.name} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PAY SALARY MODAL                                                       */}
      {/* ========================================================================= */}
      {payModalOpen && staff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Pay Monthly Salary
                  </h3>
                  <p className="text-xs text-slate-500">Disburse salary with advance deductions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-mono font-bold"
              >
                ✕
              </button>
            </div>

            {/* Advance Deduction Summary Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-600">
                <span>Base Monthly Salary:</span>
                <span className="font-bold text-slate-900">
                  Rs. {staff.monthly_salary.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-blue-700">
                <span>Advances Taken ({formatMonthLabel(payForm.salary_month)}):</span>
                <span className="font-bold">
                  - Rs. {currentMonthAdvances.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-emerald-800 font-bold text-sm">
                <span>Net Suggested Pay:</span>
                <span>
                  Rs.{' '}
                  {Math.max(
                    0,
                    staff.monthly_salary - currentMonthAdvances - currentMonthSalaryPaid
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPaySalary} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Salary Month
                  </label>
                  <input
                    type="month"
                    required
                    value={payForm.salary_month}
                    onChange={(e) => setPayForm({ ...payForm, salary_month: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                  Amount to Pay (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={payForm.amount_paid}
                  onChange={(e) => setPayForm({ ...payForm, amount_paid: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {(['Cash', 'Bank', 'Other'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayForm({ ...payForm, payment_method: method })}
                      className={`btn-press p-2 rounded-xl border text-xs font-bold transition ${
                        payForm.payment_method === method
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Notes / Voucher Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary payment"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition shadow-sm btn-press flex items-center space-x-1.5"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Disburse</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GIVE ADVANCE MODAL                                                     */}
      {/* ========================================================================= */}
      {advanceModalOpen && staff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Give Cash Advance (Kharcha)
                  </h3>
                  <p className="text-xs text-slate-500">Record cash advance for {staff.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdvanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Advance For Month
                  </label>
                  <input
                    type="month"
                    required
                    value={advanceForm.salary_month}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, salary_month: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    required
                    value={advanceForm.payment_date}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, payment_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                  Advance Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="e.g. 5000"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-black text-blue-700 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {(['Cash', 'Bank', 'Other'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setAdvanceForm({ ...advanceForm, payment_method: method })}
                      className={`btn-press p-2 rounded-xl border text-xs font-bold transition ${
                        advanceForm.payment_method === method
                          ? 'border-blue-700 bg-blue-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Remarks / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home expense advance"
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition shadow-sm btn-press flex items-center space-x-1.5"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5" />
                      <span>Disburse Advance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EDIT STAFF MEMBER MODAL                                                */}
      {/* ========================================================================= */}
      {editModalOpen && staff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Edit Staff Profile: {staff.name}
                  </h3>
                  <p className="text-xs text-slate-500">Update custom role, salary and CNIC documents</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEditStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Custom Typed Role with Autocomplete List */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Designation / Role (Custom)
                  </label>
                  <input
                    type="text"
                    list="staff-role-suggestions"
                    placeholder="Type or select role..."
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
                  />
                  <datalist id="staff-role-suggestions">
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                    Monthly Salary (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={staffForm.monthly_salary}
                    onChange={(e) => setStaffForm({ ...staffForm, monthly_salary: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={staffForm.joining_date}
                    onChange={(e) => setStaffForm({ ...staffForm, joining_date: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* CNIC Document Uploads */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-slate-700" />
                      <span>CNIC & ID Verification Photos</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Upload up to 4 photos (CNIC front/back, picture, police verification)
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {staffForm.documents.length}/4
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  {staffForm.documents.map((docUrl, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden aspect-square group shadow-2xs"
                    >
                      <img src={docUrl} alt={`Doc ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              src: docUrl,
                              title: DOC_PRESETS[idx] || `Document ${idx + 1}`,
                            })
                          }
                          className="p-1 rounded-lg bg-white/90 text-slate-900 hover:bg-white"
                          title="View Full Size"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(idx)}
                          className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                          title="Remove Photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono font-bold">
                        {DOC_PRESETS[idx] || `#${idx + 1}`}
                      </span>
                    </div>
                  ))}

                  {staffForm.documents.length < 4 && (
                    <label className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-800 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center p-2 text-center aspect-square space-y-1">
                      {uploadingDoc ? (
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-600">
                            {DOC_PRESETS[staffForm.documents.length] || '+ Add Photo'}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingDoc}
                        onChange={handleDocumentFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={staffForm.is_active}
                  onChange={(e) => setStaffForm({ ...staffForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                />
                <label
                  htmlFor="is_active_checkbox"
                  className="text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Active Employee Account
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingDoc}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition shadow-sm btn-press flex items-center space-x-1.5"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Update Staff</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DELETE STAFF CONFIRM MODAL                                             */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Remove Staff: "${staff.name}"?`}
        message="This action will delete the employee account and their historical salary/advance records from your registry."
        confirmText="Yes, Delete Staff"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteStaff}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 5. FULL-SCREEN LIGHTBOX MODAL                                             */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center space-x-3 z-70"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition backdrop-blur-sm"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center animate-scale-in"
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.title}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            {lightboxImage.title && (
              <div className="mt-3 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold border border-white/10">
                {lightboxImage.title}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
