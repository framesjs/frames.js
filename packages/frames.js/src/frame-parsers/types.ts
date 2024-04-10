import type { Frame } from "../types";

export interface Reporter {
  error: (key: string, message: unknown, source?: ParsingIssueSource) => void;
  warn: (key: string, message: unknown, source?: ParsingIssueSource) => void;
  hasReports: () => boolean;
  toObject: () => Record<string, ParsingIssue[]>;
}

export type ParsedButton = {
  action?: string;
  label?: string;
  target?: string;
  post_url?: string;
  index: number;
};

export type ParsedFrame = {
  version: string | undefined;
  image: string | undefined;
  ogImage: string | undefined;
  imageAspectRatio: string | undefined;
  inputText: string | undefined;
  postUrl: string | undefined;
  state: string | undefined;
  buttons?: ParsedButton[];
};
// @todo rename to reports
export type ParsingIssueSource = "farcaster" | "openframes";

export type ParsingIssueLevel = "error" | "warning";

export type ParsingIssue = {
  message: string;
  source: ParsingIssueSource;
  level: ParsingIssueLevel;
};

export type ParseResult =
  | {
      frame: Frame;
    }
  | {
      frame: Partial<Frame>;
      reports: Record<string, ParsingIssue[]>;
    };
