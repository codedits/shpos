'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Package,
  Receipt,
  BarChart3,
  Settings,
  Store,
  Clock,
  User,
  Users,
  Database,
  Trash2,
} from 'lucide-react';
import { usePOS } from '@/context/POSContext';

interface NavbarProps {
  onOpenHeldOrders?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenHeldOrders }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, cashierName, heldOrders, cartItemCount, customers, isDbConnected, clearAllSampleData } = usePOS();

  const navItems = [
    { label: 'Register POS', href: '/', icon: ShoppingBag, shortcut: 'F1', badge: cartItemCount > 0 ? cartItemCount : null },
    { label: 'Customers & Khata', href: '/customers', icon: Users, shortcut: 'F2', badge: customers.length > 0 ? customers.length : null },
    { label: 'Inventory', href: '/inventory', icon: Package, shortcut: 'F3' },
    { label: 'Transactions', href: '/transactions', icon: Receipt, shortcut: 'F4' },
    { label: 'Analytics', href: '/analytics', icon: BarChart3, shortcut: 'F5' },
    { label: 'Settings', href: '/settings', icon: Settings, shortcut: 'F6' },
  ];

  // Listen for F1 - F6 Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        router.push('/');
      } else if (e.key === 'F2') {
        e.preventDefault();
        router.push('/customers');
      } else if (e.key === 'F3') {
        e.preventDefault();
        router.push('/inventory');
      } else if (e.key === 'F4') {
        e.preventDefault();
        router.push('/transactions');
      } else if (e.key === 'F5') {
        e.preventDefault();
        router.push('/analytics');
      } else if (e.key === 'F6') {
        e.preventDefault();
        router.push('/settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-40 select-none text-zinc-950">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 bg-black border border-black flex items-center justify-center text-white shrink-0">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-zinc-950 text-xs sm:text-sm leading-tight uppercase tracking-wide font-heading">
                {settings.name}
              </h1>
              {isDbConnected ? (
                <span className="hidden md:flex px-1.5 py-0.2 border border-black bg-black text-white text-[9px] font-mono font-bold items-center space-x-1">
                  <Database className="w-2.5 h-2.5 text-white" />
                  <span>SUPABASE</span>
                </span>
              ) : (
                <span className="hidden md:inline px-1.5 py-0.2 border border-zinc-300 bg-zinc-100 text-zinc-600 text-[9px] font-mono font-bold">
                  OFFLINE
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              WHOLESALE CLOTHING TERMINAL
            </p>
          </div>
        </Link>

        {/* Top Navigation Tabs with F1-F6 Badges */}
        <nav className="hidden xl:flex items-center space-x-1.5 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-1.5 border font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-black hover:text-black'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                <span>{item.label}</span>
                <span
                  className={`px-1 py-0.2 text-[9px] font-mono font-extrabold border ${
                    isActive ? 'bg-white text-black border-white' : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                  }`}
                >
                  {item.shortcut}
                </span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-black text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions & Cashier */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              if (confirm('Wipe all sample clothing items, clients, and orders to start with a fresh 0-data store?')) {
                clearAllSampleData();
              }
            }}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 border border-zinc-300 bg-white hover:border-black text-[11px] font-bold text-zinc-700 uppercase transition"
            title="Start Empty Store"
          >
            <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Clear Sample Data</span>
          </button>

          {onOpenHeldOrders && (
            <button
              onClick={onOpenHeldOrders}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-zinc-900 bg-white border border-zinc-300 hover:border-black transition uppercase"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-700" />
              <span className="hidden sm:inline">Held</span>
              {heldOrders.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-black text-white">
                  {heldOrders.length}
                </span>
              )}
            </button>
          )}

          <div className="flex items-center space-x-2 border-l border-zinc-200 pl-2">
            <div className="w-7 h-7 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-800 text-xs font-bold">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden md:inline text-xs font-bold text-zinc-900">{cashierName}</span>
          </div>
        </div>
      </div>

      {/* Responsive Horizontal Nav Row for Screens under XL */}
      <nav className="xl:hidden flex items-center space-x-1 px-3 py-1.5 border-t border-zinc-200 bg-zinc-50 overflow-x-auto scrollbar-none whitespace-nowrap">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 border font-bold text-[11px] uppercase tracking-wide shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-zinc-700 border-zinc-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
              <span className="px-1 py-0.2 text-[8px] font-mono border border-zinc-300 bg-zinc-100 text-zinc-600">
                {item.shortcut}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
};
