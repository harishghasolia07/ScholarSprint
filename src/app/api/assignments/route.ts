import { NextResponse } from "next/server";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import { requireRole, requireSessionUser } from "@/lib/route-utils";
import { serializeAssignment } from "@/lib/serializers";
import type { AssignmentDoc } from "@/lib/types";
import { assignmentCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const authResult = await requireSessionUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const forbidden = requireRole(authResult.user, ["student", "admin"]);
  if (forbidden) {
    return forbidden;
  }

  try {
    await ensureIndexes();
    const assignments = await getCollection<AssignmentDoc>("assignments");
    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course");
    const q = searchParams.get("q");

    const filter: Record<string, unknown> = {};

    if (course) {
      filter.course = { $regex: course, $options: "i" };
    }

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const docs = await assignments.find(filter).sort({ dueDate: 1 }).toArray();

    return NextResponse.json({
      assignments: docs.map(serializeAssignment),
    });
  } catch (error) {
    console.error("Assignments GET error", error);
    return NextResponse.json({ error: "Unable to fetch assignments." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireSessionUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const forbidden = requireRole(authResult.user, ["admin"]);
  if (forbidden) {
    return forbidden;
  }

  try {
    await ensureIndexes();
    const payload = await request.json();
    const parsed = assignmentCreateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid assignment payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (parsed.data.dueDate <= new Date()) {
      return NextResponse.json(
        { error: "Due date must be in the future." },
        { status: 400 },
      );
    }

    const assignments = await getCollection<AssignmentDoc>("assignments");
    const now = new Date();

    const created: AssignmentDoc = {
      _id: new ObjectId(),
      title: parsed.data.title,
      description: parsed.data.description,
      course: parsed.data.course,
      dueDate: parsed.data.dueDate,
      createdByUserId: new ObjectId(authResult.user.id),
      createdAt: now,
      updatedAt: now,
    };

    const result = await assignments.insertOne(created);
    const assignment = await assignments.findOne({ _id: result.insertedId });

    if (!assignment) {
      return NextResponse.json({ error: "Failed to create assignment." }, { status: 500 });
    }

    return NextResponse.json({ assignment: serializeAssignment(assignment) }, { status: 201 });
  } catch (error) {
    console.error("Assignments POST error", error);
    return NextResponse.json({ error: "Unable to create assignment." }, { status: 500 });
  }
}
