import { cn } from "@/lib/utils";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          clamped >= 100 ? "bg-emerald-500" : clamped >= 50 ? "bg-primary" : "bg-amber-500"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
