"use client";

import { useRouter } from "next/navigation";
import SetPassword from "./SetPassword";

export default function ResetClient() {
  const router = useRouter();
  return (
    <SetPassword
      url="/api/auth/reset"
      title="Choose a new password"
      description="It must follow the 16-character rules and be different from your old password. You will then enter your authenticator code."
      onDone={(d) => {
        router.push(String(d.next ?? "/login"));
        router.refresh();
      }}
    />
  );
}
