import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const directUrl = process.env.DIRECT_URL;
  const dbUrl = process.env.DATABASE_URL;

  console.log("[prisma] DIRECT_URL:", directUrl ? `set (${directUrl.substring(0, 40)}...)` : "NOT SET");
  console.log("[prisma] DATABASE_URL:", dbUrl ? `set (${dbUrl.substring(0, 40)}...)` : "NOT SET");

  const raw = directUrl ?? dbUrl!;
  // Strip query params like ?pgbouncer=true which pg library doesn't understand
  const connectionString = raw.split("?")[0];

  console.log("[prisma] Using:", connectionString.substring(0, 50) + "...");

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
