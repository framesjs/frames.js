// Format function modified from nodejs
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

import type { UrlObject } from "node:url";
import type { ParsedUrlQuery } from "node:querystring";

// function searchParamsToUrlQuery(searchParams: URLSearchParams): ParsedUrlQuery {
//   const query: ParsedUrlQuery = {};
//   searchParams.forEach((value, key) => {
//     if (typeof query[key] === "undefined") {
//       query[key] = value;
//     } else if (Array.isArray(query[key])) {
//       (query[key] as string[]).push(value);
//     } else {
//       query[key] = [query[key] as string, value];
//     }
//   });
//   return query;
// }

function stringifyUrlQueryParam(param: unknown): string {
  if (
    typeof param === "string" ||
    (typeof param === "number" && !isNaN(param)) ||
    typeof param === "boolean"
  ) {
    return String(param);
  }

  return "";
}

function urlQueryToSearchParams(urlQuery: ParsedUrlQuery): URLSearchParams {
  const result = new URLSearchParams();
  Object.entries(urlQuery).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        result.append(key, stringifyUrlQueryParam(item));
      });
    } else {
      result.set(key, stringifyUrlQueryParam(value));
    }
  });
  return result;
}

// function assign(
//   target: URLSearchParams,
//   ...searchParamsList: URLSearchParams[]
// ): URLSearchParams {
//   searchParamsList.forEach((searchParams) => {
//     Array.from(searchParams.keys()).forEach((key) => target.delete(key));
//     searchParams.forEach((value, key) => target.append(key, value));
//   });
//   return target;
// }

const slashedProtocols = /https?|ftp|gopher|file/;

export function formatUrl(urlObj: UrlObject): string {
  let { auth } = urlObj;
  const { hostname } = urlObj;
  let protocol = urlObj.protocol || "";
  let pathname = urlObj.pathname || "";
  let hash = urlObj.hash || "";
  let query = urlObj.query || "";
  let host: string | false = false;

  auth = auth ? `${encodeURIComponent(auth).replace(/%3A/i, ":")}@` : "";

  if (urlObj.host) {
    host = auth + urlObj.host;
  } else if (hostname) {
    host = auth + (hostname.includes(":") ? `[${hostname}]` : hostname);
    if (urlObj.port) {
      host += `:${urlObj.port}`;
    }
  }

  if (query && typeof query === "object") {
    query = String(urlQueryToSearchParams(query as ParsedUrlQuery));
  }

  let search = urlObj.search || (query && `?${query}`) || "";

  if (protocol && !protocol.endsWith(":")) protocol += ":";

  if (
    urlObj.slashes ||
    ((!protocol || slashedProtocols.test(protocol)) && host !== false)
  ) {
    host = `//${host || ""}`;
    if (pathname && !pathname.startsWith("/")) {
      pathname = `/${pathname}`;
    }
  } else if (!host) {
    host = "";
  }

  if (hash && !hash.startsWith("#")) hash = `#${hash}`;
  if (search && !search.startsWith("?")) search = `?${search}`;

  pathname = pathname.replace(/[?#]/g, encodeURIComponent);
  search = search.replace("#", "%23");

  return `${protocol}${host}${pathname}${search}${hash}`;
}
