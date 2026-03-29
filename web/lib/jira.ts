// lib/jira.ts
// Jira Cloud REST API client — fetch story details by ID

import type { JiraConnection, StoryData } from "@/types";

/**
 * Converts Atlassian Document Format (ADF) JSON to plain text.
 * Recursively walks the content tree and extracts all text nodes.
 */
function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  const node = adf as Record<string, unknown>;

  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }

  if (Array.isArray(node.content)) {
    return (node.content as unknown[])
      .map(adfToPlainText)
      .join(node.type === "paragraph" ? "\n" : "");
  }

  return "";
}

function buildAuthHeader(email: string, apiToken: string): string {
  const credentials = `${email}:${apiToken}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Test Jira credentials by calling /rest/api/3/myself
 */
export async function testJiraConnection(conn: JiraConnection): Promise<{
  status: "ok" | "error";
  message: string | null;
  details?: Record<string, string>;
}> {
  const url = `${conn.baseUrl.replace(/\/$/, "")}/rest/api/3/myself`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: buildAuthHeader(conn.email, conn.apiToken),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        status: "ok",
        message: null,
        details: {
          displayName: data.displayName ?? "",
          email: data.emailAddress ?? "",
          accountId: data.accountId ?? "",
        },
      };
    }

    if (res.status === 401) {
      return { status: "error", message: "Authentication failed. Check your email and API token." };
    }
    if (res.status === 403) {
      return { status: "error", message: "Access forbidden. API token may lack required permissions." };
    }

    return {
      status: "error",
      message: `Unexpected response: HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { status: "error", message: "Connection timed out after 10 seconds." };
    }
    return { status: "error", message: `Connection error: ${String(err)}` };
  }
}

/**
 * Fetch a Jira issue or Confluence Page by ID/URL and return structured StoryData.
 */
export async function fetchJiraStory(
  conn: JiraConnection,
  storyIdOrUrl: string,
  additionalContext?: string
): Promise<StoryData> {
  const base = conn.baseUrl.replace(/\/$/, "");

  // -- Confluence Detection --
  if (storyIdOrUrl.includes("/wiki/") || storyIdOrUrl.match(/(?:pages|page)\/(\d+)/i)) {
    let pageId = storyIdOrUrl;
    const match = storyIdOrUrl.match(/(?:pages|page)\/(\d+)/i);
    if (match && match[1]) {
      pageId = match[1];
    }
    
    // Confluence v1 API works better for older and newer instances universally:
    const url = `${base}/wiki/rest/api/content/${pageId}?expand=body.storage`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: buildAuthHeader(conn.email, conn.apiToken),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401) throw new Error("Confluence authentication failed. Check credentials.");
    if (res.status === 404) throw new Error(`Confluence page '${pageId}' not found.`);
    if (!res.ok) throw new Error(`Confluence API error: HTTP ${res.status}`);

    const data = await res.json();
    const bodyHtml = data.body?.storage?.value ?? "";
    // Strip HTML tags for plain text description
    const description = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();

    return {
      id: data.id ?? pageId,
      title: data.title ?? "Confluence Page",
      description: description,
      acceptanceCriteria: "",
      issueType: "Confluence Page",
      status: data.status ?? "Published",
      additionalContext: additionalContext ?? "",
    };
  }

  // -- Jira Detection --
  let storyId = storyIdOrUrl;
  const matchJira = storyIdOrUrl.match(/browse\/([A-Z0-9\-]+)/i);
  if (matchJira && matchJira[1]) {
    storyId = matchJira[1];
  }

  const url = `${base}/rest/api/3/issue/${encodeURIComponent(storyId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(conn.email, conn.apiToken),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 401) throw new Error("Jira authentication failed. Check credentials.");
  if (res.status === 404) throw new Error(`Jira issue '${storyId}' not found.`);
  if (!res.ok) throw new Error(`Jira API error: HTTP ${res.status}`);

  const data = await res.json();
  const fields = data.fields ?? {};

  // Extract description — handle ADF format
  let description = "";
  if (fields.description) {
    description = adfToPlainText(fields.description);
  }

  // Try to find acceptance criteria in custom fields
  let acceptanceCriteria = "";
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith("customfield_") && value && typeof value === "object") {
      const label = (value as Record<string, unknown>)?.label ?? "";
      if (String(label).toLowerCase().includes("acceptance")) {
        acceptanceCriteria = adfToPlainText(value);
      }
    }
    // Some Jira configs store it as a plain string custom field
    if (
      key.startsWith("customfield_") &&
      typeof value === "string" &&
      value.toLowerCase().includes("given")
    ) {
      acceptanceCriteria = value;
    }
  }

  return {
    id: data.key ?? storyId,
    title: fields.summary ?? "",
    description: description.trim(),
    acceptanceCriteria: acceptanceCriteria.trim(),
    issueType: fields.issuetype?.name ?? "Story",
    status: fields.status?.name ?? "Unknown",
    additionalContext: additionalContext ?? "",
  };
}
