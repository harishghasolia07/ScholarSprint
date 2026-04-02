import type { ObjectId } from "mongodb";

export type UserRole = "unassigned" | "student" | "admin";
export type AppRole = "student" | "admin";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentDoc {
  _id: ObjectId;
  title: string;
  description: string;
  course: string;
  dueDate: Date;
  createdByUserId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionStatus = "not_started" | "in_progress" | "submitted";

export interface SubmissionDoc {
  _id: ObjectId;
  assignmentId: ObjectId;
  studentUserId: ObjectId;
  content: string;
  status: SubmissionStatus;
  feedback: string;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyPlanDoc {
  _id: ObjectId;
  assignmentId: ObjectId;
  studentUserId: ObjectId;
  goals: string;
  availableHoursPerWeek: number;
  generatedPlan: string;
  provider: "gemini" | "fallback";
  createdAt: Date;
}
