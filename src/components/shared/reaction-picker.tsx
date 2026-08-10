"use client";

import { useState } from "react";
import { toast } from "sonner";
import { toggleReaction } from "@/actions/message.actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";

const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "😮", "🎉"];

export type ReactionData = { emoji: string; userId: string; userName: string };

export function ReactionPicker({
  taskCommentId,
  messageId,
  reactions,
  currentUserId,
}: {
  taskCommentId?: string;
  messageId?: string;
  reactions: ReactionData[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);

  const grouped = new Map<string, ReactionData[]>();
  for (const r of reactions) {
    grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r]);
  }

  async function handleToggle(emoji: string) {
    setOpen(false);
    try {
      await toggleReaction({ emoji, taskCommentId, messageId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from(grouped.entries()).map(([emoji, list]) => {
        const reactedByMe = list.some((r) => r.userId === currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggle(emoji)}
            title={list.map((r) => r.userName).join(", ")}
            className={`rounded-full border px-1.5 py-0.5 text-xs ${
              reactedByMe ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            {emoji} {list.length}
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1">
          <div className="flex gap-1">
            {AVAILABLE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggle(emoji)}
                className="rounded p-1 text-base hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
