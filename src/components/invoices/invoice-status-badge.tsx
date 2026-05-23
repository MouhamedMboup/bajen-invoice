import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/types";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  UNPAID: { label: "Unpaid", variant: "outline" },
  PAID: { label: "Paid", variant: "default" },
  PARTIAL: { label: "Partial", variant: "secondary" },
  OVERDUE: { label: "Overdue", variant: "destructive" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
