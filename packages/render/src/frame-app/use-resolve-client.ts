import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameClientConfig } from "./types";

export type ResolveClientFunction = (options: {
  signal: AbortSignal;
}) => Promise<FrameClientConfig>;

type UseResolveClientOptions = {
  client: FrameClientConfig | ResolveClientFunction;
};

type UseResolveClientResult =
  | {
      status: "success";
      client: FrameClientConfig;
    }
  | {
      status: "error";
      error: Error;
    }
  | {
      status: "pending";
    };

export function useResolveClient({
  client,
}: UseResolveClientOptions): UseResolveClientResult {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UseResolveClientResult>(() => {
    if (typeof client !== "function") {
      return {
        status: "success",
        client,
      };
    }

    return {
      status: "pending",
    };
  });

  const resolveClient = useCallback((resolve: ResolveClientFunction) => {
    // cancel previous request
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    Promise.resolve()
      .then(async () => {
        setState({
          status: "pending",
        });
        const resolvedClient = await resolve({
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        setState({
          status: "success",
          client: resolvedClient,
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
  }, []);

  useEffect(() => {
    if (typeof client !== "function") {
      setState((prevState) => {
        if (prevState.status === "success" && prevState.client !== client) {
          return {
            status: "success",
            client,
          };
        }

        return prevState;
      });
    } else {
      resolveClient(client);
    }
  }, [client, resolveClient]);

  return state;
}
