export function sortedSearchParamsString(searchParams: URLSearchParams) {
  return Array.from(searchParams)
    .sort()
    .map((pair) => pair.join("="))
    .join("&");
}
