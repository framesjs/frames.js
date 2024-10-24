# @frames.js/render

## 0.3.18

### Patch Changes

- ac0af6c: fix: allow onTransaction/onSignature to be called from contexts outside of frame e.g. miniapp

## 0.3.17

### Patch Changes

- Updated dependencies [970ff97]
  - frames.js@0.19.4

## 0.3.16

### Patch Changes

- 1ea9ddc: feat: transaction event listeners

## 0.3.15

### Patch Changes

- eb00c77: fix: only allow http(s) URLs in link buttons

## 0.3.14

### Patch Changes

- 62b749f: fix: enforce http(s) protocol on redirect URLs
- 62b749f: fix: don't render data URIs that are SVG or not images

## 0.3.13

### Patch Changes

- b2f20d6: fix: UNIX timestamp in milliseconds in farcaster untrusted data

## 0.3.12

### Patch Changes

- 9b97405: feat: pass buttons' props separately to FrameButtonContainer

## 0.3.11

### Patch Changes

- Updated dependencies [b761511]
  - frames.js@0.19.3

## 0.3.10

### Patch Changes

- 4dfba4b: feat: expose full frameState in render UI components

## 0.3.9

### Patch Changes

- Updated dependencies [7079958]
- Updated dependencies [8df14d6]
  - frames.js@0.19.2

## 0.3.8

### Patch Changes

- 53ee761: adds previous frame props to LoadingScreen in FrameUI

## 0.3.7

### Patch Changes

- bb87cd5: fix: handle button post_url attribute
- Updated dependencies [bb87cd5]
  - frames.js@0.19.1

## 0.3.6

### Patch Changes

- 7809b6c: Fix allow sponsorship of new signers created by use-multi-farcaster-identity

## 0.3.5

### Patch Changes

- 8fede88: exports AnonymousSignerInstance from @frames.js/render/identity/anonymous

## 0.3.4

### Patch Changes

- Updated dependencies [68c5c7e]
  - frames.js@0.19.0

## 0.3.3

### Patch Changes

- c914877: fix: pass initial state to setter if the storage value is undefined
- 49b7ae8: feat: return signer approval when creating signer on farcaster

## 0.3.2

### Patch Changes

- 39341c0: fix: use initial state when value is not stored in storage or is removed from it

## 0.3.1

### Patch Changes

- 97619a8: fix(render): encodePacked for attribution

## 0.3.0

### Minor Changes

- 381669d: feat: onConnectWallet function that complements onTransaction function

### Patch Changes

- cf67e3d: feat(@frames.js/render): introduce new identity hooks
- 52d7028: feat: farcaster client transaction attribution
- Updated dependencies [381669d]
- Updated dependencies [3eeb57b]
- Updated dependencies [cf67e3d]
  - frames.js@0.18.2

## 0.2.23

### Patch Changes

- e4b0ef9: feat: support dynamic images
- 6373546: feat(render): export types for components and themes of headless ui
- bbf865b: fix(@frames.js/render): render an inline message for messages returned from cast / composer actions
- f374083: fix: correctly parse composer action state
- Updated dependencies [e4b0ef9]
- Updated dependencies [365a9e5]
- Updated dependencies [f374083]
  - frames.js@0.18.1

## 0.2.22

### Patch Changes

- Updated dependencies [044f047]
  - frames.js@0.18.0

## 0.2.21

### Patch Changes

- 8e2b564: feat: add composer actions support
- Updated dependencies [8e2b564]
- Updated dependencies [bb18c52]
  - frames.js@0.17.5

## 0.2.20

### Patch Changes

- 080f631: feat(@frames.js/render): new platform agnostic headless frame ui components

## 0.2.19

### Patch Changes

- Updated dependencies [99ac86b]
  - frames.js@0.17.4

## 0.2.18

### Patch Changes

- 2aaec07: feat: add support for type data signatures
- Updated dependencies [2aaec07]
- Updated dependencies [2fb6679]
  - frames.js@0.17.3

## 0.2.17

### Patch Changes

- Updated dependencies [c7aad53]
  - frames.js@0.17.2

## 0.2.16

### Patch Changes

- aac472d: fix(render): don't trigger onSignerlessFramePress for client side buttons (mint, tx)

## 0.2.15

### Patch Changes

- 0376179: feat(@frames.js/debugger): show collapsed frame preview and title reports
  feat(@frames.js/render): add CollapsedFrameUI component
  feat(frames.js): parse title and allow to report warnings it is missing
- Updated dependencies [0376179]
- Updated dependencies [ef7accc]
- Updated dependencies [1ff7e6e]
  - frames.js@0.17.1

## 0.2.14

### Patch Changes

- 2427333: feat(@frames.js/render): allow to override fetch, onRedirect and onLinkButtonClick behaviours
- 6c11e2e: feat(@frames.js/render): allow to debug images
- Updated dependencies [6c11e2e]
- Updated dependencies [6c11e2e]
- Updated dependencies [6c11e2e]
  - frames.js@0.17.0

## 0.2.13

### Patch Changes

- b06b5b3: fix(@frames.js/render): properly handle redirects
- Updated dependencies [acd0362]
  - frames.js@0.16.6

## 0.2.12

### Patch Changes

- Updated dependencies [dbae533]
  - frames.js@0.16.5

## 0.2.11

### Patch Changes

- Updated dependencies [b3431da]
- Updated dependencies [904241e]
  - frames.js@0.16.4

## 0.2.10

### Patch Changes

- Updated dependencies [b48809e]
- Updated dependencies [44dc3b9]
  - frames.js@0.16.3

## 0.2.9

### Patch Changes

- 56889cb: feat(render): handle transaction and cast actions
- Updated dependencies [e86382d]
- Updated dependencies [ae4fd12]
  - frames.js@0.16.2

## 0.2.8

### Patch Changes

- Updated dependencies [a5e0584]
- Updated dependencies [8d87aaa]
  - frames.js@0.16.1

## 0.2.7

### Patch Changes

- 8984e8d: feat(render): export next route handlers in isolated file
- Updated dependencies [0f9a59c]
- Updated dependencies [d24572d]
- Updated dependencies [a99a5ca]
- Updated dependencies [2251c93]
  - frames.js@0.16.0

## 0.2.6

### Patch Changes

- 3779fd0: feat: add `responseBody` to `requestError` stack item
- Updated dependencies [3779fd0]
- Updated dependencies [5156ae7]
  - frames.js@0.15.3

## 0.2.5

### Patch Changes

- 66d5a5d: feat: store source for post requests so we can render them in case of message returned from server
- 032b413: feat: parse frames.js version from meta tags and show in debugger
- b938940: fix: do not require double click when changing debug url in the middle of debugging session
- Updated dependencies [2fec9c9]
- Updated dependencies [032b413]
  - frames.js@0.15.2

## 0.2.4

### Patch Changes

- bb9c33d: feat: `allowPartialFrame` option for FrameUI
- Updated dependencies [9054c48]
  - frames.js@0.15.1

## 0.2.3

### Patch Changes

- f7d0193: feat: expose frame stack reducer dispatch and allow fetch frame override for post buttons
- Updated dependencies [d5c683e]
- Updated dependencies [6ac2524]
  - frames.js@0.15.0

## 0.2.2

### Patch Changes

- c2acf9e: fix: only include address context in transaction requests
- e65983d: feat: improve debugger farcaster identities management
- Updated dependencies [3a7b64c]
  - frames.js@0.14.1

## 0.2.1

### Patch Changes

- b4f5be1: fix: lock neverthrow version until it is fixed upstream

## 0.2.0

### Minor Changes

- 1ca5d9b: feat: Breaking change! Dynamic frame context types, move connected address into its own property in `useFrame`
- 1ca5d9b: feat: Breaking change! Update getFrames to parse different Frames specifications separately

### Patch Changes

- Updated dependencies [1ca5d9b]
  - frames.js@0.14.0

## 0.1.5

### Patch Changes

- e07cf94: fix: signFrameAction type error
- 41c980b: fix: include frame state in untrusted data

## 0.1.4

### Patch Changes

- Updated dependencies [651e6b1]
- Updated dependencies [fe92ca0]
  - frames.js@0.13.2

## 0.1.3

### Patch Changes

- Updated dependencies [0d373a9]
- Updated dependencies [0d373a9]
- Updated dependencies [0d373a9]
- Updated dependencies [0d373a9]
- Updated dependencies [0d373a9]
  - frames.js@0.13.0

## 0.1.2

### Patch Changes

- b9bed81: chore: bump frames.js dependency to v0.12.1

## 0.1.1

### Patch Changes

- 7c74f35: feat: frame error message support
- Updated dependencies [424b0ea]
- Updated dependencies [e681ce9]
- Updated dependencies [40934fb]
- Updated dependencies [2290278]
- Updated dependencies [e681ce9]
  - frames.js@0.12.0

## 0.1.0

### Minor Changes

- 84283a8: feat: rename types

### Patch Changes

- bdfad03: fix: correctly detect image change in order to properly indicate loading state
- Updated dependencies [7d22df3]
  - frames.js@0.11.3

## 0.0.3

### Patch Changes

- 64fcee3: fix: image loading state
- Updated dependencies [27d1817]
  - frames.js@0.11.2

## 0.0.2

### Patch Changes

- Updated dependencies [2b25562]
- Updated dependencies [63b6c6b]
- Updated dependencies [29bcbc6]
- Updated dependencies [1434879]
- Updated dependencies [0b681fb]
- Updated dependencies [65c7f6c]
  - frames.js@0.11.0

## 0.0.1

### Patch Changes

- a538797: feat: Breaking change! frames/render has been moved to its own @frames.js/render package
- Updated dependencies [06cbf1c]
- Updated dependencies [a538797]
- Updated dependencies [9d20e11]
- Updated dependencies [457ca30]
- Updated dependencies [66687fe]
- Updated dependencies [5b9169a]
- Updated dependencies [384e282]
  - frames.js@0.10.0
