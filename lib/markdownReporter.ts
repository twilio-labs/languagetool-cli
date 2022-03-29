import { Reporter } from "./types.js";

export const MARKDOWN_ITEM_COUNTER = "Markdown Items";

export const markdownReporter: Reporter = {
  noIssues: (result) => {
    return `- [X] **${result.path}** has no issues.\n\n`;
  },
  issue: (item, options, stats) => {
    const md: string[] = [];
    md.push(`**${item.result.path}** \`(${item.line},${item.column})\``);
    md.push(`${item.message} \`${item.contextHighlighted}\``);
    md.push("");
    md.push("```diff");
    md.push(`- ${item.currentLine}`);
    if (item.suggestedLine) {
      md.push(`+ ${item.suggestedLine}`);
      md.push("```");
      if (item.replacements.length > 0) {
        md.push(
          "**Suggestion(s):** " +
            item.replacements.map((r) => "`" + r + "`").join(", ")
        );
      }
    } else {
      md.push("```");
      if (item.match.rule.issueType === "misspelling") {
        md.push(
          "If this is code (like a variable name), try surrounding it with \\`backticks\\`."
        );
      }
    }
    md.push("");
    md.push("---");
    md.push("");

    stats.incrementCounter(MARKDOWN_ITEM_COUNTER);
    return md.join("\n");
  },
};
