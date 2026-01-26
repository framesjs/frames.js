---
"frames.js": patch
---

### Improvements

- Added comprehensive test coverage for utility functions (`escapeHtmlAttributeValue`, `isValidVersion`, button type guards, `bytesToHexString`, `getByteLength`, `hexStringToUint8Array`, `normalizeCastId`)
- Added tests for core utilities (`joinPaths`, `parseSearchParams`, `isFrameRedirect`, `isFrameDefinition`)
- Added tests for error classes (`RequestBodyNotJSONError`, `InvalidFrameActionPayloadError`, `FrameMessageError`)
- Enhanced JSDoc documentation across utility functions and middleware
- Improved CONTRIBUTING.md with detailed setup, testing, and PR guidelines
