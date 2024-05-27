import { Console, Hook, Unhook } from "console-feed";
import type { Message } from "console-feed/lib/definitions/Component";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export function useDebuggerConsole(): {
  logs: Message[];
  clear: () => void;
} {
  const [consoleLogs, setConsoleLogs] = useState<Message[]>([]);

  useEffect(() => {
    const hookedConsole = Hook(
      window.console,
      (log) => setConsoleLogs((logs) => [...logs, log as Message]),
      false
    );

    return () => {
      Unhook(hookedConsole);
    };
  }, []);

  const clear = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  return { logs: consoleLogs, clear };
}

const context = createContext<Message[]>([]);

context.displayName = "DebuggerConsoleContext";

export const DebuggerConsoleContextProvider = context.Provider;

type DebuggerConsoleProps = {
  onMount?: (element: HTMLDivElement) => void;
};

export function DebuggerConsole({ onMount }: DebuggerConsoleProps) {
  const logs = useContext(context);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onMountRef = useRef(onMount);
  onMountRef.current = onMount;

  useEffect(() => {
    if (wrapperRef.current) {
      onMountRef.current?.(wrapperRef.current);
    }
  }, []);

  return (
    <div ref={wrapperRef}>
      <Console logs={logs} variant="light"></Console>
    </div>
  );
}
