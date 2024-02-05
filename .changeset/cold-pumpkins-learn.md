---
"frames.js": minor
---

fix: Breaking change! `validateFrameMessage` & `getAddressForFid` now take an optional `hubHttpUrl` parameter to allow for custom hub URLs instead of env vars.

If you were using `getAddressForFid`, you no longer need to include the second `hubClient` argument. Instead, you can optionally pass the `hubHttpUrl` in the second argument.

```ts
const address = getAddressForFid(fid);
// or
const address = getAddressForFid(fid, { hubHttpUrl: "..." });
```
