import * as builder from "annotatedtext-remark";

const builderOptions = builder.defaults;

export function convertMarkdownToAnnotated(markdownText: string) {
  const result = builder.build(markdownText, builderOptions);

  // Remove JSX import statements
  for (const item of result.annotation) {
    const expr = /import\s+?.+?\s+?from\s+?["'].+?["']\s*?;/g;
    if (expr.test(item.text ?? "")) {
      item.interpretAs = "";
      item.markup = item.text;
      delete item.text;
    }
  }

  return result;
}
