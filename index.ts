import * as builder from "annotatedtext-remark";
import ora from "ora";
import { loadFiles } from "./lib/files.js";
import { createFetchRequest } from "./lib/languageToolClient.js";
import { generateReport, reporters } from "./lib/report.js";
import { LanguageToolResult } from "./lib/types.js";

const spinner = ora("Processing...\n").start();
run()
  .then(() => {
    spinner.succeed("Done!");
  })
  .catch((err) => {
    spinner.fail("Error:");
    console.error(err.message);
  });

async function run() {
  let nArgOffset = 2;
  let gitHubActionsOutput = false;

  if (process.argv[nArgOffset].toLowerCase() === "--githubactions") {
    nArgOffset++;
    gitHubActionsOutput = true;
  }

  const files = await loadFiles(process.argv.slice(2));
  const annotatedItems = files.map((file) => ({
    file,
    annotatedText: builder.build(file.contents, undefined),
  }));

  const responses = await Promise.all(annotatedItems.map(createFetchRequest));
  const results = await Promise.all(responses.map((r) => r.json()));
  const correlatedResults: LanguageToolResult[] = results.map((r: any, i) => {
    return {
      path: annotatedItems[i].file.path,
      contents: annotatedItems[i].file.contents,
      matches: r.matches,
    };
  });

  correlatedResults.forEach((result) => {
    generateReport(
      result,
      gitHubActionsOutput ? reporters.githubactions : reporters.markdown
    );
  });
}
