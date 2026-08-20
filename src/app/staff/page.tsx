'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { wholesaleService } from '@/services/wholesaleService';
import { StaffMember, StaffSalaryPayment, PaymentMethod } from '@/types/wholesale';
import { useToast } from '@/context/ToastContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDatePKT } from '@/lib/dateUtils';
import {
  Users,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  History,
  Phone,
  Briefcase,
  Search,
  Receipt,
  UserCheck,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Eye,
  X,
  Camera,
  Image as ImageIcon,
  Coins,
  ArrowRight,
} from 'lucide-react';

const COMMON_ROLES = [
  'Salesman',
  'Counter Cashier',
  'Packer / Helper',
  'Store Manager',
  'Master / Tailor',
  'Cutting Master',
  'Accountant',
  'Other',
];

const DOC_PRESETS = [
  'CNIC Front',
  'CNIC Back',
  'Employee Photo',
  'Police / Agreement Document',
];

export default function StaffPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [paymentsList, setPaymentsList] = useState<StaffSalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Salary Month (default: YYYY-MM of current month)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  // Active item in action
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Form states for Add/Edit Staff
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

  // Form states for Record Salary Payment
  const [payForm, setPayForm] = useState({
    salary_month: currentMonthStr,
    amount_paid: '',
    payment_method: 'Cash' as PaymentMethod,
    payment_date: '',
    notes: '',
  });

  // Form states for Record Advance
  const [advanceForm, setAdvanceForm] = useState({
    salary_month: currentMonthStr,
    amount: '',
    payment_method: 'Cash' as PaymentMethod,
    payment_date: '',
    notes: '',
  });

  const loadData = async (force = false) => {
    try {
      setLoading(true);
      const [staffData, payData] = await Promise.all([
        wholesaleService.getStaffMembers(force),
        wholesaleService.getSalaryPayments(force),
      ]);
      setStaffList(staffData);
      setPaymentsList(payData);
    } catch (err: any) {
      toast.error('Failed to load staff records', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatMonthLabel = (monthKey: string) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.role && s.role.toLowerCase().includes(q))
    );
  }, [staffList, searchQuery]);

  const activeStaff = useMemo(() => staffList.filter((s) => s.is_active), [staffList]);

  const totalMonthlyPayrollBudget = useMemo(() => {
    return activeStaff.reduce((sum, s) => sum + (s.monthly_salary || 0), 0);
  }, [activeStaff]);

  const paymentsForSelectedMonth = useMemo(() => {
    return paymentsList.filter((p) => p.salary_month === selectedMonth);
  }, [paymentsList, selectedMonth]);

  const totalPaidForSelectedMonth = useMemo(() => {
    return paymentsForSelectedMonth
      .filter((p) => (p.transaction_type || 'SALARY') !== 'ADVANCE')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  }, [paymentsForSelectedMonth]);

  const totalAdvancesForSelectedMonth = useMemo(() => {
    return paymentsForSelectedMonth
      .filter((p) => p.transaction_type === 'ADVANCE')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  }, [paymentsForSelectedMonth]);

  const remainingPayrollForSelectedMonth = Math.max(
    0,
    totalMonthlyPayrollBudget - totalPaidForSelectedMonth - totalAdvancesForSelectedMonth
  );

  // Helper map: staff_id -> paid amounts this month
  const staffMonthStatsMap = useMemo(() => {
    const map: Record<string, { salaryPaid: number; advancesTaken: number }> = {};
    paymentsForSelectedMonth.forEach((p) => {
      if (!map[p.staff_id]) map[p.staff_id] = { salaryPaid: 0, advancesTaken: 0 };
      if (p.transaction_type === 'ADVANCE') {
        map[p.staff_id].advancesTaken += p.amount_paid;
      } else {
        map[p.staff_id].salaryPaid += p.amount_paid;
      }
    });
    return map;
  }, [paymentsForSelectedMonth]);

  // Handle Document Upload
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
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Open Add Modal
  const handleOpenAddModal = () => {
    setStaffForm({
      name: '',
      phone: '',
      role: 'Salesman',
      monthly_salary: '',
      joining_date: new Date().toISOString().split('T')[0],
      is_active: true,
      photo_url: null,
      documents: [],
    });
    setAddModalOpen(true);
  };

  // Submit Add Staff
  const handleSubmitAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim()) {
      toast.warning('Staff Name Required', 'Please enter employee name.');
      return;
    }
    const salary = parseFloat(staffForm.monthly_salary) || 0;
    if (salary < 0) {
      toast.warning('Invalid Salary', 'Monthly salary cannot be negative.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.createStaffMember({
        name: staffForm.name.trim(),
        phone: staffForm.phone.trim() || undefined,
        role: staffForm.role.trim() || 'Salesman',
        monthly_salary: salary,
        joining_date: staffForm.joining_date || undefined,
        photo_url: staffForm.photo_url || undefined,
        documents: staffForm.documents,
      });

      toast.success('Staff Added', `Employee "${staffForm.name}" registered successfully.`);
      setAddModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Failed to Add Staff', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
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

  // Submit Edit Staff
  const handleSubmitEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!staffForm.name.trim()) {
      toast.warning('Staff Name Required', 'Please enter employee name.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.updateStaffMember(selectedStaff.id, {
        name: staffForm.name.trim(),
        phone: staffForm.phone.trim() || undefined,
        role: staffForm.role.trim() || 'Salesman',
        monthly_salary: parseFloat(staffForm.monthly_salary) || 0,
        joining_date: staffForm.joining_date || undefined,
        is_active: staffForm.is_active,
        photo_url: staffForm.photo_url || null,
        documents: staffForm.documents,
      });

      toast.success('Staff Updated', `Account for "${staffForm.name}" updated successfully.`);
      setEditModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Failed to Update Staff', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Pay Salary Modal
  const handleOpenPayModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    const stats = staffMonthStatsMap[staff.id] || { salaryPaid: 0, advancesTaken: 0 };
    const remainingDue = Math.max(0, staff.monthly_salary - stats.advancesTaken - stats.salaryPaid);

    setPayForm({
      salary_month: selectedMonth,
      amount_paid: remainingDue > 0 ? remainingDue.toString() : staff.monthly_salary.toString(),
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Salary payment for ${formatMonthLabel(selectedMonth)}`,
    });
    setPayModalOpen(true);
  };

  // Submit Pay Salary
  const handleSubmitPaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const amount = parseFloat(payForm.amount_paid) || 0;
    if (amount <= 0) {
      toast.warning('Payment Amount Required', 'Please enter a valid salary amount.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.recordSalaryPayment({
        staff_id: selectedStaff.id,
        salary_month: payForm.salary_month,
        amount_paid: amount,
        payment_method: payForm.payment_method,
        transaction_type: 'SALARY',
        payment_date: payForm.payment_date ? new Date(payForm.payment_date).toISOString() : undefined,
        notes: payForm.notes.trim() || undefined,
      });

      toast.success(
        'Salary Paid Successfully',
        `Rs. ${amount.toLocaleString()} paid to "${selectedStaff.name}" for ${formatMonthLabel(
          payForm.salary_month
        )}.`
      );
      setPayModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Failed to Record Salary', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Advance Modal
  const handleOpenAdvanceModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setAdvanceForm({
      salary_month: selectedMonth,
      amount: '',
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Advance Kharcha for ${formatMonthLabel(selectedMonth)}`,
    });
    setAdvanceModalOpen(true);
  };

  // Submit Advance
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const amount = parseFloat(advanceForm.amount) || 0;
    if (amount <= 0) {
      toast.warning('Advance Amount Required', 'Please enter a valid amount.');
      return;
    }

    try {
      setSaving(true);
      await wholesaleService.recordSalaryPayment({
        staff_id: selectedStaff.id,
        salary_month: advanceForm.salary_month,
        amount_paid: amount,
        payment_method: advanceForm.payment_method,
        transaction_type: 'ADVANCE',
        payment_date: advanceForm.payment_date ? new Date(advanceForm.payment_date).toISOString() : undefined,
        notes: advanceForm.notes.trim() || undefined,
      });

      toast.success(
        'Advance Disbursed',
        `Rs. ${amount.toLocaleString()} advance recorded for "${selectedStaff.name}".`
      );
      setAdvanceModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Advance Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Open History Modal
  const handleOpenHistoryModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setHistoryModalOpen(true);
  };

  // Delete Payment Record
  const handleDeletePayment = async (paymentId: string) => {
    try {
      await wholesaleService.deleteSalaryPayment(paymentId);
      toast.success('Record Deleted', 'Voucher has been removed.');
      await loadData(true);
    } catch (err: any) {
      toast.error('Could Not Delete Voucher', err.message);
    }
  };

  // Confirm Delete Staff
  const handleConfirmDeleteStaff = async () => {
    if (!selectedStaff) return;
    try {
      setSaving(true);
      await wholesaleService.deleteStaffMember(selectedStaff.id);
      toast.success('Staff Removed', `"${selectedStaff.name}" has been removed.`);
      setDeleteModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      toast.error('Could Not Delete Staff', err.message);
    } finally {
      setSaving(false);
    }
  };

  const staffPaymentHistory = useMemo(() => {
    if (!selectedStaff) return [];
    return paymentsList.filter((p) => p.staff_id === selectedStaff.id);
  }, [paymentsList, selectedStaff]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full font-sans">
        {/* Header Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
                  Staff & Salary Accounts
                </h1>
                <p className="text-xs text-slate-500 font-medium font-sans">
                  Employee profiles, custom roles, cash advances, and monthly salary payroll ledgers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Selector Pill */}
            <div className="flex items-center space-x-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 text-xs font-bold font-mono">
              <Calendar className="w-4 h-4 text-slate-500 ml-1" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-900 font-extrabold focus:outline-none cursor-pointer pr-1 text-xs"
                title="Select Salary Month"
              />
            </div>

            {/* Add Staff Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-press px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Monthly Budget */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Monthly Salary Budget
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono tracking-tight text-white">
                Rs. {totalMonthlyPayrollBudget.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Active Staff Payroll for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
          </div>

          {/* Card 2: Advances Given */}
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
                Rs. {totalAdvancesForSelectedMonth.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Total cash advances given this month
              </p>
            </div>
          </div>

          {/* Card 3: Salaries Paid */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Salaries Settled
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono tracking-tight text-emerald-700">
                Rs. {totalPaidForSelectedMonth.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Salaries disbursed for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
          </div>

          {/* Card 4: Net Pending */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Net Pending Salaries
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  remainingPayrollForSelectedMonth > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div
                className={`text-2xl font-black font-mono tracking-tight ${
                  remainingPayrollForSelectedMonth > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                Rs. {remainingPayrollForSelectedMonth.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                {remainingPayrollForSelectedMonth > 0
                  ? 'Budget minus advances & paid salary'
                  : 'All salaries for this month settled!'}
              </p>
            </div>
          </div>
        </div>

        {/* Staff Table & Search Register */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                Staff Directory & Account Balances
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Click any staff member to view full ledger account, CNIC photos, and salary statements.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, role, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                  <th className="p-4 pl-6">Staff Member</th>
                  <th className="p-4">Designation / Role</th>
                  <th className="p-4 text-right font-mono">Monthly Salary</th>
                  <th className="p-4 text-right font-mono">Advances ({selectedMonth})</th>
                  <th className="p-4 text-right font-mono">Paid ({selectedMonth})</th>
                  <th className="p-4 text-center">Status ({formatMonthLabel(selectedMonth)})</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff, idx) => {
                    const stats = staffMonthStatsMap[staff.id] || { salaryPaid: 0, advancesTaken: 0 };
                    const netDue = Math.max(0, staff.monthly_salary - stats.advancesTaken - stats.salaryPaid);
                    const isFullyPaid = staff.monthly_salary > 0 && netDue === 0;
                    const isPartial = (stats.salaryPaid > 0 || stats.advancesTaken > 0) && netDue > 0;
                    const docs = staff.documents || [];

                    return (
                      <tr
                        key={staff.id}
                        className={`table-row-hover transition ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                      >
                        {/* Name & Photo (Click to open Ledger) */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center space-x-3">
                            {staff.photo_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxImage({
                                    src: staff.photo_url!,
                                    title: `${staff.name} - Profile Photo`,
                                  })
                                }
                                className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:opacity-90 hover:ring-2 hover:ring-slate-900 transition relative group cursor-zoom-in"
                                title="Click to view full photo"
                              >
                                <img
                                  src={staff.photo_url}
                                  alt={staff.name}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs font-mono">
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <Link
                                href={`/staff/${staff.id}`}
                                className="font-extrabold text-slate-900 text-sm block hover:text-blue-600 transition flex items-center space-x-1"
                              >
                                <span>{staff.name}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                              </Link>
                              {staff.phone ? (
                                <a
                                  href={`tel:${staff.phone}`}
                                  className="text-[11px] font-mono text-slate-500 hover:text-slate-900 flex items-center space-x-1 mt-0.5"
                                >
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{staff.phone}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">No phone</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Custom Role */}
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80 font-mono">
                            {staff.role}
                          </span>
                        </td>

                        {/* Monthly Base Salary */}
                        <td className="p-4 text-right font-mono font-bold text-slate-900 text-xs">
                          Rs. {Math.round(staff.monthly_salary).toLocaleString()}
                        </td>

                        {/* Advances Taken */}
                        <td className="p-4 text-right font-mono font-bold text-blue-700 text-xs">
                          Rs. {Math.round(stats.advancesTaken).toLocaleString()}
                        </td>

                        {/* Amount Paid This Month */}
                        <td className="p-4 text-right font-mono font-bold text-emerald-700 text-xs">
                          Rs. {Math.round(stats.salaryPaid).toLocaleString()}
                        </td>

                        {/* Status for selected month */}
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider ${
                              isFullyPaid
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isPartial
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isFullyPaid
                                  ? 'bg-emerald-500'
                                  : isPartial
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span>
                              {isFullyPaid
                                ? 'PAID'
                                : isPartial
                                ? `PARTIAL (Rs. ${netDue.toLocaleString()} Due)`
                                : 'UNPAID'}
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Give Advance CTA */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdvanceModal(staff)}
                              className="btn-press px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs transition flex items-center space-x-1"
                              title="Give Cash Advance"
                            >
                              <Coins className="w-3.5 h-3.5 text-blue-700" />
                              <span>+ Advance</span>
                            </button>

                            {/* Pay Salary CTA */}
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(staff)}
                              className="btn-press px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition shadow-2xs flex items-center space-x-1"
                              title="Pay Salary"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Pay Salary</span>
                            </button>

                            {/* View Full Ledger CTA */}
                            <Link
                              href={`/staff/${staff.id}`}
                              className="btn-press p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                              title="View Full Ledger Account"
                            >
                              <History className="w-4 h-4" />
                            </Link>

                            {/* Edit CTA */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(staff)}
                              className="btn-press p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                              title="Edit Staff & CNIC Photos"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete CTA */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaff(staff);
                                setDeleteModalOpen(true);
                              }}
                              className="btn-press p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                              title="Delete Staff"
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
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-mono text-xs">
                      {searchQuery
                        ? 'No staff members matching your search query.'
                        : 'No staff members registered yet. Click "Add Staff Member" above to add your first employee.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD STAFF MEMBER MODAL WITH CUSTOM TYPED ROLE & CNIC UPLOADS           */}
      {/* ========================================================================= */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Add Staff Member
                  </h3>
                  <p className="text-xs text-slate-500">Register employee with custom role and CNIC photos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAddStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Muhammad Bilal"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Custom Typed Role Input with Autocomplete suggestions */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Designation / Role (Custom)
                  </label>
                  <input
                    type="text"
                    list="staff-role-list"
                    placeholder="Type or select role..."
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
                  />
                  <datalist id="staff-role-list">
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
                    placeholder="e.g. 35000"
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
                    placeholder="e.g. 0300-1234567"
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
                      <span>CNIC & ID Photos (Optional)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Upload up to 4 photos (CNIC front/back, employee picture, police verification)
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
                        ref={fileInputRef}
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
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
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Staff Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT STAFF MEMBER MODAL                                                */}
      {/* ========================================================================= */}
      {editModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Edit Staff: {selectedStaff.name}
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Role (Custom)
                  </label>
                  <input
                    type="text"
                    list="staff-role-list-edit"
                    placeholder="Type or select role..."
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-sans"
                  />
                  <datalist id="staff-role-list-edit">
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

              {/* CNIC Documents */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-slate-700" />
                      <span>CNIC & ID Photos (Optional)</span>
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
                  Active Employee (Included in monthly salary budget)
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
      {/* 3. RECORD SALARY PAYMENT MODAL                                            */}
      {/* ========================================================================= */}
      {payModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Pay Salary Voucher
                  </h3>
                  <p className="text-xs text-slate-500">Record salary disbursement for {selectedStaff.name}</p>
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

            {/* Advance Deduction Box */}
            {(() => {
              const stats = staffMonthStatsMap[selectedStaff.id] || { salaryPaid: 0, advancesTaken: 0 };
              return stats.advancesTaken > 0 ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono flex items-center justify-between text-blue-900">
                  <span>Advances Taken ({formatMonthLabel(payForm.salary_month)}):</span>
                  <span className="font-bold">Rs. {stats.advancesTaken.toLocaleString()}</span>
                </div>
              ) : null;
            })()}

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
                  Amount Paid (Rs.) *
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
                  Remarks / Notes (Optional)
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
      {/* 4. RECORD ADVANCE MODAL                                                   */}
      {/* ========================================================================= */}
      {advanceModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 tracking-tight font-heading">
                    Give Cash Advance
                  </h3>
                  <p className="text-xs text-slate-500">Record cash advance for {selectedStaff.name}</p>
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
      {/* 5. DELETE STAFF CONFIRM MODAL                                             */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={selectedStaff ? `Remove Staff: "${selectedStaff.name}"?` : 'Remove Staff Member?'}
        message="This action will delete the employee account and their historical salary/advance records from your registry."
        confirmText="Yes, Delete Staff"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteStaff}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 6. FULL-SCREEN LIGHTBOX MODAL                                             */}
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
