"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bajen-invoice.vercel.app";

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
      redirectTo: `${SITE_URL}/auth/callback?next=/update-password`,
    },
  });

  if (inviteError) {
    if (inviteError.message === "User already registered") {
      // User exists — generate a recovery link so they can set their password
      const { data: recoveryData, error: recoveryError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${SITE_URL}/auth/callback?next=/update-password` },
      });
      if (recoveryError) return { error: recoveryError.message };
      actionLink = recoveryData.properties.action_link;
      userId = recoveryData.user.id;
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
  return { link: actionLink };
}

export async function sendPasswordReset(
  email: string,
): Promise<{ link?: string; error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/auth/callback?next=/update-password` },
  });

  if (error) return { error: error.message };
  return { link: data.properties.action_link };
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
