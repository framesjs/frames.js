import { WagmiConfig } from "./WagmiConfig";
import { App } from "./app";

export default async function Home() {
  return (
    <WagmiConfig>
      <App />
    </WagmiConfig>
  );
}
