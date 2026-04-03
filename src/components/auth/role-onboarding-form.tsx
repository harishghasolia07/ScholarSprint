"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers/toast-provider";
import { getClientErrorMessage, requestJson } from "@/lib/client-http";

type SelectableRole = "student" | "admin";

export function RoleOnboardingForm() {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<SelectableRole>("student");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestJson<{ ok: boolean }>("/api/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          adminKey: adminKey.trim() || undefined,
        }),
      });

      toast.success("Role updated successfully.");

      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      const message = getClientErrorMessage(requestError, "Unable to set role.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-900">Select your role</legend>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-teal-500">
          <input
            type="radio"
            name="role"
            value="student"
            checked={role === "student"}
            onChange={() => setRole("student")}
            className="h-4 w-4"
          />
          <span className="text-sm text-slate-700">
            Student: submit assignments and generate AI study plans.
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-teal-500">
          <input
            type="radio"
            name="role"
            value="admin"
            checked={role === "admin"}
            onChange={() => setRole("admin")}
            className="h-4 w-4"
          />
          <span className="text-sm text-slate-700">
            Admin: create assignments and review submissions.
          </span>
        </label>
      </fieldset>

      {role === "admin" ? (
        <div className="space-y-1">
          <label htmlFor="adminKey" className="text-sm font-semibold text-slate-900">
            Admin registration key
          </label>
          <input
            id="adminKey"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-teal-500 focus:ring-2"
            placeholder="Enter admin key"
            autoComplete="off"
          />
          <p className="text-xs text-slate-500">
            Required unless your email is approved in ADMIN_EMAILS.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Saving role..." : "Continue to dashboard"}
      </button>
    </form>
  );
}
