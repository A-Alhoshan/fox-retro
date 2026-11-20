import { redirect } from "next/navigation";
import { getHostUser } from "@/lib/supabase/user";
import { NewPinForm } from "./NewPinForm";

export default async function NewPinPage() {
  const user = await getHostUser();
  if (!user) redirect("/login");
  return <NewPinForm email={user.email ?? ""} />;
}
