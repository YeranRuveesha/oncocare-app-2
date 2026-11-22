/**
 * ONE command for ALL the fake demo data (everything is made up, no real people):
 *   - DELETES the old seed data first (asks you to type DELETE to confirm)
 *   - 5 Super Admins
 *   - 20 hospitals (10 Government/Teaching + 10 Private) in Colombo, its suburbs and other cities
 *   - 2 Hospital Admins per hospital
 *   - 6 or 7 doctors per hospital (about 30% Senior Consultants, the rest Junior Doctors)
 *   - 5 or 8 patients per doctor, every doctor gets a mix of LOW, MEDIUM and HIGH risk patients
 *   - for every patient: daily logs, symptom reports + triage alerts, rehabilitation, discharge instructions
 *
 *   npm run seed-all        (delete old seed data + create everything)
 *   npm run seed-reset      (delete old seed data only)
 *
 * What gets deleted: ALL hospitals, patients, clinicians and Hospital Admins, plus Super Admins made by the seed scripts.
 * What is kept: Super Admins you made yourself (for example with `npm run create-admin`), your Supabase project, tables and settings.
 * It takes a while (about 1,100 accounts are created). Logins are written to files in the project folder
 * (NOT printed, NOT committed). Delete them when you are done:
 *   seed-admins-credentials.csv, seed-clinicians-credentials.csv, seed-patients-credentials.csv (+ emails/passwords .txt lists)
 */
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { writeFileSync, appendFileSync } from "node:fs";
import { evaluateReportRules, type ReportedSymptom, type Tier } from "../config/triage-rules";
 
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key || !anon) { console.error("Missing Supabase values in .env.local"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
 
// ---------- small helpers ----------
let seed = 20261122; const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a: number, b: number) => a + (b - a) * rnd();
const int = (a: number, b: number) => Math.round(between(a, b));
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;
const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const pad = (n: number, w: number) => String(n).padStart(w, "0");
const colombo = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(d);
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
const today = colombo(new Date());
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
function password() {
  const U = "ABCDEFGHJKLMNPQRSTUVWXYZ", L = "abcdefghijkmnopqrstuvwxyz", D = "23456789", S = "!@#$%^&*_+-=";
  const all = U + L + D + S; const c = [U, L, D, S].map((s) => s[randomInt(s.length)]);
  while (c.length < 16) c.push(all[randomInt(all.length)]);
  return c.sort(() => randomInt(3) - 1).join("");
}
async function pool<T>(items: T[], size: number, fn: (x: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } }));
}
async function insertChunks(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 400) { const { error } = await db.from(table).insert(rows.slice(i, i + 400)); if (error) throw new Error(`${table}: ${error.message}`); }
}
const usedPhones = new Set<string>(), usedNics = new Set<string>(), usedCodes = new Set<string>(), usedEmails = new Set<string>();
const PREFIXES = ["71", "72", "75", "76", "78", "70"]; // never 77000xxxx (local test phones)
function phone() { for (;;) { const p = `+94${pick(PREFIXES)}${pad(randomInt(1000000, 10000000), 7)}`; if (!usedPhones.has(p)) { usedPhones.add(p); return p; } } }
function dayOfYear(dob: string) { return diffDays(dob, `${dob.slice(0, 4)}-01-01`) + 1; }
function nic(dob: string, female: boolean, old: boolean) {
  for (;;) {
    const y = dob.slice(0, 4), d = dayOfYear(dob) + (female ? 500 : 0);
    const n = old && +y < 2000 ? `${y.slice(2)}${pad(d, 3)}${pad(randomInt(0, 10000), 4)}V` : `${y}${pad(d, 3)}${pad(randomInt(0, 100000), 5)}`;
    if (!usedNics.has(n)) { usedNics.add(n); return n; }
  }
}
function userCode(prefix: string) { for (;;) { const c = `${prefix}-${randomInt(10_000_000, 100_000_000)}`; if (!usedCodes.has(c)) { usedCodes.add(c); return c; } } }
 
/** ONE authenticator secret shared by every seeded account (demo data only). Scan it once in Google Authenticator. */
const TOTP_SECRET = "KVKFKRCPNZQUYMLXOVYDSKLMNBVCXZAQ";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Runs a Supabase call again (with a pause) when the server says "rate limit". */
async function patient<T extends { error: { message: string } | null }>(fn: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const r = await fn();
    if (!r.error || !/rate limit|too many/i.test(r.error.message) || attempt >= 8) return r;
    await sleep(2000 * (attempt + 1));
  }
}
 
/**
 * Creates an account that is already active, with email and phone marked verified.
 * It has NO authenticator yet: the person scans the QR code once on their first login (Supabase limits how many
 * sign-ins and authenticator checks a script may do, so a script cannot enrol hundreds of authenticators).
 */
async function makeAccount(a: { email: string; phone: string; nic: string; last: string; given: string; role: string; code: string; hospitalId: string | null; extra?: Record<string, unknown> }) {
  const pw = password(); let uid: string | null = null;
  try {
    const { data, error } = await patient(() => db.auth.admin.createUser({ email: a.email, password: pw, email_confirm: true, phone: a.phone.slice(1), phone_confirm: true }));
    if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
    const id = uid = data.user.id; const now = new Date().toISOString();
    const { error: pe } = await db.from("profiles").insert({
      id, user_code: a.code, role: a.role, hospital_id: a.hospitalId, status: "pending_verification", last_name: a.last, given_names: a.given, email: a.email, phone: a.phone, nic: a.nic,
      email_verified_at: now, phone_verified_at: now, must_change_password: false, ...a.extra,
    });
    if (pe) throw new Error(pe.message);
    // The database only allows "active" once an authenticator is verified, so enrol the shared demo one first.
    const { error: te } = await db.rpc("seed_enroll_totp", { uid: id, totp_secret: TOTP_SECRET });
    if (te) throw new Error(`authenticator: ${te.message} (did you run supabase/migrations/20261122020000_seed_totp.sql?)`);
    const { error: ue } = await db.from("profiles").update({ status: "active", activated_at: now }).eq("id", id);
    if (ue) throw new Error(ue.message);
    return { id, pw };
  } catch (e) { if (uid) await db.auth.admin.deleteUser(uid); throw e; }
}
 
// ---------- patient name pools (fictional, mixed communities) ----------
const NAMES = {
  sinhala: { F: ["Dilini", "Sachini", "Nadeesha", "Kaushalya", "Tharushi", "Hiruni", "Madushani", "Ayesha", "Sewwandi", "Piumi", "Lakshika", "Anoma", "Kumari", "Chamodi"], M: ["Nuwan", "Supun", "Isuru", "Chathura", "Lahiru", "Buddhika", "Sampath", "Dasun", "Janaka", "Kalum", "Roshan", "Amila", "Charith", "Thilina"], last: ["Silva", "Perera", "Fernando", "Jayawardena", "Gunasekara", "Herath", "Ranasinghe", "Premadasa", "Wijeratne", "Samarakoon", "Abeywickrama", "Dharmasena", "Seneviratne", "Amarasinghe", "Pathirana", "Rajapaksha"] },
  tamil: { F: ["Kavitha", "Priya", "Anjali", "Shanthi", "Thanuja", "Mythili", "Nirosha", "Vasuki"], M: ["Suresh", "Kumaran", "Prabakaran", "Tharmalingam", "Vijayakumar", "Arulraj", "Sivakumar", "Dinesh"], last: ["Sivarajah", "Thangarajah", "Kandiah", "Pathmanathan", "Arumugam", "Balasingam", "Navaratnam", "Rajaratnam"] },
  muslim: { F: ["Fathima", "Aisha", "Nusaiba", "Zainab", "Rizwana", "Shafna"], M: ["Mohamed", "Ahamed", "Rizvi", "Faizal", "Nazim", "Haseeb"], last: ["Hussain", "Rahuman", "Marikar", "Careem", "Zackariya", "Mansoor", "Ismail"] },
  burgher: { F: ["Rochelle", "Natasha", "Sherine"], M: ["Gerard", "Dominic", "Shane", "Keith"], last: ["de Kretser", "Vanderwall", "Jansz", "Ferdinands", "Anthonisz"] },
};
const GROUPS: (keyof typeof NAMES)[] = ["sinhala", "sinhala", "sinhala", "sinhala", "sinhala", "tamil", "tamil", "muslim", "burgher"];
const RELATIONS = ["Mother", "Father", "Spouse/Partner", "Son", "Daughter", "Brother", "Sister", "Guardian"] as const;
 
// ---------- hospitals: 10 Government/Teaching + 10 Private ----------
// [code, name, short, type, address, city, district, phone, primary, secondary]
const HOSPITALS: [string, string, string, string, string, string, string, string, string, string][] = [
  ["SLH001", "National Hospital of Sri Lanka", "NHSL", "Teaching", "Regent Street, Colombo 10", "Colombo", "Colombo", "+94110000001", "#0F4C81", "#1B7A7E"],
  ["SLH101", "Apeksha Hospital (National Cancer Institute)", "Apeksha", "Government", "High Level Road, Maharagama", "Maharagama", "Colombo", "+94110000101", "#0F4C81", "#1B7A7E"],
  ["SLH102", "Lady Ridgeway Hospital for Children", "LRH Colombo", "Teaching", "Dr. Danister De Silva Mawatha, Colombo 08", "Colombo", "Colombo", "+94110000102", "#1D4ED8", "#0E7490"],
  ["SLH103", "Teaching Hospital Kandy", "TH Kandy", "Teaching", "William Gopallawa Mawatha, Kandy", "Kandy", "Kandy", "+94810000103", "#7C2D12", "#B45309"],
  ["SLH104", "Teaching Hospital Karapitiya", "TH Karapitiya", "Teaching", "Karapitiya, Galle", "Galle", "Galle", "+94910000104", "#065F46", "#0F766E"],
  ["SLH105", "Teaching Hospital Jaffna", "TH Jaffna", "Teaching", "Hospital Road, Jaffna", "Jaffna", "Jaffna", "+94210000105", "#4338CA", "#0369A1"],
  ["SLH111", "Teaching Hospital Anuradhapura", "TH Anuradhapura", "Teaching", "Anuradhapura", "Anuradhapura", "Anuradhapura", "+94250000111", "#92400E", "#047857"],
  ["SLH112", "Teaching Hospital Batticaloa", "TH Batticaloa", "Teaching", "Batticaloa", "Batticaloa", "Batticaloa", "+94650000112", "#1E40AF", "#0F766E"],
  ["SLH113", "Colombo North Teaching Hospital", "Ragama TH", "Teaching", "Hospital Road, Ragama", "Ragama", "Gampaha", "+94110000113", "#155E75", "#4D7C0F"],
  ["SLH114", "Sri Jayewardenepura General Hospital", "SJGH", "Teaching", "Thalapathpitiya, Nugegoda", "Nugegoda", "Colombo", "+94110000114", "#312E81", "#0E7490"],
  ["SLH106", "Nawaloka Hospital", "Nawaloka", "Private", "23 Deshamanya H.K. Dharmadasa Mawatha, Colombo 02", "Colombo", "Colombo", "+94110000106", "#9F1239", "#BE123C"],
  ["SLH107", "Asiri Central Hospital", "Asiri Central", "Private", "114 Norris Canal Road, Colombo 10", "Colombo", "Colombo", "+94110000107", "#0C4A6E", "#0891B2"],
  ["SLH108", "Durdans Hospital", "Durdans", "Private", "3 Alfred Place, Colombo 03", "Colombo", "Colombo", "+94110000108", "#14532D", "#15803D"],
  ["SLH109", "Lanka Hospitals", "Lanka Hosp.", "Private", "578 Elvitigala Mawatha, Colombo 05", "Colombo", "Colombo", "+94110000109", "#1E3A8A", "#9A3412"],
  ["SLH110", "Hemas Hospital Wattala", "Hemas Wattala", "Private", "389 Negombo Road, Wattala", "Wattala", "Gampaha", "+94110000110", "#581C87", "#0D9488"],
  ["SLH115", "Ninewells Hospital", "Ninewells", "Private", "Narahenpita, Colombo 05", "Colombo", "Colombo", "+94110000115", "#7F1D1D", "#0369A1"],
  ["SLH116", "Asiri Surgical Hospital", "Asiri Surgical", "Private", "Kirimandala Mawatha, Colombo 05", "Colombo", "Colombo", "+94110000116", "#0F766E", "#1D4ED8"],
  ["SLH117", "Hemas Hospital Thalawathugoda", "Hemas Thalawathugoda", "Private", "Thalawathugoda", "Thalawathugoda", "Colombo", "+94110000117", "#6D28D9", "#0F766E"],
  ["SLH118", "Joseph Fraser Memorial Hospital", "Joseph Fraser", "Private", "Colombo 05", "Colombo", "Colombo", "+94110000118", "#B91C1C", "#1E3A8A"],
  ["SLH119", "Golden Key Hospital", "Golden Key", "Private", "Piliyandala", "Piliyandala", "Colombo", "+94110000119", "#A16207", "#115E59"],
];
const DOC_SPECIALTIES = ["Haematology", "Haematology", "Bone Marrow Transplantation", "Bone Marrow Transplantation", "Clinical Oncology", "Clinical Oncology", "Paediatric Haematology/Oncology", "Internal Medicine", "General Medicine", "Paediatrics"] as const;
const DEPARTMENTS: Record<string, string> = { "Haematology": "Haematology Unit", "Bone Marrow Transplantation": "BMT Unit", "Clinical Oncology": "Oncology Unit", "Paediatric Haematology/Oncology": "Children's Cancer Unit", "Internal Medicine": "Medical Unit 1", "General Medicine": "Medical Unit 2", "Paediatrics": "Paediatric Medicine" };
const HA_TITLES = ["Hospital Administrator (primary admin)", "Deputy Hospital Administrator"];
const SA: [string, string, boolean][] = [["Sujeewa", "Ariyaratne", false], ["Maheshi", "Kariyawasam", true], ["Ganesh", "Vigneswaran", false], ["Samira", "Ghouse", true], ["Dhammika", "Welikala", false]];
 
type Story = "stable" | "mild" | "medium" | "critical";
type Risk = "low" | "medium" | "high";
const RISKS: Risk[] = ["low", "medium", "high"];
const storyOf = (r: Risk): Story => (r === "low" ? (chance(0.6) ? "stable" : "mild") : r === "medium" ? "medium" : "critical");
const person = () => { const g = pick(GROUPS); const f = chance(0.5); return { g, f, given: pick(NAMES[g][f ? "F" : "M"]), last: pick(NAMES[g].last) }; };
const unique = (base: string, domain: string) => { let e = `${base}@${domain}`; for (let n = 2; usedEmails.has(e); n++) e = `${base}.${n}@${domain}`; usedEmails.add(e); return e; };
 
// ---------- delete the old seed data ----------
async function resetAll(confirm: boolean) {
  const rows: { id: string; role: string; email: string }[] = [];
  for (let from = 0; ; from += 1000) { // the API returns at most 1000 rows at a time
    const { data } = await db.from("profiles").select("id, role, email").order("id").range(from, from + 999);
    rows.push(...(data ?? [])); if ((data?.length ?? 0) < 1000) break;
  }
  const keep = (p: { role: string; email: string }) => p.role === "platform_admin" && !/^(sa\.|demo\.)/.test(p.email);
  const doomed = rows.filter((p) => !keep(p)); const kept = rows.filter(keep);
  const { count: hc } = await db.from("hospitals").select("id", { count: "exact", head: true });
  console.log(`\nThis will DELETE: ${doomed.filter((p) => p.role === "patient").length} patients, ${doomed.filter((p) => p.role === "junior_doctor" || p.role === "senior_consultant").length} clinicians, ${doomed.filter((p) => p.role === "hospital_admin").length} Hospital Admins, ${doomed.filter((p) => p.role === "platform_admin").length} seeded Super Admins and ${hc ?? 0} hospitals, with all their logs, reports and records.`);
  console.log(`It KEEPS ${kept.length} Super Admin account(s) you made yourself${kept.length ? ": " + kept.map((k) => k.email).join(", ") : ""}.`);
  if (confirm) {
    const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stdout });
    const ans = await rl.question('Type DELETE (capital letters) and press Enter to continue, anything else cancels: '); rl.close();
    if (ans.trim() !== "DELETE") { console.log("Cancelled. Nothing was deleted."); process.exit(0); }
  }
  console.log("Deleting…");
  await db.from("change_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // they point at reviewers
  const order = ["patient", "junior_doctor", "senior_consultant", "hospital_admin", "platform_admin"];
  for (const role of order) { const list = doomed.filter((p) => p.role === role); await pool(list, 8, async (p) => { await db.auth.admin.deleteUser(p.id); }); }
  const { error } = await db.from("hospitals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) console.error("  ! hospitals:", error.message);
  console.log("Old seed data deleted.");
}
 
// ---------- the story-driven records of one patient ----------
const SYMPTOM_SETS: Record<Story, ReportedSymptom[][]> = {
  stable: [[{ key: "nausea_vomiting", severity: "mild", onset: "today" }], [{ key: "headache", severity: "mild", onset: "2-3 days" }], [{ key: "cough", severity: "mild", onset: "yesterday" }]],
  mild: [[{ key: "nausea_vomiting", severity: "mild", onset: "today" }], [{ key: "cough", severity: "mild", onset: "2-3 days" }], [{ key: "urinating", severity: "mild", onset: "today" }], [{ key: "headache", severity: "mild", onset: "yesterday" }]],
  medium: [[{ key: "rash", severity: "moderate", onset: "yesterday" }], [{ key: "diarrhoea", severity: "moderate", onset: "today" }], [{ key: "iv_line", severity: "moderate", onset: "today" }], [{ key: "abdominal_pain", severity: "moderate", onset: "today" }], [{ key: "jaundice", severity: "moderate", onset: "2-3 days" }]],
  critical: [[{ key: "fever_chills", severity: "moderate", onset: "today" }], [{ key: "breathing", severity: "severe", onset: "today" }], [{ key: "bleeding", severity: "severe", onset: "today" }], [{ key: "cannot_eat_drink", severity: "moderate", onset: "today" }]],
};
const REPLIES = ["Please come to the day unit this morning so we can check you.", "Thank you for letting us know. Keep drinking fluids and call us if it gets worse.", "We have reviewed your report. Please take your medicines as planned and log again tomorrow.", "Please attend the clinic tomorrow. Bring your medicine list.", "Small, frequent meals can help. Call us if it gets worse."];
 
function buildDaily(story: Story, patientId: string, hospitalId: string, txDate: string, base: { weight: number; child: boolean }) {
  const first = diffDays(today, txDate) > 45 ? addDays(today, -44) : txDate;
  const n = diffDays(today, first) + 1;
  const miss = { stable: 0.07, mild: 0.12, medium: 0.18, critical: 0.2 }[story];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(first, i); const last = i === n - 1;
    if (story === "critical" && last && chance(0.6)) continue;       // critical patients often miss today
    if (chance(miss) && !last) continue;
    const w = story === "stable" || story === "mild" ? 0 : clamp((i - (n - 8)) / 7, 0, 1);   // last week gets worse
    const crit = story === "critical" && i >= n - 4;
    const sick = story === "medium" || story === "critical";
    const temp = crit ? r1(between(38.1, 39.2)) : sick ? r1(between(36.7, 37.2) + w * between(0.3, 0.8)) : r1(between(36.4, 37.3));
    const hr = crit ? int(108, 126) : int(62 + w * 20, 88 + w * 17) + (base.child ? 15 : 0);
    const sys = crit ? int(92, 106) : int(104, 128), dia = crit ? int(54, 66) : int(64, 82);
    rows.push({
      patient_id: patientId, hospital_id: hospitalId, log_date: d, day_post_transplant: Math.max(0, diffDays(d, txDate)), is_late: chance(0.05), created_at: `${d}T${pad(int(7, 20), 2)}:30:00Z`, updated_at: `${d}T${pad(int(7, 20), 2)}:30:00Z`,
      temperature_c: temp, heart_rate: hr, bp_systolic: sys, bp_diastolic: Math.min(dia, sys - 20),
      spo2: crit ? int(89, 94) : chance(0.75) ? int(95, 99) - (sick ? Math.round(w * 2) : 0) : null, weight_kg: chance(0.5) ? r1(base.weight - w * between(0, 2.5) + between(-0.4, 0.4)) : null,
      pain: clamp(int(story === "stable" ? 0 : 1, story === "stable" ? 3 : story === "mild" ? 5 : 4 + w * 3) + (crit ? 3 : 0), 0, 10),
      fatigue: clamp(int(story === "stable" ? 1 : 3, story === "stable" ? 4 : story === "mild" ? 6 : 5 + w * 3) + (crit ? 2 : 0), 0, 10),
      appetite: crit ? "Poor" : sick && chance(0.4 + w * 0.4) ? pick(["Reduced", "Poor"]) : story === "mild" && chance(0.35) ? "Reduced" : "Good",
      nausea: crit ? pick(["Mild", "Severe"]) : sick && chance(0.3 + w * 0.4) ? pick(["Mild", "Severe"]) : story === "mild" && chance(0.25) ? "Mild" : "None",
      vomiting_episodes: crit ? int(2, 5) : sick && chance(0.3 * w) ? int(1, 3) : 0, loose_stools: story === "medium" && w > 0.3 ? int(3, 6) : chance(story === "stable" ? 0.05 : 0.15) ? int(1, 3) : 0,
      bleeding: crit && chance(0.5), mouth_brushing: sick ? int(1, 3) : int(2, 4), mouth_flossed: chance(sick ? 0.3 : 0.6), mouth_rinses: sick ? int(1, 4) : int(2, 5), lip_care: chance(0.6), emollient_times: int(0, 3),
      sun_protection: pick(["Yes", "Yes", "Stayed indoors", "No"]), walking_minutes: crit ? int(0, 6) : sick ? int(3, 18) : int(12, 40), medicines: crit ? pick(["Partly", "No"]) : chance(sick ? 0.7 : 0.9) ? "Yes" : "Partly",
      notes: crit && chance(0.5) ? "Feeling very unwell today." : null,
    });
  }
  return rows;
}
 
function buildReports(story: Story, patientId: string, hospitalId: string, doctorId: string, txDate: string) {
  const n = { stable: int(0, 1), mild: int(1, 3), medium: int(2, 3), critical: int(2, 4) }[story];
  const alerts: { log: Record<string, unknown>; alert: Record<string, unknown> }[] = [];
  const used = new Set<number>();
  for (let k = 0; k < n; k++) {
    // the newest report is the "story" report; older ones are milder
    const newest = k === 0 && story !== "stable";
    let daysAgo = newest ? (story === "critical" ? int(0, 1) : int(0, 3)) : int(5, 24);
    while (used.has(daysAgo)) daysAgo++; used.add(daysAgo);
    const set = newest ? SYMPTOM_SETS[story] : SYMPTOM_SETS[k % 2 ? "mild" : "stable"];
    const symptoms = pick(set); const fever = symptoms.some((s) => s.key === "fever_chills");
    const temp = fever ? r1(between(38.1, 39.1)) : story === "critical" && newest ? r1(between(37.6, 38.6)) : undefined;
    const t = evaluateReportRules(symptoms, temp);
    const at = new Date(Date.now() - daysAgo * 86400000 - int(0, 8) * 3600000).toISOString();
    const status = newest ? (t.tier === "emergency" ? pick(["open", "open", "escalated"]) : t.tier === "urgent" ? pick(["open", "acknowledged"]) : pick(["open", "acknowledged"])) : pick(["resolved", "resolved", "acknowledged"]);
    const reply = status === "resolved" || (status === "acknowledged" && chance(0.5)) ? pick(REPLIES) : null;
    const id = crypto.randomUUID();
    alerts.push({
      log: { id, patient_id: patientId, hospital_id: hospitalId, temperature_c: temp ?? null, symptoms: symptoms.map((s) => s.key), structured: symptoms, notes: null, day_post_transplant: Math.max(0, diffDays(colombo(new Date(at)), txDate)), red_flags: t.redFlags, created_at: at },
      alert: {
        log_id: id, patient_id: patientId, hospital_id: hospitalId, tier: t.tier, urgency_score: clamp((t.tier === "emergency" ? 88 : t.tier === "urgent" ? 58 : 15) + int(-6, 8), 1, 100), reasons: t.reasons,
        source: t.tier === "routine" ? "mock_ai" : "red_flag_rules", ai_provider: "mock", ai_summary: "Demo data: simulated summary for testing.", status,
        reviewed_by: status === "open" ? null : doctorId, reviewed_at: status === "open" ? null : at, clinician_reply: reply, replied_by: reply ? doctorId : null, replied_at: reply ? at : null, created_at: at,
      },
    });
  }
  return alerts;
}
 
// ---------- main ----------
async function main() {
  if (process.argv.includes("--reset-only")) { await resetAll(true); return; }
  // check the v4 SQL was applied BEFORE deleting anything
  const { data: lib } = await db.from("exercises").select("id, category, name").is("hospital_id", null).eq("is_active", true).limit(12);
  if (!lib?.length) { console.error("The v4 SQL has not been applied yet (no library exercises found). Run supabase/migrations/20261122000000_oncocare_v4_clinical.sql in the Supabase SQL Editor first. Nothing was deleted."); process.exit(1); }
  const { data: dflt } = await db.from("discharge_instructions").select("sections").is("hospital_id", null).eq("is_active", true).maybeSingle();
  if (!dflt) { console.error("The v4 SQL has not been applied yet (no default discharge instructions). Run supabase/migrations/20261122000000_oncocare_v4_clinical.sql in the Supabase SQL Editor first. Nothing was deleted."); process.exit(1); }
 
  await resetAll(true);
  for (const f of ["seed-admins-credentials.csv", "seed-clinicians-credentials.csv", "seed-patients-credentials.csv", "seed-clinicians-emails.txt", "seed-clinicians-passwords.txt"]) writeFileSync(f, "");
  appendFileSync("seed-admins-credentials.csv", "name,role,hospital,user_code,email,phone,nic\n");
  appendFileSync("seed-clinicians-credentials.csv", "name,role,hospital,user_code,email,phone,nic,slmc_no\n");
  appendFileSync("seed-patients-credentials.csv", "name,hospital,doctor_email,risk,user_code,email,phone,nic\n");
 
  // super admins
  console.log("Super Admins…");
  for (let i = 0; i < SA.length; i++) {
    const [given, last, f] = SA[i]; const email = `sa.${i + 1}.${slug(last)}@oncocare.example.com`; usedEmails.add(email);
    try {
      const ph = phone(), n = nic(`${1968 + i * 4}-0${i + 1}-15`, f, false), c = userCode("SUP");
      const a = await makeAccount({ email, phone: ph, nic: n, last, given, role: "platform_admin", code: c, hospitalId: null, extra: { job_title: "Platform Administrator", staff_id: `SUP-${pad(100 + i, 4)}` } });
      appendFileSync("seed-admins-credentials.csv", [`${given} ${last}`, "super_admin", "(all hospitals)", c, email, ph, n, a.pw].map((v) => `"${v}"`).join(",") + "\n");
    } catch (e) { console.error(`  ✗ ${email}: ${(e as Error).message}`); }
  }
 
  // hospitals
  const { data: hs, error: he } = await db.from("hospitals").insert(HOSPITALS.map(([code, name, short, type, addr, city, district, ph, c1, c2], i) => ({
    code, name, short_name: short, registration_no: `HOSP-${pad(i + 1, 3)}`, type, address_line: addr, city, district, country: "Sri Lanka",
    email: `info@${slug(name).replace(/\./g, "-")}.example.com`, phone: ph, primary_color: c1, secondary_color: c2, status: "active",
  }))).select("id, code, short_name, name");
  if (he || !hs) { console.error("hospitals:", he?.message); process.exit(1); }
  hs.sort((a, b) => a.code.localeCompare(b.code));
  console.log(`Created ${hs.length} hospitals.`);
 
  // hospital admins (2 each) and discharge instructions
  const dischargeId = new Map<string, string>();
  for (const h of hs) {
    const { data: ins, error } = await db.from("discharge_instructions").insert({ hospital_id: h.id, version: 1, title: `Going home after your transplant: ${h.short_name}`, sections: dflt.sections, is_active: true }).select("id").single();
    if (error || !ins) throw new Error(`discharge: ${error?.message}`);
    dischargeId.set(h.id, ins.id);
  }
  console.log("Hospital Admins…");
  const adminOf = new Map<string, string>(); // hospital id -> one of its admins (doctors are marked "created by" them)
  let hi = 0;
  await pool(hs.flatMap((h) => [0, 1].map((k) => ({ h, k }))), 4, async ({ h, k }) => {
    const p = person(); const email = unique(`ha.${slug(h.short_name)}.${k + 1}`, "oncocare.example.com"); const idx = hi++;
    try {
      const ph = phone(), n = nic(`${1968 + int(0, 22)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`, p.f, false), c = userCode("ADM");
      const a = await makeAccount({ email, phone: ph, nic: n, last: p.last, given: p.given, role: "hospital_admin", code: c, hospitalId: h.id, extra: { job_title: HA_TITLES[k], staff_id: `ADM-${pad(100 + idx, 4)}`, is_primary_admin: k === 0 } });
      if (!adminOf.has(h.id)) adminOf.set(h.id, a.id);
      appendFileSync("seed-admins-credentials.csv", [`${p.given} ${p.last}`, "hospital_admin", h.short_name, c, email, ph, n, a.pw].map((v) => `"${v}"`).join(",") + "\n");
    } catch (e) { console.error(`  ✗ ${email}: ${(e as Error).message}`); }
  });
 
  // doctors: 6 or 8 per hospital
  console.log("Doctors…");
  type Doc = { id: string; email: string; hospitalId: string; short: string };
  const docs: Doc[] = []; let di = 0;
  const docJobs = hs.flatMap((h) => { const cnt = pick([6, 7]); return Array.from({ length: cnt }, (_, k) => ({ h, senior: k < (cnt === 7 ? 3 : 2) })); });
  await pool(docJobs, 4, async ({ h, senior }) => {
    const p = person(); const email = unique(`dr.${slug(p.given.split(" ")[0])}.${slug(p.last)}`, "oncocare.example.com"); const i = di++;
    const specialty = pick(DOC_SPECIALTIES); const role = senior ? "senior_consultant" : "junior_doctor";
    const years = senior ? int(14, 28) : int(1, 9); const quals = senior ? pick([["MBBS", "MD", "MRCP"], ["MBBS", "MD", "FRCP"], ["MBBS", "MD"], ["MBBS", "MD", "PhD"]]) : pick([["MBBS"], ["MBBS"], ["MBBS", "MRCP"], ["MBBS", "MD"]]);
    try {
      const ph = phone(), n = nic(`${1960 + int(0, 34)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`, p.f, i % 3 === 0), c = userCode("CLN"), slmc = String(3000 + i * 7); // simple 4-digit number, for example 3456
      const a = await makeAccount({ email, phone: ph, nic: n, last: p.last, given: p.given, role, code: c, hospitalId: h.id, extra: { created_by: adminOf.get(h.id) ?? null, job_title: senior ? "Consultant" : "Medical Officer", staff_id: `STF-${pad(1000 + i, 4)}` } });
      const { error } = await db.from("clinician_details").insert({ profile_id: a.id, slmc_no: slmc, qualifications: quals, specialty, department: DEPARTMENTS[specialty], years_experience: years });
      if (error) throw new Error(error.message);
      appendFileSync("seed-clinicians-credentials.csv", [`${p.given} ${p.last}`, role, h.short_name, c, email, ph, n, slmc, a.pw].map((v) => `"${v}"`).join(",") + "\n");
      appendFileSync("seed-clinicians-emails.txt", `${email}\n`); appendFileSync("seed-clinicians-passwords.txt", `${a.pw}\n`);
      docs.push({ id: a.id, email, hospitalId: h.id, short: h.short_name });
    } catch (e) { console.error(`  ✗ ${email}: ${(e as Error).message}`); }
  });
  console.log(`  ✓ ${docs.length} doctors`);
 
  // patients: 5 or 8 per doctor, every doctor gets low / medium / high risk patients
  type Job = { doc: Doc; risk: Risk };
  const jobs: Job[] = docs.flatMap((doc) => { const cnt = pick([5, 8]); const start = int(0, 2); return Array.from({ length: cnt }, (_, k) => ({ doc, risk: RISKS[(start + k) % 3] })); });
  console.log(`Patients: ${jobs.length} (with logs, reports, rehabilitation, discharge). This is the slow part…`);
  const tally: Record<string, number> = { low: 0, medium: 0, high: 0 }; const tiers: Record<string, number> = { routine: 0, urgent: 0, emergency: 0 };
  let done = 0, failed = 0;
  await pool(jobs, 6, async ({ doc, risk }) => {
    const story = storyOf(risk); const p = person(); const pool_ = NAMES[p.g]; const female = p.f; const { given, last, g: grp } = p;
    const email = unique(`${slug(given)}.${slug(last)}.${randomInt(10, 99)}`, "patient.oncocare.example.com");
    const child = chance(0.15); const age = child ? int(5, 16) : int(18, 74);
    const txAgo = int(6, 330); const txDate = addDays(today, -txAgo);
    const dob = `${+today.slice(0, 4) - age - 1 - (txAgo > 365 ? 1 : 0)}-${pad(int(1, 12), 2)}-${pad(int(1, 28), 2)}`;
    const diagnosis = pick(["AML", "ALL", "Lymphoma", "Thalassemia", "Other"] as const);
    try {
      const pPhone = phone(), pNic = nic(dob, female, chance(0.4)), pCode = userCode("PAT");
      const a = await makeAccount({ email, phone: pPhone, nic: pNic, last, given, role: "patient", code: pCode, hospitalId: doc.hospitalId });
      const { error: de } = await db.from("patient_details").insert({
        profile_id: a.id, assigned_doctor_id: doc.id, transplant_date: txDate, diagnosis, diagnosis_other: diagnosis === "Other" ? pick(["Myelodysplastic syndrome", "Aplastic anaemia", "Multiple myeloma", "Sickle cell disease"]) : null,
        transplant_type: diagnosis === "Thalassemia" || diagnosis === "AML" || diagnosis === "ALL" ? (chance(0.8) ? "Allogeneic" : "Autologous") : pick(["Autologous", "Allogeneic"]), date_of_birth: dob,
        gender: female ? "Female" : "Male", ec_name: `${pick(pool_[chance(0.5) ? "F" : "M"])} ${last}`, ec_relationship: child ? pick(["Mother", "Father"]) : pick(RELATIONS), ec_phone: phone(),
      });
      if (de) throw new Error(de.message);
      const weight = child ? r1(between(18, 45)) : r1(between(45, 88));
      const logs = buildDaily(story, a.id, doc.hospitalId, txDate, { weight, child });
      await insertChunks("daily_logs", logs);
      const rep = buildReports(story, a.id, doc.hospitalId, doc.id, txDate);
      for (const r of rep) tiers[r.alert.tier as string]++;
      if (rep.length) { await insertChunks("symptom_logs", rep.map((r) => r.log)); await insertChunks("triage_alerts", rep.map((r) => r.alert)); }
 
      const nEx = { stable: 5, mild: 4, medium: 4, critical: 3 }[story];
      const plan = [...lib].sort(() => rnd() - 0.5).slice(0, Math.min(nEx, lib.length));
      const restricted = new Set<number>(story === "medium" ? [plan.length - 1] : story === "critical" ? [plan.length - 1, plan.length - 2] : []);
      const paused = story === "critical" && chance(0.7);
      await db.from("patient_rehab").insert({ patient_id: a.id, paused, pause_reason: paused ? "Unwell with fever: rest until the team reviews you" : null, walking_target_minutes: { stable: int(20, 30), mild: 20, medium: 10, critical: 5 }[story], updated_by: doc.id });
      await insertChunks("patient_exercise_plan", plan.map((e, i) => ({ patient_id: a.id, exercise_id: e.id, status: restricted.has(i) ? "restricted" : "allowed", restriction_reason: restricted.has(i) ? pick(["Low platelets: avoid this exercise for now", "Rest this one until your blood counts recover", "Pain or dizziness: stop for now"]) : null, set_by: doc.id })));
      const changes: Record<string, unknown>[] = [];
      plan.forEach((e, i) => { if (restricted.has(i)) changes.push({ patient_id: a.id, hospital_id: doc.hospitalId, changed_by: doc.id, action: "set", exercise_id: e.id, new_value: { status: "restricted" }, reason: "Restricted because of the patient's current symptoms." }); });
      if (paused) changes.push({ patient_id: a.id, hospital_id: doc.hospitalId, changed_by: doc.id, action: "pause", reason: "Paused until reviewed by the team." });
      if (changes.length) await insertChunks("rehab_changes", changes);
      const allowed = plan.filter((_, i) => !restricted.has(i));
      const pDo = { stable: 0.65, mild: 0.45, medium: 0.28, critical: 0.1 }[story];
      const exLogs: Record<string, unknown>[] = [];
      for (const l of logs) {
        const d = l.log_date as string; if (paused && diffDays(today, d) < 5) continue;
        for (const e of allowed) if (chance(pDo)) { const sym = story !== "stable" && chance(0.12); exLogs.push({ patient_id: a.id, hospital_id: doc.hospitalId, exercise_id: e.id, log_date: d, completed_at: `${d}T${pad(int(6, 17), 2)}:15:00Z`, minutes: int(5, 20), effort: int(2, 8), symptoms: sym, symptom_note: sym ? pick(["Felt dizzy", "A little breathless", "Tired quickly"]) : null }); }
      }
      if (exLogs.length) await insertChunks("exercise_logs", exLogs);
      if (chance({ stable: 0.9, mild: 0.75, medium: 0.55, critical: 0.35 }[story])) {
        await db.from("discharge_acknowledgements").insert({ patient_id: a.id, instruction_id: dischargeId.get(doc.hospitalId)!, version: 1, confirmed_at: new Date(Date.now() - int(0, 20) * 86400000).toISOString() });
      }
      appendFileSync("seed-patients-credentials.csv", [`${given} ${last}`, doc.short, doc.email, risk, pCode, email, pPhone, pNic, a.pw].map((v) => `"${v}"`).join(",") + "\n");
      tally[risk]++;
    } catch (e) { failed++; console.error(`  ✗ ${email}: ${(e as Error).message}`); }
    if (++done % 50 === 0) console.log(`  … ${done}/${jobs.length}`);
  });
  console.log(`\nDone. ${hs.length} hospitals, ${docs.length} doctors, ${jobs.length - failed} patients (${failed} failed). Risk mix:`, tally, " Reports by tier:", tiers);
  console.log(`\nAUTHENTICATOR (same for every seeded account): in Google Authenticator choose "Enter a setup key" and type ${TOTP_SECRET} (time-based). Its 6-digit code works for all accounts.`);
  console.log("Logins: seed-admins-credentials.csv, seed-clinicians-credentials.csv, seed-patients-credentials.csv (+ emails/passwords .txt). Keep them private; delete when finished.");
}
main().catch((e) => { console.error("❌", e.message); process.exit(1); });
 