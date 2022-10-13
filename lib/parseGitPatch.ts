export function getChangedLineNumbersFromPatch(patch: string): number[] {
  const fileLinesRegex = /^@@ -([0-9]*),?\S* \+([0-9]*),?/;
  const lineNumbersInDiff: number[] = [];

  if (!patch) return [];

  splitIntoParts(patch.split("\n"), "@@ ").forEach((lines) => {
    const fileLinesLine = lines.shift() as string;
    const matches = fileLinesLine.match(fileLinesRegex);
    if (!matches) return [];

    const [, a, b] = matches;

    let nA = parseInt(a);
    let nB = parseInt(b);

    lines.forEach((line: string) => {
      if (line.startsWith("+")) {
        nA--;

        lineNumbersInDiff.push(nB);
      } else if (line.startsWith("-")) {
        nB--;
      }

      nA++;
      nB++;
    });
  });

  return lineNumbersInDiff;
}

function splitIntoParts(lines: string[], separator: string) {
  const parts: string[][] = [];
  let currentPart: undefined | string[] = undefined;

  lines.forEach((line) => {
    if (line.startsWith(separator)) {
      if (currentPart) {
        parts.push(currentPart);
      }

      currentPart = [line];
    } else if (currentPart) {
      currentPart.push(line);
    }
  });

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}
