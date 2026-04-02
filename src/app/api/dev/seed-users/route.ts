import { NextResponse } from "next/server";
import { seedDemoUsers } from "@/lib/demo-users";
import { isProduction } from "@/lib/env";

export async function POST() {
  if (isProduction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await seedDemoUsers();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Unable to seed demo users." },
      { status: 500 },
    );
  }
}
