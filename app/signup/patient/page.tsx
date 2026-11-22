import SignupClient from "@/components/auth/SignupClient";
import AuthLayout from "@/components/shell/AuthLayout";

export default function PatientSignup() {
  return (
    <AuthLayout title="Patient sign-up" subtitle="All fields marked * are compulsory." wide back={{ href: "/signup", label: "Back" }}>
      <SignupClient kind="patient" />
    </AuthLayout>
  );
}
