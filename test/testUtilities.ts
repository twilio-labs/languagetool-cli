import path from "path";

export function getMarkdownFixturePath(name: string = "1"): string {
  return path.resolve(__dirname, "fixtures", "markdown", name + ".md");
}
