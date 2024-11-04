import {
  getFrame,
  type FrameActionPayload,
  type GetFrameResult,
} from "frames.js";
import { type ParseFramesWithReportsResult } from "frames.js/frame-parsers";
import { parseFramesWithReports } from "frames.js/parseFramesWithReports";
import type { JsonObject, JsonValue } from "frames.js/types";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { tryCallAsync } from "../helpers";
import { isSpecificationValid } from "./validators";

const castActionMessageParser = z.object({
  type: z.literal("message"),
  message: z.string().min(1),
});

const castActionFrameParser = z.object({
  type: z.literal("frame"),
  frameUrl: z.string().min(1).url(),
});

const composerActionFormParser = z.object({
  type: z.literal("form"),
  url: z.string().min(1).url(),
  title: z.string().min(1),
});

const jsonResponseParser = z.preprocess(
  (data) => {
    if (typeof data === "object" && data !== null && !("type" in data)) {
      return {
        type: "message",
        ...data,
      };
    }

    return data;
  },
  z.discriminatedUnion("type", [
    castActionFrameParser,
    castActionMessageParser,
    composerActionFormParser,
  ])
);

const errorResponseParser = z.object({
  message: z.string().min(1),
});

export type POSTResponseError = { message: string };

export type POSTResponseRedirect = { location: string };

export type POSTTransactionResponse = JsonObject;

export type POSTResponse =
  | GetFrameResult
  | ParseFramesWithReportsResult
  | POSTResponseError
  | POSTResponseRedirect
  | JsonObject;

/** Proxies frame actions to avoid CORS issues and preserve user IP privacy */
export async function POST(req: Request | NextRequest): Promise<Response> {
  try {
    const searchParams =
      "nextUrl" in req
        ? req.nextUrl.searchParams
        : new URL(req.url).searchParams;
    const body = (await req.json()) as FrameActionPayload;
    const isPostRedirect = searchParams.get("postType") === "post_redirect";
    const isTransactionRequest = searchParams.get("postType") === "tx";
    const postUrl = searchParams.get("postUrl");
    const multiSpecificationEnabled =
      searchParams.get("multispecification") === "true";
    const specification = searchParams.get("specification") ?? "farcaster";

    if (!postUrl) {
      return Response.json(
        { message: "postUrl parameter not found" } satisfies POSTResponseError,
        {
          status: 400,
        }
      );
    }

    const response = await fetch(postUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      redirect: isPostRedirect ? "manual" : undefined,
      body: JSON.stringify(body),
    });

    if (response.status >= 500) {
      const jsonError = await tryCallAsync(
        () => response.clone().json() as Promise<JsonValue>
      );

      if (jsonError instanceof Error) {
        return Response.json(
          { message: jsonError.message } satisfies POSTResponseError,
          { status: response.status }
        );
      }

      const result = errorResponseParser.safeParse(jsonError);

      if (result.success) {
        return Response.json(
          { message: result.data.message } satisfies POSTResponseError,
          { status: response.status }
        );
      }

      // eslint-disable-next-line no-console -- provide feedback to the user
      console.error(jsonError);

      return Response.json(
        {
          message: `Frame server returned an unexpected error.`,
        } satisfies POSTResponseError,
        { status: 500 }
      );
    }

    if (response.status === 302) {
      const location = response.headers.get("location");

      if (!location) {
        return Response.json(
          {
            message:
              "Frame server returned a redirect without a location header",
          } satisfies POSTResponseError,
          { status: 500 }
        );
      }

      return Response.json(
        {
          location,
        } satisfies POSTResponseRedirect,
        { status: 302 }
      );
    } else if (isPostRedirect) {
      return Response.json(
        {
          message: "Frame server did not return a 302 redirect",
        } satisfies POSTResponseError,
        { status: 500 }
      );
    }

    if (response.status >= 400 && response.status < 500) {
      const jsonError = await tryCallAsync(
        () => response.clone().json() as Promise<JsonValue>
      );

      if (jsonError instanceof Error) {
        return Response.json(
          { message: jsonError.message } satisfies POSTResponseError,
          { status: response.status }
        );
      }

      const result = errorResponseParser.safeParse(jsonError);

      if (result.success) {
        return Response.json(
          { message: result.data.message } satisfies POSTResponseError,
          { status: response.status }
        );
      }

      // eslint-disable-next-line no-console -- provide feedback to the user
      console.error(jsonError);

      return Response.json(
        {
          message: `Frame server returned an unexpected error.`,
        } satisfies POSTResponseError,
        { status: response.status }
      );
    }

    if (response.status !== 200) {
      return Response.json(
        {
          message: `Frame server returned a non-200 status code: ${response.status}`,
        } satisfies POSTResponseError,
        { status: 500 }
      );
    }

    if (isTransactionRequest) {
      const transaction = await tryCallAsync(
        () => response.clone().json() as Promise<JsonObject>
      );

      if (transaction instanceof Error) {
        return Response.json(
          { message: transaction.message } satisfies POSTResponseError,
          { status: 500 }
        );
      }

      return Response.json(transaction satisfies JsonObject);
    }

    // Content type is JSON, could be an action
    if (
      response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("application/json")
    ) {
      const parseResult = await z
        .promise(jsonResponseParser)
        .safeParseAsync(response.clone().json());

      if (!parseResult.success) {
        throw new Error("Invalid frame response");
      }

      const headers = new Headers(response.headers);
      // Proxied requests could have content-encoding set, which breaks the response
      headers.delete("content-encoding");

      return new Response(response.body, {
        headers,
        status: response.status,
        statusText: response.statusText,
      });
    }

    const html = await response.text();

    if (multiSpecificationEnabled) {
      const result = parseFramesWithReports({
        html,
        fallbackPostUrl: body.untrustedData.url,
        fromRequestMethod: "POST",
      });

      return Response.json(result satisfies ParseFramesWithReportsResult);
    }

    if (!isSpecificationValid(specification)) {
      return Response.json(
        {
          message: "Invalid specification",
        } satisfies POSTResponseError,
        { status: 400 }
      );
    }

    const result = getFrame({
      htmlString: html,
      url: body.untrustedData.url,
      fromRequestMethod: "POST",
      specification,
    });

    return Response.json(result satisfies POSTResponse);
  } catch (err) {
    // eslint-disable-next-line no-console -- provide feedback to the user
    console.error(err);
    return Response.json({ message: String(err) } satisfies POSTResponseError, {
      status: 500,
    });
  }
}
