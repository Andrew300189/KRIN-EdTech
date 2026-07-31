export function EmptyCategoryState({ message = "Course content is being prepared." }: { message?: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">{message}</div>;
}
