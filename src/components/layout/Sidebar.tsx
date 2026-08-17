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
  ChevronLeft,
  ChevronRight,
  Database,
  Truck,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import { wholesaleService } from '@/services/wholesaleService';
import { BusinessSettings } from '@/types/wholesale';
import { useAuth } from '@/context/AuthContext';

interface NavGroup {
  title: string;
  items: { label: string; href: string; icon: React.ElementType; badge?: number | null }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Orders', href: '/orders', icon: ShoppingCart },
      { label: 'Products', href: '/products', icon: Package },
    ],
  },
  {
    title: 'Supply Chain',
    items: [
      { label: 'Suppliers', href: '/suppliers', icon: Truck },
      { label: 'Purchases', href: '/purchases', icon: ClipboardList },
    ],
  },
  {
    title: 'Accounts',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Payments', href: '/payments', icon: CreditCard },
      { label: 'Invoices', href: '/invoices', icon: FileText },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout, username } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: 'VEYRO Wholesale POS',
    phone: '',
    address: '',
    currency_symbol: 'Rs.',
  });

  useEffect(() => {
    wholesaleService.getSettings().then(setSettings).catch(() => {});
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 z-40 select-none bg-white border-r border-slate-200 transition-all duration-300 ease-in-out shrink-0 ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`border-b border-slate-200 flex items-center ${collapsed ? 'p-3 justify-center' : 'px-5 py-4'}`}>
        <Link href="/" className="flex items-center space-x-3 shrink-0 group">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-950 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105">
            <Store className="w-4.5 h-4.5 text-indigo-300" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <h1 className="font-black text-slate-900 text-base leading-none tracking-tight font-heading">
                  VEYRO
                </h1>
                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 text-[9px] font-extrabold font-mono uppercase">
                  POS
                </span>
              </div>
              <p className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase mt-1 truncate">
                {settings.business_name || 'Wholesale Terminal'}
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* New Order CTA */}
      <div className={`border-b border-slate-100 ${collapsed ? 'p-2' : 'px-4 py-3'}`}>
        <Link
          href="/orders/new"
          className={`btn-press flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-sm hover:shadow-md ${
            collapsed ? 'w-full p-2.5' : 'w-full py-2.5 px-4'
          }`}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New Order</span>}
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.title}
              </div>
            )}
            <div className={`space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`btn-press flex items-center rounded-xl text-xs font-semibold transition-all relative ${
                      collapsed
                        ? 'justify-center p-2.5'
                        : 'space-x-3 px-3.5 py-2.5'
                    } ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {active && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/40 rounded-r-full" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`} />
                    {!collapsed && <span>{item.label}</span>}
                    {item.badge && !collapsed && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: DB Status + Logout + Collapse Toggle */}
      <div className="border-t border-slate-200 bg-slate-50/80 space-y-0.5">
        {/* User Session & Logout Button */}
        <div className={`flex items-center ${collapsed ? 'justify-center py-2' : 'px-4 py-2 justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center space-x-2 truncate">
              <div className="w-6 h-6 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {(username || 'A').slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-slate-700 truncate font-mono">
                {username || 'Admin'}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            className={`text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition btn-press flex items-center ${
              collapsed ? 'p-2' : 'p-1.5'
            }`}
            title="Sign Out of VEYRO POS"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* DB Connection Badge */}
        <div className={`flex items-center ${collapsed ? 'justify-center py-2' : 'px-4 py-2 justify-between'}`}>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow shrink-0" />
            {!collapsed && (
              <>
                <Database className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase">Live DB</span>
              </>
            )}
          </div>
          {!collapsed && (
            <span className="text-[10px] font-mono text-slate-400">VEYRO v0.1</span>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center border-t border-slate-200 bg-white hover:bg-slate-50 transition text-slate-500 hover:text-slate-700 ${
            collapsed ? 'justify-center py-3' : 'px-4 py-2.5 justify-between'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && <span className="text-[10px] font-bold uppercase tracking-wide font-mono">Collapse Menu</span>}
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
