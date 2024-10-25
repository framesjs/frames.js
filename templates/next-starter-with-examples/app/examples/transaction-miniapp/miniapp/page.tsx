"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

// pass state from frame message
export default function MiniappPage({
  searchParams,
}: {
  // provided by URL returned from composer action server
  searchParams: {
    fromAddress: string;
  };
}) {
  const windowObject = typeof window !== "undefined" ? window : null;

  const [message, setMessage] = useState<any>(null);

  const handleMessage = useCallback((m: MessageEvent) => {
    console.log("received", m);

    if (m.source === windowObject?.parent) {
      setMessage(m.data);
    }
  }, []);

  useEffect(() => {
    windowObject?.addEventListener("message", handleMessage);

    return () => {
      windowObject?.removeEventListener("message", handleMessage);
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
      windowObject?.parent.postMessage(
        {
          jsonrpc: "2.0",
          id: uuidv4(),
          method: "fc_requestWalletAction",
          params: {
            action: {
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
    [windowObject?.parent]
  );

  const handleRequestSignature = useCallback(() => {
    windowObject?.parent.postMessage(
      {
        jsonrpc: "2.0",
        id: uuidv4(),
        method: "fc_requestWalletAction",
        params: {
          action: {
            chainId: "eip155:10", // OP Mainnet 10
            method: "eth_signTypedData_v4",
            params: {
              domain: {
                chainId: 10,
              },
              types: {
                Person: [
                  { name: "name", type: "string" },
                  { name: "wallet", type: "address" },
                ],
                Mail: [
                  { name: "from", type: "Person" },
                  { name: "to", type: "Person" },
                  { name: "contents", type: "string" },
                ],
              },
              primaryType: "Mail",
              message: {
                from: {
                  name: "Cow",
                  wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
                },
                to: {
                  name: "Bob",
                  wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
                },
                contents: "Hello, Bob!",
              },
            },
          },
        },
      },
      "*"
    );
  }, [windowObject?.parent]);

  return (
    <div className="flex flex-col gap-2">
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

      <div className="flex">
        <button
          className="rounded bg-slate-800 text-white p-2 w-full"
          onClick={handleRequestSignature}
        >
          Request Signature
        </button>
      </div>
      {message?.result ? (
        <pre>{JSON.stringify(message?.result, null, 2)}</pre>
      ) : (
        <div className="text-red-500">{message?.result?.message}</div>
      )}
    </div>
  );
}
