import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { nextAuthOptions } from "@/core/server/next-auth";
import { getPostLoginPath } from "@/core/utils/workspace-path";

export default async function AuthCompletePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [session, params] = await Promise.all([getServerSession(nextAuthOptions), searchParams]);
  if (!session?.user) redirect("/login?reason=session_required");

  const role = (session.user as typeof session.user & { role?: string }).role;
  redirect(getPostLoginPath(role, params.next));
}
