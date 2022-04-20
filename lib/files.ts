import { readFile } from "fs/promises";
import { LoadFileResponse, FileWithDiffInfo } from "./types.js";

function loadFile(
  pathItem: string | FileWithDiffInfo
): Promise<LoadFileResponse | null> {
  const path = typeof pathItem === "string" ? pathItem : pathItem.filename;
  const changedLines =
    typeof pathItem === "string" ? undefined : pathItem.changedLines;

  return new Promise((resolve) => {
    readFile(path, { encoding: "utf-8" })
      .then((contents) => {
        resolve({ contents, path, changedLines });
      })
      .catch(() => resolve(null));
  });
}

export async function loadFiles(paths: Array<string | FileWithDiffInfo>) {
  const responses = await Promise.all(paths.map((path) => loadFile(path)));
  return responses
    .filter((response) => !!response)
    .map((response) => response as LoadFileResponse);
}
