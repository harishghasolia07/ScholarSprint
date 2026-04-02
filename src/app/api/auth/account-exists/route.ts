import { NextResponse } from "next/server";
import { z } from "zod";
import { getCollection } from "@/lib/mongodb";
import type { UserDoc } from "@/lib/types";

const payloadSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = payloadSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const users = await getCollection<UserDoc>("users");
    const user = await users.findOne(
      { email: parsed.data.email },
      { projection: { _id: 1 } },
    );

    return NextResponse.json({ exists: Boolean(user) });
  } catch {
    return NextResponse.json({ exists: false, error: "Unable to validate account." }, { status: 500 });
  }
}
