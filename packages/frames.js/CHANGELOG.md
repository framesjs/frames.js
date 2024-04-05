# frames.js

## 0.12.1

### Patch Changes

- 0070d1f: chore: remove unnecessary url detection and use nextUrl instead
- ef57739: feat: add baseURL option

## 0.12.0

### Minor Changes

- 424b0ea: feat: allow arbitrary response in frames handler
- e681ce9: feat: split pages router to client and server entrypoints

### Patch Changes

- e681ce9: fix: split pages router bundle to client side and server side to prevent leaks
- 40934fb: fix: page router adapter for next.js node.js request handling
- 2290278: feat: application level errors support

## 0.11.4

### Patch Changes

- 8634f7d: fix: validateFrameMessage bug

## 0.11.3

### Patch Changes

- 7d22df3: fix: minor bugs and code cleanup

## 0.11.2

### Patch Changes

- 27d1817: feat: relative url support for images

## 0.11.1

### Patch Changes

- f4d5f4f: fix: allow to explicitly set state using generics
- 3875369: fix: add missing ctx, env, and req access to cloudflare workers handlers

## 0.11.0

### Minor Changes

- 63b6c6b: feat: cloudflare workers adapter
- 1434879: chore: deprecate old Next.js api

### Patch Changes

- 2b25562: fix: turbo build
- 29bcbc6: fix(nextjs): prioritize APP_URL over VERCEL_URL
- 0b681fb: fix: expose core types and utils via frames.js/types and frames.js/utils
- 65c7f6c: fix: correctly tree shake the bundle

## 0.10.0

### Minor Changes

- a538797: feat: Breaking change! frames/render has been moved to its own @frames.js/render package

### Patch Changes

- 06cbf1c: full sets of open frames tags and fixes getFrame
- 9d20e11: fix: getFrame validate image url length even if not data url
- 457ca30: fix(nextjs): getCurrentUrl respect VERCEL_URL and APP_URL env variables
- 66687fe: fix(render): mint fallback message
- 5b9169a: fix: correctly import barrel files in node10 resolution
- 384e282: chore: remove @farcaster/core

## 0.9.6

### Patch Changes

- 9239c36: fix: add UrlObject type to post_url prop on tx button

## 0.9.5

### Patch Changes

- b56713e: fix(nextjs): fetchMetadata cache issue

## 0.9.4

### Patch Changes

- 6d90f7b: fix: remove unused button state prop

## 0.9.3

### Patch Changes

- dad61eb: fix: update fetchMetadata tests

## 0.9.2

### Patch Changes

- 5cef280: feat: allow null/undefined/boolean as button
- df1073c: fix(nextjs): provide full url to nextjs handler

## 0.9.1

### Patch Changes

- 66a1fe3: fix(nextjs): handle frames being unavailable during build time

## 0.9.0

### Minor Changes

- New framework agnostic api

## 0.8.6

### Patch Changes

- d7c5cb3: fix(use-frame): respect tx button post_url
- cdad26b: fix: xmtp validator types

## 0.8.5

### Patch Changes

- e9589a5: fix: add viem Abi type to transaction response ABI type
- c995403: fix: correctly parse button index of open frames html

## 0.8.4

### Patch Changes

- 4fc8fef: define signer loading state
- 6c9b09d: feat: include user's connected address in frame transaction data request
- faa44a5: feat: parse open frames tags
- 5a609e3: fix: clear FrameUI input after submitting

## 0.8.3

### Patch Changes

- 40e99b3: fix: render frame url params fetching

## 0.8.2

### Patch Changes

- dea6f14: fix type

## 0.8.1

### Patch Changes

- 3afb70a: fix: add transaction_id property to post body
- 9c1adcb: improve image type error message

## 0.8.0

### Minor Changes

- 7ccc562: update debugger ui

### Patch Changes

- 72e6617: feat: tx support

## 0.7.1

### Patch Changes

- fix redirects

## 0.7.0

### Minor Changes

- 01fc5fe: Changes the rendering library APIs

### Patch Changes

- 60c6e56: fix: SSL proxy version error by using `NEXT_PUBLIC_HOST` for redirects in `next/server`
- e335829: chore: remove unnecessary logs
- eee74a9: Change types around rendering

## 0.6.0

### Minor Changes

- 845b30c: refactor: make frame validation errors arbitraty, remove unnecessary validateFrame function
- ce1cec6: feat: Breaking change! Adds support for fc:frame:state - no longer stores state in url params.

### Patch Changes

- 845b30c: feat: add frame rendering components

## 0.5.3

### Patch Changes

- 244d35b: fix: correctly parse protobuf messages and return eth addresses as string
- b22ad38: fix: correctly export types and commonjs/es modules

## 0.5.2

### Patch Changes

- 18c887d: chore: remove @farcaster/core dependency
- 0ba4b88: fix: properly handle hub api responses
- f9d4356: feat: add support for `of:accepts` and xmtp frame messages

## 0.5.1

### Patch Changes

- 157ec44: chore: update fallback neynar hub api url
- 426d5eb: feat: validate frame image data uri length in debugger
- 70a0ff6: improve error
- d1596ac: feat: `getAddressesForFid`, which returns all addresses and their types for a given FID.

  feat: `getFrameMessage` now returns `requesterCustodyAddress` and the `requesterVerifiedAddresses` field returns all verified addresses

- 62be50d: fixes absolute pathname handling

## 0.5.0

### Minor Changes

- 40d2662: Change <FrameButton> props to reflect Farcaster Frames schema names

## 0.4.4

### Patch Changes

- b174138: Fix getFrameFlattened meta tags

## 0.4.3

### Patch Changes

- e54b9ad: add meta frame.imageAspectRatio to getFrameHtmlHead fn in getFrameHtml.ts
- a09c555: fix bug with validateFrameMessage

## 0.4.2

### Patch Changes

- ccb8317: feat: support for `fc:frame:image:aspect_ratio`

## 0.4.1

### Patch Changes

- 800d887: fix: add warning if `FrameContainer`'s `pathname` prop is not specified.
- 8112f6f: fix: use nested destructuring for options defaults
- fd70614: feat: throw clearer error when hub url is specified without protocol (e.g. https://)
- b71f05b: feat: expose fetch options in HubHttpUrlOptions
- 8112f6f: fix: use neynar hubs as fallback

## 0.4.0

### Minor Changes

- ccd3302: feat: JSX-based frame image rendering

## 0.3.0

### Minor Changes

- 03d041e: feat: mint action

## 0.2.1

### Patch Changes

- 0d9cfaf: Fix validation for order

## 0.2.0

### Minor Changes

- 608bac9: Add support for new button action type "link" without changes

## 0.1.1

### Patch Changes

- 40d0ad7: feat: Add `getFrameMessage`, which parse frame action payloads and optionally fetches additional context from hubs.

  feat(debugger): Forward unmocked hub requests to an actual hub.

- 57649be: Add a helper function to retrieve the user data for an FID
- 518ada3: custom redirects handling for long redirect urls

## 0.1.0

### Minor Changes

- 1a73918: fix: Breaking change! `validateFrameMessage` & `getAddressForFid` now take an optional `hubHttpUrl` parameter to allow for custom hub URLs instead of env vars.

  If you were using `getAddressForFid`, you no longer need to include the second `hubClient` argument. Instead, you can optionally pass the `hubHttpUrl` in the second argument.

  ```ts
  const address = getAddressForFid(fid);
  // or
  const address = getAddressForFid(fid, { hubHttpUrl: "..." });
  ```

- 1598cb6: Breaking change! getFrame now returns a { frame, errors } object instead of a frame or null

### Patch Changes

- 99536fb: fix: frame action message creation to not include inputText if inputText was not requested by the frame
- 501861d: corrects nextjs type inaccuracy

## 0.0.4

### Patch Changes

Possibly breaking changes.

- add5abd: Fix inaccurate payload optional type
- fix an incorrect type on payload inputText being optional
- fallbackToCustodyAddress is now a default true option on getAddressForFid
- removes some unneeded internals from being exported

## 0.0.3

### Patch Changes

- Support null as children to FrameContainer

## 0.0.2

### Patch Changes

- 24dc8c5: Extends FrameState type

## 0.0.1

### Patch Changes

- d035f36: feat: fc:frame:input:text support
- 10a79e9: fix: validation via REST API
