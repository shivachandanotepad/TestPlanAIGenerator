// app/api/plan/generate/route.ts
// POST /api/plan/generate — Full pipeline: fetch story → generate test plan

import { NextRequest, NextResponse } from "next/server";
import { fetchJiraStory } from "@/lib/jira";
import { generateTestPlan } from "@/lib/generator";
import type { GeneratePlanRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePlanRequest = await req.json();

    if (!body.connection || !body.llm || !body.storyId) {
      return NextResponse.json(
        { status: "error", message: "connection, llm, and storyId are required." },
        { status: 400 }
      );
    }

    if (!body.llm.provider) {
      return NextResponse.json(
        { status: "error", message: "No LLM configured. Please configure an LLM provider first." },
        { status: 400 }
      );
    }

    // Step 1: Fetch story from Jira
    const story = await fetchJiraStory(
      body.connection,
      body.storyId,
      body.additionalContext
    );

    // Step 2: Generate test plan using template sections
    const plan = await generateTestPlan(story, body.templateSections, body.llm);

    return NextResponse.json({ status: "ok", plan });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
