import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ParsingReport } from "frames.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortedSearchParamsString(searchParams: URLSearchParams) {
  return Array.from(searchParams)
    .sort()
    .map((pair) => pair.join("="))
    .join("&");
}

export function hasWarnings(reports: Record<string, ParsingReport[]>): boolean {
  return Object.values(reports).some((report) =>
    report.some((r) => r.level === "warning")
  );
}

export class InvalidChainIdError extends Error {}

export function isValidChainId(id: string): boolean {
  return id.startsWith("eip155:");
}

export function parseChainId(id: string): number {
  if (!isValidChainId(id)) {
    throw new InvalidChainIdError(`Invalid chainId ${id}`);
  }

  return parseInt(id.split("eip155:")[1]!);
}
