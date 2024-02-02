import { Frame } from "./types";

export function getFrameHtml(
  frame: Frame,
  options: {
    og?: { title: string };
    title?: string;
    htmlBody?: string;
    htmlHead?: string;
  } = {}
): string {
  options = options || {};

  const html = `<!DOCTYPE html>
  <html>
    <head>
      ${options.title ? `<title>${options.title}</title>` : ""}
      ${options.og?.title ? `<meta property="og:title" content="${options.og.title}">` : ""}
      ${getFrameHtmlHead(frame)}
      ${options.htmlHead || ""}
    </head>
    <body>${options.htmlBody}</body>
  </html>`;
  return html;
}
export function getFrameHtmlHead(frame: Frame): string {
  return `<meta property="og:image" content="${frame.ogImage || frame.image}">
  <meta name="fc:frame" content="vNext">
  <meta name="fc:frame:image" content="${frame.image}">
  <meta name="fc:frame:post_url" content="${frame.postUrl}">
  ${
    frame.buttons
      ?.map(
        (
          button,
          index
        ) => `<meta name="fc:frame:button:${index + 1}" content="${button.label}">
        <meta name="fc:frame:button:${index + 1}:action" content="${button.action}">`
      )
      .join("\n") || ""
  }
  `;
}
