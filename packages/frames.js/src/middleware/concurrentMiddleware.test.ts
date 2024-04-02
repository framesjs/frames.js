/* eslint-disable @typescript-eslint/require-await -- middleware is always async */
import { redirect } from "../core/redirect";
import type { FramesContext, FramesMiddleware } from "../core/types";
import { concurrentMiddleware } from "./concurrentMiddleware";

describe("concurrentMiddleware", () => {
  it("throws if no middleware is provided", () => {
    expect(() => concurrentMiddleware()).toThrow("No middlewares provided");
  });

  it("returns middleware as is if only one is provided", () => {
    const middleware: FramesMiddleware<any, any> = async () => {
      return new Response();
    };

    expect(concurrentMiddleware(middleware)).toBe(middleware);
  });

  it("returns a middleware that wraps all provided middlewares", () => {
    const middleware1: FramesMiddleware<any, any> = async (context, next) => {
      return next();
    };
    const middleware2: FramesMiddleware<any, any> = async (context, next) => {
      return next();
    };

    const parallelMiddleware = concurrentMiddleware(middleware1, middleware2);

    expect(parallelMiddleware).toBeInstanceOf(Function);
  });

  it("calls all provided middlewares and properly mutates context and then calls next middleware", async () => {
    const middleware1: FramesMiddleware<any, any> = async (context, next) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      return next({ test1: true });
    };
    const middleware2: FramesMiddleware<any, any> = async (context, next) => {
      return next({ test2: true });
    };

    const parallelMiddleware = concurrentMiddleware(middleware1, middleware2);
    let context = {} as unknown as FramesContext;

    await parallelMiddleware(context, async (newCtx) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- we don't care really about the type of the value
      context = newCtx;
      return redirect("http://test.com");
    });

    expect(context).toEqual({
      test1: true,
      test2: true,
    });
  });
});
