import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

export default async function HomeRedirect() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  if (member.role === "ADMIN") redirect("/registro");
  if (member.role === "STAFF") redirect("/assegnate");
  redirect("/richieste");
}
