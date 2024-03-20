import { redirect } from "../redirect";
import { concurrentMiddleware } from "./concurrentMiddleware";

describe("concurrentMiddleware", () => {
  it("throws if no middleware is provided", () => {
    expect(() => concurrentMiddleware()).toThrow("No middlewares provided");
  });

  it("returns middleware as is if only one is provided", () => {
    const middleware = async () => {};

    expect(concurrentMiddleware(middleware as any)).toBe(middleware);
  });

  it("returns a middleware that wraps all provided middlewares", () => {
    const middleware1 = async (context: any, next: any) => {
      return next();
    };
    const middleware2 = async (context: any, next: any) => {
      return next();
    };

    const parallelMiddleware = concurrentMiddleware(middleware1, middleware2);

    expect(parallelMiddleware).toBeInstanceOf(Function);
  });

  it("calls all provided middlewares and properly mutates context and then calls next middleware", async () => {
    const middleware1 = async (context: any, next: any) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return next({ test1: true });
    };
    const middleware2 = async (context: any, next: any) => {
      return next({ test2: true });
    };

    const parallelMiddleware = concurrentMiddleware(middleware1, middleware2);
    let context: any = {};

    await parallelMiddleware(context, async (newCtx) => {
      context = newCtx;
      return redirect("http://test.com");
    });

    expect(context).toEqual({
      test1: true,
      test2: true,
    });
  });
});
