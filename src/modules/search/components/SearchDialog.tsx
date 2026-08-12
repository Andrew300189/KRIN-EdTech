import { AppModal } from "@/core/components/AppModal";

/** Full-screen search surface for compact viewports, using the shared dialog layer. */
export function SearchDialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return <AppModal
    open={open}
    onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
    title="Search"
    description="Find courses, lessons and learning materials."
    size="fullscreen"
    initialFocus="[data-search-dialog-input]"
    closeLabel="Close search"
  >
    {children}
  </AppModal>;
}
