import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadFiles } from "./lib/files.js";
import { createFetchRequest } from "./lib/languageToolClient.js";
import { generateReport, reporters } from "./lib/report.js";
import { LanguageToolResult } from "./lib/types.js";
import { convertMarkdownToAnnotated } from "./lib/markdownToAnnotated.js";
import { getFilesFromPr } from "./lib/githubReporter.js";

const parser = yargs(hideBin(process.argv))
  .usage("Usage: $0 [options] <file1> [<file2> ... <fileN>]")
  .options({
    githubactions: {
      type: "boolean",
      default: false,
      describe: "Use GitHub Actions report format.",
    },
    githubpr: {
      type: "string",
      default: "",
      nargs: 1,
      describe:
        "URL to a GitHub PR to add comments to. Requires GITHUB_TOKEN environment variable.",
    },
  })
  .help("h")
  .alias("h", "help");

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

async function run() {
  const argv = await parser.argv;
  const gitHubActionsOutput = argv.githubactions;

  let filePathsToCheck = argv._ as string[];
  if (argv.githubpr) {
    filePathsToCheck = [
      ...filePathsToCheck,
      ...(await getFilesFromPr(argv.githubpr)),
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

  const reporter = gitHubActionsOutput
    ? reporters.githubactions
    : argv.githubpr
    ? reporters.githubpr
    : reporters.markdown;

  for (const result of correlatedResults) {
    await generateReport(result, reporter);
  }

  if (reporter.complete) {
    await reporter.complete();
  }
}
