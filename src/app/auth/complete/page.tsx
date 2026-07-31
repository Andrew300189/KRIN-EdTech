import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { nextAuthOptions } from "@/core/server/next-auth";

function safeInternalPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function AuthCompletePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [session, params] = await Promise.all([getServerSession(nextAuthOptions), searchParams]);
  if (!session?.user) redirect("/login?reason=session_required");

  redirect(safeInternalPath(params.next));
}
