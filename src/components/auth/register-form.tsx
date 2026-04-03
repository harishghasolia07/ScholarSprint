"use client";

import { FormEvent, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { getClientErrorMessage, requestJson } from "@/lib/client-http";

export function RegisterForm() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestJson<{ ok: boolean; userId: string }>("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      toast.success("Account created successfully. Please login.");
      window.location.href = "/login";
    } catch (requestError) {
      const message = getClientErrorMessage(requestError, "Registration failed. Please try again.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="register-name" className="sr-only">
        Full name
      </label>
      <input
        id="register-name"
        required
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2"
        placeholder="Full name"
        autoComplete="name"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "register-error" : undefined}
      />

      <label htmlFor="register-email" className="sr-only">
        Email
      </label>
      <input
        id="register-email"
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2"
        placeholder="Email"
        autoComplete="email"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "register-error" : undefined}
      />

      <label htmlFor="register-password" className="sr-only">
        Password
      </label>
      <input
        id="register-password"
        required
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2"
        placeholder="Password"
        minLength={8}
        autoComplete="new-password"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "register-error" : undefined}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      {error ? (
        <p id="register-error" role="alert" aria-live="polite" className="text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
