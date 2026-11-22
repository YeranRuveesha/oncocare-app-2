"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import PhoneInput from "@/components/forms/PhoneInput";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client";
import { cardAllowsUserId, type RoleCard } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Method = "email" | "phone" | "userId";

/**
 * ONE login form for all 4 roles. Patients/clinicians: email or phone.
 * Hospital Admin/Admin: email, phone or User ID. Then the authenticator code.
 */
export default function LoginForm({ card }: { card: RoleCard }) {
  const router = useRouter();
  const methods: Method[] = cardAllowsUserId(card) ? ["email", "phone", "userId"] : ["email", "phone"];
  const [method, setMethod] = useState<Method>("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const labels: Record<Method, string> = { email: "Email", phone: "Telephone", userId: "User ID" };

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        if (!identifier || !password) {
          setError("Please fill in both fields.");
          return;
        }
        setBusy(true);
        const res = await api<{ next: string }>("/api/auth/login", { card, identifier, password });
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(res.data.next);
        router.refresh();
      }}
    >
      <div className="grid rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${methods.length}, 1fr)` }} role="tablist" aria-label="Log in with">
        {methods.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => {
              setMethod(m);
              setIdentifier("");
            }}
            className={cn("rounded-md px-3 py-2 text-sm font-medium", method === m ? "bg-white text-primary shadow-sm" : "text-muted-foreground")}
          >
            {labels[m]}
          </button>
        ))}
      </div>

      {method === "email" && (
        <Field id="identifier" label="Email address" required>
          <Input id="identifier" type="email" autoComplete="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        </Field>
      )}
      {method === "phone" && (
        <Field id="identifier" label="Telephone number" required>
          <PhoneInput id="identifier" value={identifier} onChange={setIdentifier} />
        </Field>
      )}
      {method === "userId" && (
        <Field id="identifier" label="User ID" required hint="e.g. ADM-48271936">
          <Input id="identifier" autoComplete="username" placeholder={card === "admin" ? "SUP-12345678" : "ADM-12345678"} value={identifier} onChange={(e) => setIdentifier(e.target.value.toUpperCase())} />
        </Field>
      )}
      <Field id="password" label="Password" required>
        <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} />
      </Field>
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Continue
      </Button>
      <p className="text-center text-xs text-muted-foreground">Next you will enter the 6-digit code from your authenticator app.</p>
    </form>
  );
}
