import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { AppToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EdTech Assignment Tracker",
  description:
    "Secure full-stack assignment tracker with role-based CRUD, MongoDB persistence, and AI-assisted study plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${sora.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <AppSessionProvider>
          <AppToastProvider>{children}</AppToastProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
