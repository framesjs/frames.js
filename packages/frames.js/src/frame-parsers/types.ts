import type { Frame } from "../types";

export interface Reporter {
  error: (key: string, message: unknown, source?: ParsingReportSource) => void;
  warn: (key: string, message: unknown, source?: ParsingReportSource) => void;
  hasReports: () => boolean;
  toObject: () => Record<string, ParsingReport[]>;
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

export type ParsingReportSource = "farcaster" | "openframes";

export type ParsingReportLevel = "error" | "warning";

export type ParsingReport = {
  message: string;
  source: ParsingReportSource;
  level: ParsingReportLevel;
};

export type ParseResult =
  | {
      frame: Frame;
    }
  | {
      frame: Partial<Frame>;
      reports: Record<string, ParsingReport[]>;
    };
