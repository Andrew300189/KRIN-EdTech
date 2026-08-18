"use client";

import { useState, type ReactNode } from "react";
import { AppModal } from "@/core/components/AppModal";
import styles from "./CmsLessonAdvancedSettings.module.css";

/** Keeps infrequent CMS controls out of the focused lesson-authoring canvas. */
export function CmsLessonAdvancedSettings({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} className={styles.trigger}>Advanced settings</button>
    <AppModal
      open={open}
      onOpenChange={setOpen}
      title="Advanced lesson settings"
      description="Manage specialised blocks, publishing, grammar links and the full exercise catalogue without leaving the lesson builder."
      size="fullscreen"
    >
      <div className={styles.content}>{children}</div>
    </AppModal>
  </>;
}
