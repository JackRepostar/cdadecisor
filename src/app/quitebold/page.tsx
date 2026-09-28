import { redirect } from "next/navigation";
import { getCurrentPlatformAdmin } from "@/lib/platform-auth";

export default async function QuiteboldRootPage() {
  const admin = await getCurrentPlatformAdmin();
  redirect(admin ? "/quitebold/organizzazioni" : "/quitebold/login");
}
