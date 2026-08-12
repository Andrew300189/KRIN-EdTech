import { AuthModalEntry } from "@/modules/auth/components/AuthModalEntry";

/** Direct registration links use the same public account modal. */
export default function RegisterPage() {
  return <AuthModalEntry initialView="register" />;
}
