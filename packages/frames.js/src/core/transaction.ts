import type { TransactionTargetResponse } from "../types";

/**
 * Returns a response containing the transaction data conforming to the frames spec.
 * @param txdata - The transaction data to return.
 */
export function transaction(txdata: TransactionTargetResponse): Response {
  return Response.json(txdata);
}
