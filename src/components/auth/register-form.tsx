"use client";

import { FormEvent, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";

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

    const response = await fetch("/api/register", {
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

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      const message = payload.error ?? "Registration failed. Please try again.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Account created successfully. Please login.");

    window.location.href = "/login";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        required
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2"
        placeholder="Full name"
      />

      <input
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2"
        placeholder="Email"
      />

      <input
        required
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2"
        placeholder="Password"
        minLength={8}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </form>
  );
}
