import { suite } from "uvu";
import expect from "expect";
import { loadFiles } from "../lib/files.js";
import { getMarkdownFixturePath } from "./testUtilities.js";

const test = suite("files.loadFiles");

const markdown1 = getMarkdownFixturePath("1");
const markdown2 = getMarkdownFixturePath("2");
const markdown3 = getMarkdownFixturePath("3");

test("loads three files", async () => {
  const result = await loadFiles([markdown1, markdown2, markdown3]);
  expect(result.length).toEqual(3);

  expect(result[0].path).toEqual(markdown1);
  expect(result[0].contents).toContain(
    "# Gloria viri paratibus deducunt latos et sorores"
  );
  expect(result[0].annotatedText).toBeUndefined();

  expect(result[1].path).toEqual(markdown2);
  expect(result[1].contents).toContain(
    "# Manetque latuisse nescit ora papaver quoque ipso"
  );
  expect(result[1].annotatedText).toBeUndefined();

  expect(result[2].path).toEqual(markdown3);
  expect(result[2].contents).toContain(
    "# Manus signaque tradiderat sonus et Andraemon fraudes"
  );
  expect(result[2].annotatedText).toBeUndefined();
});

test("loads one file, ignores bad path", async () => {
  const result = await loadFiles([
    markdown1,
    getMarkdownFixturePath("doesnotexist"),
  ]);
  expect(result.length).toEqual(1);
  expect(result[0].path).toEqual(markdown1);
});

test.run();
