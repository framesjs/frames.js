import Link from "next/link";

export default function ExamplesIndexPage() {
  return (
    <div>
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
      </ul>
    </div>
  );
}
