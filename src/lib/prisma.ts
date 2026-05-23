import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString(): string {
  if (process.env.VERCEL) {
    // Vercel cannot reach the direct Supabase host (db.*.supabase.co).
    // DATABASE_URL is the transaction pooler (port 6543) — swapping to port 5432
    // gives the session pooler, which is reachable and compatible with pg adapter.
    return (process.env.DATABASE_URL ?? process.env.DIRECT_URL!)
      .replace(":6543/", ":5432/")
      .split("?")[0];
  }
  // Local: direct URL bypasses pgBouncer entirely.
  return (process.env.DIRECT_URL ?? process.env.DATABASE_URL!).split("?")[0];
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: getConnectionString(), max: 2 }) });
globalForPrisma.prisma = prisma;
