import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadFiles } from "../lib/files.js";
import {
  LanguageToolMatch,
  LanguageToolResult,
  LoadFileResponse,
  ProgramOptions,
  ReporterItem,
  ReportStats,
} from "../lib/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getMarkdownFixturePath(name: string = "1"): string {
  return path.resolve(__dirname, "fixtures", "markdown", name + ".md");
}

export function getPatchFixture(name: string = "1"): string {
  const fullPath = path.resolve(
    __dirname,
    "fixtures",
    "patches",
    name + ".patch"
  );
  return fs.readFileSync(fullPath, { encoding: "utf8" });
}

export interface JSONFixture {
  payload: any;
  headers: string[];
}

export function getJSONFixture(name: string): JSONFixture {
  const fullPath = path.resolve(__dirname, "fixtures", name);
  const contents = fs.readFileSync(fullPath, { encoding: "utf8" });
  return JSON.parse(contents);
}

export interface FakeResult {
  markdown: LoadFileResponse;
  fakeMatch: LanguageToolMatch;
  fakeResult: LanguageToolResult;
  fakeOptions: ProgramOptions;
  fakeStats: ReportStats;
  fakeItem: ReporterItem;
}

export async function getFakeResult(): Promise<FakeResult> {
  const markdownPaths = [getMarkdownFixturePath()];
  const markdown = (await loadFiles(markdownPaths))[0];

  const fakeMatch = {
    context: {
      length: 3,
      offset: 12,
      text: "The word is foo.",
    },
    contextForSureMatch: 0,
    ignoreForIncompleteSentence: false,
    length: 3,
    offset: 12,
    message: "Consider a different word.",
    replacements: [{ value: "bar" }],
    rule: {
      category: { id: "ID_CATEGORY", name: "Who Knows?" },
      description: "Something something description",
      id: "ID_STRING",
      issueType: "who knows",
    },
    sentence: "The word is foo.",
    shortMessage: "Bad word",
    type: { typeName: "TYPE_NAME" },
  };

  const fakeResult = {
    contents: markdown.contents,
    path: "README.md",
    matches: [],
    annotatedText: undefined,
    changedLines: [...markdown.contents.split("\n").keys()],
  };

  const fakeOptions = {
    _: ["README.md"],
    githubpr: "",
    "pr-diff-only": false,
    "max-pr-suggestions": 5,
    "max-replacements": 5,
    "custom-dict-file": "",
  };

  const fakeStats = new ReportStats();

  const fakeItem = {
    column: 13,
    contextHighlighted: "foo",
    contextPrefix: "The word is ",
    contextPostfix: ".",
    currentLine: "The word is foo.",
    line: 1,
    match: fakeMatch,
    message: "Consider a different word.",
    replacements: ["bar"],
    result: fakeResult,
    suggestedLine: "The word is bar.",
  };

  return {
    markdown,
    fakeItem,
    fakeMatch,
    fakeOptions,
    fakeResult,
    fakeStats,
  };
}

export const MARKDOWN_RESPONSE = `**README.md** \`(1,13)\`
Consider a different word. \`foo\`

\`\`\`diff
- The word is foo.
+ The word is bar.
\`\`\`
**Suggestion(s):** \`bar\`

---
`;
