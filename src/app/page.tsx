import { redirect } from "next/navigation";

export default function Home() {
  // Keep the original static landing as the home page in Next.js runtime.
  redirect("/legacy/index.html");
}
