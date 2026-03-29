// app/api/template/upload/route.ts
// POST /api/template/upload — Upload and parse a .docx template

import { NextRequest, NextResponse } from "next/server";
import { parseDocxTemplate } from "@/lib/template";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("template") as File | null;

    if (!file) {
      return NextResponse.json(
        { status: "error", message: "No template file provided. Field name must be 'template'." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { status: "error", message: "Only .docx files are supported." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sections = await parseDocxTemplate(buffer);

    return NextResponse.json({
      status: "ok",
      filename: file.name,
      sections,
      sectionCount: sections.length,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `Failed to parse template: ${String(err)}` },
      { status: 500 }
    );
  }
}
