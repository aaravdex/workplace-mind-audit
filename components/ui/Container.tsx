import { cn } from "@/lib/utils";

/** Centres content at the standard page width with responsive gutters. */
export function Container({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "section" | "header" | "footer" | "main";
  className?: string;
  children: React.ReactNode;
}) {
  return <Tag className={cn("container-page", className)}>{children}</Tag>;
}
