import { ActionMetadata, ParsingReport } from "frames.js";

export type ActionMetadataFull = ActionMetadata & {
  url?: string;
};

export type ParseActionResult =
  | {
      status: "success";
      action: ActionMetadataFull;
      /**
       * Reports contain only warnings that should not have any impact on the frame's functionality.
       */
      reports: Record<string, ParsingReport[]>;
    }
  | {
      status: "failure";
      action: Partial<ActionMetadataFull>;
      /**
       * Reports contain warnings and errors that should be addressed before the frame can be used.
       */
      reports: Record<string, ParsingReport[]>;
    };
