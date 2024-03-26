import { createFrames, types } from "frames.js/next";

const priceMiddleware: types.FramesMiddleware<
  any,
  { ethPrice?: number }
> = async (ctx, next) => {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const {
      ethereum: { usd: ethPrice },
    } = await res.json();
    return next({ ethPrice });
  } catch (error) {
    console.error("Error fetching ETH price:", error);
  }
  return next();
};

export const frames = createFrames({
  basePath: "/",
  initialState: {
    pageIndex: 0,
  },
  middleware: [priceMiddleware],
});
