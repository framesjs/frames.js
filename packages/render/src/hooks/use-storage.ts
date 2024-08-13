import { useCallback, useEffect, useRef, useState } from "react";
import type { Storage } from "../identity/types";
import { WebStorage } from "../identity/storage";

type Primitives = string | number | boolean | null;
type Arr = AllowedValue[];
type Obj = { [key in string]: AllowedValue } & {
  [key in string]?: AllowedValue | undefined;
};
type AllowedValue = Primitives | Arr | Obj;

type UseStorageOptions<TValue extends AllowedValue | undefined> = {
  key: string;
  initialValue?: TValue;
  preprocessValue?: (value: TValue) => TValue;
  /**
   * @defaultValue WebStorage
   */
  storage?: Storage;
};

type Setter<TValue extends AllowedValue | undefined> = (
  value: TValue | ((prevState: TValue) => TValue)
) => Promise<void>;

const defaultStorage = new WebStorage();

export function useStorage<TValue extends AllowedValue | undefined>(
  options: UseStorageOptions<TValue>
): [TValue, Setter<TValue>];

export function useStorage<
  TValue extends AllowedValue | undefined = undefined,
>({
  key,
  initialValue,
  preprocessValue,
  storage = defaultStorage,
}: UseStorageOptions<TValue>): [
  TValue | undefined,
  Setter<TValue | undefined>,
] {
  const storageRef = useRef(storage);
  const preprocessValueRef = useRef(preprocessValue);
  preprocessValueRef.current = preprocessValue;
  const [value, setValue] = useState<TValue | undefined>(initialValue);

  useEffect(() => {
    const listener = (newValue: TValue | undefined): void => {
      if (newValue === undefined) {
        setValue(undefined);
        return;
      }

      setValue(
        preprocessValueRef.current
          ? preprocessValueRef.current(newValue)
          : newValue
      );
    };

    const unsubscribe = storageRef.current.watch(key, listener);

    return () => {
      unsubscribe();
    };
  }, [key]);

  const setState: Setter<TValue | undefined> = useCallback(
    async (setter) => {
      await storageRef.current.set<TValue | undefined>(
        key,
        typeof setter === "function" ? setter : () => setter
      );
    },
    [key]
  );

  return [value, setState];
}
