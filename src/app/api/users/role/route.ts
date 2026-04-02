import { NextResponse } from "next/server";
import { adminEmailSet, env } from "@/lib/env";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import { requireSessionUser } from "@/lib/route-utils";
import type { UserDoc } from "@/lib/types";
import { roleSelectionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const authResult = await requireSessionUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  try {
    await ensureIndexes();

    const payload = await request.json();
    const parsed = roleSelectionSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid role selection payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const desiredRole = parsed.data.role;

    if (desiredRole === "admin") {
      const emailWhitelisted = adminEmailSet.has(authResult.user.email.toLowerCase());
      const adminKeyConfigured = Boolean(env.ADMIN_REGISTRATION_KEY);
      const adminKeyMatches =
        adminKeyConfigured && parsed.data.adminKey === env.ADMIN_REGISTRATION_KEY;

      if (!emailWhitelisted && !adminKeyMatches) {
        return NextResponse.json(
          {
            error:
              "Admin role requires a valid admin key or approved admin email.",
          },
          { status: 403 },
        );
      }
    }

    const users = await getCollection<UserDoc>("users");
    const userId = new ObjectId(authResult.user.id);

    const updated = await users.findOneAndUpdate(
      { _id: userId },
      {
        $set: {
          role: desiredRole,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ role: updated.role });
  } catch (error) {
    console.error("Role selection error", error);
    return NextResponse.json({ error: "Unable to update role." }, { status: 500 });
  }
}
