import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import type { AppRole, UserDoc, UserRole } from "@/lib/types";

export interface SessionUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  const id = session.user.id;
  const email = session.user.email.toLowerCase().trim();

  await ensureIndexes();
  const users = await getCollection<UserDoc>("users");

  const existingById = ObjectId.isValid(id)
    ? await users.findOne({ _id: new ObjectId(id) })
    : null;

  const existing = existingById ?? (await users.findOne({ email }));

  if (!existing) {
    return {
      id,
      role: session.user.role ?? "unassigned",
      email,
      name: session.user.name ?? "Student",
    };
  }

  return {
    id: existing._id.toString(),
    role: existing.role,
    email,
    name: existing.name,
  };
}

export async function requireSessionUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getSessionUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    user,
  };
}

export function requireRole(user: SessionUser, allowedRoles: AppRole[]): NextResponse | null {
  if (user.role === "unassigned" || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export function parseObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}
