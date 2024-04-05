import { FrameMessageError } from "./errors";

// https://stackoverflow.com/a/39495173/11363384
type Enumerate<
  N extends number,
  Acc extends number[] = [],
> = Acc["length"] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc["length"]]>;

type IntRange<F extends number, T extends number> = Exclude<
  Enumerate<T>,
  Enumerate<F>
>;

/**
 * Throws an error for presentation to the user.
 * @param message - The error message (max 90 characters).
 * @param status - The 4XX HTTP status code to return (default: 400)
 */
export function error(
  message: string,
  status: IntRange<400, 500> = 400
): never {
  throw new FrameMessageError(message, status);
}
