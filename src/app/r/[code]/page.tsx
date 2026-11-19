import { RetroRoom } from "@/components/retro/RetroRoom";

export default async function RetroPage({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  return <RetroRoom code={code.toUpperCase()} />;
}
