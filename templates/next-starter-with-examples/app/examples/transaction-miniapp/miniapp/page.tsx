"use client";

import { useCallback, useEffect, useState } from "react";

// pass state from frame message
export default function MiniappPage({
  searchParams,
}: {
  // provided by URL returned from composer action server
  searchParams: {
    fromAddress: string;
  };
}) {
  const [message, setMessage] = useState<any>(null);

  const handleMessage = useCallback((m: MessageEvent) => {
    console.log("received", m);

    if (m.source === window.parent) {
      setMessage(m.data);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const ethAmount = formData.get("ethAmount") as string;
      const recipientAddress = formData.get(
        "recipientAddress"
      ) as `0x${string}`;

      // Handle form submission here
      window.parent.postMessage(
        {
          type: "requestTransaction",
          data: {
            requestId: "01ef6570-5a51-48fa-910c-f419400a6d0d",
            tx: {
              chainId: "eip155:10",
              method: "eth_sendTransaction",
              params: {
                abi: [],
                to: recipientAddress,
                value: (BigInt(ethAmount) * BigInt(10 ** 18)).toString(),
              },
            },
          },
        },
        "*"
      );
    },
    [window?.parent]
  );

  return (
    <div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label htmlFor="eth-amount" className="font-semibold">
          ETH Amount
        </label>
        <input
          className="rounded border border-slate-800 p-2"
          id="eth-amount"
          name="ethAmount"
          placeholder="0.1"
          type="number"
          step="0.000000000000000001"
          min="0"
          value={"0"}
          required
        />

        <label htmlFor="recipient-address" className="font-semibold">
          Recipient Address
        </label>
        <input
          className="rounded border border-slate-800 p-2"
          id="recipient-address"
          name="recipientAddress"
          placeholder="0x..."
          type="text"
          value={searchParams.fromAddress}
          required
        />

        <button className="rounded bg-slate-800 text-white p-2" type="submit">
          Send ETH
        </button>
      </form>
      {message?.data?.success ? (
        <div>Transaction sent successfully</div>
      ) : (
        <div className="text-red-500">{message?.data?.message}</div>
      )}
    </div>
  );
}
