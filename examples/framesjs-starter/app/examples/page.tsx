import Link from "next/link";

export default function ExamplesIndexPage() {
  return (
    <div className="p-2 flex flex-col gap-2">
      <b>Frames.js v0.9</b>
      <ul>
        <li>
          <Link className="underline" href="/examples/new-api">
            Basic
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/new-api-transaction">
            Transactions
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/new-api-multi-page">
            Multi Page
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/new-api-mint-button">
            Mint button
          </Link>
        </li>
        <li>
          <Link
            className="underline"
            href="/examples/new-api-only-followers-can-mint"
          >
            Only followers can mint
          </Link>
        </li>
      </ul>
      <b>Frames.js v0.8 and below</b>
      <ul>
        <li>
          <Link className="underline" href="/">
            Basic
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/transaction">
            Transactions
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/custom-hub">
            Custom Hub
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/mint-button">
            Mint button
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/multi-page">
            Multi page
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/multi-protocol">
            Multi protocol
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/only-followers-can-mint">
            Only followers can mint
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/slow-request">
            Slow request
          </Link>
        </li>
        <li>
          <Link className="underline" href="/examples/user-data">
            User data
          </Link>
        </li>
        <li>
          <Link className="underline" href="/page-router">
            Page router
          </Link>
        </li>
      </ul>
    </div>
  );
}
