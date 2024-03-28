// @todo uncomment once @see https://github.com/cloudflare/workers-sdk/issues/5367 is resolved
/* import {
  createExecutionContext,
  waitOnExecutionContext,
  SELF,
} from "cloudflare:test";*/
import { describe, it, expect, vi } from "vitest";
import worker from "../src/index";
import { ExecutionContext } from "@cloudflare/workers-types";

vi.mock("@vercel/og", () => {
  return {
    ImageResponse: class {
      arrayBuffer() {
        return new ArrayBuffer(1);
      }
    },
  };
});

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties<unknown>>;

describe("Hello World worker", () => {
  it("responds with Frame meta tags! (unit style)", async () => {
    const request = new IncomingRequest("http://example.com");
    // Create an empty context to pass to `worker.fetch()`.
    // const ctx = createExecutionContext();
    const ctx = {
      passThroughOnException() {},
      waitUntil(promise) {},
    } satisfies ExecutionContext;
    const response = await worker.fetch(request, { MY_APP_LABEL: "Test" }, ctx);
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
    // await waitOnExecutionContext(ctx);
    expect(await response.text()).toMatchSnapshot();
  });

  /* it("responds with Frame meta tags! (integration style)", async () => {
    const response = await SELF.fetch("https://example.com");
    expect(await response.text()).toMatchSnapshot(`"Hello World!"`);
  });*/
});
