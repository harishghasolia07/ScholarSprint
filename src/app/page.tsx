import Link from "next/link";
import { auth } from "@/auth";
import { Footer } from "@/components/layout/footer";

export default async function Home() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user?.id);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-14 md:flex-row md:items-center">
        <section className="flex-1">
          <p className="inline-flex rounded-full bg-teal-100 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
            Next.js 16 + MongoDB + AI
          </p>
          <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight text-slate-900">
            EdTech Assignment Tracker
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-700">
            A secure full-stack workspace for assignment operations, student submissions,
            and AI-assisted study planning. Built with role-based controls, validation,
            and production-minded architecture.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {isAuthenticated ? "Go to Dashboard" : "Sign In"}
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500"
            >
              Create Account
            </Link>
          </div>
        </section>

        <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">What this project demonstrates</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>Secure authentication with role-based authorization.</li>
            <li>Validated CRUD workflows for assignments and submissions.</li>
            <li>Deadline-aware logic for student actions.</li>
            <li>Admin grading and feedback pipeline.</li>
            <li>Gemini-powered study-plan generation with fallback resilience.</li>
            <li>Testing, CI/CD hooks, and deployment readiness.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
