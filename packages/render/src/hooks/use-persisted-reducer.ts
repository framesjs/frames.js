import { type Reducer, useEffect, useRef, useState } from "react";

type AsyncDispatch<TAction> = (action: TAction) => Promise<void>;

type StorageableReducer<TState, TAction> = [TState, AsyncDispatch<TAction>];

const unitializedState = Symbol("unitializedState");

export function usePersistedReducer<TState, TAction>(
  reducer: Reducer<TState, TAction>,
  /**
   * Used when initial state has not been loaded yet
   */
  initialState: TState,
  /**
   * Called once when the component is mounted
   */
  loadInitialState: () => Promise<TState>,
  /**
   * Called each time the dispatch is called
   */
  saveState: (state: TState) => Promise<void>
): StorageableReducer<TState, TAction> {
  const [state, setState] = useState<TState>(initialState);
  const latestStateRef = useRef<TState | symbol>(unitializedState);
  const loadInitialStateRef = useRef(loadInitialState);

  useEffect(() => {
    loadInitialStateRef
      .current()
      .then((loadedInitialState) => {
        latestStateRef.current = loadedInitialState;
        setState(loadedInitialState);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console -- provide feedback
        console.error("@frames.js/render: Could not initialize state", e);
      });
  }, []);

  const dispatch: AsyncDispatch<TAction> = async (action) => {
    if (latestStateRef.current === unitializedState) {
      throw new Error(
        "@frames.js/render: Cannot dispatch action before state is initialized"
      );
    }

    latestStateRef.current = reducer(latestStateRef.current as TState, action);

    await saveState(latestStateRef.current);
    setState(latestStateRef.current);
  };

  return [state, dispatch];
}
