# SOP: LLM Connector

## Goal
Provide a unified interface to multiple LLM providers (Groq, Ollama, Grok/xAI). Each provider is interchangeable — the rest of the system calls this connector without knowing which provider is active.

## Supported Providers

### 1. Groq
- **Library**: `groq` Python SDK (`pip install groq`)
- **Auth**: `GROQ_API_KEY` env variable
- **Test endpoint**: Send a 1-token prompt to `chat.completions`
- **Default models**: `llama3-8b-8192`, `mixtral-8x7b-32768`

### 2. Grok (xAI)
- **Library**: `openai` SDK with custom base_url
- **Base URL**: `https://api.x.ai/v1`
- **Auth**: `GROK_API_KEY` env variable
- **Test**: Same as OpenAI-compatible call

### 3. Ollama (local)
- **Library**: `ollama` Python SDK or direct HTTP `POST /api/chat`
- **Auth**: None (local, no API key)
- **Base URL**: `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- **Test**: `GET /api/tags` to check if server is running + model available

## Interface Contract
All providers must return:
```python
{
  "status": "ok" | "error",
  "response": "string (LLM output)" | None,
  "message": "error description if status=error" | None
}
```

## Error Handling
| Error | Action |
|-------|--------|
| No provider configured | Raise `LLMNotConfiguredError` — do not fall back to a default |
| Invalid API key | Raise `LLMAuthError` with provider name |
| Model not found | Raise `LLMModelNotFoundError` |
| Timeout (>30s) | Raise `LLMTimeoutError` — surface clearly to user |

## Update Log
| Date | Note |
|------|------|
| 2026-03-28 | Initial SOP created. Three providers supported. |
