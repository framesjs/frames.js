import type { FrameActionPayload } from "frames.js";
import { getFrame } from "frames.js";
import type { NextRequest } from "next/server";
import { isSpecificationValid } from "./validators";

/** Proxies frame actions to avoid CORS issues and preserve user IP privacy */
export async function POST(req: Request | NextRequest): Promise<Response> {
  const searchParams =
    "nextUrl" in req ? req.nextUrl.searchParams : new URL(req.url).searchParams;
  const body = (await req.json()) as FrameActionPayload;
  const isPostRedirect = searchParams.get("postType") === "post_redirect";
  const isTransactionRequest = searchParams.get("postType") === "tx";
  const postUrl = searchParams.get("postUrl");
  const specification = searchParams.get("specification") ?? "farcaster";

  if (!postUrl) {
    return Response.error();
  }

  if (!isSpecificationValid(specification)) {
    return Response.json({ message: "Invalid specification" }, { status: 400 });
  }

  try {
    const r = await fetch(postUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
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
