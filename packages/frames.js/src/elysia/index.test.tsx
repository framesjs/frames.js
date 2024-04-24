// eslint-disable-next-line import/no-extraneous-dependencies -- devDependencies are installed in the CI
import { Elysia } from "elysia";
import * as lib from ".";

describe("elysia adapter", () => {
  it.each(["createFrames", "Button"])("exports %s", (exportName) => {
    expect(lib).toHaveProperty(exportName);
  });

  it("correctly integrates with Elysia", async () => {
    const frames = lib.createFrames();
    const handler = frames((ctx) => {
      expect(ctx.request.url).toBe("http://localhost:3000/");

      return {
        image: <span>Test</span>,
        buttons: [<lib.Button action="post" key="1">Click me</lib.Button>],
      };
    });

    const app = new Elysia();

    app.get( "/", handler)
       .post( "/", handler);

    const request = new Request("http://localhost:3000");

    const response = await app.handle(request);

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

    const handler = frames((ctx) => {
      expect(ctx.state).toEqual({ test: false });

      return {
        image: 'http://test.png',
        state: ctx.state satisfies State,
      };
    });

    const app = new Elysia();

    app.get( "/", handler)
       .post( "/", handler);

    const request = new Request("http://localhost:3000");

    const response = await app.handle(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
  });
});
