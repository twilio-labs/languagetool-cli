import fs from "fs";
import { suite } from "uvu";
import expect from "expect";
import { convertMarkdownToAnnotated } from "../lib/markdownToAnnotated.js";
import { getMarkdownFixturePath } from "./testUtilities.js";

const test = suite("markdownToAnnotated");

test("properly annotate Markdown for language checking", () => {
  const path = getMarkdownFixturePath("react");
  const markdown = fs.readFileSync(path, { encoding: "utf-8" });

  const annotatedText = convertMarkdownToAnnotated(markdown);

  // Check the heading 1 tag
  expect(annotatedText.annotation[0].interpretAs).toEqual("");
  expect(annotatedText.annotation[0].markup).toEqual("# ");
  expect(annotatedText.annotation[1].text).toEqual(
    "Auras contra labori fit rupit et lateri"
  );

  // Check that the import statement is treated as markup
  expect(annotatedText.annotation[3].markup).toEqual(
    'import Partial from "./1.md";'
  );

  // Check the React component is treated as markup
  expect(annotatedText.annotation[6].markup).toContain("<Partial/>");

  expect(annotatedText.annotation[7].markup).toEqual(
    'import { Do, Dont } from "@site/src/components/Instruction";'
  );

  expect(annotatedText.annotation[9].text).toEqual(
    "Lorem markdownum hostibus Hesioneque in eque septem pressum? Per et dubium mihi\n" +
      "gladio, matrisque fata querellis adest?"
  );
});

test.run();
