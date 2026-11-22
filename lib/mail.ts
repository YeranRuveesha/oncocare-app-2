import "server-only";
import nodemailer from "nodemailer";
import { config } from "@/lib/config";

/**
 * Sends the app's own emails (credentials, "details changed", decisions).
 * Locally they go to Mailpit (http://localhost:54324) through SMTP port 54325.
 * Login codes, invites and password-reset emails are sent by Supabase itself.
 * We never log email bodies, because some contain temporary passwords.
 */
export async function sendMail(to: string, subject: string, bodyHtml: string): Promise<boolean> {
  if (!config.smtp.host) {
    console.info(`[mail] SMTP not configured, skipped "${subject}"`);
    return false;
  }
  try {
    const transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
    await transport.sendMail({ from: config.smtp.from, to, subject, html: wrap(bodyHtml) });
    return true;
  } catch (e) {
    console.error(`[mail] could not send "${subject}": ${(e as Error).message}`);
    return false;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function wrap(inner: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1e293b">
<h2 style="color:#0F4C81;margin:0 0 4px">OncoCare BMT</h2>
<p style="font-size:12px;color:#64748b;margin:0 0 20px">Demo project. Not medical advice.</p>
${inner}
</div>`;
}
