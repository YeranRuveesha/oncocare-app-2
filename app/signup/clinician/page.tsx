import SignupClient from "@/components/auth/SignupClient";
import AuthLayout from "@/components/shell/AuthLayout";

export default function ClinicianSignup() {
  return (
    <AuthLayout
      title="Clinician sign-up"
      subtitle="After sign-up your Hospital Admin checks your SLMC number and approves your account."
      wide
      back={{ href: "/signup", label: "Back" }}
    >
      <SignupClient kind="clinician" />
    </AuthLayout>
  );
}
