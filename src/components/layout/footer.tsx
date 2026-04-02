import { env } from "@/lib/env";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-5 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
        <p>
          Built for House of EdTech Assignment - {env.FOOTER_NAME}
        </p>
        <div className="flex items-center gap-4">
          <a
            href={env.FOOTER_GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-900 hover:text-teal-700"
          >
            GitHub
          </a>
          <a
            href={env.FOOTER_LINKEDIN_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-900 hover:text-teal-700"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
