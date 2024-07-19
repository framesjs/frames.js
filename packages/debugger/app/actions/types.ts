import type { ParsingReport } from "frames.js";
import type {
  CastActionResponse,
  ComposerActionResponse,
} from "frames.js/types";

export type ParseActionResult =
  | {
      status: "success";
      action: CastActionResponse | ComposerActionResponse;
      /**
       * Reports contain only warnings that should not have any impact on the frame's functionality.
       */
      reports: Record<string, ParsingReport[]>;
    }
  | {
      status: "failure";
      action: Partial<CastActionResponse> | Partial<ComposerActionResponse>;
      /**
       * Reports contain warnings and errors that should be addressed before the frame can be used.
       */
      reports: Record<string, ParsingReport[]>;
    };
