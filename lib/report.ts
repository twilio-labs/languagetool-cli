import { location } from "vfile-location";
import { ProgramOptions, LanguageToolResult } from "./types.js";
import { githubReporter } from "./githubReporter.js";
import { markdownReporter } from "./markdownReporter.js";

export const reporters = {
  markdown: markdownReporter,
  githubpr: githubReporter,
};

export async function generateReport(
  result: LanguageToolResult,
  reporter = reporters.markdown,
  options: ProgramOptions
) {
  const matches = result.matches;
  const matchesTotal = matches.length;

  if (!matchesTotal) {
    process.stdout.write(reporter.noIssues(result, options));
    return;
  }

  const place = location(result.contents);

  for (const match of matches) {
    const { line = 1, column = 1 } = place.toPoint(match.offset);

    const replacements = match.replacements.map((r) => r.value);

    const annotatedText = result.annotatedText?.annotation.filter(
      (t: any) => t.offset.start <= match.offset && t.offset.end > match.offset
    )?.[0];

    const ctx = match.context;
    let contextHighlighted;
    if (annotatedText) {
      const startHighlight = match.offset;
      const endHighlight = Math.min(
        annotatedText.offset.end,
        match.offset + match.length
      );
      contextHighlighted = result.contents.slice(startHighlight, endHighlight);
    } else {
      contextHighlighted = ctx.text.slice(ctx.offset, ctx.offset + ctx.length);
    }

    const contextPrefix = ctx.text.slice(0, ctx.offset);
    const contextPostfix = ctx.text.slice(
      ctx.offset + contextHighlighted.length,
      ctx.text.length
    );

    const isHighlightedCode =
      contextHighlighted.startsWith("`") && contextHighlighted.endsWith("`");

    const currentLine = result.contents.split("\n")[line - 1];
    const suggestedLine = replacements.length
      ? currentLine.slice(0, column - 1) +
        (isHighlightedCode ? "`" + replacements[0] + "`" : replacements[0]) +
        currentLine.slice(column - 1 + contextHighlighted.length)
      : "";

    // Ignore spelling errors for words in our dictionary
    if (
      match.rule.issueType === "misspelling" &&
      options.customDict?.includes(contextHighlighted.toLowerCase())
    ) {
      match.ignored = true;
      continue;
    }

    const reportedIssue = reporter.issue(
      {
        result,
        line,
        column,
        message: match.message.replace(/(\s{2})/g, ""),
        contextHighlighted,
        contextPrefix,
        contextPostfix,
        replacements,
        suggestedLine,
        currentLine,
        match,
      },
      options
    );

    if (typeof reportedIssue === "string") {
      process.stdout.write(reportedIssue);
    } else {
      await reportedIssue;
    }
  }
}
