/* eslint-disable @next/next/no-img-element */
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import Image from "next/image";

type UserDetails = {
  username: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
    };
  };
  follower_count: number;
  following_count: number;
};

type FrameAppDebuggerViewProfileDialogProps = {
  fid: number;
  onDismiss: () => void;
};

const UserDetailsSchema = z.object({
  username: z.string(),
  pfp_url: z.string().url(),
  profile: z.object({
    bio: z.object({
      text: z.string(),
    }),
  }),
  follower_count: z.number().int(),
  following_count: z.number().int(),
});

async function fetchUser(fid: number): Promise<UserDetails> {
  const response = await fetch(`/farcaster/user/${fid}`);

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();

  return UserDetailsSchema.parse(data);
}

export function FrameAppDebuggerViewProfileDialog({
  fid,
  onDismiss,
}: FrameAppDebuggerViewProfileDialogProps) {
  const query = useQuery({
    queryKey: ["user", fid],
    queryFn: () => fetchUser(fid),
  });

  return (
    <Dialog open={true} onOpenChange={onDismiss}>
      <DialogContent>
        <DialogTitle>Profile Details</DialogTitle>
        {query.isLoading && (
          <DialogDescription className="flex items-center justify-center">
            <Loader2Icon className="animate-spin" />
          </DialogDescription>
        )}
        {query.isError && (
          <DialogDescription className="flex flex-col items-center justify-center text-red-500">
            <TriangleAlertIcon className="mb-2 w-6 h-6" />
            <span className="font-semibold">Unexpected error occurred</span>
          </DialogDescription>
        )}
        {query.isSuccess && (
          <DialogDescription className="flex flex-col gap-2 items-center justify-center">
            <div className="flex items-center">
              <div className="aspect-square h-[80px] w-[80px] rounded-full overflow-hidden">
                <img
                  className="w-full h-full object-contain"
                  src={query.data.pfp_url}
                  alt={query.data.username}
                  width={80}
                />
              </div>
            </div>
            <strong className="text-lg">{query.data.username}</strong>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 text-center">
              <div>
                <strong>{formatCount(query.data.follower_count)}</strong>{" "}
                followers
              </div>
              <div>
                <strong>{formatCount(query.data.following_count)}</strong>{" "}
                following
              </div>
            </div>
            <span>{query.data.profile.bio.text}</span>
          </DialogDescription>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count >= 1000 && count < 1000000) {
    return (count / 1000).toFixed(1) + "K";
  }

  return (count / 1000000).toFixed(1) + "M";
}
