import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Settings — Bajen Invoice" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage employees and company settings.</p>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">Employee management coming soon.</p>
      </div>
    </div>
  );
}
