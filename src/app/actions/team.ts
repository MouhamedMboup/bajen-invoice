"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bajen-invoice.vercel.app";
const SET_PASSWORD_URL = `${SITE_URL}/update-password`;

function wrapInviteLink(actionLink: string): string {
  return `${SITE_URL}/invite?link=${encodeURIComponent(actionLink)}`;
}

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") return null;

  return user;
}

export async function inviteUser(
  formData: FormData,
): Promise<{ link?: string; error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };

  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as Role;

  const admin = createAdminClient();

  let actionLink: string;
  let userId: string;

  const { data: inviteData, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: SET_PASSWORD_URL,
    },
  });

  if (inviteError) {
    if (inviteError.message.toLowerCase().includes("already")) {
      // User exists — send a magic link (works for both confirmed and unconfirmed users)
      const { data: mlData, error: mlError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: SET_PASSWORD_URL },
      });
      if (mlError) return { error: mlError.message };
      actionLink = mlData.properties.action_link;
      userId = mlData.user.id;
    } else {
      return { error: inviteError.message };
    }
  } else {
    actionLink = inviteData.properties.action_link;
    userId = inviteData.user.id;
  }

  await prisma.user.upsert({
    where: { id: userId },
    update: { fullName, role },
    create: { id: userId, email, fullName, role },
  });

  revalidatePath("/team");
  return { link: wrapInviteLink(actionLink) };
}

export async function sendPasswordReset(
  email: string,
): Promise<{ link?: string; error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: SET_PASSWORD_URL },
  });

  if (error) return { error: error.message };
  return { link: wrapInviteLink(data.properties.action_link) };
}

export async function updateUserRole(id: string, role: Role): Promise<{ error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };
  if (id === currentUser.id) return { error: "Cannot change your own role" };

  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/team");
  return {};
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };
  if (id === currentUser.id) return { error: "Cannot deactivate yourself" };

  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/team");
  return {};
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };
  if (id === currentUser.id) return { error: "Cannot delete yourself" };

  const [invoiceCount, expenseCount] = await Promise.all([
    prisma.invoice.count({ where: { createdById: id } }),
    prisma.expense.count({ where: { createdById: id } }),
  ]);

  if (invoiceCount > 0 || expenseCount > 0) {
    const parts: string[] = [];
    if (invoiceCount > 0) parts.push(`${invoiceCount} invoice${invoiceCount !== 1 ? "s" : ""}`);
    if (expenseCount > 0) parts.push(`${expenseCount} expense${expenseCount !== 1 ? "s" : ""}`);
    return {
      error: `Cannot delete — this user owns ${parts.join(" and ")}. Deactivate them instead.`,
    };
  }

  await prisma.user.delete({ where: { id } });

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);

  revalidatePath("/team");
  return {};
}
