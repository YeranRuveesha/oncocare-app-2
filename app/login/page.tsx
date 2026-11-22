import Link from "next/link";
import RoleCards from "@/components/auth/RoleCards";
import AuthLayout from "@/components/shell/AuthLayout";

export default function LoginChooser() {
  return (
    <AuthLayout title="Log in" subtitle="Choose how you use OncoCare BMT" wide back={{ href: "/", label: "Home" }}>
      <RoleCards mode="login" />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link href="/signup" className="font-semibold text-primary underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
