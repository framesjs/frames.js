# frames.js

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
