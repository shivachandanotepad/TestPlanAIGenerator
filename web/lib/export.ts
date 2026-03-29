// lib/export.ts
// Exports a GeneratedTestPlan to .md string or .docx Buffer

import type { GeneratedTestPlan } from "@/types";

/**
 * Converts a GeneratedTestPlan to a Markdown string.
 */
export function exportToMarkdown(plan: GeneratedTestPlan): string {
  const lines: string[] = [];

  lines.push(`# 📋 Test Plan: ${plan.storyId}`);
  lines.push(`> Generated: ${new Date(plan.generatedAt).toLocaleString()}`);
  lines.push("");

  for (const section of plan.sections) {
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.content);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Converts a GeneratedTestPlan to a .docx file Buffer using the `docx` npm package.
 * Returns a Buffer that can be sent as a file download.
 */
export async function exportToDocx(plan: GeneratedTestPlan): Promise<Buffer> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
  } = await import("docx");

  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: `Test Plan: ${plan.storyId}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  );

  // Subtitle
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date(plan.generatedAt).toLocaleString()}`,
          italics: true,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Sections
  for (const section of plan.sections) {
    // Section heading
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
      })
    );

    // Section content — split by newlines to preserve formatting
    const contentLines = section.content.split("\n");
    for (const line of contentLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: "" }));
        continue;
      }

      // Render bullet points
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        children.push(
          new Paragraph({
            text: trimmed.slice(2),
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: trimmed,
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  const doc = new Document({
    creator: "B.L.A.S.T. Test Plan Generator",
    title: `Test Plan: ${plan.storyId}`,
    description: `AI-generated test plan for ${plan.storyId}`,
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}
