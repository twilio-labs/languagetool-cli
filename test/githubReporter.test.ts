import { suite } from "uvu";
import expect from "expect";
import nock from "nock";
import {
  initializeOctokit,
  githubReporter,
  PR_COMMENT_COUNTER,
} from "../lib/githubReporter.js";
import { MARKDOWN_ITEM_COUNTER } from "../lib/markdownReporter.js";
import { getJSONFixture, FakeResult, getFakeResult } from "./testUtilities.js";

const test = suite("githubReporter");

let f: FakeResult;

const commentResponse = getJSONFixture("github_api/issue_comment_1.json");
const prResponse = getJSONFixture("github_api/get_pr_1.json");
const reviewResponse1 = getJSONFixture("github_api/review_comment_1.json");

test.before.each(async () => {
  f = await getFakeResult();
  f.fakeOptions.githubpr = "https://github.com/dprothero/testing-ground/pull/1";

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .get("/repos/dprothero/testing-ground/pulls/1")
    .reply(200, prResponse.payload, prResponse.headers);
  await initializeOctokit(f.fakeOptions.githubpr);
});

test("noIssue", async () => {
  const report = githubReporter.noIssues(
    f.fakeResult,
    f.fakeOptions,
    f.fakeStats
  );
  expect(report).toEqual("");

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/issues/1/comments", {
      body: "<!-- languagetool-cli -->\n<details>\n<summary><h3>0 grammar issues found (click to expand)</h3></summary>\n\n- [X] **README.md** has no issues.\n\n\n</details>",
    })
    .reply(201, commentResponse.payload, commentResponse.headers);

  if (githubReporter.complete)
    await githubReporter.complete(f.fakeOptions, f.fakeStats);

  expect(nock.isDone()).toBeTruthy();
});

test("issue with suggested line", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", {
      path: "README.md",
      side: "RIGHT",
      line: 1,
      commit_id: prResponse.payload.head.sha,
      body: "<!-- languagetool-cli -->\nConsider a different word. `foo`\n\n```suggestion\nThe word is bar.\n```\n",
    })
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  expect(nock.isDone()).toBeTruthy();
});

test("issue with suggested line, max suggestions", async () => {
  f.fakeOptions["max-pr-suggestions"] = 0;

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);
});

test.run();
