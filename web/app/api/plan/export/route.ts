// app/api/plan/export/route.ts
// POST /api/plan/export — Export a test plan as .md or .docx

import { NextRequest, NextResponse } from "next/server";
import { exportToMarkdown, exportToDocx } from "@/lib/export";
import type { ExportRequest } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequest = await req.json();

    if (!body.plan || !body.format) {
      return NextResponse.json(
        { status: "error", message: "plan and format are required." },
        { status: 400 }
      );
    }

    const filename = `test-plan-${body.plan.storyId}`;

    if (body.format === "md") {
      const markdown = exportToMarkdown(body.plan);
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.md"`,
        },
      });
    }

    if (body.format === "docx") {
      const buffer = await exportToDocx(body.plan);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        },
      });
    }

    return NextResponse.json(
      { status: "error", message: "format must be 'md' or 'docx'" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 500 }
    );
  }
}
