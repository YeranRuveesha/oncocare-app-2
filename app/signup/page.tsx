import Link from "next/link";
import RoleCards from "@/components/auth/RoleCards";
import AuthLayout from "@/components/shell/AuthLayout";

export default function SignupChooser() {
  return (
    <AuthLayout title="Create an account" subtitle="Who are you?" wide back={{ href: "/", label: "Home" }}>
      <RoleCards mode="signup" />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="font-semibold text-primary underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
