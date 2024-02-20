import type { FrameActionPayload } from "frames.js"
import type {
    FrameState,
    HeadersList,
    PreviousFrame,
    RedirectMap
} from "frames.js/next/server";

/** deserializes a `PreviousFrame` from url searchParams, fetching headers from request object, @returns PreviousFrame */
export function getPreviousFrame<T extends FrameState = FrameState>(
    request: any,
    searchParams: URLSearchParams | undefined
  ): PreviousFrame<T> {
    const headersObj = request.headers;
    // not sure about the security of doing this for server only headers.
    // const headersList = Object.fromEntries(headers().entries());
    const headersList = {
        userAgent: headersObj["user-agent"],
        acceptLanguage: headersObj["accept-language"],
        host: headersObj["host"],
        pathname: headersObj["next-url"] ?? "",
        urlWithoutPathname: `${headersObj["x-forwarded-proto"] ?? request.protocol}://${headersObj["x-forwarded-host"] ?? headersObj["host"]}`,
        url:
          headersObj["referer"] ||
          `${headersObj["x-forwarded-proto"] ?? request.protocol}://${headersObj["x-forwarded-host"] ?? headersObj["host"]}${headersObj["next-url"] ?? ""}`,
    };

    console.log('SEARCH PARAMS ===> ', searchParams)

    return createPreviousFrame(parseFrameParams<T>(searchParams), headersList);
}

/** @returns PreviousFrame by combining headers and previousFrames from params */
function createPreviousFrame<T extends FrameState = FrameState>(
    previousFrameFromParams: Pick<
      PreviousFrame<T>,
      "postBody" | "prevState" | "pathname" | "prevRedirects"
    >,
    headers: HeadersList
  ): PreviousFrame<T> {
    console.log('...previousFrameFromParams ==> ', {...previousFrameFromParams})
    return {
      ...previousFrameFromParams,
      headers: headers,
    };
}


/** deserializes data stored in the url search params and @returns a Partial PreviousFrame object  */
function parseFrameParams<T extends FrameState = FrameState>(
    searchParams: URLSearchParams | undefined
  ): Pick<
    PreviousFrame<T>,
    "postBody" | "prevState" | "pathname" | "prevRedirects"
  > {

    console.log('parseFrameParams ===> ', searchParams)

    if (searchParams === undefined) {
      return {
        postBody: null,
        prevState: null,
        pathname: undefined,
        prevRedirects: null
      }
    }

    const frameActionReceived =
      searchParams.has("postBody") && typeof searchParams.get("postBody") === "string"
        ? (JSON.parse(String(searchParams.get("postBody"))) as FrameActionPayload)
        : null;
  
    const framePrevState =
      searchParams.has("prevState") && typeof searchParams.get("prevState") === "string"
        ? (JSON.parse(String(searchParams.get("prevState"))) as T)
        : null;
  
    const framePrevRedirects =
      searchParams.has("prevRedirects") &&
      typeof searchParams.get("prevRedirects") === "string"
        ? (JSON.parse(String(searchParams.get("prevRedirects"))) as RedirectMap)
        : null;
  
    const pathname =
      searchParams.has("pathname") && typeof searchParams.get("pathname") === "string"
        ? String(searchParams.get("pathname"))
        : undefined;
  
    console.log('PARSE FRAME PARAMS ---> ', {
      postBody: frameActionReceived,
      prevState: framePrevState,
      pathname: pathname,
      prevRedirects: framePrevRedirects
    })


    return {
      postBody: frameActionReceived,
      prevState: framePrevState,
      pathname: pathname,
      prevRedirects: framePrevRedirects,
    };
}