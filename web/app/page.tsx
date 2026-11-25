import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getDashboard } from "@/lib/data";
import NlmDashboard from "@/components/NlmDashboard";

export const dynamic = "force-dynamic";

// Per-analyst charts are Gus's internal team view. Set SHOW_ANALYSTS_TO_MARKETS=true to show them to market logins too.
const ANALYSTS_FOR_MARKETS = process.env.SHOW_ANALYSTS_TO_MARKETS === "true";

export default async function Page({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { market } = await searchParams;
  const m = user.isMaster ? market || null : null;
  const data = await getDashboard(user, m);

  return (
    <NlmDashboard
      data={data}
      label={user.label}
      isMaster={user.isMaster}
      market={m}
      showAnalysts={user.isMaster || ANALYSTS_FOR_MARKETS}
    />
  );
}
