"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function createCustomer(formData: FormData) {
  await getAuthUser();

  await prisma.customer.create({
    data: {
      companyName: formData.get("companyName") as string,
      contactName: (formData.get("contactName") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      billingAddress: (formData.get("billingAddress") as string) || null,
      shippingAddress: (formData.get("shippingAddress") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/customers");
}

export async function updateCustomer(id: string, formData: FormData) {
  await getAuthUser();

  await prisma.customer.update({
    where: { id },
    data: {
      companyName: formData.get("companyName") as string,
      contactName: (formData.get("contactName") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      billingAddress: (formData.get("billingAddress") as string) || null,
      shippingAddress: (formData.get("shippingAddress") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/customers");
}

export async function deleteCustomer(id: string) {
  await getAuthUser();
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}

export async function toggleCustomerActive(id: string, isActive: boolean) {
  await getAuthUser();
  await prisma.customer.update({ where: { id }, data: { isActive } });
  revalidatePath("/customers");
}
