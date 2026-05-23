/**
 * Creates the first admin user in Supabase Auth + the local users table.
 * Run once: npx tsx prisma/seed.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role needed to create users
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "amethmboup99@gmail.com";
const ADMIN_PASSWORD = "Bajen@Admin2026!";
const ADMIN_NAME = "Mouhamed Mboup";

async function main() {
  console.log("Creating admin user in Supabase Auth…");

  // Create or fetch the Supabase Auth user
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // skip email verification
    });

  let authId: string;

  if (createErr) {
    if (createErr.message.includes("already been registered")) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === ADMIN_EMAIL);
      if (!existing) throw new Error("Could not find existing user");
      authId = existing.id;
      console.log("Auth user already exists, reusing id:", authId);
    } else {
      throw createErr;
    }
  } else {
    authId = created.user.id;
    console.log("Auth user created:", authId);
  }

  // Upsert into our users table
  const user = await prisma.user.upsert({
    where: { id: authId },
    update: { role: "ADMIN", isActive: true },
    create: {
      id: authId,
      email: ADMIN_EMAIL,
      fullName: ADMIN_NAME,
      role: "ADMIN",
      isActive: true,
    },
  });

  // Seed the InvoiceCounter row (must always have exactly one row)
  await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nextNumber: 1 },
  });

  console.log("✅ Admin user ready:", user.email, "| Role:", user.role);
  console.log("✅ InvoiceCounter seeded.");
  console.log("\nLogin credentials:");
  console.log("  Email:   ", ADMIN_EMAIL);
  console.log("  Password:", ADMIN_PASSWORD);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
