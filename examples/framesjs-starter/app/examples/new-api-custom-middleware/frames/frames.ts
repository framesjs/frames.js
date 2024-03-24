import { createFrames } from "frames.js/next";

export const frames = createFrames({
  basePath: "/examples/new-api-custom-middleware/frames",
  middleware: [
    async (ctx, next) => {
      const body = await ctx.request.clone().json();

      return next({ body });
    },
    // the request body will now be available via ctx.body in your handler
  ],
});
