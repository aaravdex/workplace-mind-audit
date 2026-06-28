import { DISCLAIMER } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Renders the verbatim non-diagnostic disclaimer. Reused on marketing, survey,
 * and report surfaces so the exact wording is defined once (lib/constants.ts).
 */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-xs leading-relaxed text-brand-400",
        className,
      )}
      role="note"
    >
      {DISCLAIMER}
    </p>
  );
}
