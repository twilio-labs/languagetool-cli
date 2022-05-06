export interface ProgramOptions {
  _: string[];
  githubpr: string;
  "pr-diff-only": boolean;
  "custom-dict-file": string;
  "max-pr-suggestions": number;
  "max-replacements": number;
  customDict?: string[];
}

export interface AnnotatedTextItemOffset {
  start: number;
  end: number;
}

export interface AnnotatedTextItem {
  interpretAs?: string;
  markup?: string;
  offset: AnnotatedTextItemOffset;
  text?: string;
}

export interface AnnotatedText {
  annotation: AnnotatedTextItem[];
}

export interface LoadFileResponse {
  contents: string;
  path: string;
  annotatedText?: AnnotatedText;
  changedLines?: number[];
}

export interface LanguageToolReplacement {
  value: string;
}

export interface LanguageToolContext {
  text: string;
  offset: number;
  length: number;
}

export interface LanguageToolType {
  typeName: string;
}

export interface LanguageToolRuleCategory {
  id: string;
  name: string;
}

export interface LanguageToolRule {
  id: string;
  description: string;
  issueType: string;
  category: LanguageToolRuleCategory;
}

export interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  replacements: LanguageToolReplacement[];
  offset: number;
  length: number;
  context: LanguageToolContext;
  sentence: string;
  type: LanguageToolType;
  rule: LanguageToolRule;
  ignoreForIncompleteSentence: boolean;
  contextForSureMatch: number;
}

export interface LanguageToolResult extends LoadFileResponse {
  matches: LanguageToolMatch[];
}

export interface ReporterItem {
  result: LanguageToolResult;
  line: number;
  column: number;
  message: string;
  contextHighlighted: string;
  contextPrefix: string;
  contextPostfix: string;
  replacements: string[];
  suggestedLine: string;
  currentLine: string;
  match: LanguageToolMatch;
}

export class ReportStats {
  private counters: { [key: string]: number } = {};
  incrementCounter(key: string): void {
    this.counters[key] = this.getCounter(key) + 1;
  }
  getCounter(key: string): number {
    return this.counters[key] ?? 0;
  }
  sumAllCounters(): number {
    return Object.keys(this.counters).reduce(
      (sum, key) => sum + this.getCounter(key),
      0
    );
  }
}

export interface Reporter {
  noIssues(
    result: LanguageToolResult,
    options: ProgramOptions,
    stats: ReportStats
  ): string;
  issue(
    item: ReporterItem,
    options: ProgramOptions,
    stats: ReportStats
  ): string | Promise<void>;
  complete?(options: ProgramOptions, stats: ReportStats): Promise<void>;
}

export interface FileWithDiffInfo {
  filename: string;
  changedLines: number[];
}
