import { NextResponse } from "next/server";
import { Pool } from "pg";

function redact(url: string) {
  try { const u = new URL(url); u.password = "***"; return u.toString(); }
  catch { return url.replace(/:([^@]+)@/, ":***@"); }
}

async function testPool(connectionString: string, tag: string) {
  try {
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 6000 });
    const client = await pool.connect();
    const res = await client.query("SELECT current_user, version()");
    client.release();
    await pool.end();
    return { tag, ok: true, user: res.rows[0].current_user };
  } catch (e) {
    return { tag, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const poolerUrl = (process.env.DATABASE_URL ?? "").split("?")[0];
  const directUrl = (process.env.DIRECT_URL ?? "").split("?")[0];

  const [poolerResult, directResult] = await Promise.allSettled([
    testPool(poolerUrl, "pooler"),
    testPool(directUrl, "direct"),
  ]);

  return NextResponse.json({
    isVercel: !!process.env.VERCEL,
    poolerUrl: redact(poolerUrl),
    directUrl: redact(directUrl),
    pooler: poolerResult.status === "fulfilled" ? poolerResult.value : { ok: false, error: String(poolerResult.reason) },
    direct: directResult.status === "fulfilled" ? directResult.value : { ok: false, error: String(directResult.reason) },
  }, { status: 200 });
}
