import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { getRoleWorkspacePath } from "@/core/utils/workspace-path";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await requireAuth();
  if (authenticated) {
    redirect(getRoleWorkspacePath(authenticated.user.role));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
