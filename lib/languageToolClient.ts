import { promises as fs } from "fs";
import { Agent } from "https";
import fetch, { RequestInit, Response } from "node-fetch";
import { LoadFileResponse } from "./types.js";

function makeRequest(path: string, options: RequestInit): Promise<Response> {
  if (process.env.LT_CLIENT_KEY) {
    const agentOptions = {
      key: process.env.LT_CLIENT_KEY,
      cert: process.env.LT_CLIENT_CERT,
      ca: process.env.LT_SERVER_CA,
      rejectUnauthorized: true,
      keepAlive: true,
    };
    options.agent = new Agent(agentOptions);
  }

  const url = (process.env.LT_URL ?? "https://api.languagetool.org/v2") + path;
  return fetch(url, options);
}

export async function loadCustomDict(filePath?: string): Promise<string[]> {
  if (filePath) {
    try {
      const words = await fs.readFile(filePath, { encoding: "utf-8" });
      if (words.length) {
        return words
          .split("\n")
          .map((w) => w.trim().toLowerCase())
          .filter((w) => !!w);
      }
    } catch {
      console.error("Could not read custom dict: " + filePath);
    }
  }
  return [];
}

export function createFetchRequest(item: LoadFileResponse): Promise<Response> {
  const params = {
    data: JSON.stringify(item.annotatedText),
    language: "en-US",
    motherTongue: "en-US",
  };

  const formBody = Object.keys(params)
    .map(
      (key) =>
        encodeURIComponent(key) + "=" + encodeURIComponent((params as any)[key])
    )
    .join("&");

  const options: RequestInit = {
    body: formBody,
    headers: {
      Accepts: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    method: "POST",
  };

  return makeRequest("/check", options);
}
