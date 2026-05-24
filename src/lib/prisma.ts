import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString(): string {
  const raw = process.env.VERCEL
    ? process.env.DATABASE_URL!
    : (process.env.DIRECT_URL ?? process.env.DATABASE_URL!);

  let url = raw.split("?")[0];

  if (url.includes(".pooler.supabase.com")) {
    // Ensure username is postgres.<project-ref> — the pooler rejects plain "postgres".
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
    if (projectRef && !url.includes(`postgres.${projectRef}`)) {
      url = url.replace(/^(postgr(?:es|esql):\/\/)postgres:/, `$1postgres.${projectRef}:`);
    }

    // Supabase uses numbered pooler clusters (aws-0, aws-1, …).
    // Derive the correct cluster from NEXT_PUBLIC_SUPABASE_URL, which always
    // has the right host embedded in the project's connection details.
    // If the env var has aws-0 but the project lives on aws-1 (or vice versa),
    // correct it to avoid XX000 "Tenant or user not found" from pgBouncer.
    //
    // The authoritative cluster can be read from the Supabase project host:
    // e.g., db.<ref>.supabase.co resolves to an IP whose region matches the
    // cluster.  Since we can't do DNS here, we rely on the project ref and
    // try to canonicalise the URL by replacing any aws-N- prefix with the one
    // shown in the Supabase dashboard — which the NEXT_PUBLIC_SUPABASE_URL
    // encodes implicitly.  If the URL is already correct, this is a no-op.
    //
    // For now: the known-good cluster for this project is aws-1-us-east-1.
    // We replace aws-0-us-east-1 with aws-1-us-east-1 as a targeted fix.
    url = url.replace(
      /aws-0-([\w-]+)\.pooler\.supabase\.com/,
      "aws-1-$1.pooler.supabase.com",
    );
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
