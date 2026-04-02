import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().optional(),
  MONGODB_DB_NAME: z.string().default("house_of_edtech"),
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ADMIN_REGISTRATION_KEY: z.string().optional(),
  DEMO_STUDENT_EMAIL: z.string().email().default("student.demo@houseofedtech.dev"),
  DEMO_ADMIN_EMAIL: z.string().email().default("admin.demo@houseofedtech.dev"),
  DEMO_USER_PASSWORD: z.string().min(8).default("DemoPass@2026"),
  FOOTER_NAME: z.string().default("Harish Ghasolia"),
  FOOTER_GITHUB_URL: z.string().default("https://github.com/harishghasolia07"),
  FOOTER_LINKEDIN_URL: z
    .string()
    .default("https://www.linkedin.com/in/harish-ghasolia-124b9724b/"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  AUTH_SECRET: process.env.AUTH_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ADMIN_REGISTRATION_KEY: process.env.ADMIN_REGISTRATION_KEY,
  DEMO_STUDENT_EMAIL: process.env.DEMO_STUDENT_EMAIL,
  DEMO_ADMIN_EMAIL: process.env.DEMO_ADMIN_EMAIL,
  DEMO_USER_PASSWORD: process.env.DEMO_USER_PASSWORD,
  FOOTER_NAME: process.env.FOOTER_NAME,
  FOOTER_GITHUB_URL: process.env.FOOTER_GITHUB_URL,
  FOOTER_LINKEDIN_URL: process.env.FOOTER_LINKEDIN_URL,
});

export const isProduction = env.NODE_ENV === "production";

export const adminEmailSet = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
