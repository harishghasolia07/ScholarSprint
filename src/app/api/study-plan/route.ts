import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ensureIndexes, getCollection, ObjectId } from "@/lib/mongodb";
import { parseObjectId, requireRole, requireSessionUser } from "@/lib/route-utils";
import { serializeStudyPlan } from "@/lib/serializers";
import type { AssignmentDoc, StudyPlanDoc, SubmissionDoc } from "@/lib/types";
import { studyPlanSchema, studyPlanUpdateSchema } from "@/lib/validation";

function buildFallbackPlan(input: {
  assignmentTitle: string;
  assignmentDescription: string;
  course: string;
  dueDate: string;
  goals: string;
  availableHoursPerWeek: number;
}) {
  return [
    `### 1) Goal Alignment`,
    `- Assignment: ${input.assignmentTitle} (${input.course})`,
    `- Your goal: ${input.goals}`,
    ``,
    `### 2) Weekly Plan (${input.availableHoursPerWeek} hrs/week)`,
    `- 30%: Understand requirements and examples`,
    `- 40%: Build and iterate core deliverables`,
    `- 20%: Test and harden edge cases`,
    `- 10%: Documentation and final polish`,
    ``,
    `### 3) Milestones`,
    `- T-7 days: complete first full draft`,
    `- T-3 days: complete testing + feedback fixes`,
    `- T-1 day: final review and submission`,
    ``,
    `### 4) Risk Checklist`,
    `- Break the work into small deliverables`,
    `- Track blockers daily and resolve quickly`,
    `- Keep commits small and test after each change`,
    ``,
    `### 5) Final Reminder`,
    `Due date: ${input.dueDate}`,
    ``,
    `Assignment summary: ${input.assignmentDescription}`,
  ].join("\n");
}

async function callGemini(prompt: string) {
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status})`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
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
    const parsed = studyPlanSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid study plan payload.",
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
    const submissions = await getCollection<SubmissionDoc>("submissions");
    const studyPlans = await getCollection<StudyPlanDoc>("studyPlans");

    const assignment = await assignments.findOne({ _id: assignmentId });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const existingSubmission = await submissions.findOne({
      assignmentId,
      studentUserId: new ObjectId(authResult.user.id),
    });

    const prompt = [
      "You are an expert study coach helping a student finish an assignment.",
      "Provide a concise markdown study plan with milestones, risk management, and quality checks.",
      `Assignment title: ${assignment.title}`,
      `Course: ${assignment.course}`,
      `Due date: ${assignment.dueDate.toISOString()}`,
      `Assignment details: ${assignment.description}`,
      `Student goals: ${parsed.data.goals}`,
      `Available hours per week: ${parsed.data.availableHoursPerWeek}`,
      `Current submission status: ${existingSubmission?.status ?? "not_started"}`,
      `Current submission notes: ${existingSubmission?.content ?? "None"}`,
      "Keep it practical and actionable for the next 7 days.",
    ].join("\n");

    let generatedPlan: string;
    let provider: "gemini" | "fallback" = "fallback";

    try {
      const aiResult = await callGemini(prompt);
      if (aiResult) {
        generatedPlan = aiResult;
        provider = "gemini";
      } else {
        generatedPlan = buildFallbackPlan({
          assignmentTitle: assignment.title,
          assignmentDescription: assignment.description,
          course: assignment.course,
          dueDate: assignment.dueDate.toISOString(),
          goals: parsed.data.goals,
          availableHoursPerWeek: parsed.data.availableHoursPerWeek,
        });
      }
    } catch (error) {
      console.warn("Gemini unavailable. Falling back to deterministic plan.", error);
      generatedPlan = buildFallbackPlan({
        assignmentTitle: assignment.title,
        assignmentDescription: assignment.description,
        course: assignment.course,
        dueDate: assignment.dueDate.toISOString(),
        goals: parsed.data.goals,
        availableHoursPerWeek: parsed.data.availableHoursPerWeek,
      });
    }

    const created: StudyPlanDoc = {
      _id: new ObjectId(),
      assignmentId,
      studentUserId: new ObjectId(authResult.user.id),
      goals: parsed.data.goals,
      availableHoursPerWeek: parsed.data.availableHoursPerWeek,
      generatedPlan,
      provider,
      createdAt: new Date(),
    };

    const result = await studyPlans.insertOne(created);
    const saved = await studyPlans.findOne({ _id: result.insertedId });

    if (!saved) {
      return NextResponse.json({ error: "Unable to save study plan." }, { status: 500 });
    }

    return NextResponse.json({ studyPlan: serializeStudyPlan(saved) }, { status: 201 });
  } catch (error) {
    console.error("Study plan generation error", error);
    return NextResponse.json({ error: "Unable to generate study plan." }, { status: 500 });
  }
}

export async function GET() {
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

    const studyPlans = await getCollection<StudyPlanDoc>("studyPlans");
    const items = await studyPlans
      .find({ studentUserId: new ObjectId(authResult.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ studyPlans: items.map((item) => serializeStudyPlan(item)) });
  } catch (error) {
    console.error("Study plan list error", error);
    return NextResponse.json({ error: "Unable to fetch saved study plans." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    const parsed = studyPlanUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid study plan update payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const studyPlanId = parseObjectId(parsed.data.studyPlanId);
    if (!studyPlanId) {
      return NextResponse.json({ error: "Invalid study plan id." }, { status: 400 });
    }

    const studyPlans = await getCollection<StudyPlanDoc>("studyPlans");
    const studentObjectId = new ObjectId(authResult.user.id);

    const updated = await studyPlans.findOneAndUpdate(
      {
        _id: studyPlanId,
        studentUserId: studentObjectId,
      },
      {
        $set: {
          generatedPlan: parsed.data.generatedPlan,
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) {
      return NextResponse.json({ error: "Study plan not found." }, { status: 404 });
    }

    return NextResponse.json({ studyPlan: serializeStudyPlan(updated) });
  } catch (error) {
    console.error("Study plan update error", error);
    return NextResponse.json({ error: "Unable to update study plan." }, { status: 500 });
  }
}
