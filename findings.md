# 🔍 findings.md — Research & Discoveries

## Project: Test Plan Generator

---

## Jira REST API
- **Endpoint**: `GET /rest/api/3/issue/{issueIdOrKey}`
- **Auth**: Basic Auth (email + API token) encoded as Base64
- **Returns**: `summary`, `description`, `issuetype`, `status`, `acceptance criteria` (custom field)
- **Key Fields to Extract**:
  - `fields.summary` → Story title
  - `fields.description` → Story description (Atlassian Document Format)
  - `fields.customfield_XXXXX` → Acceptance criteria (field key varies per workspace)
- **ADF Parsing**: Jira descriptions use Atlassian Document Format (ADF) — need `atlassian-python-api` or custom ADF→text parser

## .docx Template Parsing
- **Library**: `python-docx` — parses headings and paragraphs from Word docs
- **Strategy**: Extract all `Heading 1` and `Heading 2` elements as the section skeleton
- **Limitation**: Tables and complex layouts inside .docx need special handling

## LLM Providers
| Provider | Library | Notes |
|----------|---------|-------|
| Groq | `groq` Python SDK | Fast inference, OpenAI-compatible API |
| Ollama | `ollama` Python SDK / HTTP | Local, no API key needed, `base_url` required |
| Grok (xAI) | OpenAI SDK (xAI endpoint) | `api_key` + `base_url=https://api.x.ai/v1` |

## Export
- `.md` → straightforward string generation
- `.docx` → use `python-docx` to write to a new doc mirroring the template structure
- Files written to `.tmp/` before serving download

## Helpful Libraries
- `python-docx` — template parsing + docx export
- `httpx` or `requests` — Jira/ADO API calls
- `groq` — Groq LLM SDK
- `ollama` — Ollama SDK
- `openai` — compatible with Grok (xAI) via custom base_url
- `fastapi` + `uvicorn` — backend API server
- `python-multipart` — file uploads (template .docx)

---

## Constraints Discovered
- Jira ADF format must be converted to plain text before passing to LLM
- No default LLM — system must block generation if LLM not configured
- Template structure is fixed — AI must not deviate from section headings
