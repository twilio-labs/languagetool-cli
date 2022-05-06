import { suite } from "uvu";
import expect from "expect";
import { generateReport } from "../lib/report.js";
import {
  LanguageToolResult,
  ProgramOptions,
  Reporter,
  ReporterItem,
  ReportStats,
} from "../lib/types.js";
import { getFakeResult, FakeResult } from "./testUtilities.js";

const test = suite("generateReport");

let f: FakeResult;
let noIssues: {
  result: LanguageToolResult;
  options: ProgramOptions;
  stats: ReportStats;
}[];
let issue: {
  item: ReporterItem;
  options: ProgramOptions;
  stats: ReportStats;
}[];

test.before.each(async () => {
  f = await getFakeResult();
  noIssues = [];
  issue = [];
});

const testReporter: Reporter = {
  noIssues(result, options, stats) {
    noIssues.push({ result, options, stats });
    return "";
  },
  issue(item, options, stats) {
    issue.push({ item, options, stats });
    return "";
  },
};

test("no issues found", async () => {
  await generateReport(f.fakeResult, testReporter, f.fakeOptions, f.fakeStats);
  expect(noIssues.length).toEqual(1);
  expect(issue.length).toEqual(0);
});

test("only reports 2 replacement suggestions", async () => {
  f.fakeItem.replacements = ["bar", "baz", "bat", "bear"];
  f.fakeOptions["max-replacements"] = 2;
  f.fakeResult.matches.push({
    message: "oops, there's a problem",
    shortMessage: "oops",
    replacements: [
      { value: "bar" },
      { value: "baz" },
      { value: "bat" },
      { value: "bear" },
    ],
    offset: 1,
    length: 2,
    context: {
      text: "The rain...",
      offset: 1,
      length: 2,
    },
    sentence: "The rain in Spain falls mainly on the plains.",
    type: {
      typeName: "?",
    },
    rule: {
      id: "x",
      description: "fake rule",
      issueType: "fake issue",
      category: {
        id: "y",
        name: "fake category",
      },
    },
    ignoreForIncompleteSentence: false,
    contextForSureMatch: 0,
  });

  await generateReport(f.fakeResult, testReporter, f.fakeOptions, f.fakeStats);
  expect(issue[0].item.replacements).toEqual(["bar", "baz", "(2 more)"]);
});

test.run();
