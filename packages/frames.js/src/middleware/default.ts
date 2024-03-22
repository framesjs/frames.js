import { farcaster } from "./farcaster";
import { framesjsMiddleware } from "./framesjsMiddleware";
import { renderResponse } from "./renderResponse";

export const coreMiddleware = [
  renderResponse(),
  framesjsMiddleware(),
  farcaster(),
] as const;

export type CoreMiddleware = typeof coreMiddleware;
