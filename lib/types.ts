export interface LoadFileResponse {
  contents: string;
  path: string;
}

export interface AnnotatedItem {
  file: LoadFileResponse;
  annotatedText: any;
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
