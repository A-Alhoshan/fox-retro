import { cn } from "@/lib/utils";

const PALETTE = ["#D97757", "#788C5D", "#6A9BCC", "#C2A06B", "#B07AA1", "#5E9C94", "#D4835F", "#8C7AB8"];

export function colorFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

export function Avatar({
  id,
  name,
  online,
  size = 36,
  className,
}: {
  id: string;
  name: string;
  online?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-background", className)}
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -end-0.5 size-3 rounded-full ring-2 ring-background",
            online ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
      )}
    </span>
  );
}
