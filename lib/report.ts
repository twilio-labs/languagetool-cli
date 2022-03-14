import { location } from "vfile-location";
import { LanguageToolResult } from "./types.js";

export const reporters = {
  markdown: {
    noIssues: (result: LanguageToolResult) => {
      return `- [X] **${result.path}** has no issues.\n\n`;
    },
    issue: (
      result: LanguageToolResult,
      line: number,
      column: number,
      message: string,
      contextHighlighted: string,
      contextPrefix: string,
      contextPostfix: string,
      replacements: string
    ) => {
      return (
        `- [ ] **${result.path}** \`(${line},${column})\` - _${message}_\n\n` +
        "  ```diff\n" +
        `  - «${contextHighlighted}»\n` +
        (replacements.length
          ? `  + Possible replacements: «${replacements}»\n`
          : "") +
        `  # Context: «${contextPrefix}**${contextHighlighted}**${contextPostfix}»\n` +
        "  ```\n\n"
      );
    },
  },
  githubactions: {
    noIssues: () => {
      return "";
    },
    issue: (
      result: LanguageToolResult,
      line: number,
      column: number,
      message: string,
      contextHighlighted: string,
      contextPrefix: string,
      contextPostfix: string,
      replacements: string
    ) => {
      return (
        `::warning title=${message},file=${
          result.path
        },line=${line},col=${column},endColumn=${
          column + contextHighlighted.length
        }::` +
        (replacements.length
          ? `Possible replacements: «${replacements}»\n`
          : "") +
        "\n\n"
      );
    },
  },
};

export function generateReport(
  result: LanguageToolResult,
  reporter = reporters.markdown
) {
  const matches = result.matches;
  const matchesTotal = matches.length;

  if (!matchesTotal) {
    process.stdout.write(reporter.noIssues(result));
    return;
  }

  const place = location(result.contents);

  matches.forEach((match) => {
    const { line = 1, column = 1 } = place.toPoint(match.offset);

    const replacements = match.replacements.map((r) => r.value).join(", ");

    const ctx = match.context;
    const contextPrefix = ctx.text.slice(0, ctx.offset);
    const contextPostfix = ctx.text.slice(
      ctx.offset + ctx.length,
      ctx.text.length
    );
    const contextHighlighted = ctx.text.slice(
      ctx.offset,
      ctx.offset + ctx.length
    );

    process.stdout.write(
      reporter.issue(
        result,
        line,
        column,
        match.message.replace(/(\s{2})/g, ""),
        contextHighlighted,
        contextPrefix,
        contextPostfix,
        replacements
      )
    );
  });
}
