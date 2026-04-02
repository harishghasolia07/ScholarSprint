import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { Footer } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
        <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Create account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Register with credentials to access the assignment workspace.
          </p>
          <div className="mt-6">
            <RegisterForm />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-900">
              Sign in
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
