import { FrameActionDataParsedAndHubContext } from "frames.js";
import { FrameState, PreviousFrame } from "frames.js/next/types";
import { Hex } from "viem";

export interface Session {
  address?: Hex;
  transactionId?: string;
  transactionHash?: string;
  checks?: number;
  retries?: number;
}

export type FramePageProps = {
  state: State;
  previousFrame: PreviousFrame<State>;
  postUrl: string;
  frameMessage: FrameActionDataParsedAndHubContext;
  pathname: string;
};

export type Page =
  | "initial"
  | "start"
  | "select-address"
  | "confirm"
  | "relay"
  | "check";

export type State = FrameState & { page: Page };
