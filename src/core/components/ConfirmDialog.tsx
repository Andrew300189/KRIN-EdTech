"use client";

import { type ReactNode } from "react";
import { AppModal } from "./AppModal";
import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isProcessing?: boolean;
  children?: ReactNode;
  tone?: "danger" | "warning" | "neutral";
};

/** Compact, explicit confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isProcessing = false,
  children,
  tone = "danger",
}: ConfirmDialogProps) {
  return <AppModal
    open={open}
    onOpenChange={onOpenChange}
    title={title}
    description={description}
    size="small"
    closeOnOverlayClick={!isProcessing}
    closeOnEscape={!isProcessing}
    preventClose={isProcessing}
    loading={isProcessing}
    footer={<>
      <button type="button" className={styles.cancel} disabled={isProcessing} onClick={() => onOpenChange(false)}>{cancelLabel}</button>
      <button type="button" className={`${styles.confirm} ${tone === "danger" ? styles.danger : tone === "warning" ? styles.warning : styles.neutral}`} disabled={isProcessing} onClick={onConfirm}>{isProcessing ? "Working…" : confirmLabel}</button>
    </>}
  >
    {children ? <div className={styles.details}>{children}</div> : null}
  </AppModal>;
}
