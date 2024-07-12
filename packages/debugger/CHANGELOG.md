# @frames.js/debugger

## 0.3.5

### Patch Changes

- 080f631: feat(@frames.js/debugger): use headless frame ui from render package

## 0.3.4

### Patch Changes

- 2aaec07: feat: add support for type data signatures
- 2fb6679: feat: anoynmous open frames signer

## 0.3.3

### Patch Changes

- c7aad53: fix: xmtp transactions

## 0.3.2

### Patch Changes

- daedd8b: fix(debugger): respect target url passed to signers

## 0.3.1

### Patch Changes

- 0376179: feat(@frames.js/debugger): show collapsed frame preview and title reports
  feat(@frames.js/render): add CollapsedFrameUI component
  feat(frames.js): parse title and allow to report warnings it is missing

## 0.3.0

### Minor Changes

- 6c11e2e: feat(debugger): add image debugging mode

## 0.2.13

### Patch Changes

- b06b5b3: feat(debugger): show response headers
- ddb59ec: feat(debugger): allow examples to be predefined
- b06b5b3: fix(debugger): show examples links only if examples are available
- b06b5b3: fix(debugger): properly handle redirects
- ce837a1: chore: bump rainbowkit,wagmi,viem for smart wallet support

## 0.2.12

### Patch Changes

- 44dc3b9: feat(debugger): lens open frames
- b48809e: chore: bump xmtp validator version
- fb1ac4d: fix(debugger): SIGNER_URL environment variables bug

## 0.2.11

### Patch Changes

- d6eaf5e: feat: enable gnosis chain
- 56889cb: feat: use render package to handle cast actions and transaction errors

## 0.2.10

### Patch Changes

- 9f71ea7: fix: connected address frame context
- 3f2cc78: feat: new examples and stackblitz links to example code

## 0.2.9

### Patch Changes

- 0d61c53: fix(debugger): Open URL button should be a link, use app link in qr code so it is useful on adroid devices as well

## 0.2.8

### Patch Changes

- 3779fd0: feat(debugger): console logs in tab, new request and diagnostics tabs, ui cleanup

## 0.2.7

### Patch Changes

- fc8e469: fix(debugger): invoke farcaster signer creation on sign in press

## 0.2.6

### Patch Changes

- 66d5a5d: fix: render frame errors and messages correctly
- 29c5722: feat: add button tooltips to debugger
- 032b413: feat: parse frames.js version from meta tags and show in debugger
- b938940: fix: do not require double click when changing debug url in the middle of debugging session
- cfa1ecb: feat: improved debugger ux by actionable notifications
- e259432: feat: fallback to hosted debugger signer if no fid, mnemonic or signer url are provided

## 0.2.5

### Patch Changes

- b004687: fix: add specification search param back into debugger proxy

## 0.2.4

### Patch Changes

- 92f6a4a: fix: debugger signer cors allow all
- 57f084e: feat: add degen chain support
- 92f6a4a: feat: delegate signer metadata signatures to hosted debugger by default

## 0.2.3

### Patch Changes

- 71d2eaf: fix: single pending approval for farcaster signers
  fix: only allow single pending signer and replace if new signer request is created
  fix: protocol selection tab persistence
- feat: actions support

## 0.2.2

### Patch Changes

- e65983d: feat: improve debugger farcaster identities management

## 0.2.1

### Patch Changes

- cea7c87: fix: handle value undefined in tx data
- b4f5be1: fix: lock neverthrow version until it is fixed upstream

## 0.2.0

### Minor Changes

- 1ca5d9b: feat: Breaking change! Update getFrames to parse different Frames specifications separately
- 1ca5d9b: feat: Open Frames signers, more strict validation

## 0.1.19

### Patch Changes

- 8b0f661: feat: allow to override default url in debugger

## 0.1.18

### Patch Changes

- 0d373a9: fix: lock nextjs version, move react/react-dom to dependencies
- 0d373a9: fix: cloudflare worker starter script command
- 0d373a9: fix: use also FARCASTER_DEVELOPER_FID env variable for fid

## 0.1.17

### Patch Changes

- c15c6f4: fix: use also FARCASTER_DEVELOPER_FID env variable for fid

## 0.1.16

### Patch Changes

- b9bed81: chore: bump frames.js dependency to v0.12.1

## 0.1.15

### Patch Changes

- 7c74f35: feat: frame error message support

## 0.1.14

### Patch Changes

- 7d22df3: fix: minor bugs and code cleanup
- bdfad03: fix: correctly manipulate url on load and also on change
- d6256cf: fix: properly split dev dependencies in debugger

## 0.1.13

### Patch Changes

- Updated dependencies [27d1817]
- Updated dependencies [64fcee3]
  - frames.js@0.11.2
  - @frames.js/render@0.0.3

## 0.1.12

### Patch Changes

- 46d4dd5: feat: mint tx via reservoir api
- Updated dependencies [f4d5f4f]
- Updated dependencies [3875369]
  - frames.js@0.11.1

## 0.1.11

### Patch Changes

- Updated dependencies [2b25562]
- Updated dependencies [63b6c6b]
- Updated dependencies [29bcbc6]
- Updated dependencies [1434879]
- Updated dependencies [0b681fb]
- Updated dependencies [65c7f6c]
  - frames.js@0.11.0
  - @frames.js/render@0.0.2

## 0.1.10

### Patch Changes

- 63bcd90: fix: debugger history styling improvements
- a538797: feat: Breaking change! frames/render has been moved to its own @frames.js/render package
- Updated dependencies [06cbf1c]
- Updated dependencies [a538797]
- Updated dependencies [9d20e11]
- Updated dependencies [457ca30]
- Updated dependencies [66687fe]
- Updated dependencies [5b9169a]
- Updated dependencies [384e282]
  - frames.js@0.10.0
  - @frames.js/render@0.0.1

## 0.1.9

### Patch Changes

- 0bc7f70: adds testnets

## 0.1.8

### Patch Changes

- Updated dependencies
  - frames.js@0.9.0

## 0.1.7

### Patch Changes

- 5042a38: feat: full tx flow
- 62482dd: feat: debugger transaction support
- Updated dependencies [e9589a5]
- Updated dependencies [c995403]
  - frames.js@0.8.5

## 0.1.6

### Patch Changes

- 4fc8fef: define signer loading state
- 6c9b09d: feat: include user's connected address in frame transaction data request
- Updated dependencies [4fc8fef]
- Updated dependencies [6c9b09d]
- Updated dependencies [faa44a5]
- Updated dependencies [5a609e3]
  - frames.js@0.8.4

## 0.1.5

### Patch Changes

- daec663: fix fallback to env variables

## 0.1.4

### Patch Changes

- fix styles

## 0.1.3

### Patch Changes

- 72e6617: feat: tx support
- 7ccc562: update debugger ui
- Updated dependencies [72e6617]
- Updated dependencies [7ccc562]
  - frames.js@0.8.0

## 0.1.2

### Patch Changes

- rename env var

## 0.1.1

### Patch Changes

- 7aa36f9: Fix signer flow

## 0.1.0

### Minor Changes

- e335829: feat: standalone debugger

### Patch Changes

- Updated dependencies [01fc5fe]
- Updated dependencies [60c6e56]
- Updated dependencies [e335829]
- Updated dependencies [eee74a9]
  - frames.js@0.7.0
