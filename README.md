# OncoCare BMT (demo)

> ⚠️ **DEMO ONLY · not medical advice.** Fictional data only. The red-flag rules are placeholders that a hospital's clinical team must write and sign off before any real use.

An AI-assisted outpatient companion and clinical triage web app for bone marrow transplant (BMT) recovery, white-labelled per hospital.

**Put it online for free:** follow [GO-LIVE.md](./GO-LIVE.md). **Installing tools / fixing errors:** [SETUP.md](./SETUP.md).

## Quick start (local, free)

```bash
npm install
npx supabase start          # needs Docker Desktop running
npx supabase status         # copy the URL + keys into .env.local (see .env.example)
npm run create-admin -- --email admin@example.com --phone +94770000001 --nic 851234567V --last Perera --given Demo
npm run dev                 # http://localhost:3000 → Login → Admin → Activate my account
npm test
```

Emails (codes, invites, temporary passwords) appear in **Mailpit: http://localhost:54324**.
Phone codes: Sri Lanka +94, numbers 77 000 0000 to 77 000 0020, code **123456**.

**New in v4:** see [UPDATE-V4.md](./UPDATE-V4.md) (landing page, daily log, symptom reports, rehabilitation, progress charts, clinician patient records, discharge instructions).

Illustrations on the home page are original inline SVG drawings (no third-party artwork). Charts use Recharts (MIT licence).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui · Next.js API routes · Supabase Postgres + RLS + Auth (email OTP, phone OTP, TOTP MFA) + Storage · Zod (shared browser/server rules) · Gemini/OpenAI/mock triage · Vercel.

## Roles and how accounts are made

| Role | User ID | How the account is made | Approved by |
|---|---|---|---|
| Patient | `PAT-xxxxxxxx` | public sign-up, or Hospital Admin invite | active after verification |
| Clinician (Junior Doctor / Senior Consultant) | `CLN-xxxxxxxx` | public sign-up, or Hospital Admin invite | Hospital Admin of the same hospital (self sign-up) |
| Hospital Admin | `ADM-xxxxxxxx` | Admin creates it with the hospital (temporary password, 48 h, one use) | Admin |
| Admin | `SUP-xxxxxxxx` | first one by `npm run create-admin`, later ones invited by an Admin | another Admin |

Every account verifies **email + phone + authenticator app** before it can use the app, and every login needs the authenticator code (AAL2). This is enforced in the server (`lib/gate.ts`, `lib/api.ts`), in the database trigger and in RLS (`app_ok()`).

## Main screens

| Route | Who |
|---|---|
| `/` | landing page |
| `/signup` → `/signup/patient`, `/signup/clinician` | role cards; Hospital Admin and Admin cards point to activation |
| `/login` → `/login/[card]` → `/login/verify` | role card, email/phone/User ID + password, authenticator code |
| `/activate`, `/invite`, `/onboarding` | first login: new password, email code, phone code, authenticator QR |
| `/forgot-password`, `/reset-password` | reset by email |
| `/profile` | everyone: photo, details, change requests for locked fields |
| `/patient/*` | patient home, report, results |
| `/clinician/*` | clinician home, patients, triage queue |
| `/hospital/*` | Hospital Admin: patients, clinicians, approvals, branding, audit |
| `/admin/*` | Admin: hospitals, hospital admins, admins, approvals, audit (no patient data) |

## Triage safety design

1. **Rules first** (`lib/triage/redFlags.ts`): fever ≥ 38.0°C, rigors, breathing difficulty, chest pain, confusion, bleeding → Emergency. Diarrhoea, vomiting, new rash, mouth sores, line-site redness → Urgent. No AI involved.
2. **De-identify** (`lib/triage/redact.ts`): names, emails, phones, NIC/MRN numbers, dates and links are stripped from notes.
3. **AI assist** (`lib/triage/ai.ts`): `AI_PROVIDER=gemini|openai|mock`. Output is schema-validated; on error/timeout it falls back to the mock.
4. **Merge** (`lib/triage/triageService.ts`): AI may raise urgency, **never lower** a red-flag tier.
5. Triage runs **on the server** and is written with the service role; RLS + column grants stop patients forging a tier and stop staff editing tier/score.

## Folder map

```
app/                 pages and API routes (Next.js App Router)
  (app)/             signed-in pages with the left navigation (patient, clinician, hospital, admin, profile)
  api/               backend routes (auth, onboarding, profile, change-requests, hospital, admin, checkins, alerts)
components/          forms, auth screens, shell (navigation), profile, admin, clinical, ui (shadcn)
lib/                 server logic: accounts, login, gate, verification, audit, change requests, triage
lib/validation/      Zod rules shared by the browser and the server
supabase/migrations/ one SQL file: tables, RLS, grants, storage buckets and policies
supabase/templates/  email templates (6-digit codes)
scripts/create-admin.ts  makes the first Admin
tests/               Vitest tests
```
