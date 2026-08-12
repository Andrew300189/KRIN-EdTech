"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { getSafeInternalPath } from "@/core/utils/safe-internal-path";
import { LoginModal } from "./LoginModal";

/** Turns direct /login and /register links into the same shared auth dialog. */
export function AuthModalEntry({ initialView }: { initialView: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeInternalPath(searchParams.get("next") ?? searchParams.get("callbackUrl"), "");
  const reason = searchParams.get("reason");
  const authError = searchParams.get("error");
  const requestErrorId = process.env.NODE_ENV === "development" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(searchParams.get("errorId") ?? "")
    ? searchParams.get("errorId") ?? undefined
    : undefined;
  const notice = reason === "session_expired"
    ? { message: "Your session has expired. Please sign in again.", tone: "info" as const }
    : reason === "session_required"
      ? { message: "Please sign in to continue.", tone: "info" as const }
      : authError === "cms_access_denied"
        ? { message: "We could not confirm the platform-owner access for this session.", tone: "error" as const, errorId: requestErrorId }
        : authError
          ? { message: "We could not sign you in with Google. Please try again.", tone: "error" as const, errorId: requestErrorId }
          : undefined;

  return <LoginModal open onClose={() => router.replace(nextPath || "/")} nextPath={nextPath} initialView={initialView} notice={notice} />;
}
