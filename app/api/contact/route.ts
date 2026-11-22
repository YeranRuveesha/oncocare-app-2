import { NextResponse } from "next/server";
import { fail, ok, parseBody } from "@/lib/api";
import { contactSchema } from "@/lib/validation/contact";
import { anyLocked, clientIp, LOCKED_MESSAGE, recordFailure } from "@/lib/rateLimit";
import { createServiceClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/config";

// Public contact form. No login needed, so it is protected by a hidden honeypot field and a rate limit.
export async function POST(req: Request): Promise<NextResponse> {
  if (!isConfigured()) return fail("The site is not connected to its database yet.", 503);
  const keys = [`contact:${clientIp(req)}`];
  if (await anyLocked(keys)) return fail(LOCKED_MESSAGE, 429);
  const parsed = await parseBody(req, contactSchema);
  if ("response" in parsed) return parsed.response;
  const d = parsed.data;
  // Count EVERY submission towards the limit (5 per 15 minutes per address).
  await recordFailure(keys);
  // Bots fill the hidden field. Pretend it worked, but save nothing.
  if (d.website) return ok();
  const { error } = await createServiceClient().from("contact_messages").insert({
    name: d.name, email: d.email, hospital_name: d.hospital_name ?? null, message: d.message,
  });
  if (error) return fail("Could not send your message. Please email us instead.", 500);
  return ok();
}
