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
