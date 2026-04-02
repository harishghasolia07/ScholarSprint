import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { Footer } from "@/components/layout/footer";
import { env, isProduction } from "@/lib/env";
import { ensureDemoAppUsers } from "@/lib/demo-users";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
    const session = await auth();
    const shouldShowDemoLogin = !isProduction || env.ENABLE_DEMO_LOGIN;

    if (session?.user?.id) {
        redirect("/dashboard");
    }

    if (shouldShowDemoLogin) {
        await ensureDemoAppUsers();
    }

    return (
        <div className="flex min-h-screen flex-col">
            <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
                <article className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Sign in</h1>
                    <p className="mt-2 text-sm text-slate-600">Access your assignment dashboard.</p>
                    <div className="mt-6">
                        <LoginForm
                            demoStudentEmail={shouldShowDemoLogin ? env.DEMO_STUDENT_EMAIL : undefined}
                            demoAdminEmail={shouldShowDemoLogin ? env.DEMO_ADMIN_EMAIL : undefined}
                            demoPassword={shouldShowDemoLogin ? env.DEMO_USER_PASSWORD : undefined}
                        />
                    </div>
                    <p className="mt-4 text-sm text-slate-600">
                        New here?{" "}
                        <Link href="/register" className="font-semibold text-teal-700 hover:text-teal-900">
                            Create an account
                        </Link>
                    </p>
                </article>
            </main>
            <Footer />
        </div>
    );
}
