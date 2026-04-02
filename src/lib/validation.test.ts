import { describe, expect, it } from "vitest";
import {
  assignmentCreateSchema,
  registerSchema,
  roleSelectionSchema,
  submissionCreateSchema,
  studyPlanSchema,
} from "@/lib/validation";

describe("validation schema coverage", () => {
  it("accepts valid assignment payload", () => {
    const parsed = assignmentCreateSchema.safeParse({
      title: "Final backend project",
      description: "Build all API routes and tests",
      course: "Full Stack 402",
      dueDate: "2030-06-01T10:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects assignment with empty title", () => {
    const parsed = assignmentCreateSchema.safeParse({
      title: "",
      description: "desc",
      course: "course",
      dueDate: "2030-06-01T10:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes registration email", () => {
    const parsed = registerSchema.parse({
      name: "Student Name",
      email: " STUDENT@MAIL.COM ",
      password: "securepass123",
    });

    expect(parsed.email).toBe("student@mail.com");
  });

  it("rejects invalid submission status", () => {
    const parsed = submissionCreateSchema.safeParse({
      assignmentId: "abc123",
      content: "my answer",
      status: "done",
    });

    expect(parsed.success).toBe(false);
  });

  it("enforces study plan hour range", () => {
    const parsed = studyPlanSchema.safeParse({
      assignmentId: "abc123",
      goals: "Finish assignment and review",
      availableHoursPerWeek: 99,
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts role selection payload", () => {
    const parsed = roleSelectionSchema.safeParse({
      role: "student",
    });

    expect(parsed.success).toBe(true);
  });
});
