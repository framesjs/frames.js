import * as lib from ".";

describe("cloudflare workers adapter", () => {
  it.each(["createFrames", "Button"])("exports %s", (exportName) => {
    expect(lib).toHaveProperty(exportName);
  });

  it("correctly integrates with Cloudflare Workers", async () => {
    const frames = lib.createFrames();
    const handler = frames(async (ctx) => {
      expect(ctx.request.url).toBe("http://localhost:3000/");

      return {
        image: <span>Test</span>,
        buttons: [<lib.Button action="post">Click me</lib.Button>],
      };
    });

    const request = new Request("http://localhost:3000");

    // @ts-expect-error - expects fetcher property on request but it is not used by our lib
    const response = await handler(request, {}, {});

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
  });

  it('works properly with state', async () => {
    type State = {
      test: boolean;
    };
    const frames = lib.createFrames<State>({
      initialState: {
        test: false,
      },
    });

    const handler = frames(async (ctx) => {
      expect(ctx.state).toEqual({ test: false });

      return {
        image: 'http://test.png',
        state: ctx.state satisfies State,
      };
    });

    const request = new Request("http://localhost:3000");

    // @ts-expect-error - expects fetcher property on request but it is not used by our lib
    const response = await handler(request, {}, {});

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
  });
});
