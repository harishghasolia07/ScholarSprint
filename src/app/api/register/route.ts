import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import type { UserDoc } from "@/lib/types";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid registration payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    await ensureIndexes();

    const users = await getCollection<UserDoc>("users");
    const existing = await users.findOne({ email: parsed.data.email });

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user: UserDoc = {
      _id: new ObjectId(),
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "unassigned",
      createdAt: now,
      updatedAt: now,
    };

    await users.insertOne(user);

    return NextResponse.json({ ok: true, userId: user._id.toString() }, { status: 201 });
  } catch (error) {
    console.error("Register route error", error);
    return NextResponse.json({ error: "Unable to register account." }, { status: 500 });
  }
}
