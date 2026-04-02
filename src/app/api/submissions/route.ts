import { NextResponse } from "next/server";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import { parseObjectId, requireRole, requireSessionUser } from "@/lib/route-utils";
import { serializeSubmission } from "@/lib/serializers";
import type { AssignmentDoc, SubmissionDoc } from "@/lib/types";
import { submissionCreateSchema } from "@/lib/validation";

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
    const submissions = await getCollection<SubmissionDoc>("submissions");
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    const filter: Record<string, unknown> = {};

    if (assignmentId) {
      const parsedAssignmentId = parseObjectId(assignmentId);
      if (!parsedAssignmentId) {
        return NextResponse.json({ error: "Invalid assignment id." }, { status: 400 });
      }

      filter.assignmentId = parsedAssignmentId;
    }

    if (authResult.user.role === "student") {
      filter.studentUserId = new ObjectId(authResult.user.id);
    }

    const docs = await submissions.find(filter).sort({ updatedAt: -1 }).toArray();

    return NextResponse.json({
      submissions: docs.map(serializeSubmission),
    });
  } catch (error) {
    console.error("Submissions GET error", error);
    return NextResponse.json({ error: "Unable to fetch submissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireSessionUser();
  if ("response" in authResult) {
    return authResult.response;
  }

  const forbidden = requireRole(authResult.user, ["student"]);
  if (forbidden) {
    return forbidden;
  }

  try {
    await ensureIndexes();
    const payload = await request.json();
    const parsed = submissionCreateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid submission payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const assignmentId = parseObjectId(parsed.data.assignmentId);
    if (!assignmentId) {
      return NextResponse.json({ error: "Invalid assignment id." }, { status: 400 });
    }

    const assignments = await getCollection<AssignmentDoc>("assignments");
    const assignment = await assignments.findOne({ _id: assignmentId });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    if (assignment.dueDate < new Date()) {
      return NextResponse.json(
        { error: "Submission deadline has passed." },
        { status: 400 },
      );
    }

    const submissions = await getCollection<SubmissionDoc>("submissions");
    const now = new Date();
    const studentUserId = new ObjectId(authResult.user.id);

    const upserted = await submissions.findOneAndUpdate(
      { assignmentId, studentUserId },
      {
        $set: {
          content: parsed.data.content,
          status: parsed.data.status,
          updatedAt: now,
        },
        $setOnInsert: {
          assignmentId,
          studentUserId,
          feedback: "",
          score: null,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!upserted) {
      return NextResponse.json({ error: "Unable to save submission." }, { status: 500 });
    }

    return NextResponse.json({ submission: serializeSubmission(upserted) }, { status: 201 });
  } catch (error) {
    console.error("Submissions POST error", error);
    return NextResponse.json({ error: "Unable to save submission." }, { status: 500 });
  }
}
