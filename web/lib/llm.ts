// lib/llm.ts
// Unified LLM connector — supports Groq, Ollama, and Grok (xAI)

import type { LLMConnection } from "@/types";

export interface LLMTestResult {
  status: "ok" | "error";
  message: string | null;
  provider?: string;
  model?: string;
}

export interface LLMGenerateResult {
  content: string;
}

// ─── Connection Tests ────────────────────────────────────────────────────────

async function testGroq(conn: LLMConnection): Promise<LLMTestResult> {
  try {
    const { Groq } = await import("groq-sdk");
    const client = new Groq({ apiKey: conn.apiKey });
    const res = await client.chat.completions.create({
      model: conn.model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return { status: "ok", message: null, provider: "groq", model: res.model };
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("401") || msg.includes("Invalid API Key") || msg.includes("authentication")) {
      return { status: "error", message: "Invalid Groq API key." };
    }
    if (msg.includes("model") && msg.includes("not found")) {
      return { status: "error", message: `Model '${conn.model}' not found on Groq.` };
    }
    return { status: "error", message: `Groq error: ${msg}` };
  }
}

async function testOllama(conn: LLMConnection): Promise<LLMTestResult> {
  const baseUrl = (conn.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return { status: "error", message: `Ollama server responded with HTTP ${res.status}.` };
    }
    const data = await res.json();
    const models: string[] = (data.models ?? []).map(
      (m: { name: string }) => m.name
    );
    const modelBase = conn.model.split(":")[0];
    const found = models.some((m) => m === conn.model || m.split(":")[0] === modelBase);
    if (!found) {
      return {
        status: "error",
        message: `Model '${conn.model}' not found. Available: ${models.join(", ") || "none pulled yet"}.`,
      };
    }
    return { status: "ok", message: null, provider: "ollama", model: conn.model };
  } catch (err: unknown) {
    const e = err as Error;
    if (e.name === "TimeoutError") {
      return { status: "error", message: "Ollama server timed out." };
    }
    return { status: "error", message: `Cannot reach Ollama at ${baseUrl}. Is it running?` };
  }
}

async function testGrok(conn: LLMConnection): Promise<LLMTestResult> {
  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey: conn.apiKey,
      baseURL: "https://api.x.ai/v1",
    });
    const res = await client.chat.completions.create({
      model: conn.model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return { status: "ok", message: null, provider: "grok", model: res.model };
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("401") || msg.includes("authentication")) {
      return { status: "error", message: "Invalid xAI API key." };
    }
    return { status: "error", message: `Grok error: ${msg}` };
  }
}

export async function testLLMConnection(conn: LLMConnection): Promise<LLMTestResult> {
  if (!conn.provider) {
    return { status: "error", message: "No LLM provider configured." };
  }
  switch (conn.provider) {
    case "groq":
      if (!conn.apiKey) return { status: "error", message: "Groq requires an API key." };
      return testGroq(conn);
    case "ollama":
      return testOllama(conn);
    case "grok":
      if (!conn.apiKey) return { status: "error", message: "Grok requires an API key." };
      return testGrok(conn);
    default:
      return { status: "error", message: `Unknown provider: ${conn.provider}` };
  }
}

// ─── Generation ──────────────────────────────────────────────────────────────

async function generateWithGroq(conn: LLMConnection, prompt: string): Promise<string> {
  const { Groq } = await import("groq-sdk");
  const client = new Groq({ apiKey: conn.apiKey });
  const res = await client.chat.completions.create({
    model: conn.model,
    messages: [
      {
        role: "system",
        content:
          "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 4096,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function generateWithOllama(conn: LLMConnection, prompt: string): Promise<string> {
  const baseUrl = (conn.baseUrl ?? "http://localhost:11434").replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: conn.model,
      messages: [
        {
          role: "system",
          content:
            "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional.",
        },
        { role: "user", content: prompt },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Ollama generation error: HTTP ${res.status}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

async function generateWithGrok(conn: LLMConnection, prompt: string): Promise<string> {
  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: conn.apiKey, baseURL: "https://api.x.ai/v1" });
  const res = await client.chat.completions.create({
    model: conn.model,
    messages: [
      {
        role: "system",
        content:
          "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 4096,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function generateWithLLM(
  conn: LLMConnection,
  prompt: string
): Promise<LLMGenerateResult> {
  if (!conn.provider) throw new Error("No LLM provider configured.");

  let content = "";
  switch (conn.provider) {
    case "groq":
      content = await generateWithGroq(conn, prompt);
      break;
    case "ollama":
      content = await generateWithOllama(conn, prompt);
      break;
    case "grok":
      content = await generateWithGrok(conn, prompt);
      break;
    default:
      throw new Error(`Unknown LLM provider: ${conn.provider}`);
  }
  return { content };
}
