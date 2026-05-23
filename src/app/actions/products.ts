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

export async function createProduct(formData: FormData) {
  await getAuthUser();

  const categoryId = formData.get("categoryId") as string;

  await prisma.product.create({
    data: {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      brand: (formData.get("brand") as string) || null,
      categoryId: categoryId || null,
      caseQty: parseInt(formData.get("caseQty") as string) || 1,
      unitPrice: parseFloat(formData.get("unitPrice") as string),
      wholesalePrice: parseFloat(formData.get("wholesalePrice") as string),
      stockLevel: parseInt(formData.get("stockLevel") as string) || 0,
      minStockAlert: parseInt(formData.get("minStockAlert") as string) || 5,
    },
  });

  revalidatePath("/products");
}

export async function updateProduct(id: string, formData: FormData) {
  await getAuthUser();

  const categoryId = formData.get("categoryId") as string;

  await prisma.product.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      brand: (formData.get("brand") as string) || null,
      categoryId: categoryId || null,
      caseQty: parseInt(formData.get("caseQty") as string) || 1,
      unitPrice: parseFloat(formData.get("unitPrice") as string),
      wholesalePrice: parseFloat(formData.get("wholesalePrice") as string),
      stockLevel: parseInt(formData.get("stockLevel") as string) || 0,
      minStockAlert: parseInt(formData.get("minStockAlert") as string) || 5,
    },
  });

  revalidatePath("/products");
}

export async function deleteProduct(id: string) {
  await getAuthUser();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
}

export async function createCategory(name: string) {
  await getAuthUser();
  const category = await prisma.category.create({ data: { name } });
  revalidatePath("/products");
  return category;
}
