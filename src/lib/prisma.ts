import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
  // Strip ?pgbouncer=true — pg library doesn't understand those query params
  const connectionString = raw.split("?")[0];
  const adapter = new PrismaPg({ connectionString, max: 2 });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
