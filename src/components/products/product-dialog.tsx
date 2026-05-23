"use client";

import React, { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct, updateProduct } from "@/app/actions/products";
import type { Category, Product } from "@/types";

interface ProductDialogProps {
  product?: Product;
  categories: Category[];
  trigger?: React.ReactElement<{ onClick?: () => void }>;
}

export function ProductDialog({ product, categories, trigger }: ProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!product;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("categoryId", categoryId);

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateProduct(product.id, formData);
          toast.success("Product updated");
        } else {
          await createProduct(formData);
          toast.success("Product created");
          formRef.current?.reset();
          setCategoryId("");
        }
        setOpen(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Unique constraint") || msg.includes("sku")) {
          toast.error("SKU already exists");
        } else {
          toast.error("Something went wrong");
        }
      }
    });
  }

  const triggerEl = trigger
    ? React.cloneElement(trigger, { onClick: () => setOpen(true) })
    : (
      <Button onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Product
      </Button>
    );

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" name="name" required defaultValue={product?.name} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sku">SKU *</Label>
              <Input id="sku" name="sku" required defaultValue={product?.sku} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" name="brand" defaultValue={product?.brand ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="caseQty">Case Qty</Label>
              <Input
                id="caseQty"
                name="caseQty"
                type="number"
                min={1}
                defaultValue={product?.caseQty ?? 1}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={product?.unitPrice?.toString()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wholesalePrice">Wholesale Price *</Label>
              <Input
                id="wholesalePrice"
                name="wholesalePrice"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={product?.wholesalePrice?.toString()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stockLevel">Stock Level</Label>
              <Input
                id="stockLevel"
                name="stockLevel"
                type="number"
                min={0}
                defaultValue={product?.stockLevel ?? 0}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minStockAlert">Min Stock Alert</Label>
              <Input
                id="minStockAlert"
                name="minStockAlert"
                type="number"
                min={0}
                defaultValue={product?.minStockAlert ?? 5}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function EditProductButton({
  product,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  return (
    <ProductDialog
      product={product}
      categories={categories}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}
