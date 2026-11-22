# OncoCare BMT · Setup guide for Windows (beginner friendly)

> **DEMO ONLY.** Use fake people and fake data. This app is not medical advice.

This version (v3) has 4 kinds of user: **Patient**, **Clinician** (Junior Doctor or Senior Consultant),
**Hospital Admin** and **Admin**. Every account must verify **email**, **telephone** and an
**authenticator app** (Google Authenticator, Microsoft Authenticator, Authy, all free).

Everything below is free.

---

## What runs where

| Thing | What it does | Address on your computer |
|---|---|---|
| Next.js app | the website | http://localhost:3000 |
| Supabase (local, in Docker) | database, logins, file storage | http://127.0.0.1:54321 |
| Supabase Studio | look at the tables in a browser | http://localhost:54323 |
| **Mailpit** | catches every email the app sends (codes, invites, temp passwords) | **http://localhost:54324** |

No real emails or SMS are sent locally:

* **Email codes** appear in Mailpit.
* **Phone codes:** choose **Sri Lanka (+94)** and type a test number **77 000 0000 to 77 000 0020**.
  The code is always **123456**. (Each account needs a different number.)

---

## Part 1 · Install the tools (one time)

1. **Node.js 20 or newer (LTS)**: https://nodejs.org → download the LTS installer → Next, Next, Finish.
2. **Git**: https://git-scm.com/download/win → default options.
3. **VS Code**: https://code.visualstudio.com
4. **Docker Desktop** (runs Supabase on your PC): https://www.docker.com/products/docker-desktop/
   * Install with the **WSL 2** option ticked. Restart Windows if it asks.
   * Open Docker Desktop once and wait until it says **Engine running** (green).
   * Docker Desktop is free for personal use and education.
5. An **authenticator app** on your phone (Google Authenticator or Microsoft Authenticator).

Check in a new terminal (VS Code: **Terminal → New Terminal**):

```powershell
node -v      # v20 or newer
docker -v    # any version
```

---

## Part 2 · Unzip the project

1. Unzip `oncocare-app.zip` into a short path, for example `C:\Users\<you>\develop\`.
   You get the folder `C:\Users\<you>\develop\oncocare-app`.
   (Use this fresh folder. Do not copy it on top of an old version.)
2. In VS Code: **File → Open Folder…** → choose `oncocare-app`.
3. Open the terminal (**Terminal → New Terminal**) and install the packages:

```powershell
npm install
```

---

## Part 3 · Supabase: pick ONE way

| | **A. Local Supabase (practice only, needs Docker)** | **B. Online Supabase (supabase.com), needed for Vercel** |
|---|---|---|
| Cost | free | free |
| Needs | Docker Desktop | an account + 20 minutes of settings |
| Emails with codes | appear in Mailpit, unlimited | only 2 per hour unless you add a free email sender |
| Phone codes | test numbers work at once | you must add the test numbers yourself |
| Best for | building and testing on your PC | showing it online later (Vercel) |

Vercel only hosts the website, not the database. The live site on Vercel always uses **B**.
If you don't want Docker, skip A and do **B** for both your PC and Vercel (same keys in `.env.local` and in Vercel).

---

### 3A · Local Supabase (on your PC)

**Step 1 · Start Docker.** Open **Docker Desktop** and wait until the bottom-left says **Engine running**.

**Step 2 · Create and start the database.** In the VS Code terminal (inside `oncocare-app`):

```powershell
npx supabase start
```

* The first time downloads about 2 GB (5 to 15 minutes). Later starts take seconds.
* This **creates** everything for you: all tables, security rules, photo storage,
  email templates, the 6-digit codes, the authenticator setting and the test phone numbers.
  They come from `supabase\config.toml` and `supabase\migrations\20261120000000_oncocare_v3.sql`.
  You do not need to click anything in a dashboard.

**Step 3 · Find the API keys.**

```powershell
npx supabase status
```

It prints a small table. Look for these lines (the exact layout depends on the CLI version):

```
API URL / Project URL   http://127.0.0.1:54321
Studio                  http://127.0.0.1:54323
Mailpit                 http://127.0.0.1:54324
Publishable             sb_publishable_....
Secret                  sb_secret_....
```

(Older CLI versions call them `anon key` and `service_role key`. Same thing.)

**Step 4 · Connect the app: create `.env.local`.**

1. In VS Code's left Explorer, right-click `.env.example` → **Copy**, then right-click the empty space → **Paste**.
2. Right-click the copy → **Rename** → type exactly `.env.local`
   (not `.env.local.txt`, not `local.env`).
3. Fill it in like this:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the Publishable key>
SUPABASE_SERVICE_ROLE_KEY=<the Secret key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
SMTP_FROM=OncoCare BMT <no-reply@oncocare.local>
AI_PROVIDER=mock
```

4. Save (**Ctrl+S**).

| `.env.local` line | Comes from | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **API URL** | always `http://127.0.0.1:54321` locally |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publishable key** (`sb_publishable_...`) | safe for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret key** (`sb_secret_...`) | server only, never share |

> These local keys only work on your own PC, so they are safe for practice.

**Step 5 · Check it.** Open http://127.0.0.1:54323 (Studio) → **Table Editor**. You should see
`hospitals`, `profiles`, `patient_details`, `clinician_details`, `change_requests`, `audit_logs` and more.

Every time you come back later: open Docker Desktop, then `npx supabase start`. Your data is kept.
To stop: `npx supabase stop`.

---

### 3B · Online Supabase (supabase.com), no Docker, used by Vercel

**Step 1 · Create the project.**

1. Go to https://supabase.com → **Start your project** → sign in with GitHub or email.
2. **New project** → choose your organization → Name `oncocare-bmt` → make up a strong **Database Password**
   (save it somewhere) → Region **Southeast Asia (Singapore)** → plan **Free** → **Create new project**.
3. Wait about 2 minutes until the project is ready.

**Step 2 · Create the tables.**

1. Left menu → **SQL Editor** → **+ New query**.
2. In VS Code open `supabase\migrations\20261120000000_oncocare_v3.sql`, press **Ctrl+A**, **Ctrl+C**.
3. Paste into the SQL Editor → **Run**. It should say *Success. No rows returned*.
   (It removes any old OncoCare tables first.)
4. If you used this project before: **Authentication → Users** → delete the old test users.
5. **Then run the v4 file too** (same way): `supabase\migrations\20261122000000_oncocare_v4_clinical.sql`. It adds the new features. Already running v3 online with data? Run **only** the v4 file: see **UPDATE-V4.md**.

**Step 3 · Find the API keys.**

* **Project URL:** click the **Connect** button at the top of the dashboard
  (or **Project Settings → Data API**). It looks like `https://abcdefghijkl.supabase.co`.
* **Keys:** **Project Settings → API Keys**.
  * **Publishable key** `sb_publishable_...` → copy.
  * **Secret key** `sb_secret_...` → click the eye/**Reveal** → copy.
  * (On the **Legacy API Keys** tab, `anon` = publishable and `service_role` = secret. Either set works.)

**Step 4 · Connect the app.** In `.env.local` use the online values instead of the local ones:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
SUPABASE_SERVICE_ROLE_KEY=<Secret key>
```

> ⚠️ The online **Secret key** gives full access to your database. Never paste it in chat,
> screenshots or GitHub. If it was ever shared, make a new one: **API Keys → Secret keys → ⋯ → Roll / Create new** and delete the old one.

**Step 5 · Dashboard settings** (the local version does these automatically):

* **Authentication → Sign In / Providers → Email:** on. **Confirm email** off. **Secure email change** off. **Email OTP Length: 6** (new projects default to 8, and the app only has 6 boxes, so this one matters!).
* **Authentication → Sign In / Providers → Phone:** on, provider **Twilio** with dummy values
  (Account SID `AC00000000000000000000000000000000`, Auth Token `dummy`, Message Service SID `MG00000000000000000000000000000000`),
  **Confirm phone** off, and in **Test phone numbers and OTPs** paste:
  `94770000000=123456,94770000001=123456,94770000002=123456,94770000003=123456,94770000004=123456,94770000005=123456,94770000006=123456,94770000007=123456,94770000008=123456,94770000009=123456,94770000010=123456`
* **Authentication → Sign In / Providers → Password:** minimum length **16**.
* **Authentication → Multi-Factor:** **TOTP (App Authenticator)** enabled.
* **Authentication → URL Configuration:** Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**`.
* **Authentication → Emails → Templates:** paste the HTML from `supabase\templates\`
  (Magic Link ← `magic_link.html`, Invite ← `invite.html`, Reset Password ← `recovery.html`, Change Email ← `email_change.html`).
* **Emails:** Supabase's built-in sender only sends **2 emails per hour**, only to your own team's addresses.
  For more, add a free sender (see GO-LIVE.md Step 4, Brevo) and put the same values in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

After changing `.env.local`, stop `npm run dev` (**Ctrl+C**) and start it again.

---

## Part 4 · Create the first Admin (one time)

There is no public sign-up for Admins. Make the first one with a command (fake details are fine):

```powershell
npm run create-admin -- --email admin@example.com --phone +94770000001 --nic 851234567V --last Perera --given Demo
```

It prints a **User ID** like `SUP-12345678` and a **temporary password** (16 characters).
Copy both now: the password is shown once, works once and expires in 48 hours.

---

## Part 5 · Run the app

```powershell
npm run dev
```

Open http://localhost:3000.

### 5.1 Activate the Admin

1. Click **Login → Admin → Activate my account**.
2. Enter the User ID and temporary password.
3. Choose your own 16-character password (upper, lower, number, special; no spaces or `: ( ) .`).
4. **Email code:** open http://localhost:54324, open the newest email, type the 6-digit code.
5. **Phone code:** type **123456**.
6. **Authenticator:** scan the QR code with your phone app, type the 6-digit code it shows.

You are now on the Admin home page.

### 5.2 Create a hospital and its Hospital Admin

1. **Hospitals → New hospital**. Step 1: hospital details, logo and colours (live preview).
   Step 2: the first Hospital Admin (use phone `77 000 0002`).
2. You get the Hospital Admin's **User ID** and **temporary password** once (Copy button).
   The same details are also emailed (see Mailpit).
3. Log out, then **Login → Hospital Admin → Activate my account** and repeat steps 2 to 6 of 5.1.
   The hospital changes from **Awaiting admin setup** to **Active**.

### 5.3 Add a doctor

As the Hospital Admin: **Clinicians → Add clinician**. An invite email appears in Mailpit.
Open http://localhost:3000/invite, type the email and the code from the invite, then set a password
and verify the phone (use `77 000 0003`) and authenticator.

### 5.4 Patient and clinician sign-up

From the home page: **Sign up → Patient** (choose the hospital and the approved doctor) or
**Sign up → Clinician**. After email, phone and authenticator:

* Patients go straight to their home page.
* Self-registered clinicians wait until a Hospital Admin of the same hospital approves them
  (**Approvals** page).

### 5.5 Logging in later

**Login → choose your role card →** email or telephone (Hospital Admin and Admin can also use the User ID)
**→ password → authenticator code.** Five wrong passwords lock the login for 10 minutes.
Choosing the wrong card simply says "Invalid credentials".

**Forgot password:** Login → *Forgot password?* → the reset email arrives in Mailpit.

---

## Part 6 · Tests

```powershell
npm test           # unit tests
npm run typecheck  # TypeScript check
npm run build      # full production build
```

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | start the website |
| `npx supabase start` | start the local database (Docker must be running) |
| `npx supabase stop` | stop it (your data is kept) |
| `npx supabase status` | show the local addresses and keys |
| `npx supabase db reset` | **wipe everything** and rebuild the tables (then run `create-admin` again) |
| `npm run create-admin -- ...` | make an Admin account |
| `npm run seed-demo` | add 3 fake patients with 30 days of fake data (needs `.env.local`) |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npx supabase start` says Docker is not running | Open Docker Desktop and wait for **Engine running**. |
| Port already in use (54321 etc.) | `npx supabase stop`, then start again. Close other Supabase projects. |
| "Missing NEXT_PUBLIC_SUPABASE_URL" | `.env.local` is missing or misnamed (not `.env.local.txt`). Restart `npm run dev` after editing it. |
| No email code arrives | Open http://localhost:54324. Wait 5 seconds before asking for a new code. |
| Phone code fails | Use Sri Lanka +94 and a number 77 000 0000 to 77 000 0020, code 123456. Each account needs its own number. |
| Authenticator code is wrong | Check your phone's time is automatic. Codes change every 30 seconds. |
| "Your temporary password has expired" | Admin → Hospital admins → **Regenerate credentials**. |
| Lost the Admin authenticator | `npx supabase db reset` and start again (demo data only). |

Putting it online with a hosted Supabase project and Vercel: see **GO-LIVE.md**.
