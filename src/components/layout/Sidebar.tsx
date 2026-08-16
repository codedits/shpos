'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  FileText,
  PlusCircle,
  Store,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 select-none text-zinc-950 z-30 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-200 flex items-center space-x-3 bg-zinc-50">
        <div className="w-9 h-9 bg-black border border-black flex items-center justify-center text-white shrink-0">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div className="overflow-hidden">
            <h1 className="font-black text-zinc-950 text-sm leading-tight tracking-wider uppercase">
              BURAQ COLLECTION
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Wholesale POS
            </p>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="p-3 border-b border-zinc-200">
        <Link
          href="/orders/new"
          className="w-full flex items-center justify-center space-x-2 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wide border border-black transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create Order</span>
        </Link>
      </div>

      {/* Main Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Navigation Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 border font-bold text-xs uppercase tracking-wide transition-all ${
                isActive
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-white text-zinc-700 border-transparent hover:bg-zinc-100 hover:text-black hover:border-zinc-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Footer Info */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50 font-mono text-[11px] text-zinc-500">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-800 uppercase">System Ready</span>
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full" />
        </div>
        <p className="text-[10px] text-zinc-400 mt-1">Supabase DB Connected</p>
      </div>
    </aside>
  );
};
