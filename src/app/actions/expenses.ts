"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { ExpenseCategory } from "@/types";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createExpense(formData: FormData) {
  const user = await getAuthUser();

  await prisma.expense.create({
    data: {
      category: formData.get("category") as ExpenseCategory,
      amount: parseFloat(formData.get("amount") as string),
      description: (formData.get("description") as string) || null,
      date: new Date(formData.get("date") as string),
      createdById: user.id,
    },
  });

  revalidatePath("/expenses");
}

export async function updateExpense(id: string, formData: FormData) {
  await getAuthUser();

  await prisma.expense.update({
    where: { id },
    data: {
      category: formData.get("category") as ExpenseCategory,
      amount: parseFloat(formData.get("amount") as string),
      description: (formData.get("description") as string) || null,
      date: new Date(formData.get("date") as string),
    },
  });

  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  await getAuthUser();
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
}
