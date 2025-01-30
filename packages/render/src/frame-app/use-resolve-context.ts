import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolveContextFunction, FrameContext } from "./types";

type UseResolveContextOptions = {
  context: FrameContext | ResolveContextFunction;
};

type UseResolveContextResult =
  | {
      status: "success";
      context: FrameContext;
    }
  | {
      status: "error";
      error: Error;
    }
  | {
      status: "pending";
    };

export function useResolveContext({
  context,
}: UseResolveContextOptions): UseResolveContextResult {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UseResolveContextResult>(() => {
    if (typeof context !== "function") {
      return {
        status: "success",
        context,
      };
    }

    return {
      status: "pending",
    };
  });

  const resolveContext = useCallback((resolve: ResolveContextFunction) => {
    // cancel previous request
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    Promise.resolve()
      .then(async () => {
        setState({
          status: "pending",
        });
        const resolvedContext = await resolve({
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        setState({
          status: "success",
          context: resolvedContext,
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
      abortController.abort(
        "Aborted because the component has been unmounted/remounted"
      );
    };
  }, []);

  useEffect(() => {
    if (typeof context !== "function") {
      setState((prevState) => {
        if (prevState.status === "success" && prevState.context !== context) {
          return {
            status: "success",
            context,
          };
        }

        return prevState;
      });
    } else {
      return resolveContext(context);
    }
  }, [context, resolveContext]);

  return state;
}
