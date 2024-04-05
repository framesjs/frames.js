import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { TLSSocket } from "node:tls";
import {
  convertNodeJSRequestToWebAPIRequest,
  sendWebAPIResponseToNodeJSResponse,
} from "./node-server-helpers";

describe("convertNodeJSRequestToWebAPIRequest", () => {
  it("properly detects url from host header (with custom port)", () => {
    const req = new IncomingMessage(new Socket());
    req.headers.host = "framesjs.org:3000";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("http://framesjs.org:3000/test");
  });

  it("properly detects url from host header (without port)", () => {
    const req = new IncomingMessage(new Socket());
    req.headers.host = "framesjs.org";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("http://framesjs.org/test");
  });

  it("properly detects protocol from socket", () => {
    const socket = new TLSSocket(new Socket());
    const req = new IncomingMessage(socket);
    req.headers.host = "framesjs.org";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("https://framesjs.org/test");
  });

  it("uses x-forwarded-host if available", () => {
    const req = new IncomingMessage(new Socket());
    req.headers["x-forwarded-host"] = "framesjs.org:3000";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("http://framesjs.org:3000/test");
  });

  it("uses x-forwarded-host over host header", () => {
    const req = new IncomingMessage(new Socket());
    req.headers["x-forwarded-host"] = "framesjs.org:3000";
    req.headers.host = "framesjs.org";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("http://framesjs.org:3000/test");
  });

  it("uses x-forwarded-proto if available", () => {
    const req = new IncomingMessage(new Socket());

    req.headers["x-forwarded-proto"] = "https";
    req.headers.host = "framesjs.org";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("https://framesjs.org/test");
  });

  it("uses x-forwarded-proto over encrypted socket", () => {
    const socket = new TLSSocket(new Socket());
    const req = new IncomingMessage(socket);

    req.headers["x-forwarded-proto"] = "http";
    req.headers.host = "framesjs.org";
    req.url = "/test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.url).toBe("http://framesjs.org/test");
  });

  it("passes all headers to Request", () => {
    const req = new IncomingMessage(new Socket());
    req.headers.host = "framesjs.org";
    req.url = "/test";
    req.headers["x-test"] = "test";
    req.headers["content-type"] = "test";

    const res = new ServerResponse(req);
    const request = convertNodeJSRequestToWebAPIRequest(req, res);

    expect(request.headers.get("x-test")).toBe("test");
    expect(request.headers.get("content-type")).toBe("test");
  });
});

describe("sendWebAPIResponseToNodeJSResponse", () => {
  it("sends response with headers to node.js response", async () => {
    const response = Response.json(
      { test: "test" },
      { headers: { "x-test": "test" }, statusText: "OK" }
    );
    const res = new ServerResponse(new IncomingMessage(new Socket()));

    await sendWebAPIResponseToNodeJSResponse(res, response);

    expect(res.statusCode).toBe(200);
    expect(res.statusMessage).toBe("OK");
    expect(res.getHeader("content-type")).toBe("application/json");
  });
});
