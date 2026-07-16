"use client";

import { useActionState } from "react";
import { signIn, type AuthFormState } from "../actions";

const initialState: AuthFormState = { error: null };

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          suppressHydrationWarning
          className="mt-1 block w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
          placeholder="••••••••"
        />
      </div>

      {nextPath && <input type="hidden" name="next" value={nextPath} />}

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
