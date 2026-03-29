// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Test Plan AI Agent",
  description:
    "Test Plan AI Agent — Intelligently generate structured QA test plans from Jira stories using AI. Connect Jira, pick your LLM, and export in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
