// lib/generator.ts
// Orchestrates the full test plan pipeline: story → template sections → LLM → plan

import type {
  StoryData,
  TemplateSection,
  LLMConnection,
  GeneratedTestPlan,
  TestPlanSection,
} from "@/types";
import { generateWithLLM } from "@/lib/llm";

/**
 * Builds the LLM prompt for a single section.
 */
function buildSectionPrompt(
  story: StoryData,
  section: TemplateSection
): string {
  return `You are filling in the "${section.heading}" section of a QA Test Plan document.

## User Story Context
**ID**: ${story.id}
**Title**: ${story.title}
**Type**: ${story.issueType}
**Status**: ${story.status}

**Description**:
${story.description || "(No description provided)"}

**Acceptance Criteria**:
${story.acceptanceCriteria || "(No acceptance criteria provided)"}

${story.additionalContext ? `**Additional Context**:\n${story.additionalContext}` : ""}

---

## Your Task
Write the content for the **"${section.heading}"** section of this test plan.
- Be concise, professional, and structured.
- Use bullet points or tables where appropriate.
- Do NOT include the section heading itself in your response — only the content.
- Stay relevant to the story described above.`;
}

/**
 * Generates a complete test plan by calling the LLM for each template section.
 */
export async function generateTestPlan(
  story: StoryData,
  templateSections: TemplateSection[],
  llm: LLMConnection
): Promise<GeneratedTestPlan> {
  if (!llm.provider) {
    throw new Error("No LLM configured. Please configure an LLM provider before generating.");
  }

  const sections: TestPlanSection[] = [];

  for (const section of templateSections) {
    const prompt = buildSectionPrompt(story, section);
    const result = await generateWithLLM(llm, prompt);
    sections.push({
      heading: section.heading,
      content: result.content.trim(),
    });
  }

  return {
    storyId: story.id,
    generatedAt: new Date().toISOString(),
    sections,
  };
}
