import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RoleOnboardingForm } from "@/components/auth/role-onboarding-form";
import { Footer } from "@/components/layout/footer";
import { getSessionUser } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export default async function RoleOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "unassigned") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
        <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Choose your role</h1>
          <p className="mt-2 text-sm text-slate-600">
            Select how you want to use this platform. You can continue once your role is set.
          </p>

          <div className="mt-6">
            <RoleOnboardingForm />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
