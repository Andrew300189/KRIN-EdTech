import { notFound, redirect } from "next/navigation";

const levelCodes = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

/** Preserve old level URLs while moving level selection into the catalogue. */
export default async function StudentLevelPage({
  params,
}: {
  params: Promise<{ levelCode: string }>;
}) {
  const level = (await params).levelCode.trim().toUpperCase();
  if (!levelCodes.has(level)) notFound();
  redirect(`/student/catalog?level=${level}`);
}
