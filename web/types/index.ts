// types/index.ts
// Shared TypeScript types for the Test Plan Generator

export type LLMProvider = "groq" | "ollama" | "grok" | "gemini" | "openrouter" | "github" | "cohere" | "lmstudio";
export type PlatformType = "jira" | "ado";

// ─── Connection Configs ─────────────────────────────────────────────────────

export interface JiraConnection {
  type: "jira";
  baseUrl: string;    // e.g. https://workspace.atlassian.net
  email: string;
  apiToken: string;
}

export interface ADOConnection {
  type: "ado";
  baseUrl: string;   // e.g. https://dev.azure.com/org
  patToken: string;
}

export interface LLMConnection {
  provider: LLMProvider;
  apiKey?: string;       // Required for groq, grok
  model: string;         // e.g. llama3-8b-8192, grok-beta, llama3
  baseUrl?: string;      // Required for ollama
}

// ─── Story / Issue ──────────────────────────────────────────────────────────

export interface StoryData {
  id: string;              // e.g. KAN-4
  title: string;
  description: string;     // Plain text (ADF converted)
  acceptanceCriteria: string;
  issueType: string;       // Story, Bug, Epic, etc.
  status: string;
  additionalContext?: string;
}

// ─── Template ───────────────────────────────────────────────────────────────

export interface TemplateSection {
  level: 1 | 2;           // Heading level from .docx
  heading: string;         // Section title
  placeholder?: string;    // Any existing placeholder text
}

// ─── Test Plan ──────────────────────────────────────────────────────────────

export interface TestPlanSection {
  heading: string;
  content: string;
}

export interface GeneratedTestPlan {
  storyId: string;
  generatedAt: string;     // ISO 8601
  sections: TestPlanSection[];
}

// ─── API Request / Response ─────────────────────────────────────────────────

export interface ConnectionTestRequest {
  connectionType: "jira" | "llm";
  jira?: JiraConnection;
  llm?: LLMConnection;
}

export interface ConnectionTestResponse {
  status: "ok" | "error";
  message: string | null;
  details?: Record<string, string>;
}

export interface FetchStoryRequest {
  connection: JiraConnection;
  storyId: string;
  additionalContext?: string;
}

export interface GeneratePlanRequest {
  connection: JiraConnection;
  llm: LLMConnection;
  storyId: string;
  additionalContext?: string;
  templateSections: TemplateSection[];
}

export interface GeneratePlanResponse {
  status: "ok" | "error";
  plan?: GeneratedTestPlan;
  message?: string;
}

export interface ExportRequest {
  plan: GeneratedTestPlan;
  format: "md" | "docx";
}
