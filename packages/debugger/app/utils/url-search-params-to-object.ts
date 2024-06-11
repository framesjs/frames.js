export function urlSearchParamsToObject(
  searchParams: URLSearchParams
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of searchParams.entries()) {
    // each 'entry' is a [key, value] tupple
    if (value.startsWith("{")) {
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch (err) {}
    }
    result[key] = value;
  }

  return result;
}
