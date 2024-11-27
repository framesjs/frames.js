import type { PartialDeep } from "type-fest";
import type { Frame, FrameV2 } from "../types";

export type SupportedParsingSpecification =
  | "farcaster"
  | "farcaster_v2"
  | "openframes";

export interface Reporter {
  error: (key: string, message: unknown, source?: ParsingReportSource) => void;
  /**
   * Report a warning. Warning can't be used in case the frame is invalid and not renderable.
   */
  warn: (key: string, message: unknown, source?: ParsingReportSource) => void;
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
  title?: string;
};

export type ParsedFrameV2 = PartialDeep<FrameV2>;

export type ParsingReportSource = SupportedParsingSpecification;

export type ParsingReportLevel = "error" | "warning";

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
      specification: "farcaster" | "openframes";
    }
  | {
      status: "failure";
      frame: Partial<Frame>;
      /**
       * Reports contain warnings and errors that should be addressed before the frame can be used.
       */
      reports: Record<string, ParsingReport[]>;
      specification: "farcaster" | "openframes";
    };

export type ParseResultFramesV2 =
  | {
      status: "success";
      frame: FrameV2;
      /**
       * Reports contain only warnings that should not have any impact on the frame's functionality.
       */
      reports: Record<string, ParsingReport[]>;
      specification: "farcaster_v2";
    }
  | {
      status: "failure";
      frame: PartialDeep<FrameV2>;
      /**
       * Reports contain warnings and errors that should be addressed before the frame can be used.
       */
      reports: Record<string, ParsingReport[]>;
      specification: "farcaster_v2";
    };

export type ParsedFrameworkDetails = {
  framesVersion?: string;
  framesDebugInfo?: {
    /**
     * Image URL of debug image.
     */
    image?: string;
  };
};

export type ParseResultWithFrameworkDetails = (
  | ParseResult
  | ParseResultFramesV2
) &
  ParsedFrameworkDetails;

export type ParseFramesWithReportsResult = {
  farcaster: ParseResultWithFrameworkDetails;
  farcaster_v2: ParseResultFramesV2;
  openframes: ParseResultWithFrameworkDetails;
};
