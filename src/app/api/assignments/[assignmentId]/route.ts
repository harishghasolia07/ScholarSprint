import { NextResponse } from "next/server";
import { ensureIndexes, getCollection } from "@/lib/mongodb";
import { parseObjectId, requireRole, requireSessionUser } from "@/lib/route-utils";
import { serializeAssignment } from "@/lib/serializers";
import type { AssignmentDoc, SubmissionDoc } from "@/lib/types";
import { assignmentUpdateSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ assignmentId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
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
    const { assignmentId } = await context.params;
    const objectId = parseObjectId(assignmentId);

    if (!objectId) {
      return NextResponse.json({ error: "Invalid assignment id." }, { status: 400 });
    }

    const assignments = await getCollection<AssignmentDoc>("assignments");
    const assignment = await assignments.findOne({ _id: objectId });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ assignment: serializeAssignment(assignment) });
  } catch (error) {
    console.error("Assignments/:id GET error", error);
    return NextResponse.json({ error: "Unable to fetch assignment." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const { assignmentId } = await context.params;
    const objectId = parseObjectId(assignmentId);

    if (!objectId) {
      return NextResponse.json({ error: "Invalid assignment id." }, { status: 400 });
    }

    const payload = await request.json();
    const parsed = assignmentUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid assignment update payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (parsed.data.dueDate && parsed.data.dueDate <= new Date()) {
      return NextResponse.json(
        { error: "Due date must be in the future." },
        { status: 400 },
      );
    }

    const assignments = await getCollection<AssignmentDoc>("assignments");

    const updateResult = await assignments.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          ...parsed.data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updateResult) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ assignment: serializeAssignment(updateResult) });
  } catch (error) {
    console.error("Assignments/:id PATCH error", error);
    return NextResponse.json({ error: "Unable to update assignment." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const { assignmentId } = await context.params;
    const objectId = parseObjectId(assignmentId);

    if (!objectId) {
      return NextResponse.json({ error: "Invalid assignment id." }, { status: 400 });
    }

    const assignments = await getCollection<AssignmentDoc>("assignments");
    const submissions = await getCollection<SubmissionDoc>("submissions");

    const deleteResult = await assignments.deleteOne({ _id: objectId });
    if (!deleteResult.deletedCount) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    await submissions.deleteMany({ assignmentId: objectId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assignments/:id DELETE error", error);
    return NextResponse.json({ error: "Unable to delete assignment." }, { status: 500 });
  }
}
