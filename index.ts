import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadFiles } from "./lib/files.js";
import {
  loadCustomDict,
  createFetchRequest,
} from "./lib/languageToolClient.js";
import { generateReport, reporters } from "./lib/report.js";
import {
  ProgramOptions,
  LanguageToolResult,
  ReportStats,
  FileWithDiffInfo,
} from "./lib/types.js";
import { convertMarkdownToAnnotated } from "./lib/markdownToAnnotated.js";
import { getFilesFromPr } from "./lib/githubReporter.js";

const parser = yargs(hideBin(process.argv))
  .usage("Usage: $0 [options] [<file1> <file2> ... <fileN>]")
  .options({
    githubpr: {
      type: "string",
      default: "",
      nargs: 1,
      describe:
        "URL to a GitHub PR to add comments to. Requires GITHUB_TOKEN environment variable.",
    },
    "pr-diff-only": {
      type: "boolean",
      default: false,
      describe: "Only report issues on lines that are part of the PR's diff.",
    },
    "max-pr-suggestions": {
      type: "number",
      default: 5,
      describe:
        "Maximum number of PR suggestion comments to add to a PR. (Too many gets unwieldy.)",
    },
    "custom-dict-file": {
      type: "string",
      default: "",
      describe: "A file containing a list of custom dictionary words.",
    },
  })
  .help("h")
  .alias("h", "help");

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

async function run() {
  const options = (await parser.argv) as ProgramOptions;
  options.customDict = await loadCustomDict(options["custom-dict-file"]);

  let filePathsToCheck: Array<string | FileWithDiffInfo> = options._;
  if (options.githubpr) {
    filePathsToCheck = [
      ...filePathsToCheck,
      ...(await getFilesFromPr(options.githubpr)),
    ];
  }
  const files = await loadFiles(filePathsToCheck);
  const annotatedItems = files.map((file) => ({
    ...file,
    annotatedText: convertMarkdownToAnnotated(file.contents),
  }));

  const responses = await Promise.all(annotatedItems.map(createFetchRequest));
  const results = await Promise.all(responses.map((r) => r.json()));
  const correlatedResults: LanguageToolResult[] = results.map((r: any, i) => {
    return {
      ...annotatedItems[i],
      matches: r.matches,
    };
  });

  const reporter = options.githubpr ? reporters.githubpr : reporters.markdown;
  const stats = new ReportStats();

  for (const result of correlatedResults) {
    await generateReport(result, reporter, options, stats);
  }

  if (reporter.complete) {
    await reporter.complete(options, stats);
  }
}
