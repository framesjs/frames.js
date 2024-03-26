import { getFrame } from "frames.js";
import { NextRequest } from "next/server";

/** Proxies frame actions to avoid CORS issues and preserve user IP privacy */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const isPostRedirect =
    req.nextUrl.searchParams.get("postType") === "post_redirect";
  const isTransactionRequest =
    req.nextUrl.searchParams.get("postType") === "tx";
  const postUrl = req.nextUrl.searchParams.get("postUrl")!;

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

    if (isTransactionRequest) {
      const transaction = await r.json();
      return Response.json(transaction);
    }

    const htmlString = await r.text();

    const { frame, errors } = getFrame({
      htmlString,
      url: body.untrustedData.url,
    });

    return Response.json({ frame, errors });
  } catch (err) {
    console.error(err);
    return Response.error();
  }
}
