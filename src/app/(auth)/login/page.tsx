import { AuthModalEntry } from "@/modules/auth/components/AuthModalEntry";

/** Direct sign-in links use the same accessible account dialog as the header. */
export default function LoginPage() {
  return <AuthModalEntry initialView="login" />;
}
