import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/route-utils";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { Footer } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "unassigned") {
    redirect("/onboarding/role");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <DashboardClient role={user.role} userName={user.name} />
      </main>
      <Footer />
    </div>
  );
}
