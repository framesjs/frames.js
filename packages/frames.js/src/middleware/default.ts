import { farcasterHubContext } from "./farcasterHubContext";
import { framesjsMiddleware } from "./framesjsMiddleware";
import { renderResponse } from "./renderResponse";

export const defaultMiddleware = [
  renderResponse(),
  framesjsMiddleware(),
  farcasterHubContext(),
] as const;

export type DefaultMiddleware = typeof defaultMiddleware;
