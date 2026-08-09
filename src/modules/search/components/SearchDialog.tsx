export function SearchDialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-white p-4 md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Search</p>
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700">Back</button>
      </div>
      {children}
    </div>
  );
}
