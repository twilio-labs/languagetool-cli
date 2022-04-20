import { suite } from "uvu";
import expect from "expect";
import { getChangedLineNumbersFromPatch } from "../lib/parseGitPatch.js";
import { getPatchFixture } from "./testUtilities.js";

const test = suite("getChangedLineNumbersFromPatch");

test("basic patch parsing", () => {
  const patch = getPatchFixture();
  const results = getChangedLineNumbersFromPatch(patch);
  expect(results).toEqual([50, 53, 56]);
});

test("patch with multiple sections", () => {
  const patch = getPatchFixture("2");
  const results = getChangedLineNumbersFromPatch(patch);
  expect(results).toEqual([10, 68]);
});

test("patch with bulleted list", () => {
  const patch = getPatchFixture("3");
  const results = getChangedLineNumbersFromPatch(patch);
  expect(results).toEqual([260, 267]);
});

test("blank input", () => {
  const results = getChangedLineNumbersFromPatch("");
  expect(results).toEqual([]);
});

test("invalid input", () => {
  const results = getChangedLineNumbersFromPatch("@@ ");
  expect(results).toEqual([]);
});

test.run();
