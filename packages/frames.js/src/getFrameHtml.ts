import { DEFAULT_FRAME_TITLE } from "./constants";
import type { ParsedFrameV2 } from "./frame-parsers";
import { getFrameFlattened, getFrameV2Flattened } from "./getFrameFlattened";
import type { Frame, FrameFlattened, FrameV2Flattened } from "./types";
import { escapeHtmlAttributeValue } from "./utils";

export interface GetFrameHtmlOptions {
  /** value for the OG "og:title" html tag*/
  og?: { title: string };
  /** the <title> of the page */
  title?: string;
  /** Additional string to include in the <body> of the html string */
  htmlBody?: string;
  /** Additional string to include in the <head> of the html string */
  htmlHead?: string;
}

/**
 * Turns a `Frame` into a complete HTML document string.
 * Generates a valid HTML page with proper meta tags for frame rendering.
 *
 * @param frame - The Frame to turn into HTML
 * @param options - Additional options to customize the HTML output
 * @param options.og - OpenGraph title configuration
 * @param options.title - Custom page title
 * @param options.htmlBody - Additional content for the body tag
 * @param options.htmlHead - Additional content for the head tag
 * @returns A complete HTML document string
 */
export function getFrameHtml(
  frame: Frame,
  options: GetFrameHtmlOptions = {}
): string {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <title>${options.title ?? frame.title ?? DEFAULT_FRAME_TITLE}</title>
      ${frame.title ?? options.og?.title
      ? `<meta property="og:title" content="${frame.title ?? options.og?.title}"/>`
      : ""
    }
      ${getFrameHtmlHead(frame)}
      ${options.htmlHead || ""}
    </head>
    <body>${options.htmlBody ? options.htmlBody : ""}</body>
  </html>`;
  return html;
}

/**
 * Formats a `Frame` ready to be included in a <head> of an html string
 * @param frame - The `Frame` to get the <head> contents for
 * @param overrides - Optional overrides to apply to the frame
 * @returns an string with tags to be included in a <head>
 */
export function getFrameHtmlHead(
  frame: Partial<Frame>,
  overrides?: Partial<FrameFlattened>
): string {
  const flattened = getFrameFlattened(frame, overrides);

  const tags = Object.entries(flattened)
    .map(([key, value]) => {
      return value
        ? `<meta name="${key}" content="${escapeHtmlAttributeValue(value)}"/>`
        : null;
    })
    .filter(Boolean) as string[];

  if (frame.title) {
    tags.push(`<title>${escapeHtmlAttributeValue(frame.title)}</title>`);
  }

  return tags.join("");
}

/**
 * Formats a Frame v2 ready to be included in a <head> of an html string
 */
export function getFrameV2HtmlHead(
  frame: ParsedFrameV2,
  overrides?: Partial<FrameV2Flattened>
): string {
  const flattened = getFrameV2Flattened(frame, overrides);

  const tagStrings = Object.entries(flattened)
    .map(([key, value]) => {
      return value
        ? `<meta name="${key}" content="${escapeHtmlAttributeValue(value)}"/>`
        : null;
    })
    .filter(Boolean) as string[];

  return tagStrings.join("");
}
