import "server-only";

import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import { UserDoc } from "@/lib/types";

export interface DemoSeedResult {
  studentEmail: string;
  adminEmail: string;
  password: string;
}

export interface DemoAppUsersResult {
  studentEmail: string;
  adminEmail: string;
}
async function upsertAppUser(params: {
  email: string;
  name: string;
  role: "student" | "admin";
  passwordHash: string;
}) {
  await ensureIndexes();
  const users = await getCollection<UserDoc>("users");
  const now = new Date();

  await users.updateOne(
    { email: params.email },
    {
      $set: {
        email: params.email,
        name: params.name,
        role: params.role,
        passwordHash: params.passwordHash,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function seedDemoUsers(): Promise<DemoSeedResult> {
  const studentEmail = env.DEMO_STUDENT_EMAIL.toLowerCase().trim();
  const adminEmail = env.DEMO_ADMIN_EMAIL.toLowerCase().trim();
  const password = env.DEMO_USER_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  await Promise.all([
    upsertAppUser({
      email: studentEmail,
      name: "Demo Student",
      role: "student",
      passwordHash,
    }),
    upsertAppUser({
      email: adminEmail,
      name: "Demo Admin",
      role: "admin",
      passwordHash,
    }),
  ]);

  return {
    studentEmail,
    adminEmail,
    password,
  };
}

export async function ensureDemoAppUsers(): Promise<DemoAppUsersResult> {
  const studentEmail = env.DEMO_STUDENT_EMAIL.toLowerCase().trim();
  const adminEmail = env.DEMO_ADMIN_EMAIL.toLowerCase().trim();

  await ensureIndexes();
  const users = await getCollection<UserDoc>("users");
  const now = new Date();
  const passwordHash = await bcrypt.hash(env.DEMO_USER_PASSWORD, 12);

  await Promise.all([
    users.updateOne(
      { email: studentEmail },
      {
        $set: {
          name: "Demo Student",
          email: studentEmail,
          role: "student",
          passwordHash,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true },
    ),
    users.updateOne(
      { email: adminEmail },
      {
        $set: {
          name: "Demo Admin",
          email: adminEmail,
          role: "admin",
          passwordHash,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: now,
        },
      },
      { upsert: true },
    ),
  ]);

  return {
    studentEmail,
    adminEmail,
  };
}
