import { getHostUser } from "@/lib/supabase/user";
import { Landing } from "./Landing";

export default async function Home() {
  const host = await getHostUser();
  return <Landing signedIn={!!host} />;
}
