import {
  LoadFileResponse,
  LanguageToolResult,
  ProgramOptions,
  ReportStats,
  ReporterItem,
  LanguageToolMatch,
} from "../lib/types";
import {
  markdownReporter,
  MARKDOWN_ITEM_COUNTER,
} from "../lib/markdownReporter";
import { loadFiles } from "../lib/files";
import { getMarkdownFixturePath } from "./testUtilities";

describe("markdownReporter", () => {
  const markdownPaths = [getMarkdownFixturePath()];

  let markdown: LoadFileResponse,
    fakeResult: LanguageToolResult,
    fakeOptions: ProgramOptions,
    fakeStats: ReportStats,
    fakeItem: ReporterItem;

  beforeEach(async () => {
    markdown = (await loadFiles(markdownPaths))[0];

    fakeResult = {
      contents: markdown.contents,
      path: markdown.path,
      matches: [],
      annotatedText: undefined,
    };

    fakeOptions = {
      _: markdownPaths,
      githubpr: "",
      "pr-diff-only": false,
      "max-pr-suggestions": 5,
      "custom-dict-file": "",
    };

    fakeStats = new ReportStats();

    fakeItem = {
      column: 13,
      contextHighlighted: "foo",
      contextPrefix: "The word is ",
      contextPostfix: ".",
      currentLine: "The word is foo.",
      line: 1,
      match: undefined as any as LanguageToolMatch,
      message: "Consider a different word.",
      replacements: ["bar"],
      result: fakeResult,
      suggestedLine: "The word is bar.",
    };
  });

  test("noIssue", () => {
    const report = markdownReporter.noIssues(
      fakeResult,
      fakeOptions,
      fakeStats
    );
    expect(fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
    expect(report).toEqual(`- [X] **${markdown.path}** has no issues.\n\n`);
  });

  describe("issue", () => {
    test("with suggested line", () => {
      const report = markdownReporter.issue(fakeItem, fakeOptions, fakeStats);
      expect(fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
      expect(report)
        .toEqual(`**/Users/dprothero/Projects/languagetool-cli/test/fixtures/markdown/1.md** \`(1,13)\`
Consider a different word. \`foo\`

\`\`\`diff
- The word is foo.
+ The word is bar.
\`\`\`
**Suggestion(s):** \`bar\`

---
`);
    });
  });
});
