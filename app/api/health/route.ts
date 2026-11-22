import { NextResponse } from "next/server";
import { config, isConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Quick check: is Supabase configured and which AI provider is active? Never shows key values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabaseConfigured: isConfigured(),
    supabaseUrl: config.supabaseUrl ? new URL(config.supabaseUrl).host : null,
    emailSender: config.smtp.host ? `${config.smtp.host}:${config.smtp.port}` : "not configured",
    aiProvider: config.aiProvider,
    aiKeyPresent: config.aiProvider === "gemini" ? Boolean(config.geminiApiKey) : config.aiProvider === "openai" ? Boolean(config.openaiApiKey) : true,
  });
}
