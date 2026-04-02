import { NextResponse } from "next/server";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import { parseObjectId, requireRole, requireSessionUser } from "@/lib/route-utils";
import { serializeSubmission } from "@/lib/serializers";
import type { AssignmentDoc, SubmissionDoc, UserRole } from "@/lib/types";
import {
  submissionAdminUpdateSchema,
  submissionStudentUpdateSchema,
} from "@/lib/validation";

interface RouteContext {
  params: Promise<{ submissionId: string }>;
}

async function getSubmissionWithAccessCheck(
  submissionId: string,
  userId: string,
  userRole: UserRole,
) {
  if (userRole === "unassigned") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const objectId = parseObjectId(submissionId);
  if (!objectId) {
    return { error: NextResponse.json({ error: "Invalid submission id." }, { status: 400 }) };
  }

  const submissions = await getCollection<SubmissionDoc>("submissions");
  const submission = await submissions.findOne({ _id: objectId });

  if (!submission) {
    return { error: NextResponse.json({ error: "Submission not found." }, { status: 404 }) };
  }

  if (userRole === "student" && submission.studentUserId.toString() !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { objectId, submission, submissions };
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
    const { submissionId } = await context.params;
    const fetched = await getSubmissionWithAccessCheck(
      submissionId,
      authResult.user.id,
      authResult.user.role,
    );

    if ("error" in fetched) {
      return fetched.error;
    }

    return NextResponse.json({ submission: serializeSubmission(fetched.submission) });
  } catch (error) {
    console.error("Submissions/:id GET error", error);
    return NextResponse.json({ error: "Unable to fetch submission." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const { submissionId } = await context.params;
    const fetched = await getSubmissionWithAccessCheck(
      submissionId,
      authResult.user.id,
      authResult.user.role,
    );

    if ("error" in fetched) {
      return fetched.error;
    }

    const payload = await request.json();

    if (authResult.user.role === "admin") {
      const parsed = submissionAdminUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid admin update payload.",
            details: parsed.error.flatten(),
          },
          { status: 400 },
        );
      }

      const updated = await fetched.submissions.findOneAndUpdate(
        { _id: fetched.objectId },
        {
          $set: {
            ...parsed.data,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        return NextResponse.json({ error: "Submission not found." }, { status: 404 });
      }

      return NextResponse.json({ submission: serializeSubmission(updated) });
    }

    const parsed = submissionStudentUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid student update payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const assignments = await getCollection<AssignmentDoc>("assignments");
    const assignment = await assignments.findOne({ _id: fetched.submission.assignmentId });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    if (assignment.dueDate < new Date()) {
      return NextResponse.json(
        { error: "Submission deadline has passed." },
        { status: 400 },
      );
    }

    const updated = await fetched.submissions.findOneAndUpdate(
      { _id: fetched.objectId, studentUserId: new ObjectId(authResult.user.id) },
      {
        $set: {
          ...parsed.data,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    return NextResponse.json({ submission: serializeSubmission(updated) });
  } catch (error) {
    console.error("Submissions/:id PATCH error", error);
    return NextResponse.json({ error: "Unable to update submission." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const { submissionId } = await context.params;
    const fetched = await getSubmissionWithAccessCheck(
      submissionId,
      authResult.user.id,
      authResult.user.role,
    );

    if ("error" in fetched) {
      return fetched.error;
    }

    if (authResult.user.role === "student") {
      const assignments = await getCollection<AssignmentDoc>("assignments");
      const assignment = await assignments.findOne({ _id: fetched.submission.assignmentId });

      if (!assignment) {
        return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
      }

      if (assignment.dueDate < new Date()) {
        return NextResponse.json(
          { error: "Submission deadline has passed." },
          { status: 400 },
        );
      }
    }

    const deleteFilter: Record<string, unknown> = { _id: fetched.objectId };
    if (authResult.user.role === "student") {
      deleteFilter.studentUserId = new ObjectId(authResult.user.id);
    }

    const result = await fetched.submissions.deleteOne(deleteFilter);
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submissions/:id DELETE error", error);
    return NextResponse.json({ error: "Unable to delete submission." }, { status: 500 });
  }
}
