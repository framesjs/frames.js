import type { 
    ActionIndex, 
    FrameReducer,
    FrameState, 
    PreviousFrame, 
    Dispatch 
} from "frames.js/next/server";
/**
 *
 * @param reducer a function taking a state and action and returning another action. This reducer is always called in the Frame to compute the state by calling it with the previous Frame + action
 * @param initialState the initial state to use if there was no previous action
 * @param initializerArg the previousFrame object to use to initialize the state
 * @returns An array of [State, Dispatch] where State is your reducer state, and dispatch is a function that doesn't do anything atm
 */
export function useFramesReducer<T extends FrameState = FrameState>(
    reducer: FrameReducer<T>,
    initialState: T,
    initializerArg: PreviousFrame<T>
  ): [T, Dispatch] {
    console.log('reducer --=> ', reducer)
    console.log('initialState --=> ', initialState)
    console.log('initializerArg --=> ', initializerArg)

    function frameReducerInit(initial: PreviousFrame<T>): T {
      console.log('useFramesReducer --=> ', initial)
      if (initial.prevState === null || initial.postBody === null)
        return initialState;
  
      return reducer(initial.prevState, initial);
    }
  
    // doesn't do anything right now, but exists to make Button onClicks feel more natural and not magic.
    function dispatch(actionIndex: ActionIndex) {}
  
    return [frameReducerInit(initializerArg), dispatch];
  }