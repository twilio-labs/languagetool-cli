import { location } from "vfile-location";
import { LanguageToolResult } from "./types.js";

export function generateReport(result: LanguageToolResult) {
  const matches = result.matches;
  const matchesTotal = matches.length;

  if (!matchesTotal) {
    console.log(`- [X] **${result.path}** has no issues.\n`);
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

    const message = match.message.replace(/(\s{2})/g, "");
    console.log(
      `- [ ] **${result.path}** \`(${line},${column})\` - _${message}_\n\n` +
        "  ```diff\n" +
        `  - «${contextHighlighted}»\n` +
        (replacements.length
          ? `  + Possible replacements: «${replacements}»\n`
          : "") +
        `  # Context: «${contextPrefix}**${contextHighlighted}**${contextPostfix}»\n` +
        "  ```\n"
    );
  });
}
