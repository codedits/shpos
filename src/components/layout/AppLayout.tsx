'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex bg-slate-50/70 text-slate-900">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header (visible only on < lg) */}
        <MobileHeader />

        {/* Page Content */}
        <main className="flex-1 w-full pb-16 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
