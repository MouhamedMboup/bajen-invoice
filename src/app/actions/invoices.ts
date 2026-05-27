"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { InvoiceStatus, PaymentMethod } from "@/types";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function nextInvoiceNumber(): Promise<string> {
  const counter = await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    create: { id: 1, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  // counter.nextNumber is already incremented; the invoice number is the value before increment
  // We upsert: on create nextNumber=2 (means we just created #1), on update we get the new value
  // So the invoice number = nextNumber - 1 when updating, or 1 when creating
  // Simpler: read first, then increment
  return `INV-${String(counter.nextNumber - 1 || 1).padStart(4, "0")}`;
}

export interface InvoiceLineItem {
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export async function createInvoice(data: {
  customerId: string;
  dueDate: string | null;
  taxRate: number;
  discountAmount: number;
  notes: string | null;
  items: InvoiceLineItem[];
}) {
  const user = await getAuthUser();

  const subtotal = data.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice - item.discount;
  }, 0);

  const taxAmount = (subtotal * data.taxRate) / 100;
  const total = subtotal + taxAmount - data.discountAmount;

  // Get next sequential invoice number atomically
  await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    create: { id: 1, nextNumber: 1 },
    update: {},
  });

  const counter = await prisma.invoiceCounter.update({
    where: { id: 1 },
    data: { nextNumber: { increment: 1 } },
  });

  const invoiceNumber = `INV-${String(counter.nextNumber - 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: data.customerId,
      status: "UNPAID",
      subtotal,
      taxRate: data.taxRate,
      taxAmount,
      discountAmount: data.discountAmount,
      total,
      notes: data.notes,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdById: user.id,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.quantity * item.unitPrice - item.discount,
        })),
      },
    },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(id: string, data: {
  customerId: string;
  dueDate: string | null;
  taxRate: number;
  discountAmount: number;
  notes: string | null;
  items: InvoiceLineItem[];
}) {
  const user = await getAuthUser();

  const subtotal = data.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice - item.discount;
  }, 0);

  const taxAmount = (subtotal * data.taxRate) / 100;
  const total = subtotal + taxAmount - data.discountAmount;

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id },
      data: {
        customerId: data.customerId,
        subtotal,
        taxRate: data.taxRate,
        taxAmount,
        discountAmount: data.discountAmount,
        total,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        updatedById: user.id,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.quantity * item.unitPrice - item.discount,
          })),
        },
      },
    });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  await getAuthUser();
  await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function addPayment(invoiceId: string, formData: FormData) {
  await getAuthUser();

  const amount = parseFloat(formData.get("amount") as string);
  const method = formData.get("method") as PaymentMethod;
  const notes = (formData.get("notes") as string) || null;

  await prisma.payment.create({
    data: { invoiceId, amount, method, notes },
  });

  // Auto-update invoice status based on total paid
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (invoice) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = Number(invoice.total);
    let newStatus: InvoiceStatus = invoice.status;

    if (totalPaid >= invoiceTotal) {
      newStatus = "PAID";
    } else if (totalPaid > 0) {
      newStatus = "PARTIAL";
    }

    if (newStatus !== invoice.status) {
      await prisma.invoice.update({ where: { id: invoiceId }, data: { status: newStatus } });
    }
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(id: string) {
  await getAuthUser();
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  redirect("/invoices");
}
