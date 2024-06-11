import { FrameActionPayload, getFrame } from "frames.js";
import { type NextRequest } from "next/server";
import { getAction } from "../actions/getAction";
import { persistMockResponsesForDebugHubRequests } from "../utils/mock-hub-utils";
import type { SupportedParsingSpecification } from "frames.js";

export function isSpecificationValid(
  specification: unknown
): specification is SupportedParsingSpecification {
  return (
    typeof specification === "string" &&
    ["farcaster", "openframes"].includes(specification)
  );
}

/** Proxies fetching a frame through a backend to avoid CORS issues and preserve user IP privacy */
export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl.searchParams.get("url");
  const specification =
    request.nextUrl.searchParams.get("specification") ?? "farcaster";
  const shouldParseActions = request.nextUrl.searchParams.get("actions");

  if (!url) {
    return Response.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (!(specification === "farcaster" || specification === "openframes")) {
    return Response.json({ message: "Invalid specification" }, { status: 400 });
  }

  try {
    const urlRes = await fetch(url);

    // If content type is JSON it could be an action
    if (
      urlRes.headers.get("content-type")?.includes("application/json") &&
      specification === "farcaster" &&
      shouldParseActions
    ) {
      const json = (await urlRes.json()) as object;

      const result = getAction({ json, specification });

      return Response.json({ ...result, type: "action", url });
    }

    const htmlString = await urlRes.text();

    const result = getFrame({ htmlString, url, specification });

    return Response.json({ ...result, type: "frame" });
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the developer
    console.error(err);
    return Response.json({ message: err }, { status: 500 });
  }
}

/** Proxies frame actions to avoid CORS issues and preserve user IP privacy */
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.clone().json()) as FrameActionPayload;
  const isPostRedirect =
    req.nextUrl.searchParams.get("postType") === "post_redirect";
  const isTransactionRequest =
    req.nextUrl.searchParams.get("postType") === "tx";
  const postUrl = req.nextUrl.searchParams.get("postUrl");
  const specification =
    req.nextUrl.searchParams.get("specification") ?? "farcaster";

  if (!isSpecificationValid(specification)) {
    return Response.json({ message: "Invalid specification" }, { status: 400 });
  }

  // TODO: refactor useful logic back into render package

  if (specification === "farcaster") {
    await persistMockResponsesForDebugHubRequests(req);
  }

  if (!postUrl) {
    return Response.error();
  }

  try {
    const r = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: isPostRedirect ? "manual" : undefined,
      body: JSON.stringify(body),
    });

    if (r.status === 302) {
      return Response.json(
        {
          location: r.headers.get("location"),
        },
        { status: 302 }
      );
    }

    // this is an error, just return response as is
    if (r.status >= 500) {
      return Response.json(await r.text(), { status: r.status });
    }

    if (r.status >= 400 && r.status < 500) {
      const json = (await r.json()) as { message?: string };

      // this is message response
      if ("message" in json) {
        return Response.json({ message: json.message }, { status: r.status });
      } else {
        return r;
      }
    }

    if (isPostRedirect && r.status !== 302) {
      return Response.json(
        {
          message: `Invalid response status code for post redirect button, 302 expected, got ${r.status}`,
        },
        { status: 400 }
      );
    }

    if (isTransactionRequest) {
      const transaction = (await r.json()) as JSON;
      return Response.json(transaction);
    }

    // Content type is JSON, could be an action
    if (r.headers.get("content-type")?.includes("application/json")) {
      const json = (await r.json()) as
        | { message: string }
        | { type: string; frameUrl: string };

      if ("message" in json) {
        return Response.json({ message: json.message }, { status: r.status });
      } else if (
        "type" in json &&
        json.type === "frame" &&
        "frameUrl" in json
      ) {
        return Response.json(json);
      }
      throw new Error("Invalid frame response");
    }

    const htmlString = await r.text();

    const result = getFrame({
      htmlString,
      url: body.untrustedData.url,
      specification,
    });

    return Response.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the user
    console.error(err);
    return Response.error();
  }
}
