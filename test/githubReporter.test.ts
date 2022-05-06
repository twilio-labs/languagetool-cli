import { suite } from "uvu";
import expect from "expect";
import nock from "nock";
import { performance } from "perf_hooks";
import {
  initializeOctokit,
  githubReporter,
  PR_COMMENT_COUNTER,
} from "../lib/githubReporter.js";
import { MARKDOWN_ITEM_COUNTER } from "../lib/markdownReporter.js";
import { getJSONFixture, FakeResult, getFakeResult } from "./testUtilities.js";
import { MARKDOWN_RESPONSE } from "./markdownReporter.test.js";

const test = suite("githubReporter");

let f: FakeResult;

const commentResponse = getJSONFixture("github_api/issue_comment_1.json");
const commentResponseTooBig = getJSONFixture("github_api/issue_comment_2.json");
const prResponse = getJSONFixture("github_api/get_pr_1.json");
const reviewResponse1 = getJSONFixture("github_api/review_comment_1.json");

test.before.each(async () => {
  process.env.GITHUB_TOKEN = "123456";
  f = await getFakeResult();
  f.fakeOptions.githubpr = "https://github.com/dprothero/testing-ground/pull/1";

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .get("/repos/dprothero/testing-ground/pulls/1")
    .reply(200, prResponse.payload, prResponse.headers);
  await initializeOctokit(f.fakeOptions.githubpr);
});

test("no github token", async () => {
  process.env.GITHUB_TOKEN = "";
  let error;
  try {
    await initializeOctokit("");
  } catch (err: any) {
    error = err.message;
  }

  expect(error).toEqual(
    "No GITHUB_TOKEN environment variable specified. Cannot report to GitHub."
  );
});

test("custom github enterprise host", async () => {
  nock("https://github.enterprise.com:443", { encodedQueryParams: true })
    .get("/api/v3/repos/some-org/some-repo/pulls/1")
    .reply(200, prResponse.payload, prResponse.headers);
  await initializeOctokit(
    "https://github.enterprise.com/some-org/some-repo/pull/1"
  );
  expect(nock.isDone()).toBeTruthy();
});

test("nothing to report on complete", async () => {
  expect(githubReporter.complete).toBeTruthy();
  if (githubReporter.complete)
    await githubReporter.complete(f.fakeOptions, f.fakeStats);
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

const notPartOfDiff = {
  message: "Validation Failed",
  errors: [
    {
      resource: "PullRequestReviewComment",
      code: "custom",
      field: "pull_request_review_thread.line",
      message: "pull_request_review_thread.line must be part of the diff",
    },
    {
      resource: "PullRequestReviewComment",
      code: "missing_field",
      field: "pull_request_review_thread.diff_hunk",
    },
  ],
  documentation_url: "https://docs.github.com/rest",
};

test("issue not part of diff", async () => {
  f.fakeItem.result.changedLines = [];
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);

  expect(nock.isDone()).toBeTruthy();
});

test("issue not part of diff, pr-diff-only", async () => {
  f.fakeItem.result.changedLines = [];
  f.fakeOptions["pr-diff-only"] = true;
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);

  expect(nock.isDone()).toBeTruthy();
});

test("issue not part of diff from api", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(422, notPartOfDiff, reviewResponse1.headers);

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);

  expect(nock.isDone()).toBeTruthy();
});

test("issue not part of diff, pr-diff-only from api", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(422, notPartOfDiff, reviewResponse1.headers);

  f.fakeOptions["pr-diff-only"] = true;
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);

  expect(nock.isDone()).toBeTruthy();
});

test("two issues, one suggestion, one general comment", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(422, notPartOfDiff, reviewResponse1.headers);

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/issues/1/comments", (postData) =>
      postData.body.includes("1 additional")
    )
    .reply(201, commentResponse.payload, commentResponse.headers);

  if (githubReporter.complete)
    await githubReporter.complete(f.fakeOptions, f.fakeStats);

  expect(nock.isDone()).toBeTruthy();
});

test("two suggestions with rate limiting between calls", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  let startTime = performance.now();
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  let endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(999);
  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  startTime = performance.now();
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  endTime = performance.now();

  expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(2);

  expect(nock.isDone()).toBeTruthy();
});

test("issue, some other github api error", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("```suggestion")
    )
    .reply(
      422,
      {
        message: "Validation Failed",
        errors: [
          {
            resource: "PullRequestReviewComment",
            code: "custom",
            field: "pull_request_review_thread.line",
            message: "some other error",
          },
        ],
        documentation_url: "https://docs.github.com/rest",
      },
      reviewResponse1.headers
    );

  let error;
  try {
    await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  } catch (err: any) {
    error = err.message;
  }
  expect(error).toContain("some other error");

  expect(nock.isDone()).toBeTruthy();
});

test("issue with suggested line, multiple suggestions", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", (postData) =>
      postData.body.includes("**Other suggestion(s):** `other`")
    )
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  f.fakeItem.replacements.push("other");
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  expect(nock.isDone()).toBeTruthy();
});

test("issue without suggested line", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", {
      path: "README.md",
      side: "RIGHT",
      line: 1,
      commit_id: prResponse.payload.head.sha,
      body: "<!-- languagetool-cli -->\nConsider a different word. `foo`\n",
    })
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  f.fakeItem.suggestedLine = "";
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  expect(nock.isDone()).toBeTruthy();
});

test("issue without suggested line, misspelling", async () => {
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/pulls/1/comments", {
      path: "README.md",
      side: "RIGHT",
      line: 1,
      commit_id: prResponse.payload.head.sha,
      body: "<!-- languagetool-cli -->\nConsider a different word. `foo`\n\nIf this is code (like a variable name), try surrounding it with \\`backticks\\`.",
    })
    .reply(201, reviewResponse1.payload, reviewResponse1.headers);

  f.fakeItem.suggestedLine = "";
  f.fakeItem.match.rule.issueType = "misspelling";
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(0);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(1);

  expect(nock.isDone()).toBeTruthy();
});

test("issue hitting max suggestions", async () => {
  f.fakeOptions["max-pr-suggestions"] = 0;

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(1);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/issues/1/comments", (postData) =>
      postData.body.includes(MARKDOWN_RESPONSE)
    )
    .reply(201, commentResponse.payload, commentResponse.headers);

  if (githubReporter.complete)
    await githubReporter.complete(f.fakeOptions, f.fakeStats);

  expect(nock.isDone()).toBeTruthy();
});

test("all comments too large for github", async () => {
  const fakeItem2 = {
    ...f.fakeItem,
    contextHighlighted: "fee",
    currentLine: "The word is fee.",
  };
  const fakeMarkdownItem1 = MARKDOWN_RESPONSE;
  const fakeMarkdownItem2 = MARKDOWN_RESPONSE.replaceAll("foo", "fee");

  f.fakeOptions["max-pr-suggestions"] = 0;

  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);
  await githubReporter.issue(fakeItem2, f.fakeOptions, f.fakeStats);

  expect(f.fakeStats.getCounter(MARKDOWN_ITEM_COUNTER)).toEqual(2);
  expect(f.fakeStats.getCounter(PR_COMMENT_COUNTER)).toEqual(0);

  // First request fails
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post(
      "/repos/dprothero/testing-ground/issues/1/comments",
      (postData) =>
        postData.body.includes(fakeMarkdownItem1) &&
        postData.body.includes(fakeMarkdownItem2)
    )
    .reply(422, commentResponseTooBig.payload, commentResponseTooBig.headers);

  // Now we should get two separate requests, one for each comment
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post(
      "/repos/dprothero/testing-ground/issues/1/comments",
      (postData) =>
        postData.body.includes(fakeMarkdownItem1) &&
        !postData.body.includes(fakeMarkdownItem2)
    )
    .reply(201, commentResponse.payload, commentResponse.headers);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post(
      "/repos/dprothero/testing-ground/issues/1/comments",
      (postData) =>
        !postData.body.includes(fakeMarkdownItem1) &&
        postData.body.includes(fakeMarkdownItem2)
    )
    .reply(201, commentResponse.payload, commentResponse.headers);

  if (githubReporter.complete)
    await githubReporter.complete(f.fakeOptions, f.fakeStats);

  expect(nock.isDone()).toBeTruthy();
});

test("one comment too large for github", async () => {
  f.fakeOptions["max-pr-suggestions"] = 0;
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/issues/1/comments", (postData) =>
      postData.body.includes(MARKDOWN_RESPONSE)
    )
    .reply(422, commentResponseTooBig.payload, commentResponseTooBig.headers);

  let message = "";
  if (githubReporter.complete) {
    try {
      await githubReporter.complete(f.fakeOptions, f.fakeStats);
    } catch (err) {
      message = (err as any).message;
    }
  }
  expect(message).toEqual("The comment is too long for GitHub.");

  expect(nock.isDone()).toBeTruthy();
});

test("other github error posting comment", async () => {
  f.fakeOptions["max-pr-suggestions"] = 0;
  await githubReporter.issue(f.fakeItem, f.fakeOptions, f.fakeStats);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .post("/repos/dprothero/testing-ground/issues/1/comments", (postData) =>
      postData.body.includes(MARKDOWN_RESPONSE)
    )
    .reply(
      422,
      {
        ...commentResponseTooBig.payload,
        errors: [
          {
            message: "Something else bad happened",
          },
        ],
      },
      commentResponseTooBig.headers
    );

  let message = "";
  if (githubReporter.complete) {
    try {
      await githubReporter.complete(f.fakeOptions, f.fakeStats);
    } catch (err) {
      message = (err as any).message;
    }
  }
  expect(message.startsWith("Validation Failed")).toBeTruthy();

  expect(nock.isDone()).toBeTruthy();
});

test.run();
