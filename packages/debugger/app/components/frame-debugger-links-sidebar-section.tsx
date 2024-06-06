import { ListIcon, MessageCircleHeart, PlayIcon } from "lucide-react";
import Link from "next/link";

type FrameDebuggerLinksSidebarSectionProps = {
  hasExamples: boolean;
};

export function FrameDebuggerLinksSidebarSection({
  hasExamples,
}: FrameDebuggerLinksSidebarSectionProps) {
  return (
    <div className="border rounded-lg shadow-sm bg-white">
      {hasExamples && (
        <Link className="px-2 py-3 block border-b" href="/">
          <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
            <PlayIcon className="inline" size={16} />
          </span>
          Examples
        </Link>
      )}
      <a
        target="_blank"
        className="px-2 py-3 block"
        href="https://docs.farcaster.xyz/learn/what-is-farcaster/frames"
      >
        <span className="text-slate-400 px-2 w-9 relative text-center inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="inline mb-1"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 1000 1000"
          >
            <path
              fill="#64748b"
              d="M257.778 155.556h484.444v688.889h-71.111V528.889h-.697c-7.86-87.212-81.156-155.556-170.414-155.556-89.258 0-162.554 68.344-170.414 155.556h-.697v315.556h-71.111V155.556z"
            ></path>
            <path
              fill="#64748b"
              d="M128.889 253.333l28.889 97.778h24.444v395.556c-12.273 0-22.222 9.949-22.222 22.222v26.667h-4.444c-12.273 0-22.223 9.949-22.223 22.222v26.667h248.889v-26.667c0-12.273-9.949-22.222-22.222-22.222h-4.444v-26.667c0-12.273-9.95-22.222-22.223-22.222h-26.666V253.333H128.889zM675.556 746.667c-12.273 0-22.223 9.949-22.223 22.222v26.667h-4.444c-12.273 0-22.222 9.949-22.222 22.222v26.667h248.889v-26.667c0-12.273-9.95-22.222-22.223-22.222h-4.444v-26.667c0-12.273-9.949-22.222-22.222-22.222V351.111h24.444L880 253.333H702.222v493.334h-26.666z"
            ></path>
          </svg>
        </span>
        Farcaster Frames Docs
      </a>
      <a
        target="_blank"
        className="px-2 py-3 border-t block"
        href="https://framesjs.org"
      >
        <span className="text-slate-400 px-2 w-9 relative text-center inline-block">
          ↗
        </span>
        Frames.js documentation
      </a>
      <a
        target="_blank"
        className="px-2 py-3 border-t block"
        href="https://warpcast.com/~/compose?text=I%20have%20a%20question%20about%20%40frames!%20cc%20%40df%20%40stephancill."
      >
        <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
          <MessageCircleHeart className="inline" size={16} />
        </span>
        Ask for help
      </a>
      <a
        target="_blank"
        className="px-2 py-3 border-t block"
        href="https://warpcast.com/~/developers/embeds"
      >
        <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
          ⬗
        </span>
        Warpcast Frame Debugger
      </a>
      <a
        target="_blank"
        className="px-2 py-3 border-t block"
        href="https://github.com/davidfurlong/awesome-frames?tab=readme-ov-file"
      >
        <span className="text-slate-400 px-2 w-9 relative text-center inline-block bottom-[1px]">
          <ListIcon className="inline" size={16} />
        </span>
        Awesome Frames
      </a>
    </div>
  );
}
