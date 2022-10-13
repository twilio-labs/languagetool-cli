import { suite } from "uvu";
import expect from "expect";
import {
  markdownReporter,
  MARKDOWN_ITEM_COUNTER,
} from "../lib/markdownReporter.js";
import {
  FakeResult,
  getFakeResult,
  MARKDOWN_RESPONSE,
} from "./testUtilities.js";

const test = suite("markdownReporter");

let f: FakeResult;

test.before.each(async () => {
  f = await getFakeResult();
});

test("noIssue", () => {
  const report = markdownReporter.noIssues(
    f.fakeResult,
    f.fakeOptions,
    f.fakeStats
  );
  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(report).toEqual(`- [X] **README.md** has no issues.\n\n`);
});

test("issue with suggested line", () => {
  const report = markdownReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(report).toEqual(MARKDOWN_RESPONSE);
});

test("issue with no suggested line", () => {
  f.fakeItem.suggestedLine = "";
  const report = markdownReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(report).toEqual(`**README.md** \`(1,13)\`
Consider a different word. \`foo\`

\`\`\`diff
- The word is foo.
\`\`\`

---
`);
});

test("issue with no suggested line w/ misspelling", () => {
  f.fakeItem.suggestedLine = "";
  f.fakeMatch.rule.issueType = "misspelling";
  const report = markdownReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(report).toEqual(`**README.md** \`(1,13)\`
Consider a different word. \`foo\`

\`\`\`diff
- The word is foo.
\`\`\`
If this is code (like a variable name), try surrounding it with \\\`backticks\\\`.

---
`);
});

test.run();
