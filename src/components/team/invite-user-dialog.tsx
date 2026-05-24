"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser } from "@/app/actions/team";

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await inviteUser(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setInviteLink(result.link ?? null);
    });
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setInviteLink(null);
    setCopied(false);
    formRef.current?.reset();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invite User
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-800">User created successfully</p>
                <p className="text-xs text-green-700 mt-1">
                  Share the link below with them — they click it, set their password, and can log in immediately.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Invite link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="text-xs font-mono truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This link expires in 24 hours.</p>
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" placeholder="Jane Smith" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  defaultValue="EMPLOYEE"
                  className="flex h-9 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Generating…" : "Generate invite link"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
