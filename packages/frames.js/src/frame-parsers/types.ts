import type { Frame } from "../types";

export type ParsedButton = {
  action?: string;
  label?: string;
  target?: string;
  post_url?: string;
  index: number;
};

export type ParsedFrame = {
  version: string | undefined;
  image: string | undefined;
  ogImage: string | undefined;
  imageAspectRatio: string | undefined;
  inputText: string | undefined;
  postUrl: string | undefined;
  state: string | undefined;
  buttons?: ParsedButton[];
};

export type ParseErrorSource = "farcaster" | "openframes";

export type ParseError = {
  message: string;
  source: ParseErrorSource;
};

export type ParseResult =
  | {
      frame: Frame;
    }
  | {
      frame: Partial<Frame>;
      errors: Record<string, ParseError[]>;
    };
