import { FRAMES_META_TAGS_HEADER } from "@frames.js/core";
import { Metadata } from "next";

/**
 * Fetches meta tags from your Frames app that can be used in Next.js generateMetadata() function.
 *
 * @example
 * import type { Metadata } from "next";
 * import { fetchMetadata } from "@frames.js/next";
 *
 * export async function generateMetadata(): Promise<Metadata> {
 *  return {
 *   title: "New api example",
 *   description: "This is a new api example",
 *   other: {
 *     ...(await fetchMetadata(
 *       new URL(
 *        "/examples/new-api/frames",
 *        process.env.VERCEL_URL || "http://localhost:3000"
 *       )),
 *     ),
 *   },
 * };
 *
 * @param url Full URL of your Frames app
 */
export async function fetchMetadata(
  url: URL | string
): Promise<NonNullable<Metadata["other"]>> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      // we use Accept header to get the response in JSON format, this is automatically supported by frames.js renderResponse middleware
      Accept: FRAMES_META_TAGS_HEADER,
    },
  });

  if (response.ok) {
    // process the JSON value to nextjs compatible format
    const flattenedFrame: Record<string, string> = await response.json();

    return flattenedFrame as NonNullable<Metadata["other"]>;
  }

  throw new Error(
    `Failed to fetch frames metadata from ${url}. The server returned ${response.status} ${response.statusText} response.`
  );
}
