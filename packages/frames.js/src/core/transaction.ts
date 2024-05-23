import type { TransactionTargetResponse } from "../types";

export class TransactionResponse extends Response {
  constructor(txdata: TransactionTargetResponse) {
    super(JSON.stringify(txdata), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

/**
 * Returns a response containing the transaction data conforming to the frames spec.
 * @param txdata - The transaction data to return.
 */
export function transaction(txdata: TransactionTargetResponse): Response {
  return new TransactionResponse(txdata);
}
