"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayIcon } from "lucide-react";
import Link from "next/link";

export type ExampleItem = {
  title: string;
  url: string;
};

type FrameDebuggerExamplesSectionProps = {
  examples: ExampleItem[] | null;
};

export function FrameDebuggerExamplesSection({
  examples,
}: FrameDebuggerExamplesSectionProps) {
  if (!examples || examples.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-grow flex-col items-center justify-center p-2">
      <Card>
        <CardHeader>
          <CardTitle>Examples</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {examples.map((example) => {
            return (
              <Link
                key={example.url}
                className="py-1 inline-flex items-center gap-2 font-semibold"
                href={{
                  pathname: "/",
                  query: { url: example.url },
                }}
              >
                <span className="text-slate-400 relative text-center inline-block">
                  <PlayIcon size={16} />
                </span>
                {example.title}
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
