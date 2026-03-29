// lib/llm.ts
// Unified LLM connector — supports Groq, Ollama, Grok, Gemini, OpenRouter, GitHub, Cohere, LM Studio

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
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
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

async function testOpenAICompatible(conn: LLMConnection, baseURL: string): Promise<LLMTestResult> {
  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: conn.apiKey || "dummy", baseURL });
    const res = await client.chat.completions.create({
      model: conn.model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    return { status: "ok", message: null, provider: conn.provider, model: res.model };
  } catch (err: unknown) {
    return { status: "error", message: `${conn.provider} error: ${String(err)}` };
  }
}

async function testGemini(conn: LLMConnection): Promise<LLMTestResult> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${conn.model}?key=${conn.apiKey}`);
    if (!res.ok) {
      if (res.status === 400) return { status: "error", message: `Gemini: Model ${conn.model} not found or invalid.` };
      if (res.status === 403) return { status: "error", message: `Gemini: Invalid API key.` };
      return { status: "error", message: `Gemini error: ${res.status}` };
    }
    return { status: "ok", message: null, provider: "gemini", model: conn.model };
  } catch (err) {
    return { status: "error", message: `Gemini API error: ${String(err)}` };
  }
}

async function testCohere(conn: LLMConnection): Promise<LLMTestResult> {
  try {
    const res = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: { "Authorization": `Bearer ${conn.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: conn.model, message: "ping" })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { status: "error", message: `Cohere error: ${errorData.message || res.status}` };
    }
    return { status: "ok", message: null, provider: "cohere", model: conn.model };
  } catch (err) {
    return { status: "error", message: `Cohere API error: ${String(err)}` };
  }
}

export async function testLLMConnection(conn: LLMConnection): Promise<LLMTestResult> {
  if (!conn.provider) return { status: "error", message: "No LLM provider configured." };
  
  switch (conn.provider) {
    case "groq":
      if (!conn.apiKey) return { status: "error", message: "Groq requires an API key." };
      return testGroq(conn);
    case "ollama":
      return testOllama(conn);
    case "grok":
      if (!conn.apiKey) return { status: "error", message: "Grok requires an API key." };
      return testOpenAICompatible(conn, "https://api.x.ai/v1");
    case "openrouter":
      if (!conn.apiKey) return { status: "error", message: "OpenRouter requires an API key." };
      return testOpenAICompatible(conn, "https://openrouter.ai/api/v1");
    case "github":
      if (!conn.apiKey) return { status: "error", message: "GitHub requires a Personal Access Token." };
      return testOpenAICompatible(conn, "https://models.inference.ai.azure.com");
    case "lmstudio":
      return testOpenAICompatible(conn, conn.baseUrl ?? "http://localhost:1234/v1");
    case "gemini":
      if (!conn.apiKey) return { status: "error", message: "Gemini requires an API key." };
      return testGemini(conn);
    case "cohere":
      if (!conn.apiKey) return { status: "error", message: "Cohere requires an API key." };
      return testCohere(conn);
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
      { role: "system", content: "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional." },
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
        { role: "system", content: "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional." },
        { role: "user", content: prompt },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama generation error: HTTP ${res.status}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

async function generateOpenAICompatible(conn: LLMConnection, prompt: string, baseURL: string): Promise<string> {
  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: conn.apiKey || "dummy", baseURL });
  const res = await client.chat.completions.create({
    model: conn.model,
    messages: [
      { role: "system", content: "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional." },
      { role: "user", content: prompt },
    ],
    max_tokens: 4096,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function generateGemini(conn: LLMConnection, prompt: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${conn.model}:generateContent?key=${conn.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "System: You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional.\n\nUser: " + prompt }] }],
      generationConfig: { maxOutputTokens: 8192 }
    })
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function generateCohere(conn: LLMConnection, prompt: string): Promise<string> {
  const res = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: { "Authorization": `Bearer ${conn.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      model: conn.model, 
      preamble: "You are a senior QA engineer. Generate test plan content strictly following the provided section headings. Be concise, structured, and professional.",
      message: prompt
    })
  });
  if (!res.ok) throw new Error(`Cohere API error: ${res.status}`);
  const data = await res.json();
  return data.text ?? "";
}

export async function generateWithLLM(conn: LLMConnection, prompt: string): Promise<LLMGenerateResult> {
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
      content = await generateOpenAICompatible(conn, prompt, "https://api.x.ai/v1");
      break;
    case "openrouter":
      content = await generateOpenAICompatible(conn, prompt, "https://openrouter.ai/api/v1");
      break;
    case "github":
      content = await generateOpenAICompatible(conn, prompt, "https://models.inference.ai.azure.com");
      break;
    case "lmstudio":
      content = await generateOpenAICompatible(conn, prompt, conn.baseUrl ?? "http://localhost:1234/v1");
      break;
    case "gemini":
      content = await generateGemini(conn, prompt);
      break;
    case "cohere":
      content = await generateCohere(conn, prompt);
      break;
    default:
      throw new Error(`Unknown LLM provider: ${conn.provider}`);
  }
  return { content };
}
