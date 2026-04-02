import type { AssignmentDoc, StudyPlanDoc, SubmissionDoc, UserDoc } from "@/lib/types";

export function serializeAssignment(doc: AssignmentDoc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    course: doc.course,
    dueDate: doc.dueDate.toISOString(),
    createdByUserId: doc.createdByUserId.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeSubmission(doc: SubmissionDoc) {
  return {
    id: doc._id.toString(),
    assignmentId: doc.assignmentId.toString(),
    studentUserId: doc.studentUserId.toString(),
    content: doc.content,
    status: doc.status,
    feedback: doc.feedback,
    score: doc.score,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeStudyPlan(doc: StudyPlanDoc) {
  return {
    id: doc._id.toString(),
    assignmentId: doc.assignmentId.toString(),
    studentUserId: doc.studentUserId.toString(),
    goals: doc.goals,
    availableHoursPerWeek: doc.availableHoursPerWeek,
    generatedPlan: doc.generatedPlan,
    provider: doc.provider,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializeUser(doc: UserDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
