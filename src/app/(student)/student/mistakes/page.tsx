import MistakesPage from "@/app/profile/mistakes/page";

export default async function StudentMistakesPage({
  searchParams,
}: {
  searchParams: Promise<{
    resolved?: string | string[];
    position?: string | string[];
  }>;
}) {
  return <MistakesPage searchParams={searchParams} />;
}
