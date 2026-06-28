/**
 * Tiny class-name joiner. Filters falsy values so conditional classes read
 * cleanly: cn("base", active && "is-active"). Dependency-free on purpose —
 * we can swap in clsx/tailwind-merge later if class conflicts become an issue.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
