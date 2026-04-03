"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/providers/toast-provider";
import { getClientErrorMessage, requestJson } from "@/lib/client-http";

export function LoginForm(props: {
    demoStudentEmail?: string;
    demoAdminEmail?: string;
    demoPassword?: string;
}) {
    const toast = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function accountExists(inputEmail: string): Promise<boolean> {
        const response = await requestJson<{ exists?: boolean }>("/api/auth/account-exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: inputEmail }),
        });

        return Boolean(response.exists);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError("");

        try {
            const normalizedEmail = email.toLowerCase().trim();
            const exists = await accountExists(normalizedEmail);

            if (!exists) {
                const message = "Account not found. Please register first.";
                setError(message);
                toast.error(message);
                return;
            }

            const result = await signIn("credentials", {
                email: normalizedEmail,
                password,
                redirect: false,
                callbackUrl: "/dashboard",
            });

            if (!result || result.error) {
                const message = "Incorrect password. Please try again.";
                setError(message);
                toast.error(message);
                return;
            }

            toast.success("Logged in successfully.");
            window.location.href = "/dashboard";
        } catch (requestError) {
            const message = getClientErrorMessage(requestError, "Unable to sign in right now.");
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    async function quickLogin(role: "student" | "admin") {
        const selectedEmail =
            role === "admin" ? props.demoAdminEmail ?? "" : props.demoStudentEmail ?? "";
        const selectedPassword = props.demoPassword ?? "";

        if (!selectedEmail || !selectedPassword) {
            setError("Demo credentials are missing. Check environment variables.");
            toast.error("Demo credentials are missing. Check environment variables.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email: selectedEmail,
                password: selectedPassword,
                redirect: false,
                callbackUrl: "/dashboard",
            });

            if (!result || result.error) {
                const message = `Unable to login as ${role}.`;
                setError(message);
                toast.error(message);
                return;
            }

            toast.success(`Logged in as ${role}.`);
            window.location.href = "/dashboard";
        } catch (requestError) {
            const message = getClientErrorMessage(requestError, `Unable to login as ${role}.`);
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="login-email" className="sr-only">
                Email
            </label>
            <input
                id="login-email"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Email"
                autoComplete="email"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
            />

            <label htmlFor="login-password" className="sr-only">
                Password
            </label>
            <input
                id="login-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Password"
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
            />

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>

            {props.demoStudentEmail && props.demoAdminEmail && props.demoPassword ? (
                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => void quickLogin("student")}
                        disabled={loading}
                        className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Demo Login as Student
                    </button>
                    <button
                        type="button"
                        onClick={() => void quickLogin("admin")}
                        disabled={loading}
                        className="rounded-xl bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        Demo Login as Admin
                    </button>
                </div>
            ) : null}

            {error ? (
                <p id="login-error" role="alert" aria-live="polite" className="text-sm font-medium text-rose-700">
                    {error}
                </p>
            ) : null}
        </form>
    );
}
