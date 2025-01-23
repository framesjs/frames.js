import {
  type domainManifestSchema,
  type FrameEmbedNext,
} from "@farcaster/frame-core";
import type { PartialDeep } from "type-fest";
import type { z } from "zod";

export type FarcasterManifest = z.infer<typeof domainManifestSchema>;

export type Frame = FrameEmbedNext;

export type PartialFarcasterManifest = PartialDeep<FarcasterManifest>;

export type VerifyAppKeyFunctionResult =
  | {
      readonly valid: false;
    }
  | {
      readonly valid: true;
      readonly appFid: number;
    };

export type VerifyAppKeyFunction = (
  fid: number,
  appKey: string
) => Promise<VerifyAppKeyFunctionResult>;

export type SignMessageFunction = (message: string) => Promise<`0x${string}`>;
