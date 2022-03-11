import { readFile } from "fs/promises";
import { LoadFileResponse } from "./types.js";

function loadFile(path: string): Promise<LoadFileResponse | null> {
  return new Promise((resolve) => {
    readFile(path, { encoding: "utf-8" })
      .then((contents) => {
        resolve({ contents, path });
      })
      .catch(() => resolve(null));
  });
}

export async function loadFiles(paths: string[]) {
  const responses = await Promise.all(paths.map((path) => loadFile(path)));
  return responses
    .filter((response) => !!response)
    .map((response) => response as LoadFileResponse);
}
