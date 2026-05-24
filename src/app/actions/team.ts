"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") throw new Error("Forbidden");

  return user;
}

export async function inviteUser(formData: FormData) {
  await getAdminUser();

  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as Role;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (error) throw new Error(error.message);

  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { fullName, role },
    create: { id: data.user.id, email, fullName, role },
  });

  revalidatePath("/team");
}

export async function updateUserRole(id: string, role: Role) {
  const currentUser = await getAdminUser();
  if (id === currentUser.id) throw new Error("Cannot change your own role");

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/team");
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const currentUser = await getAdminUser();
  if (id === currentUser.id) throw new Error("Cannot deactivate yourself");

  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/team");
}
