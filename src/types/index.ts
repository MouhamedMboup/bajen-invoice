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
