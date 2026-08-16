'use client';

import React from 'react';
import { TopNavbar } from './TopNavbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50/70 text-slate-900">
      {/* Sleek Top Navigation Bar */}
      <TopNavbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-16 animate-fade-in">
        {children}
      </main>
    </div>
  );
};
