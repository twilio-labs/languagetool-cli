import { Agent } from "https";
import fetch, { Response } from "node-fetch";
import { LoadFileResponse } from "./types.js";

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

  const options: any = {
    body: formBody,
    headers: {
      Accepts: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    method: "POST",
  };

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

  const url = process.env.LT_URL ?? "https://api.languagetool.org/v2/check";
  return fetch(url, options);
}
