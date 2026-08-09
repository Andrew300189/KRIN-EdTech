export function SearchError({ onRetry }: { onRetry: () => void }) {
  return <div className="px-3 py-3 text-sm text-red-700">Unable to perform search. <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button></div>;
}
