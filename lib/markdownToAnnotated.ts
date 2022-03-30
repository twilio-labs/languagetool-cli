import * as builder from "annotatedtext-remark";

const builderOptions = builder.defaults;

export function convertMarkdownToAnnotated(markdownText: string) {
  return builder.build(markdownText, builderOptions);
}
