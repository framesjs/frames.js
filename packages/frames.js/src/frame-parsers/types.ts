import type { Frame } from "../types";

export type SupportedParsingSpecification = "farcaster" | "openframes";

export interface Reporter {
  error: (key: string, message: unknown, source?: ParsingReportSource) => void;
  /**
   * Report a warning. Warning can't be used in case the frame is invalid and not renderable.
   */
  warn: (key: string, message: unknown, source?: ParsingReportSource) => void;
  valid: (key: string, message: unknown, source?: ParsingReportSource) => void;
  hasReports: () => boolean;
  hasErrors: () => boolean;
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

export type ParsingReportSource = SupportedParsingSpecification;

export type ParsingReportLevel = "error" | "warning" | "valid";

export type ParsingReport = {
  message: string;
  source: ParsingReportSource;
  level: ParsingReportLevel;
};

export type ParseResult =
  | {
      status: "success";
      frame: Frame;
      /**
       * Reports contain only warnings that should not have any impact on the frame's functionality.
       */
      reports: Record<string, ParsingReport[]>;
    }
  | {
      status: "failure";
      frame: Partial<Frame>;
      /**
       * Reports contain warnings and errors that should be addressed before the frame can be used.
       */
      reports: Record<string, ParsingReport[]>;
    };
