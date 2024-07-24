import Link from "next/link";

const examples = [
  {
    title: "Basic",
    path: "/examples/basic",
  },
  {
    title: "Cache Control",
    path: "/examples/cache-control",
  },
  {
    title: "Cast Actions",
    path: "/examples/cast-actions",
  },
  {
    title: "Composer Actions",
    path: "/examples/composer-actions",
  },
  {
    title: "Custom Font (edge)",
    path: "/examples/custom-font-edge",
  },
  {
    title: "Custom Font (inline)",
    path: "/examples/custom-font-inline",
  },
  {
    title: "Custom Font (nodejs)",
    path: "/examples/custom-font-nodejs",
  },
  {
    title: "Custom Farcaster Hub",
    path: "/examples/custom-hub",
  },
  {
    title: "Custom Middleware",
    path: "/examples/custom-middleware",
  },
  {
    title: "Dynamic Image",
    path: "/examples/dynamic-image",
  },
  {
    title: "Dynamic Routes",
    path: "/examples/dynamic-routes",
  },
  {
    title: "Error Message handling",
    path: "/examples/error-handling",
  },
  {
    title: "Images Worker",
    path: "/examples/images-worker",
  },
  {
    title: "Images Worker (Custom)",
    path: "/examples/images-worker-custom",
  },
  {
    title: "Inline Images",
    path: "/examples/inline-images",
  },
  {
    title: "Mint Button",
    path: "/examples/mint-button",
  },
  {
    title: "Multi Page",
    path: "/examples/multi-page",
  },
  {
    title: "Multi Protocol",
    path: "/examples/multi-protocol",
  },
  {
    title: "Neynar",
    path: "/examples/neynar",
  },
  {
    title: "Only Followers Can Mint",
    path: "/examples/only-followers-can-mint",
  },
  {
    title: "Post Redirect",
    path: "/examples/post-redirect",
  },
  {
    title: "Slow Request",
    path: "/examples/slow-request",
  },
  {
    title: "State",
    path: "/examples/state",
  },
  {
    title: "State Signing",
    path: "/examples/state-signing",
  },
  {
    title: "State via Query Params",
    path: "/examples/state-via-query-params",
  },
  {
    title: "Transactions",
    path: "/examples/transactions",
  },
  {
    title: "User Data",
    path: "/examples/user-data",
  },
  {
    title: "Wallet Signatures",
    path: "/examples/wallet-signatures",
  },
];

export default function ExamplesIndexPage() {
  return (
    <div className="p-2 flex flex-col gap-2">
      <b>Frames.js examples</b>
      <ul>
        {examples.map((example) => (
          <li key={example.path}>
            <Link className="underline" href={example.path}>
              {example.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
