import { createFrameComponent } from "./components";

export type RouterAppState = {
  correctAnswer: number;
  answersCount: number;
};

export const initialState: RouterAppState = {
  correctAnswer: 1,
  answersCount: 0,
};

export const Frame = createFrameComponent<RouterAppState>({
  framesHandlerURL: "/examples/next-routing/frames",
  framesURL: "/examples/next-routing",
});
