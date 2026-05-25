import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: { orderBy: { paidAt: "asc" } },
      createdBy: true,
      updatedBy: true,
    },
  });

  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const logoPath = join(process.cwd(), "public", "logo.png");
  const logoBase64 = readFileSync(logoPath).toString("base64");
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} logoSrc={logoSrc} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
