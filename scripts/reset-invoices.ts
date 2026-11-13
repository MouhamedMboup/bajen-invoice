/**
 * Wipes ALL invoices (with their items and payments) and resets numbering so the
 * next invoice is INV-0001. Dry run by default; pass --confirm to actually delete.
 *
 *   npx tsx scripts/reset-invoices.ts            # show what would be deleted
 *   npx tsx scripts/reset-invoices.ts --confirm  # delete and reset
 */
import { config } from "dotenv";

// Must load env before importing prisma (a static import would run first).
config({ path: ".env.local", quiet: true });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const confirm = process.argv.includes("--confirm");

  try {
    const [invoices, items, payments, counter] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoiceItem.count(),
      prisma.payment.count(),
      prisma.invoiceCounter.findUnique({ where: { id: 1 } }),
    ]);
    console.log(
      `Current: ${invoices} invoices, ${items} invoice items, ${payments} payments; nextNumber = ${counter?.nextNumber ?? "(none)"}`,
    );

    if (!confirm) {
      console.log(
        "Dry run — nothing deleted. Re-run with --confirm to wipe all invoices and reset numbering.",
      );
      return;
    }

    // Serializable: if someone creates an invoice while this runs, the transaction
    // fails instead of leaving a survivor whose number would later be reused.
    const [delPayments, delItems, delInvoices] = await prisma.$transaction(
      [
        prisma.payment.deleteMany(),
        prisma.invoiceItem.deleteMany(),
        prisma.invoice.deleteMany(),
        prisma.invoiceCounter.upsert({
          where: { id: 1 },
          create: { id: 1, nextNumber: 1 },
          update: { nextNumber: 1 },
        }),
      ],
      { isolationLevel: "Serializable" },
    );
    console.log(
      `Deleted ${delInvoices.count} invoices, ${delItems.count} invoice items, ${delPayments.count} payments.`,
    );
    console.log("Next invoice will be INV-0001.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Reset failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
