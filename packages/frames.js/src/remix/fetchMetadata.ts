import type { FrameFlattened } from "../types";
import { FRAMES_META_TAGS_HEADER } from "../core";
import type { MetaFunction } from "@remix-run/node";

type Metadata = ReturnType<MetaFunction>;

/**
 * Fetches meta tags from your Frames app that can be used in Remix meta() function.
 *
 * @example
 * import { fetchMetadata } from "frames.js/remix";
 *
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   return {
 *     metaTags: await fetchMetadata(new URL('/frames', request.url)),
 *   }
 * }
 *
 * export const meta: MetaFunction<typeof loader> = ({ data }) => {
 *   return [
 *    { title: 'My title' },
 *    ...data.metaTags,
 *   ];
 * };
 *
 * @param url Full URL of your Frames app
 */
export async function fetchMetadata(url: URL | string): Promise<Metadata> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      // we use Accept header to get the response in JSON format, this is automatically supported by frames.js renderResponse middleware
      Accept: FRAMES_META_TAGS_HEADER,
    },
  });

  if (response.ok) {
    // process the JSON value to nextjs compatible format
    const flattenedFrame: FrameFlattened = await response.json();

    // convert to remix compatible shape
    return Object.entries(flattenedFrame).map(([key, value]) => {
      return {
        name: key,
        content: value,
      };
    });
  }

  throw new Error(
    `Failed to fetch frames metadata from ${url}. The server returned ${response.status} ${response.statusText} response.`
  );
}
