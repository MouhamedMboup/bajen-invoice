"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Check, Trash2 } from "lucide-react";
import type { Role } from "@/types";
import { updateUserRole, toggleUserActive, sendPasswordReset, deleteUser } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface UserActionsProps {
  userId: string;
  email: string;
  currentRole: Role;
  isActive: boolean;
  isSelf: boolean;
}

export function UserActions({ userId, email, currentRole, isActive, isSelf }: UserActionsProps) {
  const [rolePending, startRoleTransition] = useTransition();
  const [activePending, startActiveTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;
    startRoleTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Role updated");
    });
  }

  function handleToggleActive() {
    startActiveTransition(async () => {
      const result = await toggleUserActive(userId, !isActive);
      if (result?.error) { toast.error(result.error); return; }
      toast.success(isActive ? "User deactivated" : "User reactivated");
    });
  }

  function handleResend() {
    startResetTransition(async () => {
      const result = await sendPasswordReset(email);
      if (result?.error) { toast.error(result.error); return; }
      setResetLink(result.link ?? null);
    });
  }

  async function handleCopy() {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteUser(userId);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("User deleted");
      setConfirmDelete(false);
    });
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          defaultValue={currentRole}
          onChange={handleRoleChange}
          disabled={rolePending}
          className="h-8 cursor-pointer rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="ADMIN">Admin</option>
        </select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleResend}
          disabled={resetPending}
        >
          {resetPending ? "…" : "Resend invite"}
        </Button>

        <Button
          size="sm"
          variant={isActive ? "outline" : "default"}
          className="h-8 text-xs"
          onClick={handleToggleActive}
          disabled={activePending}
        >
          {activePending ? "…" : isActive ? "Deactivate" : "Reactivate"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
          disabled={deletePending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {email}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              This permanently removes the user from the app and revokes their login access. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deletePending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deletePending}>
                {deletePending ? "Deleting…" : "Delete user"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetLink} onOpenChange={(v) => { if (!v) { setResetLink(null); setCopied(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite link for {email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Share this link with the user. They click it, set their password, and can log in immediately.
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={resetLink ?? ""}
                className="text-xs font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">This link expires in 24 hours.</p>
            <div className="flex justify-end">
              <Button onClick={() => { setResetLink(null); setCopied(false); }}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
