# Go live for free: hosted Supabase + Vercel (step by step)

> **DEMO ONLY.** Fictional data only. Do the local setup in **SETUP.md** first and make sure it works.

You already have a hosted Supabase project. These are the settings the v3 app needs there.
All are free-tier.

---

## ☐ Step 1 · Replace the database (5 min)

> ⚠️ This **deletes all OncoCare tables and data** in the hosted project and rebuilds them.

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Open `supabase\migrations\20261120000000_oncocare_v3.sql` in VS Code, select all (**Ctrl+A**), copy, paste into the editor.
3. Click **Run**. It should say *Success. No rows returned*.
4. **Authentication → Users**: delete the old test users from v2 (their emails would otherwise be "already registered").

**Then also run `supabase\migrations\20261122000000_oncocare_v4_clinical.sql`** the same way (new features: daily log, reports, rehab, discharge instructions, private storage buckets). If your hosted project already runs v3 with data, skip Step 1 and run only this v4 file (see UPDATE-V4.md).

You no longer need `0001_init.sql` or `0002_fix_permissions.sql`: the new file contains all permissions.

## ☐ Step 2 · Login settings (5 min)

**Authentication → Sign In / Providers**

* **Email**: enabled. Turn **Confirm email** **OFF** (the app checks email itself with a 6-digit code).
  Turn **Secure email change** **OFF**. Set **Email OTP length** to **6**.
* **Phone**: enabled. Pick **Twilio** and type dummy values (for example Account SID `AC00000000000000000000000000000000`,
  Auth Token `dummy`, Message Service SID `MG00000000000000000000000000000000`). No SMS is ever sent for test numbers.
  Under **Test phone numbers and OTPs** add (one per line):

  ```
  94770000000=123456,94770000001=123456,94770000002=123456,94770000003=123456,94770000004=123456,94770000005=123456,94770000006=123456,94770000007=123456,94770000008=123456,94770000009=123456,94770000010=123456
  ```

  Turn **Confirm phone** **OFF**.
* **Password**: minimum length **16**.

**Authentication → Multi-Factor** → **TOTP (App Authenticator)**: **Enabled**.

**Authentication → URL Configuration**

* **Site URL**: your Vercel address, e.g. `https://oncocare-yourname.vercel.app`
* **Redirect URLs**: add `https://oncocare-yourname.vercel.app/**` and `http://localhost:3000/**`

## ☐ Step 3 · Email templates (10 min)

**Authentication → Emails → Templates.** The app types codes, so each email must show `{{ .Token }}`.
Copy the HTML from the matching file in `supabase\templates\`:

| Supabase template | File |
|---|---|
| Magic Link | `magic_link.html` |
| Invite user | `invite.html` |
| Reset Password | `recovery.html` |
| Change Email Address | `email_change.html` |

(Optional, under **Security notifications**: Password changed → `password_changed_notification.html`.)

## ☐ Step 4 · An email sender (10 min, free)

Supabase's built-in email only sends **2 emails per hour** and only to your own team's addresses.
For a demo that others try, add a free SMTP sender, for example **Brevo** (300 emails/day free):

1. Sign up at https://www.brevo.com → **SMTP & API** → create an SMTP key.
2. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   host `smtp-relay.brevo.com`, port `587`, your Brevo login and SMTP key, sender = an address you verified in Brevo.
3. Use the same values for the app's own emails (Step 6: `SMTP_*`).

## ☐ Step 5 · Create the first Admin (2 min)

In `.env.local` on your PC, temporarily put the **hosted** URL and keys, then run:

```powershell
npm run create-admin -- --email you@example.com --phone +94770000001 --nic 851234567V --last Perera --given Demo
```

Then put the local values back if you want to keep developing locally.

## ☐ Step 6 · Vercel (10 min)

1. Push the code to GitHub (`.env.local` is ignored, never commit it).
2. https://vercel.com → **Add New → Project** → import the repository.
3. **Environment Variables** (Settings → Environment Variables):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY` | the **secret** key (only here and in `.env.local`) |
| `NEXT_PUBLIC_SITE_URL` | `https://oncocare-yourname.vercel.app` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | from Step 4 |
| `AI_PROVIDER` | `mock` or `gemini` |
| `GEMINI_API_KEY` | only if you chose `gemini` |

4. **Deploy**. Then open the site → **Login → Admin → Activate my account**.

## Costs

Supabase Free, Vercel Hobby, Brevo Free, Gemini free tier, test phone numbers instead of SMS: **0**.
Free Supabase projects pause after a week without use; click **Restore** in the dashboard.
