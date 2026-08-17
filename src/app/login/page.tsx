'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setSubmitting(true);

    setTimeout(() => {
      const success = login(usernameInput, passwordInput);
      if (success) {
        toast.success('Welcome to VEYRO POS', 'Login authenticated successfully.');
      } else {
        setErrorMsg('Invalid username or password.');
        toast.error('Authentication Failed', 'Invalid username or password.');
      }
      setSubmitting(false);
    }, 200);
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden select-none font-sans bg-slate-900 animate-fade-in">
      {/* Optimized High-Speed Full-Screen Background Image */}
      <Image
        src="/login_bg.jpg"
        alt="VEYRO Background Wallpaper"
        fill
        priority
        sizes="100vw"
        quality={80}
        className="object-cover object-center pointer-events-none"
      />

      {/* Subtle backdrop overlay */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none z-0" />

      {/* Main Container with Solid White macOS Style 3D Card */}
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10">
        <div
          className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 space-y-6 relative z-10 animate-scale-in"
          style={{
            boxShadow: '0 30px 70px -15px rgba(15, 23, 42, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)'
          }}
        >
          {/* Brand Header */}
          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center space-x-1.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">
                VEYRO
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-slate-900/10 text-slate-900 text-[9px] font-extrabold font-mono uppercase tracking-wider">
                POS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium font-sans">
              Wholesale Point of Sale & Accounts Terminal
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 animate-fade-in font-sans">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter username..."
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-transparent transition placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white focus:border-transparent transition placeholder:text-slate-400 placeholder:font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-sm flex items-center justify-center space-x-2 transition btn-press mt-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to VEYRO POS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-650" />
              <span>Secure Session</span>
            </span>
            <span className="text-slate-400">v0.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
