# SOP: Jira Connector

## Goal
Authenticate with the Jira Cloud REST API and fetch the full details of a given story/epic ID.

## Inputs
| Field | Type | Required |
|-------|------|----------|
| `base_url` | string | ✅ e.g. `https://workspace.atlassian.net` |
| `email` | string | ✅ Atlassian account email |
| `api_token` | string | ✅ Jira API token (not password) |
| `issue_id` | string | ✅ e.g. `KAN-4` |

## Auth Method
- HTTP Basic Auth: `base64(email:api_token)`
- Header: `Authorization: Basic <encoded>`
- Header: `Content-Type: application/json`

## Endpoints Used
| Action | Endpoint |
|--------|----------|
| Test Connection | `GET /rest/api/3/myself` |
| Fetch Story | `GET /rest/api/3/issue/{issueIdOrKey}` |

## Output Fields Extracted
- `fields.summary` → Story title
- `fields.description` → Story body (Atlassian Document Format — must be converted to plain text)
- `fields.issuetype.name` → e.g. Story, Bug, Epic
- `fields.status.name` → e.g. To Do, In Progress
- `fields.customfield_*` → Acceptance criteria (varies per workspace — scan for "Acceptance Criteria" label)

## ADF → Plain Text Conversion
Jira descriptions use Atlassian Document Format (ADF). Strategy:
1. Recursively walk the `content` array of the ADF JSON
2. Extract all `text` nodes
3. Join with newlines

## Edge Cases
- If `description` is `null`, use summary only
- If issue not found → raise `JiraIssueNotFoundError` with the ID
- If auth fails → raise `JiraAuthError` with a clear message
- Rate limit: Jira Cloud = 10 req/sec per user — add retry with backoff if 429

## Update Log
| Date | Note |
|------|------|
| 2026-03-28 | Initial SOP created |
