import type { ParseFramesV2ResultWithFrameworkDetails } from "frames.js/frame-parsers";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFreshRef } from "../hooks/use-fresh-ref";
import { fetchProxied } from "../unstable-use-fetch-frame";
import { isParseFramesWithReportsResult } from "../helpers";

type State =
  | {
      status: "success";
      frame: ParseFramesV2ResultWithFrameworkDetails;
      source: string | URL | ParseFramesV2ResultWithFrameworkDetails;
    }
  | {
      status: "error";
      error: Error;
    }
  | {
      status: "pending";
    };

type UseFetchFrameAppOptions = {
  source: string | URL | ParseFramesV2ResultWithFrameworkDetails;
  proxyUrl: string;
  fetchFn?: typeof fetch;
};

type UseFetchFrameAppResult = State;

const defaultFetchFunction: typeof fetch = (...args) => fetch(...args);

export function useFetchFrameApp({
  fetchFn,
  source,
  proxyUrl,
}: UseFetchFrameAppOptions): UseFetchFrameAppResult {
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchRef = useFreshRef(fetchFn ?? defaultFetchFunction);
  const [state, setState] = useState<State>(() => {
    if (typeof source === "string" || source instanceof URL) {
      return {
        status: "pending",
      };
    }

    return {
      status: "success",
      frame: source,
      source,
    };
  });

  const fetchFrame = useCallback(
    (sourceUrl: string | URL) => {
      // cancel previous request
      abortControllerRef.current?.abort();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // we don't want to return promise from fetchFrame because it is used in effect
      Promise.resolve(sourceUrl)
        .then(async (url) => {
          setState({
            status: "pending",
          });

          const responseOrError = await fetchProxied({
            fetchFn: fetchRef.current,
            url: url.toString(),
            parseFarcasterManifest: true,
            proxyUrl,
            signal: abortController.signal,
          });

          if (responseOrError instanceof Error) {
            throw responseOrError;
          }

          if (!responseOrError.ok) {
            throw new Error(
              `Failed to fetch frame, server returned status ${responseOrError.status}`
            );
          }

          const data = (await responseOrError.json()) as Promise<unknown>;

          if (!isParseFramesWithReportsResult(data)) {
            throw new Error(
              "Invalid response, expected parse result, make sure you are using @frames.js/render proxy"
            );
          }

          if (abortController.signal.aborted) {
            return;
          }

          setState({
            status: "success",
            frame: data.farcaster_v2,
            source: sourceUrl,
          });
        })
        .catch((e) => {
          if (abortController.signal.aborted) {
            return;
          }

          setState({
            status: "error",
            error: e instanceof Error ? e : new Error(String(e)),
          });
        });

      return () => {
        abortController.abort();
      };
    },
    [fetchRef, proxyUrl]
  );

  useEffect(() => {
    if (typeof source === "string" || source instanceof URL) {
      return fetchFrame(source);
    }

    setState((val) => {
      if (val.status === "success" && val.source === source) {
        return val;
      }

      return {
        status: "success",
        frame: source,
        source,
      };
    });
  }, [source, fetchFrame]);

  return state;
}
