import type {
  User,
  Customer,
  Product,
  Invoice,
  InvoiceItem,
  Payment,
  Expense,
  Category,
  Role,
  InvoiceStatus,
  ExpenseCategory,
  PaymentMethod,
} from "@/generated/prisma/client";

export type {
  User,
  Customer,
  Product,
  Invoice,
  InvoiceItem,
  Payment,
  Expense,
  Category,
  Role,
  InvoiceStatus,
  ExpenseCategory,
  PaymentMethod,
};

export type InvoiceWithRelations = Invoice & {
  customer: Customer;
  items: (InvoiceItem & { product: Product | null })[];
  payments: Payment[];
  createdBy: User;
  updatedBy: User | null;
};

export type ProductWithCategory = Product & {
  category: Category | null;
};

export type CustomerWithInvoices = Customer & {
  invoices: Invoice[];
};

export type DashboardStats = {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  overdueCount: number;
  unpaidCount: number;
  lowStockCount: number;
};

// Plain (serializable) shapes passed from Server Components to the invoice forms.
// Prisma Decimals can't cross the client boundary, so prices are plain numbers.
export type InvoiceFormCustomer = { id: string; companyName: string };
export type InvoiceFormProduct = {
  id: string;
  name: string;
  sku: string | null;
  wholesalePrice: number;
};
