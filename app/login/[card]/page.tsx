import { notFound } from "next/navigation";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import AuthLayout from "@/components/shell/AuthLayout";
import { CARD_LABEL, ROLE_CARDS, type RoleCard } from "@/lib/roles";

export default async function LoginPage({ params }: { params: Promise<{ card: string }> }) {
  const { card } = await params;
  if (!ROLE_CARDS.includes(card as RoleCard)) notFound();
  const c = card as RoleCard;
  return (
    <AuthLayout title={`${CARD_LABEL[c]} login`} back={{ href: "/login", label: "Back" }}>
      <LoginForm card={c} />
      {(c === "hospital-admin" || c === "admin") && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          First time? <Link href="/activate" className="font-semibold text-primary underline">Activate my account</Link>
        </p>
      )}
    </AuthLayout>
  );
}
