import { FrameMessageError } from "./errors";

/**
 * Throws an error for presentation to the user.
 * @param message - The error message (max 90 characters).
 * @param status - The 4XX HTTP status code to return (default: 400)
 */
export function error(message: string, status = 400): never {
  throw new FrameMessageError(message, status);
}
