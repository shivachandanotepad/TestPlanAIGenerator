// app/api/connect/test/route.ts
// POST /api/connect/test — Tests Jira or LLM connection

import { NextRequest, NextResponse } from "next/server";
import { testJiraConnection } from "@/lib/jira";
import { testLLMConnection } from "@/lib/llm";
import type { ConnectionTestRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: ConnectionTestRequest = await req.json();

    if (body.connectionType === "jira") {
      if (!body.jira) {
        return NextResponse.json({ status: "error", message: "Jira config missing." }, { status: 400 });
      }
      const result = await testJiraConnection(body.jira);
      return NextResponse.json(result);
    }

    if (body.connectionType === "llm") {
      if (!body.llm) {
        return NextResponse.json({ status: "error", message: "LLM config missing." }, { status: 400 });
      }
      const result = await testLLMConnection(body.llm);
      return NextResponse.json(result);
    }

    return NextResponse.json({ status: "error", message: "Invalid connectionType." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Server error: ${String(err)}` },
      { status: 500 }
    );
  }
}
