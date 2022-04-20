import { suite } from "uvu";
import expect from "expect";
import nock from "nock";
import { getFilesFromPr } from "../lib/githubReporter.js";
import { getJSONFixture } from "./testUtilities.js";

const test = suite("githubReporter.getFilesFromPr");

test("invoke", async () => {
  const prResponse = getJSONFixture("github_api/get_pr_1.json");
  const issueComments = getJSONFixture("github_api/get_issue_comments.json");
  const prComments = getJSONFixture("github_api/get_pr_comments.json");
  const prFiles = getJSONFixture("github_api/get_pr_files_1.json");

  process.env.GITHUB_TOKEN = "123456";

  // It will fetch the PR
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .get("/repos/dprothero/testing-ground/pulls/1")
    .reply(200, prResponse.payload, prResponse.headers);

  // It will fetch any general comments attached to the PR (we return 1)
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .get("/repos/dprothero/testing-ground/issues/1/comments")
    .reply(200, issueComments.payload, issueComments.headers);

  // It will fetch review comments tied to files in the PR (we return 3)
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .get("/repos/dprothero/testing-ground/pulls/1/comments")
    .reply(200, prComments.payload, prComments.headers);

  // It will delete the 1 general comment
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .delete("/repos/dprothero/testing-ground/issues/comments/1087729616")
    .reply(204, "", prResponse.headers);

  // It will delete the 3 review comments
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .delete("/repos/dprothero/testing-ground/pulls/comments/840963759")
    .reply(204, "", prResponse.headers);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .delete("/repos/dprothero/testing-ground/pulls/comments/840962069")
    .reply(204, "", prResponse.headers);

  nock("https://api.github.com:443", { encodedQueryParams: true })
    .delete("/repos/dprothero/testing-ground/pulls/comments/840961847")
    .reply(204, "", prResponse.headers);

  // Finally it will fetch the list of files modified by the PR
  nock("https://api.github.com:443", { encodedQueryParams: true })
    .get("/repos/dprothero/testing-ground/pulls/1/files")
    .reply(200, prFiles.payload, prFiles.headers);

  const files = await getFilesFromPr(
    "https://github.com/dprothero/testing-ground/pull/1"
  );

  expect(files).toEqual([
    { filename: "README.md", changedLines: [1, 2] },
    { filename: "README.mdx", changedLines: [1, 2] },
  ]);
  expect(nock.isDone()).toBeTruthy();
});

test.run();
