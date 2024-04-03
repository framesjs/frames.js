import type { FrameRedirect } from "./types";

/**
 * Creates a redirect with 302 as default status
 */
export function redirect(
  /**
   * Fully qualified URL to redirect to
   */
  location: string | URL,
  responseInit?: ResponseInit
): FrameRedirect {
  return {
    kind: "redirect",
    location,
    ...responseInit,
  };
}
