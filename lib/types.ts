export interface ProgramOptions {
  _: string[];
  githubpr: string;
  "pr-diff-only": boolean;
  "custom-dict-file": string;
  "max-suggestions": number;
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
  ignored?: boolean;
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
export interface Reporter {
  noIssues(result: LanguageToolResult, options: ProgramOptions): string;
  issue(item: ReporterItem, options: ProgramOptions): string | Promise<void>;
  complete?(
    results: LanguageToolResult[],
    options: ProgramOptions
  ): Promise<void>;
}
