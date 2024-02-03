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
  const html = `<!DOCTYPE html>
  <html>
    <head>
      ${options.title ? `<title>${options.title}</title>` : ""}
      ${options.og?.title ? `<meta property="og:title" content="${options.og.title}"/>` : ""}
      ${getFrameHtmlHead(frame)}
      ${options.htmlHead || ""}
    </head>
    <body>${options.htmlBody ? options.htmlBody : ""}</body>
  </html>`;
  return html;
}
export function getFrameHtmlHead(frame: Frame): string {
  return `<meta name="og:image" content="${frame.ogImage || frame.image}"/>
  <meta name="fc:frame" content="${frame.version}"/>
  <meta name="fc:frame:image" content="${frame.image}"/>
  <meta name="fc:frame:post_url" content="${frame.postUrl}"/>
  ${frame.inputText ? `<meta name="fc:frame:input:text" content="${frame.inputText}"/>` : ""}
  ${
    frame.buttons
      ?.map(
        (
          button,
          index
        ) => `<meta name="fc:frame:button:${index + 1}" content="${button.label}"/>
        ${button.action ? `<meta name="fc:frame:button:${index + 1}:action" content="${button.action}"/>` : ""}`
      )
      .join("\n") || ""
  }
  `;
}
