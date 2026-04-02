import { Collection, Db, Document, MongoClient, ObjectId } from "mongodb";
import { env } from "@/lib/env";
import type { AssignmentDoc, StudyPlanDoc, SubmissionDoc, UserDoc } from "@/lib/types";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

let dbRef: Db | null = null;
let indexesInitialized = false;

async function getMongoClient(): Promise<MongoClient> {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to your environment variables.");
  }

  if (!global.mongoClientPromise) {
    const client = new MongoClient(env.MONGODB_URI);
    global.mongoClientPromise = client.connect();
  }

  return global.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  if (dbRef) {
    return dbRef;
  }

  const client = await getMongoClient();
  dbRef = client.db(env.MONGODB_DB_NAME);
  return dbRef;
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export async function ensureIndexes(): Promise<void> {
  if (indexesInitialized) {
    return;
  }

  const users = await getCollection<UserDoc>("users");
  const assignments = await getCollection<AssignmentDoc>("assignments");
  const submissions = await getCollection<SubmissionDoc>("submissions");
  const studyPlans = await getCollection<StudyPlanDoc>("studyPlans");

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    assignments.createIndex({ dueDate: 1 }),
    assignments.createIndex({ course: 1 }),
    submissions.createIndex({ assignmentId: 1, studentUserId: 1 }, { unique: true }),
    submissions.createIndex({ studentUserId: 1, updatedAt: -1 }),
    studyPlans.createIndex({ studentUserId: 1, createdAt: -1 }),
  ]);

  indexesInitialized = true;
}

export { ObjectId };
