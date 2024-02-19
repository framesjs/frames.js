import { createMiddleware } from "./app/examples/next-routing-better/api";
import { initialState } from "./app/examples/next-routing/types";

export const middleware = createMiddleware(initialState, {
  framesURL: "/examples/next-routing-better",
  framesHandlerURL: "/examples/next-routing-better/frames",
});

export const config = {
  matcher: ["/examples/next-routing-better/:path*"],
};
