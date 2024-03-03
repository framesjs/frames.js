import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sortedSearchParamsString(searchParams: URLSearchParams) {
  return Array.from(searchParams)
    .sort()
    .map((pair) => pair.join("="))
    .join("&");
}
