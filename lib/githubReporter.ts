import { Octokit } from "octokit";
import { OctokitOptions } from "@octokit/core/dist-types/types";
import {
  ProgramOptions,
  Reporter,
  ReporterItem,
  ReportStats,
} from "./types.js";
import { markdownReporter, MARKDOWN_ITEM_COUNTER } from "./markdownReporter.js";

const PR_COMMENT_COUNTER = "PR Comments";
const MAGIC_MARKER = "<!-- languagetool-cli -->";

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
let prGeneralComment: string = "";

export async function getFilesFromPr(prUrlString: string): Promise<string[]> {
  pr = parsePrUrl(prUrlString);
  const { host, owner, repo, pull_number } = pr;
  octokit = getOctokit(host);

  const prData = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
  });
  prSha = prData.data.head.sha;

  // Remove old comments
  const generalComments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pull_number,
  });
  const deletePromises: Promise<any>[] = [];
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
    .map((f) => f.filename);
}

async function addCommentToPr(
  item: ReporterItem,
  options: ProgramOptions,
  stats: ReportStats
) {
  if (stats.getCounter(PR_COMMENT_COUNTER) >= options["max-suggestions"]) {
    prGeneralComment += markdownReporter.issue(item, options, stats);
    return;
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
        prGeneralComment += markdownReporter.issue(item, options, stats);
      }
    } else throw err;
  }
}

export const githubReporter: Reporter = {
  noIssues: (result, options, stats) => {
    prGeneralComment += markdownReporter.noIssues(result, options, stats);
    return "";
  },
  issue: addCommentToPr,
  complete: async (options, stats) => {
    if (!prGeneralComment) return;

    const totalMarkdownItems = stats.getCounter(MARKDOWN_ITEM_COUNTER);
    const additional =
      totalMarkdownItems < stats.sumAllCounters() ? "additional " : "";

    await octokit.rest.issues.createComment({
      owner: pr.owner,
      repo: pr.repo,
      issue_number: pr.pull_number,
      body: `${MAGIC_MARKER}
<details>
<summary><h3>${totalMarkdownItems} ${additional}grammar issues found (click to expand)</h3></summary>

${prGeneralComment}
</details>`,
    });
  },
};
