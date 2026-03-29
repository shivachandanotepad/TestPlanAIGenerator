"use client";

import { useState, useRef, useEffect } from "react";
import type {
  JiraConnection,
  LLMConnection,
  LLMProvider,
  TemplateSection,
  GeneratedTestPlan,
} from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface ConnectionStatus {
  jira: "idle" | "loading" | "ok" | "error";
  llm: "idle" | "loading" | "ok" | "error";
  jiraMessage?: string;
  llmMessage?: string;
  jiraUser?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Step Labels ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Connect Agents" },
  { id: 2, label: "Context & Story" },
  { id: 3, label: "Generate Plan" },
  { id: 4, label: "Review & Rate" },
] as const;

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1 state
  const [jira, setJira] = useState<JiraConnection>({
    type: "jira",
    baseUrl: "",
    email: "",
    apiToken: "",
  });
  const [llm, setLlm] = useState<LLMConnection>({
    provider: "groq",
    apiKey: "",
    model: "llama3-8b-8192",
    baseUrl: "",
  });
  const [connStatus, setConnStatus] = useState<ConnectionStatus>({
    jira: "idle",
    llm: "idle",
  });

  // Step 2 state
  const [storyId, setStoryId] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [templateUploading, setTemplateUploading] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Step 4 state
  const [plan, setPlan] = useState<GeneratedTestPlan | null>(null);
  const [rating, setRating] = useState(0);
  const [exporting, setExporting] = useState<"md" | "docx" | null>(null);

  // ─── Theme ────────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // ─── Step 1: Test Connection ────────────────────────────────────────────────

  async function testJiraConn() {
    setConnStatus((s) => ({ ...s, jira: "loading", jiraMessage: undefined }));
    try {
      const res = await fetch("/api/connect/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionType: "jira", jira }),
      });
      const data = await res.json();
      setConnStatus((s) => ({
        ...s,
        jira: data.status,
        jiraMessage: data.message,
        jiraUser: data.details?.displayName,
      }));
    } catch {
      setConnStatus((s) => ({ ...s, jira: "error", jiraMessage: "Request failed." }));
    }
  }

  async function testLLMConn() {
    setConnStatus((s) => ({ ...s, llm: "loading", llmMessage: undefined }));
    try {
      const res = await fetch("/api/connect/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionType: "llm", llm }),
      });
      const data = await res.json();
      setConnStatus((s) => ({
        ...s,
        llm: data.status,
        llmMessage: data.message,
      }));
    } catch {
      setConnStatus((s) => ({ ...s, llm: "error", llmMessage: "Request failed." }));
    }
  }

  // ─── Step 2: Upload Template ─────────────────────────────────────────────────

  async function handleTemplateUpload(file: File) {
    setTemplateFile(file);
    setTemplateUploading(true);
    try {
      const fd = new FormData();
      fd.append("template", file);
      const res = await fetch("/api/template/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "ok") {
        setTemplateSections(data.sections);
      }
    } catch {
      // silently use default sections
    } finally {
      setTemplateUploading(false);
    }
  }

  // ─── Step 3: Generate ────────────────────────────────────────────────────────

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    setCurrentStep(3);

    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection: jira,
          llm,
          storyId,
          additionalContext,
          templateSections: templateSections.length > 0 ? templateSections : undefined,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setPlan(data.plan);
        setCurrentStep(4);
      } else {
        setGenError(data.message ?? "Generation failed.");
      }
    } catch (err) {
      setGenError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  async function handleExport(format: "md" | "docx") {
    if (!plan) return;
    setExporting(format);
    try {
      const res = await fetch("/api/plan/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, format }),
      });
      const blob = await res.blob();
      downloadBlob(blob, `test-plan-${plan.storyId}.${format}`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  }

  // ─── LLM model defaults ────────────────────────────────────────────────────

  function handleProviderChange(provider: LLMProvider) {
    const defaults: Record<LLMProvider, string> = {
      groq: "llama3-8b-8192",
      ollama: "llama3",
      grok: "grok-beta",
    };
    setLlm((l) => ({ ...l, provider, model: defaults[provider], apiKey: "", baseUrl: "" }));
    setConnStatus((s) => ({ ...s, llm: "idle", llmMessage: undefined }));
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🧠</div>
          <span className="sidebar-logo-text">Test Plan AI Agent</span>
        </div>
        <nav className="sidebar-nav">
          <button className="sidebar-nav-item active">
            <span className="nav-icon">⚡</span> Dashboard
          </button>
          <button className="sidebar-nav-item">
            <span className="nav-icon">🔗</span> Integrations
          </button>
          <button className="sidebar-nav-item">
            <span className="nav-icon">⚙️</span> Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="current-phase-badge">
            <div className="current-phase-label">Current Phase</div>
            <div className="current-phase-value">Step {currentStep}: {STEPS[currentStep - 1].label}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {/* Header */}
        <div className="header-row">
          <div>
            <h1 className="header-title">Test Plan AI Agent</h1>
            <p className="header-subtitle">Connect your agents and generate contextual test plans instantly.</p>
          </div>
          <button
            id="theme-toggle-btn"
            className="theme-toggle"
            onClick={() => setIsDark((d) => !d)}
            aria-label="Toggle light/dark mode"
          >
            <span className="theme-toggle-icon">{isDark ? "☀️" : "🌙"}</span>
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((step, i) => (
            <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div className="step-item">
                <div
                  className={`step-circle ${
                    currentStep > step.id
                      ? "completed"
                      : currentStep === step.id
                      ? "active"
                      : ""
                  }`}
                >
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                <span
                  className={`step-label ${
                    currentStep === step.id
                      ? "active"
                      : currentStep > step.id
                      ? "completed"
                      : ""
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`step-connector ${currentStep > step.id ? "completed" : ""}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="step-container">
          {/* ── Step 1: Connect Agents ── */}
          {currentStep === 1 && (
            <div className="fade-in">
              <div className="grid-2">
                {/* Jira Card */}
                <div className="card">
                  <div className="card-title">
                    🔗 Jira Tracking
                    {connStatus.jira === "ok" && (
                      <span className="status-badge success">✓ Connected</span>
                    )}
                    {connStatus.jira === "error" && (
                      <span className="status-badge error">✗ Failed</span>
                    )}
                  </div>
                  <p className="card-subtitle">Connect your Atlassian Jira workspace</p>

                  <div className="form-group">
                    <label className="form-label">Jira Base URL</label>
                    <input
                      id="jira-url"
                      type="url"
                      className="form-input"
                      placeholder="https://workspace.atlassian.net"
                      value={jira.baseUrl}
                      onChange={(e) => setJira((j) => ({ ...j, baseUrl: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      id="jira-email"
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      value={jira.email}
                      onChange={(e) => setJira((j) => ({ ...j, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">API Token</label>
                    <input
                      id="jira-token"
                      type="password"
                      className="form-input"
                      placeholder="Your Jira API token"
                      value={jira.apiToken}
                      onChange={(e) => setJira((j) => ({ ...j, apiToken: e.target.value }))}
                    />
                  </div>

                  {connStatus.jira === "error" && connStatus.jiraMessage && (
                    <div className="error-message">⚠ {connStatus.jiraMessage}</div>
                  )}
                  {connStatus.jira === "ok" && connStatus.jiraUser && (
                    <div className="error-message" style={{ background: "var(--success-dim)", borderColor: "var(--border-success)", color: "var(--success)" }}>
                      👤 Connected as: {connStatus.jiraUser}
                    </div>
                  )}

                  <button
                    id="test-jira-btn"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={testJiraConn}
                    disabled={connStatus.jira === "loading" || !jira.baseUrl || !jira.email || !jira.apiToken}
                  >
                    {connStatus.jira === "loading" ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Testing…</> : "Test Connection"}
                  </button>
                </div>

                {/* LLM Card */}
                <div className="card">
                  <div className="card-title">
                    🤖 LLM Intelligence
                    {connStatus.llm === "ok" && (
                      <span className="status-badge success">✓ Connected</span>
                    )}
                    {connStatus.llm === "error" && (
                      <span className="status-badge error">✗ Failed</span>
                    )}
                  </div>
                  <p className="card-subtitle">Configure your AI provider for plan generation</p>

                  <div className="form-group">
                    <label className="form-label">Provider</label>
                    <select
                      id="llm-provider"
                      className="form-input form-select"
                      value={llm.provider}
                      onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                    >
                      <option value="groq">Groq (Cloud API)</option>
                      <option value="grok">Grok (xAI)</option>
                      <option value="ollama">Ollama (Local)</option>
                    </select>
                  </div>

                  {(llm.provider === "groq" || llm.provider === "grok") && (
                    <div className="form-group">
                      <label className="form-label">
                        {llm.provider === "groq" ? "Groq API Key" : "xAI API Key"}
                      </label>
                      <input
                        id="llm-key"
                        type="password"
                        className="form-input"
                        placeholder="••••••••••••••••••••"
                        value={llm.apiKey ?? ""}
                        onChange={(e) => setLlm((l) => ({ ...l, apiKey: e.target.value }))}
                      />
                    </div>
                  )}

                  {llm.provider === "ollama" && (
                    <div className="form-group">
                      <label className="form-label">Ollama Base URL</label>
                      <input
                        id="ollama-url"
                        type="url"
                        className="form-input"
                        placeholder="http://localhost:11434"
                        value={llm.baseUrl ?? ""}
                        onChange={(e) => setLlm((l) => ({ ...l, baseUrl: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input
                      id="llm-model"
                      type="text"
                      className="form-input"
                      placeholder={
                        llm.provider === "groq"
                          ? "llama3-8b-8192"
                          : llm.provider === "grok"
                          ? "grok-beta"
                          : "llama3"
                      }
                      value={llm.model}
                      onChange={(e) => setLlm((l) => ({ ...l, model: e.target.value }))}
                    />
                  </div>

                  {connStatus.llm === "error" && connStatus.llmMessage && (
                    <div className="error-message">⚠ {connStatus.llmMessage}</div>
                  )}

                  <button
                    id="test-llm-btn"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={testLLMConn}
                    disabled={
                      connStatus.llm === "loading" ||
                      !llm.model ||
                      (llm.provider !== "ollama" && !llm.apiKey)
                    }
                  >
                    {connStatus.llm === "loading" ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Testing…</> : "Test Connection"}
                  </button>
                </div>
              </div>

              <div className="step-actions">
                <button
                  id="continue-to-context"
                  className="btn btn-primary"
                  onClick={() => setCurrentStep(2)}
                  disabled={connStatus.jira !== "ok" || connStatus.llm !== "ok"}
                >
                  Continue to Context →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Context & Story ── */}
          {currentStep === 2 && (
            <div className="fade-in">
              <div className="card">
                <div className="card-title">🎯 Feature Context</div>
                <p className="card-subtitle">
                  Provide the Jira Ticket ID and any additional context to ground the AI generation.
                </p>

                <div className="form-group">
                  <label className="form-label">Jira Story / Epic ID</label>
                  <input
                    id="story-id"
                    type="text"
                    className="form-input"
                    placeholder="e.g. KAN-4, PROJ-123"
                    value={storyId}
                    onChange={(e) => setStoryId(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    🔗 Additional Knowledge Links or Context (Optional)
                  </label>
                  <textarea
                    id="additional-context"
                    className="form-input form-textarea"
                    placeholder="Paste links to design docs, git repos, or any other notes you want the AI to read before making the test plan…"
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                  />
                </div>

                {/* Template Section */}
                <div className="form-group">
                  <label className="form-label">Test Plan Template</label>
                  {templateFile ? (
                    <div className="template-badge">
                      <div className="template-badge-icon">📄</div>
                      <div>
                        <div className="template-badge-name">{templateFile.name}</div>
                        <div className="template-badge-sub">
                          {templateUploading
                            ? "Parsing template sections…"
                            : `${templateSections.length} sections detected — The AI will strictly follow this structure.`}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: "auto" }}
                        onClick={() => templateInputRef.current?.click()}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      className="template-badge"
                      style={{ cursor: "pointer", justifyContent: "center" }}
                      onClick={() => templateInputRef.current?.click()}
                    >
                      <div className="template-badge-icon">⬆️</div>
                      <div>
                        <div className="template-badge-name">Upload .docx Template</div>
                        <div className="template-badge-sub">Click to upload — the AI will follow its structure exactly</div>
                      </div>
                    </div>
                  )}
                  <input
                    ref={templateInputRef}
                    type="file"
                    accept=".docx"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleTemplateUpload(f);
                    }}
                  />
                  {!templateFile && (
                    <p className="section-info">
                      No template uploaded — a default 7-section structure will be used.
                    </p>
                  )}
                </div>
              </div>

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => setCurrentStep(1)}>
                  ← Back
                </button>
                <button
                  id="generate-btn"
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={!storyId.trim()}
                >
                  ✨ Generate Test Plan
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Generating ── */}
          {currentStep === 3 && (
            <div className="fade-in card">
              {generating ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <div className="loading-title">Generating Test Plan…</div>
                  <div className="loading-sub">
                    Fetching <strong>{storyId}</strong> from Jira, then crafting each section using {llm.provider.toUpperCase()}.<br />
                    This may take 15–60 seconds depending on the story length.
                  </div>
                </div>
              ) : genError ? (
                <div style={{ padding: "40px 0" }}>
                  <div className="error-message" style={{ justifyContent: "center", textAlign: "center" }}>
                    ❌ {genError}
                  </div>
                  <div className="step-actions" style={{ borderTop: "none", justifyContent: "center", marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={() => setCurrentStep(2)}>← Back to Context</button>
                    <button className="btn btn-primary" onClick={handleGenerate}>Retry ↻</button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Step 4: Review & Rate ── */}
          {currentStep === 4 && plan && (
            <div className="fade-in">
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div className="card-title" style={{ marginBottom: 0 }}>
                    📋 Generated Test Plan
                  </div>
                  <div className="export-actions">
                    <button
                      id="export-md-btn"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleExport("md")}
                      disabled={exporting !== null}
                    >
                      {exporting === "md" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : "⬇ Export .MD"}
                    </button>
                    <button
                      id="export-docx-btn"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleExport("docx")}
                      disabled={exporting !== null}
                    >
                      {exporting === "docx" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : "⬇ Export .DOCX"}
                    </button>
                  </div>
                </div>

                <div className="plan-output">
                  {plan.sections.map((section, i) => (
                    <div key={i}>
                      <div className="plan-section-heading">## {section.heading}</div>
                      <div style={{ marginBottom: 16, whiteSpace: "pre-wrap" }}>{section.content}</div>
                    </div>
                  ))}
                </div>

                <div className="rating-section">
                  <div className="rating-label">How accurately does this capture the requirements?</div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`star ${rating >= n ? "active" : ""}`}
                        onClick={() => setRating(n)}
                        role="button"
                        aria-label={`Rate ${n} stars`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="step-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => { setPlan(null); setStoryId(""); setCurrentStep(2); }}
                >
                  ← New Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
