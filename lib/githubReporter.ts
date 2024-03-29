import { Octokit } from "octokit";
import { OctokitOptions } from "@octokit/core/dist-types/types";
import { snooze, SnoozeFunc } from "./snooze.js";
import {
  ProgramOptions,
  Reporter,
  ReporterItem,
  ReportStats,
  FileWithDiffInfo,
} from "./types.js";
import { markdownReporter, MARKDOWN_ITEM_COUNTER } from "./markdownReporter.js";
import { getChangedLineNumbersFromPatch } from "./parseGitPatch.js";

let snoozeFunc = snooze;

export const PR_COMMENT_COUNTER = "PR Comments";
export const MAGIC_MARKER = "<!-- languagetool-cli -->";

interface GitHubPr {
  host: string;
  owner: string;
  repo: string;
  pull_number: number;
}

function parsePrUrl(prUrlString: string): GitHubPr {
  const urlParse =
    /^https:\/\/(?<host>.*?)\/(?<owner>.*?)\/(?<repo>.*?)\/pull\/(?<pull_number>\d*)$/.exec(
      prUrlString
    );

  return {
    host: urlParse?.groups?.host as string,
    owner: urlParse?.groups?.owner as string,
    repo: urlParse?.groups?.repo as string,
    pull_number: parseInt(urlParse?.groups?.pull_number as string),
  };
}

function getOctokit(host: string): Octokit {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error(
      "No GITHUB_TOKEN environment variable specified. Cannot report to GitHub."
    );
  }

  const octokitOptions: OctokitOptions = { auth: process.env.GITHUB_TOKEN };
  if (host !== "github.com") {
    octokitOptions.baseUrl = "https://" + host + "/api/v3";
  }

  return new Octokit(octokitOptions);
}

let pr: GitHubPr;
let octokit: Octokit;
let prSha: string;
let prGeneralComments: string[] = [];
let reviewCommentApiCounter: number = 0;

export async function initializeOctokit(
  prUrlString: string,
  overrideSnooze?: SnoozeFunc
): Promise<void> {
  pr = parsePrUrl(prUrlString);
  const { owner, repo, pull_number } = pr;
  octokit = getOctokit(pr.host);

  const prResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });
  prSha = prResponse.data.head.sha;
  prGeneralComments = [];
  reviewCommentApiCounter = 0;
  snoozeFunc = overrideSnooze ?? snooze;
}

export async function getFilesFromPr(
  prUrlString: string
): Promise<FileWithDiffInfo[]> {
  await initializeOctokit(prUrlString);
  const { owner, repo, pull_number } = pr;

  // Remove old comments
  const deletePromises: Promise<any>[] = [];
  const generalComments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pull_number,
  });

  for (const comment of generalComments.data.filter((c) =>
    c.body?.includes(MAGIC_MARKER)
  )) {
    deletePromises.push(
      octokit.rest.issues.deleteComment({ owner, repo, comment_id: comment.id })
    );
  }

  const reviewComments = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number,
  });

  for (const comment of reviewComments.data.filter((c) =>
    c.body?.includes(MAGIC_MARKER)
  )) {
    deletePromises.push(
      octokit.rest.pulls.deleteReviewComment({
        owner,
        repo,
        comment_id: comment.id,
      })
    );
  }

  await Promise.all(deletePromises);

  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });

  return response.data
    .filter(
      (f) =>
        !["renamed", "removed", "unchanged"].includes(f.status) &&
        (f.filename.toLowerCase().endsWith("md") ||
          f.filename.toLowerCase().endsWith("mdx"))
    )
    .map((f) => ({
      filename: f.filename,
      changedLines: getChangedLineNumbersFromPatch(f.patch as string),
    }));
}

async function addCommentToPr(
  item: ReporterItem,
  options: ProgramOptions,
  stats: ReportStats
) {
  const counterPassed =
    stats.getCounter(PR_COMMENT_COUNTER) >= options["max-pr-suggestions"];
  const changeIsInDiff = item.result.changedLines?.includes(item.line);

  if (counterPassed || !changeIsInDiff) {
    if (changeIsInDiff || !options["pr-diff-only"]) {
      prGeneralComments.push(
        markdownReporter.issue(item, options, stats) as string
      );
    }
    return;
  }

  reviewCommentApiCounter++;
  if (reviewCommentApiCounter > 1) {
    // GitHub recommends 1s between review comment calls
    await snoozeFunc(1000);
  }

  const md: string[] = [];
  md.push(MAGIC_MARKER);
  md.push(`${item.message} \`${item.contextHighlighted}\``);
  md.push("");
  if (item.suggestedLine) {
    md.push("```suggestion");
    md.push(item.suggestedLine);
    md.push("```");
    md.push("");
    if (item.replacements.length > 1) {
      md.push(
        "\n**Other suggestion(s):** " +
          item.replacements
            .slice(1)
            .map((r) => "`" + r + "`")
            .join(", ")
      );
    }
  } else if (item.match.rule.issueType === "misspelling") {
    md.push(
      "If this is code (like a variable name), try surrounding it with \\`backticks\\`."
    );
  }

  try {
    await octokit.rest.pulls.createReviewComment({
      owner: pr.owner,
      repo: pr.repo,
      pull_number: pr.pull_number,
      path: item.result.path,
      side: "RIGHT",
      line: item.line,
      commit_id: prSha,
      body: md.join("\n"),
    });
    stats.incrementCounter(PR_COMMENT_COUNTER);
  } catch (err: any) {
    if (
      err.message.includes(
        "pull_request_review_thread.line must be part of the diff"
      )
    ) {
      if (!options["pr-diff-only"]) {
        prGeneralComments.push(
          markdownReporter.issue(item, options, stats) as string
        );
      }
    } else throw err;
  }
}

function fillCommentTemplate(vars: {
  numItems: number;
  additional: string;
  comment: string;
}) {
  const templateString = `${MAGIC_MARKER}
<details>
<summary><h3>\${this.numItems} \${this.additional}grammar issues found (click to expand)</h3></summary>

\${this.comment}
</details>`;
  return new Function("return `" + templateString + "`;").call(vars);
}

export const githubReporter: Reporter = {
  noIssues: (result, options, stats) => {
    prGeneralComments.push(
      markdownReporter.noIssues(result, options, stats) as string
    );
    return "";
  },
  issue: addCommentToPr,
  complete: async (options, stats) => {
    if (!prGeneralComments.length) return;

    const totalMarkdownItems = stats.getCounter(MARKDOWN_ITEM_COUNTER);
    const additional =
      totalMarkdownItems < stats.sumAllCounters() ? "additional " : "";

    await attemptCreateComment(
      totalMarkdownItems,
      additional,
      prGeneralComments
    );
  },
};

async function attemptCreateComment(
  numItems: number,
  additional: string,
  comments: string[]
) {
  const result = await createComment(numItems, additional, comments.join("\n"));
  if (result === "too_long") {
    if (comments.length < 2) {
      throw new Error("The comment is too long for GitHub.");
    }
    const half = Math.ceil(comments.length / 2);
    const firstHalf = comments.slice(0, half);
    const secondHalf = comments.slice(-half);
    await attemptCreateComment(firstHalf.length, additional, firstHalf);
    await attemptCreateComment(secondHalf.length, "additional ", secondHalf);
  }
}

async function createComment(
  numItems: number,
  additional: string,
  comment: string
): Promise<string> {
  try {
    await octokit.rest.issues.createComment({
      owner: pr.owner,
      repo: pr.repo,
      issue_number: pr.pull_number,
      body: fillCommentTemplate({
        numItems,
        additional,
        comment,
      }),
    });
  } catch (err) {
    const message = (err as any)?.response?.data?.errors?.[0]?.message;
    if (message.startsWith("Body is too long")) {
      return "too_long";
    }
    throw err;
  }
  return "ok";
}
