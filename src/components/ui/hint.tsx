"use client";

import { Tooltip } from "@base-ui/react/tooltip";

/**
 * Hover/focus hint for a control: its name in bold plus one line on what it does.
 * Rendered in a portal so toolbars with overflow can't clip it.
 */
export function Hint({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={150} render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={10} collisionPadding={8} className="z-50">
          <Tooltip.Popup className="max-w-64 origin-[var(--transform-origin)] rounded-xl border border-border bg-popover px-3 py-2 text-start text-popover-foreground shadow-xl transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <p className="text-xs font-semibold">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
