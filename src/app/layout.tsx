import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { POSProvider } from '@/context/POSContext';
import { ToastProvider } from '@/context/ToastContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Buraq Wholesale POS & Accounts Ledger',
  description: 'High-performance wholesale point of sale terminal and customer account ledger management system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white`}>
        <ToastProvider>
          <POSProvider>{children}</POSProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
