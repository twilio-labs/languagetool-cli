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
  issue: (
    {
      result,
      line,
      column,
      message,
      contextHighlighted,
      contextPrefix,
      contextPostfix,
      replacements,
    }: ReporterItem,
    options: ProgramOptions
  ) => {
    return (
      `- [ ] **${result.path}** \`(${line},${column})\` - _${message}_\n\n` +
      "  ```diff\n" +
      `  - «${contextHighlighted}»\n` +
      (replacements.length
        ? `  + Possible replacements: «${replacements.join(", ")}»\n`
        : "") +
      `  # Context: «${contextPrefix}**${contextHighlighted}**${contextPostfix}»\n` +
      "  ```\n\n"
    );
  },
};
