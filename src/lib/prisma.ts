import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString(): string {
  if (process.env.VERCEL) {
    // Vercel cannot reach db.*.supabase.co (direct host).
    // DATABASE_URL is the transaction pooler (port 6543) — always reachable.
    // Strip query params because pg doesn't understand pgbouncer=true etc.
    return process.env.DATABASE_URL!.split("?")[0];
  }
  // Local: use the direct URL (bypasses pgBouncer).
  return (process.env.DIRECT_URL ?? process.env.DATABASE_URL!).split("?")[0];
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getConnectionString(),
      max: 2,
      // Supabase requires SSL; pg adapter doesn't infer it from the URL
      // Supabase pooler uses a self-signed cert in its chain; disable verification
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    }),
  });
globalForPrisma.prisma = prisma;
