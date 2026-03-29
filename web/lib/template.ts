// lib/template.ts
// Parses a .docx file to extract section headings (the template skeleton)

import type { TemplateSection } from "@/types";

/**
 * Extracts heading sections from a .docx file buffer using mammoth.
 * Returns ordered list of TemplateSection objects.
 */
export async function parseDocxTemplate(
  buffer: Buffer | ArrayBuffer
): Promise<TemplateSection[]> {
  const mammoth = await import("mammoth");

  // Convert to HTML to preserve heading structure
  const buf = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
  const result = await mammoth.convertToHtml({ buffer: buf });
  const html = result.value;

  const sections: TemplateSection[] = [];

  // Parse H1 and H2 tags from HTML output
  const headingRegex = /<h([12])[^>]*>(.*?)<\/h[12]>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10) as 1 | 2;
    // Strip inner HTML tags from heading text
    const heading = match[2].replace(/<[^>]+>/g, "").trim();
    if (heading) {
      sections.push({ level, heading });
    }
  }

  // Fallback: if no headings found, provide a default template structure
  if (sections.length === 0) {
    return getDefaultTemplateSections();
  }

  return sections;
}

/**
 * Default template structure used as fallback if .docx has no detectable headings.
 */
export function getDefaultTemplateSections(): TemplateSection[] {
  return [
    { level: 1, heading: "1. Summary" },
    { level: 1, heading: "2. Scope" },
    { level: 1, heading: "3. Test Objectives" },
    { level: 1, heading: "4. Test Scenarios" },
    { level: 1, heading: "5. Test Cases" },
    { level: 1, heading: "6. Entry & Exit Criteria" },
    { level: 1, heading: "7. Risks & Assumptions" },
  ];
}
