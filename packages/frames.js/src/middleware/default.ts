import { farcaster } from "./farcaster";
import { framesjsMiddleware } from "./framesjsMiddleware";
import { imagesWorkerMiddleware } from "./images-worker";
import { renderResponse } from "./renderResponse";

export const coreMiddleware = [
  renderResponse(),
  imagesWorkerMiddleware(),
  framesjsMiddleware(),
  farcaster(),
] as const;

export type CoreMiddleware = typeof coreMiddleware;
