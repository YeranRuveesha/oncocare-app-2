import AuthLayout from "@/components/shell/AuthLayout";

export default function BlockedPage() {
  return (
    <AuthLayout title="This account cannot be used">
      <p className="text-sm text-muted-foreground">This account or its hospital has been deactivated. Please contact your hospital.</p>
      <form action="/api/auth/logout" method="post" className="mt-6">
        <button className="text-sm font-medium text-primary underline">Log out</button>
      </form>
    </AuthLayout>
  );
}
