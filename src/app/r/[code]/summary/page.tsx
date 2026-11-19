import { SummaryRoom } from "@/components/retro/SummaryRoom";

export default async function SummaryPage({ params }: PageProps<"/r/[code]/summary">) {
  const { code } = await params;
  return <SummaryRoom code={code.toUpperCase()} />;
}
