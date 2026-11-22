import ForgotForm from "@/components/auth/ForgotForm";
import AuthLayout from "@/components/shell/AuthLayout";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthLayout title="Forgot password?" subtitle="We will email you a link to choose a new password. Your authenticator app stays the same." back={{ href: "/login", label: "Login" }}>
      <ForgotForm linkError={Boolean(error)} />
    </AuthLayout>
  );
}
