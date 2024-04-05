import { concurrentMiddleware } from "../middleware/concurrentMiddleware";
import { createFrames } from "./createFrames";
import { redirect } from "./redirect";
import type { FramesMiddleware } from "./types";

describe("createFrames", () => {
  it("returns a handler function", () => {
    const handler = createFrames({});

    expect(handler).toBeInstanceOf(Function);
  });

  it("provides default properties on context based on default middleware and internal logic", async () => {
    const handler = createFrames();

    const routeHandler = handler((ctx) => {
      expect(ctx.url).toBeInstanceOf(URL);
      expect(ctx.url.href).toBe("http://test.com/");

      expect(ctx.basePath).toBe("/");
      expect(ctx.initialState).toBeUndefined();
      expect(ctx.pressedButton).toBeUndefined();
      expect(ctx.request).toBeInstanceOf(Request);
      return redirect("http://test.com");
    });

    await expect(
      routeHandler(new Request("http://test.com"))
    ).resolves.toBeInstanceOf(Response);
  });

  it("passes initialState to context", async () => {
    const handler = createFrames({ initialState: { test: true } });

    const routeHandler = handler((ctx) => {
      expect(ctx.initialState).toEqual({ test: true });
      return redirect("http://test.com");
    });

    await expect(
      routeHandler(new Request("http://test.com"))
    ).resolves.toBeInstanceOf(Response);
  });

  it("supports custom global middleware", async () => {
    const customMiddleware: FramesMiddleware<any, { custom: string }> = async (
      ctx,
      next
    ) => {
      return next({ custom: "http://mydomain.com" });
    };

    const handler = createFrames({
      middleware: [customMiddleware],
    });

    const routeHandler = handler((ctx) => {
      return redirect(ctx.custom);
    });

    const response = await routeHandler(new Request("http://test.com"));

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Location")).toBe("http://mydomain.com");
  });

  it("supports per route middleware", async () => {
    const customMiddleware: FramesMiddleware<any, { custom: string }> = async (
      ctx,
      next
    ) => {
      return next({ custom: "http://mydomain.com" });
    };

    const handler = createFrames();

    const routeHandler = handler(
      (ctx) => {
        return redirect(ctx.custom);
      },
      {
        middleware: [customMiddleware],
      }
    );

    const response = await routeHandler(new Request("http://test.com"));

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("Location")).toBe("http://mydomain.com");
  });

  it("works with parallel middleware", async () => {
    const middleware0: FramesMiddleware<any, { test0: boolean }> = async (
      context,
      next
    ) => {
      return next({ test0: true });
    };
    const middleware1: FramesMiddleware<any, { test1: boolean }> = async (
      context,
      next
    ) => {
      return next({ test1: true });
    };
    const middleware2: FramesMiddleware<any, { test2: boolean }> = async (
      context,
      next
    ) => {
      return next({ test2: true });
    };
    const middleware3: FramesMiddleware<any, { test3: boolean }> = async (
      context,
      next
    ) => {
      return next({ test3: true });
    };

    const handler = createFrames({
      middleware: [
        middleware0,
        concurrentMiddleware(middleware1, middleware2),
        middleware3,
      ],
    });

    const routeHandler = handler((ctx) => {
      expect(ctx).toMatchObject({
        test0: true,
        test1: true,
        test2: true,
        test3: true,
      });
      return redirect("http://test.com");
    });

    const response = await routeHandler(new Request("http://test.com"));

    expect(response).toBeInstanceOf(Response);
  });

  it("fails if invalid URL is set as baseUrl", () => {
    expect(() => createFrames({ baseUrl: "invalid" })).toThrow(
      "Invalid baseUrl: Invalid URL"
    );
  });

  it("sets baseUrl on context if provided", async () => {
    const handler = createFrames({ baseUrl: "http://override.com" });

    const routeHandler = handler((ctx) => {
      expect(ctx.baseUrl.toString()).toBe("http://override.com/");
      return Response.json({ test: true });
    });

    await expect(
      routeHandler(new Request("http://test.com"))
    ).resolves.toHaveProperty("status", 200);
  });

  it("resolves resolvedUrl against request URL and / if no basePath or baseUrl are provided", async () => {
    const handler = createFrames();

    const routeHandler = handler((ctx) => {
      expect(ctx.baseUrl.toString()).toBe("http://test.com/");
      return Response.json({ test: true });
    });

    await expect(
      routeHandler(new Request("http://test.com/this-will-be-removed"))
    ).resolves.toHaveProperty("status", 200);
  });

  it("resolves resolvedUrl against request URL when only basePath is provided", async () => {
    const handler = createFrames({ basePath: "/test" });

    const routeHandler = handler((ctx) => {
      expect(ctx.baseUrl.toString()).toBe("http://test.com/test");
      return Response.json({ test: true });
    });

    await expect(
      routeHandler(new Request("http://test.com/this-will-be-removed"))
    ).resolves.toHaveProperty("status", 200);
  });

  it("resolves resolvedUrl against baseUrl and / when only baseUrl is provided", async () => {
    const handler = createFrames({ baseUrl: "http://override.com" });

    const routeHandler = handler((ctx) => {
      expect(ctx.baseUrl.toString()).toBe("http://override.com/");
      return Response.json({ test: true });
    });

    await expect(
      routeHandler(new Request("http://test.com/this-will-be-removed"))
    ).resolves.toHaveProperty("status", 200);
  });

  it("resolves resolvedUrl against baseUrl and basePath if both are provided", async () => {
    const handler = createFrames({
      baseUrl: "http://override.com",
      basePath: "/test",
    });

    const routeHandler = handler((ctx) => {
      expect(ctx.baseUrl.toString()).toBe("http://override.com/test");
      return Response.json({ test: true });
    });

    await expect(
      routeHandler(new Request("http://test.com/this-will-be-removed"))
    ).resolves.toHaveProperty("status", 200);
  });

  it("resolves basePath relatively to baseUrl", async () => {
    const handler = createFrames({
      baseUrl: "http://override.com/test",
      basePath: "/test2",
    });

    const routeHandler = handler((ctx) => {
      expect(ctx.baseUrl.toString()).toBe("http://override.com/test/test2");
      return Response.json({ test: true });
    });

    await expect(
      routeHandler(new Request("http://test.com/this-will-be-removed"))
    ).resolves.toHaveProperty("status", 200);
  });
});
