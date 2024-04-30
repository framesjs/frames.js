import { FrameActionPayload, getFrame } from "frames.js";
import { type NextRequest } from "next/server";
import { getAction } from "../actions/getAction";
import { persistMockResponsesForDebugHubRequests } from "../utils/mock-hub-utils";

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
  const postUrlRaw = req.nextUrl.searchParams.get("postUrl");
  const specification =
    req.nextUrl.searchParams.get("specification") || "farcaster";

  // TODO: refactor useful logic back into render package

  if (specification === "farcaster") {
    await persistMockResponsesForDebugHubRequests(req);
  }

  if (!postUrlRaw) {
    return Response.error();
  }

  const postUrl = new URL(postUrlRaw);

  // Remove trailing slash (causes redirect issues)
  if (postUrl.pathname.endsWith("/")) {
    postUrl.pathname = postUrl.pathname.slice(0, -1);
  }

  try {
    const r = await fetch(postUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      redirect: isPostRedirect ? "manual" : "follow",
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

    if (r.status >= 400 && r.status < 500) {
      const json = (await r.json()) as { message?: string };
      if ("message" in json) {
        return Response.json({ message: json.message }, { status: r.status });
      }
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
