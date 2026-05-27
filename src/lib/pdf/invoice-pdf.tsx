import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceWithRelations } from "@/types";

// Bajen brand green (closest sRGB to oklch(0.42 0.13 148))
const GREEN = "#2B6B45";
const GREEN_LIGHT = "#EAF4EF";
const GRAY = "#6B7280";
const DARK = "#111827";
const BORDER = "#E5E7EB";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingHorizontal: 40,
    paddingVertical: 36,
    backgroundColor: "#FFFFFF",
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  logo: { width: 100, height: 34, objectFit: "contain" },
  companyBlock: { alignItems: "flex-end", gap: 2 },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GREEN },
  companyMeta: { color: GRAY, fontSize: 8 },

  // ── Invoice title band ────────────────────────────────────────────
  titleBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  invoiceLabel: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  invoiceNumber: { fontSize: 13, color: "#FFFFFF", opacity: 0.85 },

  // ── Meta grid ─────────────────────────────────────────────────────
  metaRow: { flexDirection: "row", gap: 0, marginBottom: 20 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  // ── Bill To ───────────────────────────────────────────────────────
  billSection: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  billTitle: { fontSize: 7, color: GREEN, textTransform: "uppercase", fontFamily: "Helvetica-Bold", marginBottom: 6 },
  billName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  billDetail: { fontSize: 8, color: GRAY, marginBottom: 1 },

  // ── Table ─────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: "solid",
  },
  tableRowAlt: { backgroundColor: "#F9FAFB" },
  tableCell: { fontSize: 9 },
  tableCellMuted: { fontSize: 8, color: GRAY },

  colDesc: { flex: 3 },
  colSku:  { flex: 1.5, textAlign: "left" },
  colQty:  { flex: 0.8, textAlign: "right" },
  colPrice: { flex: 1.2, textAlign: "right" },
  colDisc: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.4, textAlign: "right" },

  // ── Totals ────────────────────────────────────────────────────────
  totalsSection: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totalsBox: { width: 200 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 8, color: GRAY },
  totalsValue: { fontSize: 9 },
  totalsDivider: { borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", marginVertical: 4 },
  totalsBold: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totalsBalance: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GREEN },

  // ── Notes ─────────────────────────────────────────────────────────
  notesSection: { marginTop: 20 },
  notesLabel: { fontSize: 7, color: GRAY, textTransform: "uppercase", marginBottom: 4 },
  notesText: { fontSize: 8, color: DARK, lineHeight: 1.5 },

  // ── Payments ──────────────────────────────────────────────────────
  paymentsSection: { marginTop: 20 },
  paymentsTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 6, color: DARK },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: GRAY },
});

const PAYMENT_METHOD: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  OTHER: "Other",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  UNPAID: "Unpaid",
  PAID: "Paid",
  PARTIAL: "Partial",
  OVERDUE: "Overdue",
};

function fmt(n: Prisma.Decimal | number | string) {
  return `$${Number(n).toFixed(2)}`;
}

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  invoice: InvoiceWithRelations;
  logoSrc: string;
}

export function InvoicePDF({ invoice, logoSrc }: Props) {
  const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(invoice.total) - totalPaid;

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author="Bajen Sheabutter INC."
      subject={`Invoice for ${invoice.customer.companyName}`}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoSrc} style={s.logo} />
          <View style={s.companyBlock}>
            <Text style={s.companyName}>Bajen Sheabutter INC.</Text>
            <Text style={s.companyMeta}>info@bajensheabutter.com</Text>
            <Text style={s.companyMeta}>+1 (555) 000-0000</Text>
            <Text style={s.companyMeta}>New York, NY, USA</Text>
          </View>
        </View>

        {/* ── Title band ── */}
        <View style={s.titleBand}>
          <Text style={s.invoiceLabel}>INVOICE</Text>
          <Text style={s.invoiceNumber}>{invoice.invoiceNumber}</Text>
        </View>

        {/* ── Meta row ── */}
        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Date Issued</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.createdAt)}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Status</Text>
            <Text style={s.metaValue}>{STATUS_LABEL[invoice.status]}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Prepared By</Text>
            <Text style={s.metaValue}>{invoice.createdBy.fullName}</Text>
          </View>
        </View>

        {/* ── Bill To ── */}
        <View style={s.billSection}>
          <Text style={s.billTitle}>Bill To</Text>
          <Text style={s.billName}>{invoice.customer.companyName}</Text>
          {invoice.customer.contactName && (
            <Text style={s.billDetail}>{invoice.customer.contactName}</Text>
          )}
          {invoice.customer.billingAddress && (
            <Text style={s.billDetail}>{invoice.customer.billingAddress}</Text>
          )}
          {invoice.customer.email && (
            <Text style={s.billDetail}>{invoice.customer.email}</Text>
          )}
          {invoice.customer.phone && (
            <Text style={s.billDetail}>{invoice.customer.phone}</Text>
          )}
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, s.colDesc]}>Description</Text>
          <Text style={[s.tableHeaderCell, s.colSku]}>SKU</Text>
          <Text style={[s.tableHeaderCell, s.colQty]}>Qty</Text>
          <Text style={[s.tableHeaderCell, s.colPrice]}>Unit Price</Text>
          <Text style={[s.tableHeaderCell, s.colDisc]}>Discount</Text>
          <Text style={[s.tableHeaderCell, s.colTotal]}>Total</Text>
        </View>

        {invoice.items.map((item, i) => (
          <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCell, s.colDesc]}>{item.productName}</Text>
            <Text style={[s.tableCellMuted, s.colSku]}>{item.productSku ?? "—"}</Text>
            <Text style={[s.tableCell, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tableCell, s.colPrice]}>{fmt(item.unitPrice)}</Text>
            <Text style={[s.tableCell, s.colDisc]}>
              {Number(item.discount) > 0 ? `-${fmt(item.discount)}` : "—"}
            </Text>
            <Text style={[s.tableCell, s.colTotal, { fontFamily: "Helvetica-Bold" }]}>
              {fmt(item.total)}
            </Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsSection}>
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{fmt(invoice.subtotal)}</Text>
            </View>
            {Number(invoice.taxRate) > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Tax ({Number(invoice.taxRate)}%)</Text>
                <Text style={s.totalsValue}>{fmt(invoice.taxAmount)}</Text>
              </View>
            )}
            {Number(invoice.discountAmount) > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Discount</Text>
                <Text style={s.totalsValue}>-{fmt(invoice.discountAmount)}</Text>
              </View>
            )}
            <View style={s.totalsDivider} />
            <View style={s.totalsRow}>
              <Text style={s.totalsBold}>Total</Text>
              <Text style={s.totalsBold}>{fmt(invoice.total)}</Text>
            </View>
            {totalPaid > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Total Paid</Text>
                <Text style={s.totalsValue}>{fmt(totalPaid)}</Text>
              </View>
            )}
            <View style={s.totalsDivider} />
            <View style={s.totalsRow}>
              <Text style={s.totalsBalance}>Balance Due</Text>
              <Text style={s.totalsBalance}>{fmt(balance)}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Payment history ── */}
        {invoice.payments.length > 0 && (
          <View style={s.paymentsSection}>
            <Text style={s.paymentsTitle}>Payment History</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Date</Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>Method</Text>
              <Text style={[s.tableHeaderCell, { flex: 3 }]}>Notes</Text>
              <Text style={[s.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Amount</Text>
            </View>
            {invoice.payments.map((p, i) => (
              <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, { flex: 2 }]}>{fmtDate(p.paidAt)}</Text>
                <Text style={[s.tableCell, { flex: 2 }]}>{PAYMENT_METHOD[p.method]}</Text>
                <Text style={[s.tableCellMuted, { flex: 3 }]}>{p.notes ?? "—"}</Text>
                <Text style={[s.tableCell, { flex: 1.5, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>
                  {fmt(p.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            © {new Date().getFullYear()} Bajen Sheabutter INC. — Internal document
          </Text>
          <Text style={s.footerText}>
            Thank you for your business!
          </Text>
        </View>

      </Page>
    </Document>
  );
}
