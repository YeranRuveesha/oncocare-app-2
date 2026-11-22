import ActivateForm from "@/components/auth/ActivateForm";
import AuthLayout from "@/components/shell/AuthLayout";

export default function ActivatePage() {
  return (
    <AuthLayout
      title="Activate my account"
      subtitle="For Hospital Admins and Admins. Next you will set your own password and verify your email, phone and authenticator app."
      back={{ href: "/signup", label: "Back" }}
    >
      <ActivateForm />
    </AuthLayout>
  );
}
