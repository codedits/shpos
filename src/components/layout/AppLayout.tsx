'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { useAuth } from '@/context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Prevent ANY dashboard or layout flashing while unauthenticated or checking session
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-4 font-sans select-none text-slate-900">
        <div className="flex flex-col items-center space-y-4 animate-scale-in text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.25em] text-slate-900 font-heading uppercase pl-[0.25em]">
            VEYRO
          </h1>
          <div className="w-32 h-[2px] bg-slate-100 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-slate-900 rounded-full animate-progress" />
          </div>
        </div>
      </div>
    );
  }

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
