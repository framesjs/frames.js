/* eslint-disable no-console -- we are logging errors */
import {
  createServer,
  type RequestListener,
  type IncomingMessage,
} from "node:http";
import supertest from "supertest";
import type { NextApiRequest, NextApiResponse } from "next";
import { createFrames, Button } from "./server";

describe("next.js pages router integration", () => {
  it("works with next.js pages router with disabled body parsing", async () => {
    const frames = createFrames();
    const handler = frames(() => {
      return {
        image: <span>Test</span>,
        buttons: [
          <Button action="post" key="1">
            Click me
          </Button>,
        ],
      };
    });

    const server = createServer(handler as unknown as RequestListener);

    const request = supertest(server);

    const response = await request.get("/");

    expect(response.status).toBe(200);
  });

  it("works with next.js pages router with enabled body parsing", async () => {
    const frames = createFrames();
    const handler = frames(() => {
      return {
        image: <span>Test</span>,
        buttons: [
          <Button action="post" key="1">
            Click me
          </Button>,
        ],
      };
    });

    const server = createServer((req, res) => {
      // simulate how next.js consumes the req and replaces body
      async function streamToString(request: IncomingMessage): Promise<string> {
        const chunks: Buffer[] = [];

        for await (const chunk of request) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- we are testing this
          chunks.push(Buffer.from(chunk));
        }

        return Buffer.concat(chunks).toString("utf-8");
      }

      streamToString(req)
        .then((body) => {
          // eslint-disable-next-line jest/no-conditional-expect -- we need to test this
          expect(req.readable).toBe(false);

          // @ts-expect-error -- this is a test
          req.body = body;

          return handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
        })
        .catch((e) => {
          console.error(e);
          res.writeHead(500, { "content-type": "text/plain" });
          res.end(String(e));
        });
    });

    const request = supertest(server);

    const response = await request.post("/").send({
      test: "test",
    });

    expect(response.status).toBe(200);
  });
});
