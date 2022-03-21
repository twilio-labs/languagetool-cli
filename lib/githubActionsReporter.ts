import { LanguageToolResult, Reporter, ReporterItem } from "./types.js";

export const githubActionsReporter: Reporter = {
  noIssues: () => {
    return "";
  },
  issue: ({
    result,
    line,
    column,
    message,
    contextHighlighted,
    replacements,
  }: ReporterItem) => {
    return (
      `::warning title=${message},file=${
        result.path
      },line=${line},col=${column},endColumn=${
        column + contextHighlighted.length
      }::` +
      (replacements.length
        ? `Possible replacements: «${replacements.join(", ")}»\n`
        : "") +
      "\n\n"
    );
  },
};
