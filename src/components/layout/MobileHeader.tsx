'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  FileText,
  Plus,
  Store,
  Settings,
  Menu,
  X,
  Database,
  Truck,
  ClipboardList,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { wholesaleService } from '@/services/wholesaleService';
import { BusinessSettings } from '@/types/wholesale';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Suppliers', href: '/suppliers', icon: Truck },
  { label: 'Purchases', href: '/purchases', icon: ClipboardList },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Staff & Salary', href: '/staff', icon: UserCheck },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const MobileHeader: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: 'VEYRO Wholesale POS',
    phone: '',
    address: '',
    currency_symbol: 'Rs.',
  });

  useEffect(() => {
    wholesaleService.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="lg:hidden w-full bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 select-none">
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2.5 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-950 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
            <Store className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <h1 className="font-black text-slate-900 text-sm leading-tight tracking-tight font-heading">
                VEYRO
              </h1>
              <span className="px-1 py-0.2 rounded bg-indigo-100 text-indigo-900 text-[8px] font-extrabold font-mono uppercase">
                POS
              </span>
            </div>
            <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
              {settings.business_name || 'Wholesale POS'}
            </p>
          </div>
        </Link>

        {/* Right: DB Badge + New Order + Hamburger */}
        <div className="flex items-center space-x-2">
          <Link
            href="/orders/new"
            className="btn-press px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Order</span>
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg animate-fade-in space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`btn-press flex items-center space-x-2 p-2.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="flex items-center space-x-1 text-emerald-700 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>VEYRO Live</span>
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center space-x-1 transition btn-press"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
