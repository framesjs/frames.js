import { headers } from "next/headers";
import App from "./app";
import { Providers } from "./providers";

export default function Home({
  searchParams,
}: {
  searchParams: Record<string, string>;
}): JSX.Element {
  return (
    <Providers cookie={headers().get("cookie") ?? ""}>
      <App searchParams={searchParams} />
    </Providers>
  );
}
