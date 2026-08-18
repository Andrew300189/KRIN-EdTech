"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import styles from "./CmsUsersWorkspace.module.css";

export function CmsUserActions({ userId, userName, archived, isOwner }: { userId: string; userName: string; archived: boolean; isOwner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const perform = async (method: "DELETE" | "PATCH") => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify({ action: "restore" }) : undefined,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? "Unable to update this user.");
        return;
      }
      setConfirmDelete(false);
      router.refresh();
    } catch {
      setError("Unable to update this user. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isOwner) return <span className={styles.ownerLabel}>Protected owner account</span>;

  return <div className={styles.actions}>
    <button type="button" disabled={busy} onClick={() => archived ? void perform("PATCH") : setConfirmDelete(true)} className={`${styles.actionButton} ${archived ? styles.restoreButton : styles.deleteButton}`}>{busy ? "Saving…" : archived ? "Restore" : "Delete"}</button>
    {error ? <span role="alert" className={styles.actionError}>{error}</span> : null}
    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={`Delete ${userName}?`}
      description="This removes the account's access. It does not erase protected learning and payment records."
      confirmLabel="Delete account"
      onConfirm={() => void perform("DELETE")}
      isProcessing={busy}
    >
      <p>The account can be restored later from CMS users.</p>
    </ConfirmDialog>
  </div>;
}
