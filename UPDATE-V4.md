# What's new in this version (v4) and how to switch it on

> **DEMO ONLY.** Fictional data only. The medical text, the triage rules and the exercise list are
> placeholders that a clinical team must review before any real use (look for `TODO: clinician`
> comments in the code).

Your v3 website is unchanged. This version only **adds** things. **No Docker is needed** for any step
below if you use the online Supabase and Vercel.

## What was added

* **Home page**: sticky menu with links, new sections (What is bone marrow, transplant types, journey, conditions, recovery at home, how it helps, hospitals, FAQ), footer, cookie notice, and the pages `/privacy`, `/terms`, `/cookies`, `/accessibility`, `/contact` (contact form saved in the database).
  Edit your contact details in `config/site.ts` and the hospitals list in `config/partner-hospitals.ts`.
* **Patient**: Discharge Instructions, new 3-step Report Symptoms, Daily Log, Rehabilitation, My Progress (8 charts).
* **Clinician**: My Patients (search, filters, sort), a full patient record with tabs, CSV export, reply to / escalate reports.
* **Hospital Admin**: Discharge Instructions editor (every save is a new version).
* **Admin**: edits their own profile directly (password + authenticator code), no approval.
* **Every list** now has a numbered "No." column, search, sorting and paging.
* The rules that decide Routine / Urgent / Emergency are in **one file**: `config/triage-rules.ts`.

## Step 1 · Install the new package (on your PC)

Open the project folder in VS Code → **Terminal → New Terminal**:

```powershell
npm install
```

(It adds the chart library `recharts`.)

## Step 2 · Update your ONLINE Supabase (5 minutes, no Docker)

You do **not** need to change any Authentication, Providers or Email setting. You only run one file.

1. Open https://supabase.com/dashboard → your project.
2. Left menu → **SQL Editor** → **+ New query**.
3. In VS Code open `supabase\migrations\20261122000000_oncocare_v4_clinical.sql`.
   Press **Ctrl+A**, then **Ctrl+C**.
4. Paste it into the SQL Editor and click **Run**. You should see *Success. No rows returned*.
   * It is safe to run twice.
   * It **does not delete** your hospitals, users or old check-ins.
5. Check it worked: left menu → **Table Editor**. You should now see `daily_logs`, `discharge_instructions`,
   `exercises`, `patient_exercise_plan`, `exercise_logs`, `contact_messages` and more.
   Left menu → **Storage** should show two **private** buckets: `discharge-docs` and `symptom-photos`.
6. **Brand-new online project?** Run the **old** file `20261120000000_oncocare_v3.sql` first, then this one.
   (Never run the v3 file on a project that already has data: it wipes it.)

If the website says it cannot find a table right after step 4, wait one minute, or run
`notify pgrst, 'reload schema';` in the SQL Editor.

## Step 3 · Put the new code on Vercel

1. Commit and push to GitHub as before (`.env.local` is never pushed).
2. Vercel redeploys by itself. No new Environment Variables are needed.
3. Open your site and check `/` and `/contact`.

## Step 4 · (Optional) Add fake demo patients so the charts have data

This creates 3 made-up patients with 30 days of made-up logs, reports and exercise records, and 1 made-up doctor.
In `.env.local` put your online values (see SETUP.md Part 3B), then:

```powershell
npm run seed-demo
```

It prints, **once**, an email, a password and an **authenticator secret** for each demo account.
To log in as one: choose the role card, enter the email and password, and for the 6-digit code add the
secret to Google/Microsoft Authenticator ("enter a setup key"). Run it again any time to reset the demo data.
Put your normal `.env.local` values back afterwards if you switched.

## Step 5 · Try it

| As | Open | What to look at |
|---|---|---|
| Patient | Daily Log, Report Symptoms, Rehabilitation, My Progress, Discharge Instructions | forms, the 3-step report, charts |
| Clinician (assigned doctor) | My Patients → click a name | tabs, CSV export, plan changes (reason needed) |
| Clinician | Triage Queue | reply, escalate |
| Hospital Admin | Discharge Instructions | edit → "Publish as a new version" |
| Admin | My Profile → Edit my details | password + code needed; new email/phone gets a code first |

## Who can see what (enforced in the database)

* A patient sees only their own rows.
* A doctor (Junior or Senior) sees **only the patients assigned to them**. Nobody else's patients, even in the same hospital.
* **Hospital Admins and Admins can never read** logs, reports, charts, exercises or photos.
* Browsers can only **read** the new tables. Every write goes through the server after it checks the person.
* Photos and PDFs are in private buckets and open only through links that expire in 60 seconds.
* Names, phone numbers, NIC or addresses are never sent to the AI. It only gets symptoms, severity, temperature, day after
  transplant and text with personal details removed. The AI can only **raise** the urgency, never lower it.

## Honest limits of this demo

* Search/sort/paging on lists happen on the server after fetching up to about 1,000 to 2,000 rows. That is fine for a demo,
  but a real hospital would page in the database itself.
* The "PDF" of a discharge page or patient record is the browser's **Print → Save as PDF**. A hospital can also upload its own PDF.
* Voice-to-text uses your browser's own speech service (Chrome/Edge). It is hidden when the browser does not offer it.
* The original PDF you mentioned for the discharge text was not received, so the seeded text was written from the
  wording in your message. Replace it in the Hospital Admin editor if you have the official version.

---

(see the last section: **All the fake demo data in one command**)

---

## v4.1: doctors see only their own patients

Run `supabase/migrations/20261122010000_assigned_only.sql` once in the Supabase SQL Editor (paste, Run). No redeploy needed for the rule itself.
A patient is assigned to a doctor on the sign-up form or by the Hospital Admin. A doctor with no assigned patients sees an empty list.

---

## All the fake demo data in one command

1. The v4 SQL (and the v4.1 SQL) must already be applied.
2. In the project folder: `npm run seed-all`
3. It shows what it will delete and asks you to type **DELETE**. It then removes ALL hospitals, patients, clinicians, Hospital Admins and seeded Super Admins. Super Admins you made yourself (for example with `npm run create-admin`) are kept.
4. It then creates: 5 Super Admins, 20 hospitals (10 Government/Teaching + 10 Private, in Colombo, its suburbs, Kandy, Galle, Jaffna and more), 2 Hospital Admins per hospital, 6 or 8 doctors per hospital, 5 or 8 patients per doctor. Every doctor has a mix of **low, medium and high risk** patients, each with daily logs, reports with triage alerts, rehabilitation and discharge instructions.
5. It makes about 1,100 accounts, so it can take 20 to 40 minutes. Leave the terminal open.
6. Logins are saved in `seed-admins-credentials.csv`, `seed-clinicians-credentials.csv` (+ emails/passwords `.txt` lists) and `seed-patients-credentials.csv`. Delete them when finished.
7. Only want to delete: `npm run seed-reset`.
