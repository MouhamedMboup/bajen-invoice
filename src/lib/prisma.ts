import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString(): string {
  // DIRECT_URL should be:
  //   - Local dev: direct Postgres URL (db.*.supabase.co:5432)
  //   - Vercel: Supabase session pooler URL (aws-0-*.pooler.supabase.com:5432)
  //             Username MUST be postgres.<project-ref> for the pooler to accept it.
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
  return raw.split("?")[0];
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
