# 📋 task_plan.md — Test Plan Generator Blueprint

## Project Goal
Build an intelligent, multi-step Test Plan Generator agent that:
1. Connects to Jira (ADO, X-Ray in future) via user-provided credentials
2. Fetches a user story by ID
3. Parses a user-uploaded `.docx` template to extract section structure
4. Uses a configured LLM (Groq / Ollama / Grok) to generate test plan content per section
5. Exports the result as a downloadable `.md` and `.docx` file

---

## Phase 1: B — Blueprint ✅
- [x] Discovery Questions answered
- [x] `gemini.md` created (data schema + rules)
- [x] `task_plan.md` created (this file)
- [x] `findings.md` created
- [x] `progress.md` created

## Phase 2: L — Link (Connectivity)
- [ ] Create `tools/test_jira_connection.py` — verify Jira creds
- [ ] Create `tools/test_llm_connection.py` — verify LLM (Groq/Ollama/Grok)
- [ ] Validate `.env` structure
- [ ] Test with real Jira ticket (KAN-4 from screenshot)

## Phase 3: A — Architect (3-Layer Build)

### Layer 1: Architecture SOPs
- [ ] `architecture/jira_connector.md`
- [ ] `architecture/llm_connector.md`
- [ ] `architecture/template_parser.md`
- [ ] `architecture/test_plan_generator.md`
- [ ] `architecture/export_handler.md`

### Layer 2: Navigation
- [ ] Main orchestrator script that routes: fetch → parse → generate → export

### Layer 3: Tools (`tools/`)
- [ ] `tools/fetch_jira_story.py`
- [ ] `tools/parse_docx_template.py`
- [ ] `tools/generate_test_plan.py`
- [ ] `tools/export_to_md.py`
- [ ] `tools/export_to_docx.py`

### Backend API (FastAPI)
- [ ] `POST /api/connect/test` — test any connection
- [ ] `POST /api/story/fetch` — fetch story by ID
- [ ] `POST /api/plan/generate` — full pipeline execution
- [ ] `GET /api/plan/export?format=md|docx` — download result

## Phase 4: S — Stylize (Frontend)
- [ ] 4-step wizard UI (matches screenshot prototype)
  - Step 1: Connect Agents (Jira + LLM config)
  - Step 2: Context & Story (Jira ID + optional context + template upload)
  - Step 3: Generate Test Plan (loading state)
  - Step 4: Review & Rate + Export .MD / .DOCX
- [ ] Dark mode support
- [ ] Connection status indicators (green ✅ / red ❌)

## Phase 5: T — Trigger (Deployment)
- [ ] Local dev environment working end-to-end
- [ ] Optional: Vercel (frontend) + Railway/Render (backend) deployment
- [ ] Final maintenance log update in `gemini.md`

---

## File Structure
```
TestPlanGenerator/
├── gemini.md               # Project Constitution
├── task_plan.md            # This file
├── findings.md             # Research & discoveries
├── progress.md             # Error log & progress
├── .env                    # Secrets (never committed)
├── architecture/           # Layer 1: SOPs
├── tools/                  # Layer 3: Python scripts
├── backend/                # FastAPI server
├── frontend/               # React/HTML UI
└── .tmp/                   # Intermediate files (generated docs)
```
