import type { Reporter } from "./types";

export function validate<TValidator extends (...args: any) => any>(
  reporter: Reporter,
  errorKey: string,
  validator: TValidator,
  ...validatorArgs: Parameters<TValidator>
): ReturnType<TValidator> | undefined {
  try {
    const result = validator(...validatorArgs);
    reporter.valid(errorKey, result);
    return result;
  } catch (e) {
    reporter.error(errorKey, e);

    return undefined;
  }
}
