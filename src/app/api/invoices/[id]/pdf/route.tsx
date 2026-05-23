import { NextResponse, type NextRequest } from "next/server";
import path from "path";
import fs from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: { orderBy: { paidAt: "desc" } },
      createdBy: true,
      updatedBy: true,
    },
  });

  if (!invoice) return new NextResponse("Not found", { status: 404 });

  // Read logo as base64 data URI so @react-pdf/renderer can embed it reliably
  const logoFile = path.join(process.cwd(), "public", "logo.png");
  const logoSrc = `data:image/png;base64,${fs.readFileSync(logoFile).toString("base64")}`;

  const buffer = await renderToBuffer(
    <InvoicePDF invoice={invoice} logoSrc={logoSrc} />
  );

  const filename = `${invoice.invoiceNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
