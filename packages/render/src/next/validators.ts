import type { SupportedParsingSpecification } from "frames.js";

export function isSpecificationValid(
  specification: unknown
): specification is SupportedParsingSpecification {
  return (
    typeof specification === "string" &&
    ["farcaster", "openframes"].includes(specification)
  );
}
