# 📜 gemini.md — Project Constitution
> **This file is LAW.** Update only when a schema changes, a rule is added, or architecture is modified.

---

## 🏆 Project Identity
**Name:** Test Plan Generator (B.L.A.S.T. Flow)
**Mission:** Fetch a user story from a connected platform (Jira, ADO, X-Ray, etc.), and generate a structured, downloadable test plan that strictly follows the uploaded `.docx` template — powered by a user-configured LLM.

---

## 🗃️ Data Schema

### Input Payload
```json
{
  "connection": {
    "type": "jira | ado | xray",
    "base_url": "string",
    "email": "string (Jira only)",
    "api_token": "string",
    "project_key": "string (optional)"
  },
  "llm": {
    "provider": "groq | ollama | grok",
    "api_key": "string (null for ollama)",
    "model": "string",
    "base_url": "string (ollama only)"
  },
  "story": {
    "id": "string",        // e.g. KAN-4, AB#123
    "additional_context": "string (optional)"
  },
  "template": {
    "filename": "string",  // e.g. Test Plan - Template.docx
    "filepath": "string"   // absolute path or upload reference
  }
}
```

### Output Payload
```json
{
  "test_plan": {
    "story_id": "string",
    "generated_at": "ISO8601 timestamp",
    "sections": [
      {
        "heading": "string",       // matches .docx template heading
        "content": "string"        // AI-generated content for that section
      }
    ]
  },
  "exports": {
    "markdown": "string",           // .md file content
    "docx_path": "string"           // path to generated .docx in .tmp/
  }
}
```

---

## 🏗️ Architectural Invariants
1. **Template is Supreme**: The AI must mirror the section headings and structure from the `.docx` template exactly. No improvised sections.
2. **No Default LLM**: If no LLM is configured, the system must halt and prompt the user to configure one. Never use a hardcoded fallback.
3. **Connections are Modular**: Each platform connector (Jira, ADO, X-Ray) is an independent tool file. Adding a new platform must not change existing connectors.
4. **No Cloud Push (v1)**: Output is download-only (`.md` and `.docx`). No push to Jira/Confluence/email in v1.
5. **Secrets in `.env` only**: No credentials hardcoded anywhere. All tokens loaded from `.env`.
6. **Intermediates in `.tmp/`**: All generated files (rendered docx, markdown) written to `.tmp/` before serving to frontend.

---

## 🔌 Supported Integrations

### Story Platforms
| Platform | Status | Auth Method |
|----------|--------|-------------|
| Jira | ✅ v1 | Base URL + Email + API Token |
| Azure DevOps (ADO) | 🔜 v2 | Base URL + PAT Token |
| X-Ray | 🔜 v2 | Jira-linked |

### LLM Providers
| Provider | Status | Auth |
|----------|--------|------|
| Groq | ✅ v1 | API Key |
| Ollama | ✅ v1 | Base URL (local, no key) |
| Grok (xAI) | ✅ v1 | API Key |

---

## 📏 Behavioral Rules
- **DO**: Parse the `.docx` template to extract all headings/sections before calling the LLM.
- **DO**: Include the full Jira story text (summary, description, acceptance criteria) in the LLM prompt.
- **DO NOT**: Invent sections not present in the template.
- **DO NOT**: Proceed if story fetch fails — surface the error clearly.
- **DO NOT**: Proceed if LLM is not configured — surface a "configure LLM" prompt.
- **DO NOT**: Store any API credentials outside of `.env`.

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Backend | Next.js API Route Handlers |
| Frontend | React 18 + Vanilla CSS |
| Deployment | Vercel |
| .docx parsing | `mammoth` (read) + `docx` npm (write) |
| LLM: Groq | `groq` npm SDK |
| LLM: Grok (xAI) | `openai` npm SDK (custom baseURL) |
| LLM: Ollama | `ollama` npm SDK |
| Jira | `node-fetch` / native `fetch` |

## 📁 File Structure
```
TestPlanGenerator/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # 4-step wizard root
│   ├── globals.css
│   └── api/
│       ├── connect/test/route.ts     # Test Jira or LLM connection
│       ├── story/fetch/route.ts      # Fetch Jira story by ID
│       ├── plan/generate/route.ts    # Full pipeline
│       └── template/upload/route.ts  # Upload .docx template
├── lib/
│   ├── jira.ts               # Jira REST client
│   ├── llm.ts                # Unified LLM connector
│   ├── template.ts           # .docx template parser
│   ├── generator.ts          # Test plan orchestrator
│   └── export.ts             # .md and .docx exporter
├── types/
│   └── index.ts              # Shared TypeScript types
├── components/               # React wizard step components
├── gemini.md
├── architecture/
└── .env.local.example
```

## 🗂️ Maintenance Log
| Date | Change | By |
|------|--------|----|
| 2026-03-28 | Initial constitution created. Schema v1 defined. | System Pilot |
| 2026-03-28 | Pivoted stack from Python/FastAPI → Next.js TypeScript for Vercel. | System Pilot |
