"use client";

import { useActionState } from "react";
import type { LoginState } from "@/app/admin/(auth)/login/actions";

type LoginFormProps = {
  action: (state: LoginState, formData: FormData) => Promise<LoginState>;
  next?: string;
};

const inputClass =
  "w-full rounded border border-rule bg-surface px-3 py-2.5 text-base text-ink aria-invalid:border-danger";

export function LoginForm({ action, next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? (
        <p
          role="alert"
          data-testid="login-error"
          className="rounded border border-danger px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className={inputClass}
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-sm text-danger">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className={inputClass}
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-danger">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
