# House of EdTech - Full-Stack Assignment Tracker

Production-minded Next.js 16 application demonstrating secure role-based CRUD, MongoDB integration, and AI-powered add-on functionality for students.

## Core Features

- Authentication with NextAuth credentials (email/password)
- Role-based authorization (`admin` and `student`)
- Assignment CRUD for admins
- Submission workflows for students with deadline-aware restrictions
- Review and scoring workflow for admins
- AI study-plan generation using Gemini with fallback strategy
- AI study-plan markdown editor + live preview + save edits
- Saved study plans list with reload support
- Validation and sanitization using Zod
- Responsive Tailwind UI with accessibility-aware form semantics
- CI workflow for lint, typecheck, test, and build

## Tech Stack

- Next.js 16 (App Router + TypeScript)
- React 19
- Tailwind CSS 4
- MongoDB Node Driver
- NextAuth v5 for authentication and session management
- Zod for payload validation
- React Markdown + remark-gfm for markdown preview
- Vitest + Playwright for testing

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment variables:

```bash
cp .env.example .env.local
```

3. Update at minimum:

- `MONGODB_URI`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET` (or `AUTH_SECRET`)
- `FOOTER_NAME`
- `FOOTER_GITHUB_URL`
- `FOOTER_LINKEDIN_URL`

4. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.
If your auth URL is configured for another port, use that instead (for example `http://localhost:3001`).

## Scripts

- `npm run dev` - start development server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
- `npm run test:unit` - run Vitest tests
- `npm run test:e2e` - run Playwright tests
- `npm run build` - production build
- `npm run ci` - full local CI pipeline

## API Overview

- `GET/POST /api/assignments` - list/create assignments
- `GET/PATCH/DELETE /api/assignments/:assignmentId` - assignment operations
- `GET/POST /api/submissions` - list/upsert submissions
- `GET/PATCH/DELETE /api/submissions/:submissionId` - submission operations
- `GET/POST/PATCH /api/study-plan` - list, generate, and edit AI study plans
- `POST /api/auth/account-exists` - account existence check for login UX

## Security and Real-World Considerations

- Strict server-side role checks for each write path
- Input validation and sanitization on all CRUD payloads
- Auth and identity handled by NextAuth credentials sessions
- Collection indexes for common query paths and uniqueness constraints
- Fallback AI strategy to avoid total feature failure when provider is unavailable
- Clear API error responses and guarded deadline logic for student actions

## Deployment

The app is deployment-ready for Vercel:

1. Connect repository to Vercel.
2. Add environment variables from `.env.example`.
3. Deploy.

CI configuration is available in `.github/workflows/ci.yml`.

## Submission Identity

- Name: Harish Ghasolia
- GitHub: https://github.com/harishghasolia07
- LinkedIn: https://www.linkedin.com/in/harish-ghasolia-124b9724b/
