import { Hono } from "hono";
import * as lib from ".";

describe("hono adapter", () => {
  it.each(["createFrames", "Button"])("exports %s", (exportName) => {
    expect(lib).toHaveProperty(exportName);
  });

  it("correctly integrates with Hono", async () => {
    const frames = lib.createFrames();
    const handler = frames(async (ctx) => {
      expect(ctx.request.url).toBe("http://localhost:3000/");

      return {
        image: <span>Test</span>,
        buttons: [<lib.Button action="post">Click me</lib.Button>],
      };
    });

    const app = new Hono();

    app.on(["GET", "POST"], "/", handler);

    const request = new Request("http://localhost:3000");

    const response = await app.request(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
  });
});
