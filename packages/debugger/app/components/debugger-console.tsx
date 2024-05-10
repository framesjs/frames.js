import { Console, Hook, Unhook } from "console-feed";
import type { Message } from "console-feed/lib/definitions/Component";
import { createContext, useContext, useEffect, useState } from "react";

export function useDebuggerConsole(): Message[] {
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

  return consoleLogs;
}

const context = createContext<Message[]>([]);

context.displayName = "DebuggerConsoleContext";

export const DebuggerConsoleContextProvider = context.Provider;

export function DebuggerConsole() {
  const logs = useContext(context);

  return <Console logs={logs} variant="light"></Console>;
}
