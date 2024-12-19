import { createContext, useContext } from "react";

const protocolSelectorContext = createContext({
  open() {},
});

protocolSelectorContext.displayName = "ProtocolSelectorContext";

export function useProtocolSelector() {
  return useContext(protocolSelectorContext);
}

export const ProtocolSelectorProvider = protocolSelectorContext.Provider;
