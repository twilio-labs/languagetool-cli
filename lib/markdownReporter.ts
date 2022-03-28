import {
  ProgramOptions,
  LanguageToolResult,
  Reporter,
  ReporterItem,
} from "./types.js";

export const markdownReporter: Reporter = {
  noIssues: (result: LanguageToolResult, options: ProgramOptions) => {
    return `- [X] **${result.path}** has no issues.\n\n`;
  },
  issue: (item: ReporterItem, options: ProgramOptions) => {
    return (
      `- [ ] **${item.result.path}** \`(${item.line},${item.column})\`\n${item.message} \`${item.contextHighlighted}\`` +
      `\n\n   \`\`\`diff\n   - ${item.currentLine}\n` +
      (item.suggestedLine
        ? `   + ${item.suggestedLine}\n` +
          (item.replacements.length > 1
            ? "   ```\n   **Suggestion(s):** " + item.replacements.join(", ")
            : "")
        : item.match.rule.issueType === "misspelling"
        ? "   ```\n   If this is code (like a variable name), try surrounding it with \\`backticks\\`."
        : "   ```") +
      "\n\n"
    );
  },
};
