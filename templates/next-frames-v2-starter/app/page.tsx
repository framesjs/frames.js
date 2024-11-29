import { WagmiConfig } from "./WagmiProvider";
import { App } from "./App";

export default async function Home() {
  return (
    <WagmiConfig>
      <App />
    </WagmiConfig>
  );
}
