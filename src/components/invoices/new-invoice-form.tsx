"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createInvoice } from "@/app/actions/invoices";
import type { Customer, Product } from "@/types";

interface LineItem {
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
}

function emptyLine(): LineItem {
  return { productId: null, productName: "", productSku: null, quantity: 1, unitPrice: 0, discount: 0 };
}

interface NewInvoiceFormProps {
  customers: Customer[];
  products: Product[];
}

export function NewInvoiceForm({ customers, products }: NewInvoiceFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleProductSelect(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      updateItem(index, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitPrice: Number(product.wholesalePrice),
      });
    }
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
    0
  );
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discountAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (items.some((item) => !item.productName)) {
      toast.error("All line items need a product name");
      return;
    }

    startTransition(async () => {
      try {
        await createInvoice({
          customerId,
          dueDate: dueDate || null,
          taxRate,
          discountAmount,
          notes: notes || null,
          items,
        });
      } catch (err: unknown) {
        // redirect throws internally in Next.js — don't toast on it
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("NEXT_REDIRECT")) {
          toast.error("Failed to create invoice");
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header fields */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Invoice Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label>Customer *</Label>
            <SearchableSelect
              value={customerId}
              onValueChange={setCustomerId}
              options={customers.map((c) => ({ value: c.id, label: c.companyName }))}
              placeholder="Select customer"
              searchPlaceholder="Search customers…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="font-semibold">Line Items</h3>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs text-muted-foreground">Product</Label>
                <SearchableSelect
                  value={item.productId ?? ""}
                  onValueChange={(v) => { if (v) handleProductSelect(index, v); }}
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select product"
                  searchPlaceholder="Search products…"
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Name (custom)</Label>
                <Input
                  value={item.productName}
                  onChange={(e) => updateItem(index, { productName: e.target.value, productId: null })}
                  placeholder="or type a name"
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Unit Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Disc.</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.discount}
                  onChange={(e) => updateItem(index, { discount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-1 flex justify-end pb-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems((prev) => [...prev, emptyLine()])}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Line
        </Button>
      </div>

      {/* Totals and notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Notes</h3>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for this invoice…"
          />
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="discountAmount">Invoice Discount ($)</Label>
              <Input
                id="discountAmount"
                type="number"
                step="0.01"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
