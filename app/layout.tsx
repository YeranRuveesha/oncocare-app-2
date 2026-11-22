import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { getSessionState } from "@/lib/session";
import { brandingStyle } from "@/lib/utils";
import { isConfigured } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "OncoCare BMT · recovery companion for BMT outpatients (demo)",
  description: "Demo of an outpatient companion and clinical triage platform for bone marrow transplant recovery. Not medical advice.",
  openGraph: {
    title: "OncoCare BMT",
    description: "A student demo of a recovery companion and triage tool for bone marrow transplant outpatients. Fictional data only.",
    type: "website",
    siteName: "OncoCare BMT",
  },
  twitter: { card: "summary", title: "OncoCare BMT", description: "Recovery companion demo for bone marrow transplant outpatients." },
};

// Branding depends on who is logged in, so render on each request.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // White-label: a logged-in, fully verified user sees their hospital's colours.
  const s = isConfigured() ? await getSessionState().catch(() => null) : null;
  const style = s?.gate === "ok" && s.hospital ? brandingStyle(s.hospital.primary_color, s.hospital.secondary_color) : {};
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} style={style as React.CSSProperties}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
