import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString(): string {
  const raw = process.env.VERCEL
    ? process.env.DATABASE_URL!
    : (process.env.DIRECT_URL ?? process.env.DATABASE_URL!);

  let url = raw.split("?")[0];

  // Supabase pooler (*.pooler.supabase.com) requires username format
  // "postgres.<project-ref>" — plain "postgres" is rejected with XX000.
  // Extract the project ref from NEXT_PUBLIC_SUPABASE_URL and fix the username.
  if (url.includes(".pooler.supabase.com")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    if (projectRef && !url.includes(`postgres.${projectRef}`)) {
      url = url.replace(/^(postgr(?:es|esql):\/\/)postgres:/, `$1postgres.${projectRef}:`);
    }
  }

  return url;
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
