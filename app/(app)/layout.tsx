import AppShell from "@/components/shell/AppShell";
import { requirePage } from "@/lib/session";

/** Every page in here needs a FULLY verified (AAL2), active account. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePage();
  return <AppShell session={session}>{children}</AppShell>;
}
