// app/api/story/fetch/route.ts
// POST /api/story/fetch — Fetches a Jira story by ID

import { NextRequest, NextResponse } from "next/server";
import { fetchJiraStory } from "@/lib/jira";
import type { FetchStoryRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: FetchStoryRequest = await req.json();

    if (!body.connection || !body.storyId) {
      return NextResponse.json(
        { status: "error", message: "connection and storyId are required." },
        { status: 400 }
      );
    }

    const story = await fetchJiraStory(body.connection, body.storyId, body.additionalContext);
    return NextResponse.json({ status: "ok", story });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
