import { redirect } from "next/navigation";
import PublicShell from "@/components/landing/PublicShell";
import HeroSection from "@/components/landing/HeroSection";
import BoneMarrowSection from "@/components/landing/BoneMarrowSection";
import TransplantTypes from "@/components/landing/TransplantTypes";
import JourneyTimeline from "@/components/landing/JourneyTimeline";
import ConditionsGrid from "@/components/landing/ConditionsGrid";
import HomeMonitoringSection from "@/components/landing/HomeMonitoringSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HospitalsSection from "@/components/landing/HospitalsSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaBanner from "@/components/landing/CtaBanner";
import { isConfigured } from "@/lib/config";
import { getSessionState, nextPath } from "@/lib/session";

export default async function Home() {
  // Fully logged-in users (authenticator code done) go straight to their dashboard.
  if (isConfigured()) {
    const s = await getSessionState().catch(() => null);
    if (s?.gate === "ok") redirect(nextPath(s));
  }
  return (
    <PublicShell home>
      <HeroSection />
      <BoneMarrowSection />
      <TransplantTypes />
      <JourneyTimeline />
      <ConditionsGrid />
      <HomeMonitoringSection />
      <FeaturesSection />
      <HospitalsSection />
      <FaqSection />
      <CtaBanner />
    </PublicShell>
  );
}
