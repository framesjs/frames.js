import { getFrameFlattened } from "./getFrameFlattened";
import type { Frame } from "./types";
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
 * Turns a `Frame` into html
 * @param frame - The Frame to turn into html
 * @param options - additional options passs into the html string
 * @returns an html string
 */
export function getFrameHtml(
  frame: Frame,
  options: GetFrameHtmlOptions = {}
): string {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <title>${options.title ?? "frame"}</title>
      ${
        options.og?.title
          ? `<meta property="og:title" content="${options.og.title}"/>`
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
 * @returns an string with tags to be included in a <head>
 */
export function getFrameHtmlHead(frame: Frame): string {
  const flattened = getFrameFlattened(frame);

  const tags = Object.entries(flattened)
    .map(([key, value]) => {
      return value
        ? `<meta name="${key}" content="${escapeHtmlAttributeValue(value)}"/>`
        : null;
    })
    .filter(Boolean) as string[];

  return tags.join("");
}
