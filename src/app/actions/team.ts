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

async function sendEmail(to: string, subject: string, html: string): Promise<string | null> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Bajen Sheabutter INC. <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    return body.message ?? `Email send failed (${res.status})`;
  }
  return null;
}

export async function inviteUser(formData: FormData): Promise<{ error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };

  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as Role;

  const admin = createAdminClient();

  // Generate the invite link — does NOT send an email
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
      // User already exists — generate a recovery link so they can still set their password
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

  // Send via Resend API directly — no Supabase SMTP involved
  const emailError = await sendEmail(
    email,
    "You're invited to Bajen Invoice",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#15803d">You've been invited to Bajen Invoice</h2>
      <p>Hi ${fullName},</p>
      <p>You've been invited to join <strong>Bajen Sheabutter INC.</strong>'s invoice management platform.</p>
      <p>Click the button below to set your password and access the app:</p>
      <a href="${actionLink}" style="display:inline-block;background:#15803d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">Accept invitation</a>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours. If you didn't expect this invitation, you can ignore this email.</p>
    </div>`,
  );

  if (emailError) return { error: `Failed to send email: ${emailError}` };

  await prisma.user.upsert({
    where: { id: userId },
    update: { fullName, role },
    create: { id: userId, email, fullName, role },
  });

  revalidatePath("/team");
  return {};
}

export async function sendPasswordReset(email: string): Promise<{ error?: string }> {
  const currentUser = await getAdminUser();
  if (!currentUser) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${SITE_URL}/auth/callback?next=/update-password` },
  });

  if (error) return { error: error.message };

  const emailError = await sendEmail(
    email,
    "Set your Bajen Invoice password",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#15803d">Set your password</h2>
      <p>An admin has sent you access to <strong>Bajen Invoice</strong>.</p>
      <p>Click the button below to set your password and sign in:</p>
      <a href="${data.properties.action_link}" style="display:inline-block;background:#15803d;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">Set password & sign in</a>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">This link expires in 24 hours.</p>
    </div>`,
  );

  if (emailError) return { error: `Failed to send email: ${emailError}` };
  return {};
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
