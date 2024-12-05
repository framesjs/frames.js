import type { PartialDeep } from "type-fest";
import type { Frame, FrameV2 } from "../types";
import type {
  FarcasterManifest,
  PartialFarcasterManifest,
} from "../farcaster-v2/types";

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

export type ParseResultFramesV1Success = {
  status: "success";
  frame: Frame;
  /**
   * Reports contain only warnings that should not have any impact on the frame's functionality.
   */
  reports: Record<string, ParsingReport[]>;
  specification: "farcaster" | "openframes";
};

export type ParseResultFramesV1Failure = {
  status: "failure";
  frame: Partial<Frame>;
  /**
   * Reports contain warnings and errors that should be addressed before the frame can be used.
   */
  reports: Record<string, ParsingReport[]>;
  specification: "farcaster" | "openframes";
};

export type ParseResult =
  | ParseResultFramesV1Success
  | ParseResultFramesV1Failure;

export type ParseResultFramesV2FrameManifestSuccess = {
  status: "success";
  manifest: FarcasterManifest;
  reports: Record<string, ParsingReport[]>;
};

export type ParseResultFramesV2FrameManifestFailure = {
  status: "failure";
  manifest: PartialFarcasterManifest;
  reports: Record<string, ParsingReport[]>;
};

export type ParseResultFramesV2FrameManifest =
  | ParseResultFramesV2FrameManifestSuccess
  | ParseResultFramesV2FrameManifestFailure;

export type ParseResultFramesV2Success = {
  status: "success";
  frame: FrameV2;
  /**
   * Reports contain only warnings that should not have any impact on the frame's functionality.
   */
  reports: Record<string, ParsingReport[]>;
  specification: "farcaster_v2";
  /**
   * Manifest parsing result, available only if parseManifest option is enabled.
   */
  manifest?: ParseResultFramesV2FrameManifest;
};

export type ParseResultFramesV2Failure = {
  status: "failure";
  frame: PartialDeep<FrameV2>;
  /**
   * Reports contain warnings and errors that should be addressed before the frame can be used.
   */
  reports: Record<string, ParsingReport[]>;
  specification: "farcaster_v2";
  /**
   * Manifest parsing result, available only if parseManifest option is enabled.
   */
  manifest?: ParseResultFramesV2FrameManifest;
};

export type ParseResultFramesV2 =
  | ParseResultFramesV2Success
  | ParseResultFramesV2Failure;

export type ParsedFrameworkDetails = {
  framesVersion?: string;
  framesDebugInfo?: {
    /**
     * Image URL of debug image.
     */
    image?: string;
  };
};

export type ParseFramesV1SuccessResultWithFrameworkDetails =
  ParseResultFramesV1Success & ParsedFrameworkDetails;
export type ParseFramesV1FailureResultWithFrameworkDetails =
  ParseResultFramesV1Failure & ParsedFrameworkDetails;

export type ParseResultWithFrameworkDetails =
  | ParseFramesV1SuccessResultWithFrameworkDetails
  | ParseFramesV1FailureResultWithFrameworkDetails;

export type ParseFramesV2SuccessResultWithFrameworkDetails =
  ParseResultFramesV2Success & ParsedFrameworkDetails;
export type ParseFramesV2FailureResultWithFrameworkDetails =
  ParseResultFramesV2Failure & ParsedFrameworkDetails;

export type ParseFramesV2ResultWithFrameworkDetails =
  | ParseFramesV2SuccessResultWithFrameworkDetails
  | ParseFramesV2FailureResultWithFrameworkDetails;

export type ParseFramesWithReportsResult = {
  farcaster: ParseResultWithFrameworkDetails;
  farcaster_v2: ParseFramesV2ResultWithFrameworkDetails;
  openframes: ParseResultWithFrameworkDetails;
};
