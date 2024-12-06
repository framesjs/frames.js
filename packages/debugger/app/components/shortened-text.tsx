import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function ShortenedText({
  maxLength,
  text,
}: {
  maxLength: number;
  text: string;
}) {
  if (text.length < maxLength) return text;

  return (
    <HoverCard>
      <HoverCardTrigger>{text.slice(0, maxLength - 3)}...</HoverCardTrigger>
      <HoverCardContent className="break-words">{text}</HoverCardContent>
    </HoverCard>
  );
}
