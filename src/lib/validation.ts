import { z } from "zod";

function sanitizeText(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function sanitizeMarkdown(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    // Keep markdown line breaks/tabs while stripping problematic control chars.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const safeString = (max = 2000) =>
  z
    .string()
    .transform((value) => sanitizeText(value))
    .pipe(z.string().min(1).max(max));

const safeMarkdownString = (max = 20000) =>
  z
    .string()
    .transform((value) => sanitizeMarkdown(value))
    .pipe(z.string().min(1).max(max));

export const registerSchema = z.object({
  name: safeString(120),
  email: z
    .string()
    .transform((value) => value.toLowerCase().trim())
    .pipe(z.string().email()),
  password: z.string().min(8).max(128),
  adminKey: z.string().optional(),
});

export const assignmentCreateSchema = z.object({
  title: safeString(160),
  description: safeString(5000),
  course: safeString(120),
  dueDate: z.coerce.date(),
});

export const assignmentUpdateSchema = z
  .object({
    title: safeString(160).optional(),
    description: safeString(5000).optional(),
    course: safeString(120).optional(),
    dueDate: z.coerce.date().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const submissionCreateSchema = z.object({
  assignmentId: z.string().min(1),
  content: safeString(8000),
  status: z.enum(["not_started", "in_progress", "submitted"]),
});

export const submissionStudentUpdateSchema = z
  .object({
    content: safeString(8000).optional(),
    status: z.enum(["not_started", "in_progress", "submitted"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const submissionAdminUpdateSchema = z
  .object({
    feedback: safeString(4000).optional(),
    score: z.number().min(0).max(100).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const studyPlanSchema = z.object({
  assignmentId: z.string().min(1),
  goals: safeString(1000),
  availableHoursPerWeek: z.number().int().min(1).max(40),
});

export const studyPlanUpdateSchema = z.object({
  studyPlanId: z.string().min(1),
  generatedPlan: safeMarkdownString(20000),
});

export const roleSelectionSchema = z.object({
  role: z.enum(["student", "admin"]),
  adminKey: z.string().optional(),
});

export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RoleSelectionInput = z.infer<typeof roleSelectionSchema>;
export type StudyPlanInput = z.infer<typeof studyPlanSchema>;
export type StudyPlanUpdateInput = z.infer<typeof studyPlanUpdateSchema>;
export type SubmissionAdminUpdateInput = z.infer<typeof submissionAdminUpdateSchema>;
export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
export type SubmissionStudentUpdateInput = z.infer<typeof submissionStudentUpdateSchema>;
