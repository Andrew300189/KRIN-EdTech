import { redirect } from "next/navigation";

/** Keeps legacy email/reset links on the single supported sign-in screen. */
export default function LegacyAuthLoginPage() {
  redirect("/login");
}
