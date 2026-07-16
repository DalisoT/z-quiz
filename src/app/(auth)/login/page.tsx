import Link from "next/link";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{ check_email?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { check_email, next } = await searchParams;

  return (
    <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back. Sign in to continue practising.
      </p>

      {check_email && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-border bg-muted px-4 py-3 text-sm"
        >
          Account created. Check your email to confirm before signing in.
        </div>
      )}

      <LoginForm nextPath={next} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
