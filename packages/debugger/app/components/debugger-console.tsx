import { Console, Hook, Unhook } from "console-feed";
import type { Message } from "console-feed/lib/definitions/Component";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

const LOGS_UPDATED_EVENT = "frames.js/debugger: logs_updated";

type DebuggerConsoleAPI = {
  readonly logs: Message[];
  clear: () => void;
};

export function useDebuggerConsole(): DebuggerConsoleAPI {
  const consoleLogsRef = useRef<Message[]>([]);

  useEffect(() => {
    const hookedConsole = Hook(
      window.console,
      (log) => {
        consoleLogsRef.current = [...consoleLogsRef.current, log as Message];

        window.dispatchEvent(new CustomEvent(LOGS_UPDATED_EVENT));
      },
      false
    );

    return () => {
      Unhook(hookedConsole);
    };
  }, []);

  const clear = useCallback(() => {
    consoleLogsRef.current = [];
    window.dispatchEvent(new CustomEvent(LOGS_UPDATED_EVENT));
  }, []);

  return useMemo(
    () => ({
      get logs() {
        return consoleLogsRef.current;
      },
      clear,
    }),
    [clear]
  );
}

const context = createContext<DebuggerConsoleAPI>({
  logs: [],
  clear: () => {},
});

context.displayName = "DebuggerConsoleContext";

export const DebuggerConsoleContextProvider = context.Provider;

type DebuggerConsoleProps = {
  onMount?: (element: HTMLDivElement) => void;
};

export function DebuggerConsole({ onMount }: DebuggerConsoleProps) {
  const debuggerConsole = useContext(context);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onMountRef = useRef(onMount);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  onMountRef.current = onMount;

  useEffect(() => {
    if (wrapperRef.current) {
      onMountRef.current?.(wrapperRef.current);
    }
  }, []);

  useEffect(() => {
    const handleLogsUpdated = () => {
      forceUpdate();
    };

    window.addEventListener(LOGS_UPDATED_EVENT, handleLogsUpdated);

    return () => {
      window.removeEventListener(LOGS_UPDATED_EVENT, handleLogsUpdated);
    };
  }, []);

  return (
    <div ref={wrapperRef}>
      <Console logs={debuggerConsole.logs} variant="light" />
    </div>
  );
}
