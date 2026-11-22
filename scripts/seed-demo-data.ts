/**
 * Adds 3 FAKE demo patients (+1 fake doctor) with up to 30 days of fake daily logs, symptom reports and
 * exercise records, so the charts and the clinician screens can be tested.
 *
 *   npm run seed-demo
 *
 * Needs the v4 migration to be applied. Safe to run again: it clears and recreates the demo data.
 * Everything is made up. Do NOT use real people. The accounts it creates are printed once, with their
 * password and an authenticator secret (type the secret into Google/Microsoft Authenticator to log in).
 */
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { TOTP, Secret } from "otpauth";
import { evaluateReportRules, SYMPTOM_RULES, type ReportedSymptom } from "../config/triage-rules";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key || !anon) { console.error("Missing Supabase values in .env.local"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const colombo = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(d);
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const today = colombo(new Date());
// Small repeatable "random" so every run gives the same shapes.
let seed = 42; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a: number, b: number) => a + (b - a) * rnd();
const r1 = (n: number) => Math.round(n * 10) / 10;

function password() {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ", L = "abcdefghijkmnopqrstuvwxyz", D = "23456789", S = "!@#$%^&*_+-=";
  const all = U + L + D + S; const c = [U, L, D, S].map((s) => s[randomInt(s.length)]);
  while (c.length < 16) c.push(all[randomInt(all.length)]);
  return c.sort(() => randomInt(3) - 1).join("");
}

async function ensureHospital() {
  const { data } = await db.from("hospitals").select("id, name").eq("status", "active").order("created_at").limit(1);
  if (data?.length) return data[0];
  const { data: h, error } = await db.from("hospitals").insert({
    code: "DEMO01", name: "Demo Teaching Hospital", short_name: "Demo TH", registration_no: "DEMO-SEED-001", type: "Teaching", address_line: "1 Demo Road", city: "Colombo", district: "Colombo",
    country: "Sri Lanka", email: "info@demo-hospital.example", phone: "+94110000001", primary_color: "#0F4C81", secondary_color: "#1B7A7E", status: "active",
  }).select("id, name").single();
  if (error) throw new Error(error.message);
  return h;
}

/** Creates (or finds) a fully verified account with a real authenticator factor. */
async function account(a: { email: string; phone: string; nic: string; last: string; given: string; role: "patient" | "junior_doctor"; prefix: "PAT" | "CLN"; hospitalId: string }) {
  const { data: ex } = await db.from("profiles").select("id").eq("email", a.email).maybeSingle();
  if (ex) return { id: ex.id as string, created: false as const };
  const pw = password();
  const { data, error } = await db.auth.admin.createUser({ email: a.email, password: pw, email_confirm: true, phone: a.phone.slice(1), phone_confirm: true });
  if (error || !data.user) throw new Error(`${a.email}: ${error?.message}`);
  const id = data.user.id;
  const { error: pe } = await db.from("profiles").insert({
    id, user_code: `${a.prefix}-${randomInt(10_000_000, 100_000_000)}`, role: a.role, hospital_id: a.hospitalId, status: "pending_verification", last_name: a.last, given_names: a.given,
    email: a.email, phone: a.phone, nic: a.nic, email_verified_at: new Date().toISOString(), phone_verified_at: new Date().toISOString(), must_change_password: false,
  });
  if (pe) throw new Error(pe.message);
  // Authenticator: sign in as the user, enrol, verify with a real code.
  const c = createClient(url!, anon!, { auth: { persistSession: false } });
  const { error: se } = await c.auth.signInWithPassword({ email: a.email, password: pw });
  if (se) throw new Error(se.message);
  const { data: f, error: fe } = await c.auth.mfa.enroll({ factorType: "totp", friendlyName: "Demo" });
  if (fe || !f) throw new Error(fe?.message ?? "enrol failed");
  const code = new TOTP({ secret: Secret.fromBase32(f.totp.secret), digits: 6, period: 30 }).generate();
  const { error: ve } = await c.auth.mfa.challengeAndVerify({ factorId: f.id, code });
  if (ve) throw new Error(ve.message);
  await db.from("profiles").update({ status: "active", activated_at: new Date().toISOString() }).eq("id", id);
  console.log(`   ${a.given} ${a.last}  (${a.role})  email ${a.email}  password ${pw}  authenticator secret ${f.totp.secret}`);
  return { id, created: true as const };
}

async function main() {
  const h = await ensureHospital();
  console.log(`Hospital: ${h.name}`);
  console.log("New demo accounts (shown once):");
  const doc = await account({ email: "demo.doctor@oncocare.demo", phone: "+94770000018", nic: "198012345678", last: "Silva", given: "Demo Doctor", role: "junior_doctor", prefix: "CLN", hospitalId: h.id });
  await db.from("clinician_details").upsert({ profile_id: doc.id, slmc_no: "DEMO1234", qualifications: ["MBBS"], specialty: "Haematology" }, { onConflict: "profile_id" });

  const people = [
    { email: "demo.patient1@oncocare.demo", phone: "+94770000015", nic: "200112345671", last: "Perera", given: "Demo One", tx: -45, dx: "AML", type: "Allogeneic", story: "fever" },
    { email: "demo.patient2@oncocare.demo", phone: "+94770000016", nic: "199912345672", last: "Fernando", given: "Demo Two", tx: -120, dx: "Lymphoma", type: "Autologous", story: "steady" },
    { email: "demo.patient3@oncocare.demo", phone: "+94770000017", nic: "200312345673", last: "Jayasinghe", given: "Demo Three", tx: -20, dx: "Thalassemia", type: "Allogeneic", story: "rash" },
  ] as const;
  const { data: ex } = await db.from("exercises").select("id, category").is("hospital_id", null).limit(10);
  const library = ex ?? [];

  for (const p of people) {
    const acc = await account({ ...p, role: "patient", prefix: "PAT", hospitalId: h.id });
    const txDate = addDays(today, p.tx);
    await db.from("patient_details").upsert({
      profile_id: acc.id, assigned_doctor_id: doc.id, transplant_date: txDate, diagnosis: p.dx, transplant_type: p.type, date_of_birth: "1990-05-05", gender: "Prefer not to say",
      ec_name: "Demo Relative", ec_relationship: "Mother", ec_phone: "+94770000099",
    }, { onConflict: "profile_id" });
    // wipe old demo data of this patient, then rebuild
    for (const t of ["daily_logs", "exercise_logs", "symptom_logs", "patient_exercise_plan", "rehab_changes"]) await db.from(t).delete().eq("patient_id", acc.id);
    await db.from("patient_rehab").upsert({ patient_id: acc.id, paused: false, walking_target_minutes: 20, updated_by: doc.id }, { onConflict: "patient_id" });

    const plan = library.slice(0, 4);
    await db.from("patient_exercise_plan").insert(plan.map((e, i) => ({ patient_id: acc.id, exercise_id: e.id, status: i === 3 && p.story === "fever" ? "restricted" : "allowed", restriction_reason: i === 3 && p.story === "fever" ? "Low platelets: avoid this exercise for now" : null, set_by: doc.id })));
    const allowed = plan.filter((_, i) => !(i === 3 && p.story === "fever"));

    const start = addDays(today, -29) < txDate ? txDate : addDays(today, -29);
    const logs: Record<string, unknown>[] = [], exLogs: Record<string, unknown>[] = [];
    for (let d = start, i = 0; d <= today; d = addDays(d, 1), i++) {
      if (p.story === "rash" && i % 5 === 3) continue;       // a few missed days stay missed
      if (p.story === "steady" && i % 9 === 4) continue;
      const day = Math.round((new Date(d).getTime() - new Date(txDate).getTime()) / 86400000);
      const fever = p.story === "fever" && day === (p.tx * -1) - 9 ? 38.4 : null;
      logs.push({
        patient_id: acc.id, hospital_id: h.id, log_date: d, day_post_transplant: day, is_late: false, created_at: `${d}T15:30:00Z`, updated_at: `${d}T15:30:00Z`,
        temperature_c: fever ?? r1(between(36.4, 37.4)), heart_rate: Math.round(between(64, 92)), bp_systolic: Math.round(between(104, 128)), bp_diastolic: Math.round(between(64, 82)),
        spo2: rnd() > 0.3 ? Math.round(between(95, 99)) : null, weight_kg: rnd() > 0.4 ? r1(between(54, 56.5)) : null,
        pain: Math.round(between(0, 4)), fatigue: Math.round(between(2, 7) - Math.min(3, i / 10)), appetite: rnd() > 0.7 ? "Reduced" : "Good", nausea: rnd() > 0.8 ? "Mild" : "None",
        vomiting_episodes: rnd() > 0.9 ? 1 : 0, loose_stools: rnd() > 0.85 ? 2 : 0, bleeding: false,
        mouth_brushing: rnd() > 0.2 ? 3 : 1, mouth_flossed: rnd() > 0.4, mouth_rinses: rnd() > 0.3 ? 4 : 2, lip_care: rnd() > 0.3, emollient_times: Math.round(between(0, 3)),
        sun_protection: rnd() > 0.5 ? "Yes" : "Stayed indoors", walking_minutes: Math.round(between(5, 30)), medicines: rnd() > 0.15 ? "Yes" : "Partly", notes: null,
      });
      for (const e of allowed) if (rnd() > 0.45) exLogs.push({ patient_id: acc.id, hospital_id: h.id, exercise_id: e.id, log_date: d, completed_at: `${d}T10:00:00Z`, minutes: Math.round(between(5, 15)), effort: Math.round(between(2, 6)), symptoms: false });
    }
    await db.from("daily_logs").insert(logs);
    if (exLogs.length) await db.from("exercise_logs").insert(exLogs);

    // a few reports (tiers come from the real rules file)
    const reports: { daysAgo: number; symptoms: ReportedSymptom[]; temp?: number; status: string; reply?: string }[] =
      p.story === "fever" ? [{ daysAgo: 9, symptoms: [{ key: "fever_chills", severity: "moderate", onset: "today" }], temp: 38.4, status: "resolved", reply: "Please come to the day unit this morning." }, { daysAgo: 2, symptoms: [{ key: "cough", severity: "mild", onset: "yesterday" }], status: "acknowledged" }]
      : p.story === "rash" ? [{ daysAgo: 1, symptoms: [{ key: "rash", severity: "moderate", onset: "yesterday" }, { key: "diarrhoea", severity: "mild", onset: "today" }], status: "open" }]
      : [{ daysAgo: 6, symptoms: [{ key: "nausea_vomiting", severity: "mild", onset: "today" }], status: "resolved", reply: "Small, frequent meals can help. Call us if it gets worse." }];
    for (const r of reports) {
      const t = evaluateReportRules(r.symptoms, r.temp);
      const at = new Date(Date.now() - r.daysAgo * 86400000).toISOString();
      const { data: log } = await db.from("symptom_logs").insert({ patient_id: acc.id, hospital_id: h.id, temperature_c: r.temp ?? null, symptoms: r.symptoms.map((s) => s.key), structured: r.symptoms, notes: null, day_post_transplant: -p.tx - r.daysAgo, red_flags: t.redFlags, created_at: at }).select("id").single();
      if (log) await db.from("triage_alerts").insert({ log_id: log.id, patient_id: acc.id, hospital_id: h.id, tier: t.tier, urgency_score: t.tier === "emergency" ? 92 : t.tier === "urgent" ? 62 : 20, reasons: t.reasons, source: t.tier === "routine" ? "mock_ai" : "red_flag_rules", ai_provider: "mock", ai_summary: "Demo data: simulated summary for testing.", status: r.status, clinician_reply: r.reply ?? null, replied_by: r.reply ? doc.id : null, replied_at: r.reply ? at : null, created_at: at });
    }
    console.log(`Seeded ${p.given} ${p.last}: ${logs.length} daily logs, ${exLogs.length} exercise records, ${reports.length} reports`);
  }
  void SYMPTOM_RULES;
  console.log("\nDone. Log in as the demo doctor to see the patients, or as a demo patient to see the charts.");
}
main().catch((e) => { console.error("❌", e.message); process.exit(1); });
