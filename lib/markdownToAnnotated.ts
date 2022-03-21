import * as builder from "annotatedtext-remark";

const builderOptions = builder.defaults;
const original_interpretmarkup = builder.defaults.interpretmarkup;
builderOptions.interpretmarkup = (text = "") => {
  const original = original_interpretmarkup(text);
  if (!original) {
    // interpret `foo` as: foo
    if (/^\`([^\`].*?[^\`])\`$/gm.test(text)) {
      return text.replace(/^\`([^\`].*?[^\`])\`$/gm, "$1");
    }
  }
  return original;
};

export function convertMarkdownToAnnotated(markdownText: string) {
  return builder.build(markdownText, builderOptions);
}
