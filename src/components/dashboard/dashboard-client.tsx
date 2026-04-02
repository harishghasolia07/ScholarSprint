"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/providers/toast-provider";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type UserRole = "student" | "admin";
type SubmissionStatus = "not_started" | "in_progress" | "submitted";

interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentUserId: string;
  content: string;
  status: SubmissionStatus;
  feedback: string;
  score: number | null;
  createdAt: string;
  updatedAt: string;
}

interface StudyPlan {
  id: string;
  assignmentId: string;
  goals?: string;
  availableHoursPerWeek?: number;
  generatedPlan: string;
  provider: "gemini" | "fallback";
  createdAt: string;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(json.error ?? "Request failed");
  }

  return json;
}

export function DashboardClient({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [latestPlan, setLatestPlan] = useState<StudyPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<StudyPlan[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [createAssignmentForm, setCreateAssignmentForm] = useState({
    title: "",
    description: "",
    course: "",
    dueDate: "",
  });

  const [updateAssignmentForm, setUpdateAssignmentForm] = useState({
    assignmentId: "",
    title: "",
    description: "",
    course: "",
    dueDate: "",
  });

  const [submissionForm, setSubmissionForm] = useState({
    assignmentId: "",
    content: "",
    status: "in_progress" as SubmissionStatus,
  });

  const [reviewDraft, setReviewDraft] = useState<Record<string, { feedback: string; score: string }>>({});

  const [studyPlanForm, setStudyPlanForm] = useState({
    assignmentId: "",
    goals: "",
    availableHoursPerWeek: 8,
  });
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [editablePlan, setEditablePlan] = useState("");

  const assignmentById = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((assignment) => map.set(assignment.id, assignment));
    return map;
  }, [assignments]);

  const loadSavedPlans = useCallback(async () => {
    if (role !== "student") {
      return;
    }

    const response = await requestJson<{ studyPlans: StudyPlan[] }>("/api/study-plan");
    setSavedPlans(response.studyPlans);
  }, [role]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [assignmentResponse, submissionResponse] = await Promise.all([
        requestJson<{ assignments: Assignment[] }>("/api/assignments"),
        requestJson<{ submissions: Submission[] }>("/api/submissions"),
      ]);

      setAssignments(assignmentResponse.assignments);
      setSubmissions(submissionResponse.submissions);

      if (assignmentResponse.assignments.length > 0) {
        setSubmissionForm((prev) => ({
          ...prev,
          assignmentId: prev.assignmentId || assignmentResponse.assignments[0].id,
        }));

        setUpdateAssignmentForm((prev) => ({
          ...prev,
          assignmentId: prev.assignmentId || assignmentResponse.assignments[0].id,
        }));
      }

      setStudyPlanForm((prev) => {
        const selectedStillExists = assignmentResponse.assignments.some(
          (assignment) => assignment.id === prev.assignmentId,
        );

        return {
          ...prev,
          // Keep user's selected assignment. Clear it only when it no longer exists.
          assignmentId: selectedStillExists ? prev.assignmentId : "",
        };
      });

      setReviewDraft((previous) => {
        const next = { ...previous };
        submissionResponse.submissions.forEach((submission) => {
          if (!next[submission.id]) {
            next[submission.id] = {
              feedback: submission.feedback ?? "",
              score: submission.score === null ? "" : String(submission.score),
            };
          }
        });
        return next;
      });

      if (role === "student") {
        await loadSavedPlans();
      }
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [loadSavedPlans, role, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await requestJson<{ assignment: Assignment }>("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createAssignmentForm),
      });

      toast.success("Assignment created successfully.");
      setCreateAssignmentForm({ title: "", description: "", course: "", dueDate: "" });
      await loadData();
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleUpdateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!updateAssignmentForm.assignmentId) {
      const message = "Select an assignment to update.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload: Record<string, unknown> = {};
    if (updateAssignmentForm.title.trim()) payload.title = updateAssignmentForm.title;
    if (updateAssignmentForm.description.trim()) payload.description = updateAssignmentForm.description;
    if (updateAssignmentForm.course.trim()) payload.course = updateAssignmentForm.course;
    if (updateAssignmentForm.dueDate.trim()) payload.dueDate = updateAssignmentForm.dueDate;

    if (Object.keys(payload).length === 0) {
      const message = "Provide at least one field for assignment update.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      await requestJson<{ assignment: Assignment }>(
        `/api/assignments/${updateAssignmentForm.assignmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      toast.success("Assignment updated successfully.");
      setUpdateAssignmentForm((prev) => ({ ...prev, title: "", description: "", course: "", dueDate: "" }));
      await loadData();
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    setError("");

    try {
      await requestJson<{ success: boolean }>(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      toast.success("Assignment deleted.");
      await loadData();
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleUpsertSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await requestJson<{ submission: Submission }>("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionForm),
      });

      toast.success("Assignment status saved.");
      await loadData();
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleDeleteSubmission(submissionId: string) {
    setError("");

    try {
      await requestJson<{ success: boolean }>(`/api/submissions/${submissionId}`, {
        method: "DELETE",
      });

      toast.success("Submission deleted.");
      await loadData();
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleAdminReviewSave(submissionId: string) {
    const draft = reviewDraft[submissionId];
    if (!draft) {
      return;
    }

    setError("");

    try {
      await requestJson<{ submission: Submission }>(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: draft.feedback,
          score: draft.score === "" ? null : Number(draft.score),
        }),
      });

      toast.success("Review saved.");
      await loadData();
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleGeneratePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsGeneratingPlan(true);

    try {
      const response = await requestJson<{ studyPlan: StudyPlan }>("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studyPlanForm),
      });

      setLatestPlan(response.studyPlan);
      setEditablePlan(response.studyPlan.generatedPlan);
      await loadSavedPlans();
      toast.success("Study plan generated successfully.");
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function handleSaveEditedPlan() {
    if (!latestPlan) {
      toast.error("Generate a study plan first.");
      return;
    }

    const trimmedPlan = editablePlan.trim();
    if (!trimmedPlan) {
      toast.error("Study plan cannot be empty.");
      return;
    }

    setError("");

    try {
      const response = await requestJson<{ studyPlan: StudyPlan }>("/api/study-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyPlanId: latestPlan.id,
          generatedPlan: trimmedPlan,
        }),
      });

      setLatestPlan(response.studyPlan);
      setEditablePlan(response.studyPlan.generatedPlan);
      await loadSavedPlans();
      toast.success("Study plan updated.");
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      toast.error(message);
    }
  }

  async function handleSignOut() {
    toast.info("Signing out...");
    await signOut({ redirect: false });
    window.location.href = `${window.location.origin}/login`;
  }

  function handleLoadSavedPlan(plan: StudyPlan) {
    setLatestPlan(plan);
    setEditablePlan(plan.generatedPlan);
    toast.info("Saved plan loaded into editor.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            {role} workspace
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Welcome back, {userName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage assignments, submissions, reviews, and AI-assisted study plans.
          </p>
        </div>
        <button
          onClick={() => void handleSignOut()}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
        >
          Sign out
        </button>
      </header>

      {loading ? <p className="text-sm text-slate-600">Loading dashboard data...</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Assignments</h2>
          <p className="mt-1 text-sm text-slate-600">
            Central assignment list with due dates and course context.
          </p>

          <div className="mt-4 space-y-3">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-500">No assignments yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                      <p className="text-sm text-slate-600">{assignment.course}</p>
                    </div>
                    {role === "admin" ? (
                      <button
                        onClick={() => void handleDeleteAssignment(assignment.id)}
                        className="text-sm font-semibold text-rose-700 hover:text-rose-900"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{assignment.description}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Due {new Date(assignment.dueDate).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        {role === "admin" ? (
          <article className="space-y-6">
            <form
              onSubmit={handleCreateAssignment}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-900">Create assignment</h2>
              <div className="mt-4 space-y-3">
                <input
                  required
                  value={createAssignmentForm.title}
                  onChange={(event) =>
                    setCreateAssignmentForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Assignment title"
                />
                <input
                  required
                  value={createAssignmentForm.course}
                  onChange={(event) =>
                    setCreateAssignmentForm((prev) => ({ ...prev, course: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Course"
                />
                <textarea
                  required
                  value={createAssignmentForm.description}
                  onChange={(event) =>
                    setCreateAssignmentForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Assignment description"
                />
                <input
                  required
                  type="datetime-local"
                  value={createAssignmentForm.dueDate}
                  onChange={(event) =>
                    setCreateAssignmentForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700">
                Create assignment
              </button>
            </form>

            <form
              onSubmit={handleUpdateAssignment}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-900">Update assignment</h2>
              <p className="mt-1 text-sm text-slate-600">Fill only the fields you want to change.</p>

              <div className="mt-4 space-y-3">
                <select
                  required
                  value={updateAssignmentForm.assignmentId}
                  onChange={(event) =>
                    setUpdateAssignmentForm((prev) => ({ ...prev, assignmentId: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="">Select assignment</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </option>
                  ))}
                </select>

                <input
                  value={updateAssignmentForm.title}
                  onChange={(event) =>
                    setUpdateAssignmentForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="New title"
                />
                <input
                  value={updateAssignmentForm.course}
                  onChange={(event) =>
                    setUpdateAssignmentForm((prev) => ({ ...prev, course: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="New course"
                />
                <textarea
                  value={updateAssignmentForm.description}
                  onChange={(event) =>
                    setUpdateAssignmentForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="New description"
                />
                <input
                  type="datetime-local"
                  value={updateAssignmentForm.dueDate}
                  onChange={(event) =>
                    setUpdateAssignmentForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>

              <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700">
                Update assignment
              </button>
            </form>
          </article>
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Submit your work</h2>
            <form onSubmit={handleUpsertSubmission} className="mt-4 space-y-3">
              <select
                required
                value={submissionForm.assignmentId}
                onChange={(event) =>
                  setSubmissionForm((prev) => ({ ...prev, assignmentId: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">Select assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title}
                  </option>
                ))}
              </select>

              <select
                value={submissionForm.status}
                onChange={(event) =>
                  setSubmissionForm((prev) => ({
                    ...prev,
                    status: event.target.value as SubmissionStatus,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="submitted">Submitted</option>
              </select>

              <textarea
                required
                value={submissionForm.content}
                onChange={(event) =>
                  setSubmissionForm((prev) => ({ ...prev, content: event.target.value }))
                }
                className="min-h-32 w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Paste your solution summary, links, and notes"
              />

              <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700">
                Save submission
              </button>
            </form>
          </article>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Submissions</h2>
        <div className="mt-4 space-y-3">
          {submissions.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            submissions.map((submission) => (
              <article key={submission.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h3 className="font-semibold text-slate-900">
                    {assignmentById.get(submission.assignmentId)?.title ?? submission.assignmentId}
                  </h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {submission.status.replace("_", " ")}
                  </p>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{submission.content}</p>

                {role === "admin" ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
                    <textarea
                      value={reviewDraft[submission.id]?.feedback ?? ""}
                      onChange={(event) =>
                        setReviewDraft((prev) => ({
                          ...prev,
                          [submission.id]: {
                            feedback: event.target.value,
                            score: prev[submission.id]?.score ?? "",
                          },
                        }))
                      }
                      className="min-h-20 rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="Feedback"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={reviewDraft[submission.id]?.score ?? ""}
                      onChange={(event) =>
                        setReviewDraft((prev) => ({
                          ...prev,
                          [submission.id]: {
                            feedback: prev[submission.id]?.feedback ?? "",
                            score: event.target.value,
                          },
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="Score"
                    />
                    <button
                      onClick={() => void handleAdminReviewSave(submission.id)}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Save review
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">Feedback:</span> {submission.feedback || "Pending"}
                    </p>
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">Score:</span> {submission.score ?? "Not scored"}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          setSubmissionForm({
                            assignmentId: submission.assignmentId,
                            content: submission.content,
                            status: submission.status,
                          })
                        }
                        className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                      >
                        Load into editor
                      </button>
                      <button
                        onClick={() => void handleDeleteSubmission(submission.id)}
                        className="text-sm font-semibold text-rose-700 hover:text-rose-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {role === "student" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">AI Study Planner</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generate a practical study plan with Gemini and fallback-safe logic.
          </p>

          <form onSubmit={handleGeneratePlan} className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Assignment
              </label>
              <select
                required
                value={studyPlanForm.assignmentId}
                onChange={(event) =>
                  setStudyPlanForm((prev) => ({ ...prev, assignmentId: event.target.value }))
                }
                className="relative z-20 w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                <option value="">Select assignment for AI plan</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.title}
                  </option>
                ))}
              </select>
              {assignments.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {assignments.map((assignment) => {
                    const selected = studyPlanForm.assignmentId === assignment.id;

                    return (
                      <button
                        key={assignment.id}
                        type="button"
                        onClick={() =>
                          setStudyPlanForm((prev) => ({ ...prev, assignmentId: assignment.id }))
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          selected
                            ? "border-teal-700 bg-teal-700 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {assignment.title}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-500">No assignments available yet.</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Available hours per week
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={studyPlanForm.availableHoursPerWeek}
                onChange={(event) =>
                  setStudyPlanForm((prev) => ({
                    ...prev,
                    availableHoursPerWeek: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Example: 8"
              />
              <p className="text-xs text-slate-500">This value means hours/week.</p>
            </div>

            <textarea
              required
              value={studyPlanForm.goals}
              onChange={(event) =>
                setStudyPlanForm((prev) => ({ ...prev, goals: event.target.value }))
              }
              className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 md:col-span-2"
              placeholder="What do you want to achieve before submission?"
            />

            <button
              disabled={isGeneratingPlan}
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
            >
              <span className="inline-flex items-center justify-center gap-2">
                {isGeneratingPlan ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : null}
                {isGeneratingPlan ? "Generating..." : "Generate study plan"}
              </span>
            </button>
          </form>

          {latestPlan ? (
            <article className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
                Provider: {latestPlan.provider}
              </p>
              <p className="mb-4 text-xs text-slate-600">
                Generated plans are saved automatically. Use Save plan to persist your edits.
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                <section>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Markdown editor
                  </label>
                  <textarea
                    value={editablePlan}
                    onChange={(event) => setEditablePlan(event.target.value)}
                    className="min-h-72 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900"
                    placeholder="Edit your study plan in markdown..."
                  />

                  <button
                    type="button"
                    onClick={() => void handleSaveEditedPlan()}
                    className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Save plan
                  </button>
                </section>

                <section>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Live preview
                  </label>
                  <div className="min-h-72 rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
                    <div className="prose prose-sm max-w-none prose-headings:font-display prose-pre:whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {editablePlan || "No content to preview yet."}
                      </ReactMarkdown>
                    </div>
                  </div>
                </section>
              </div>
            </article>
          ) : null}

          <article className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Saved plans</h3>

            {savedPlans.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No saved plans yet. Generate your first plan above.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        {assignmentById.get(plan.assignmentId)?.title ?? "Unknown assignment"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Date(plan.createdAt).toLocaleString()} • {plan.provider}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLoadSavedPlan(plan)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:text-slate-900"
                    >
                      Load plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
}
