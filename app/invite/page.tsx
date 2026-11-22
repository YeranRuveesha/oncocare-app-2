import InviteForm from "@/components/auth/InviteForm";
import AuthLayout from "@/components/shell/AuthLayout";

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthLayout title="Open your invite" subtitle="Your hospital created an account for you. Enter your email and the 6-digit code from the invite email.">
      <InviteForm initialEmail={email ?? ""} />
    </AuthLayout>
  );
}
