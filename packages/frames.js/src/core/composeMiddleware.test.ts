import { composeMiddleware } from "./composeMiddleware";

describe("composeMiddleware", () => {
  it("returns noop function if there are no middlewares to be composed", () => {
    expect(() => composeMiddleware([])).toThrow(
      "Please provide at least one middleware function"
    );
  });

  it("properly works with just one middleware", async () => {
    const context = { a: 1 };

    const composedMiddleware = composeMiddleware<typeof context, any>([
      async (ctx, next) => {
        ctx.a = 2;
        return next();
      },
    ]);

    await expect(composedMiddleware(context)).resolves.toBeUndefined();

    expect(context).toEqual({ a: 2 });
  });

  it("calls middleware in order from first to last and allows to modify the context", async () => {
    const context: {
      order: number[];
      1?: boolean;
      2?: string;
    } = {
      order: [],
    };

    const composedMiddleware = composeMiddleware<typeof context, Promise<any>>([
      async (ctx: typeof context, next) => {
        ctx.order.push(1);
        const result = await next({
          ...ctx,
          1: true,
        });
        ctx.order.push(1);
        return result;
      },
      async (ctx: typeof context, next) => {
        ctx.order.push(2);

        expect(ctx).toMatchObject({ 1: true });

        const result = await next({ ...ctx, 2: "test" });

        expect(ctx).not.toHaveProperty("2");

        ctx.order.push(2);

        return result;
      },
      async (ctx: typeof context) => {
        ctx.order.push(3);

        expect(ctx).toMatchObject({ 1: true, 2: "test" });

        return "something";
      },
    ]);

    await expect(composedMiddleware(context)).resolves.toBe("something");

    expect(context).toEqual({
      order: [1, 2, 3, 2, 1],
    });
  });
});
