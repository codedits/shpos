export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number; // Wholesale selling price in Rs.
  costPrice?: number; // Wholesale purchase price in Rs.
  categoryId: string;
  barcode: string;
  stock: number; // Available inventory count
  unit?: string; // e.g. Pcs, Carton, Box, Kg, Bale
  sku: string;
  image?: string;
  description?: string;
  isTaxable?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number; // 0 to 100
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  outstandingBalance: number; // Pending Khata / Udhar balance in Rs.
  creditLimit?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'qr' | 'credit'; // 'credit' = Pay Later / Khata

export interface Transaction {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue: number;
  customer?: Customer;
  createdAt: string;
  cashierName: string;
  notes?: string;
  status: 'completed' | 'refunded';
}

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxRatePercent: number;
  currencySymbol: string;
  receiptHeader: string;
  receiptFooter: string;
  autoPrintReceipt: boolean;
}

export interface HeldOrder {
  id: string;
  customerName: string;
  items: CartItem[];
  createdAt: string;
  note?: string;
}
