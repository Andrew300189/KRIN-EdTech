"use client";

import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";

/** Full-screen search surface for compact viewports, using the shared dialog layer. */
export function SearchDialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const { t } = useLocale();
  return <AppModal
    open={open}
    onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
    title={t("search.dialog.title")}
    description={t("search.dialog.description")}
    size="fullscreen"
    initialFocus="[data-search-dialog-input]"
    closeLabel={t("search.dialog.close")}
  >
    {children}
  </AppModal>;
}
