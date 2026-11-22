import { ok } from "@/lib/api";
import { completeOnboarding } from "@/lib/onboarding";

export async function POST() {
  return ok({ next: await completeOnboarding() });
}
