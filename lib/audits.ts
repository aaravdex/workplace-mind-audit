import { z } from "zod";

/** Input for creating an audit (owner-authenticated). */
export const CreateAuditSchema = z.object({
  title: z.string().trim().min(1, "Give the audit a title"),
  organisationName: z.string().trim().min(1, "Organisation name is required"),
  industry: z.string().trim().optional(),
  /** Controlled list of department/segment options offered to respondents. */
  segments: z.array(z.string().trim().min(1)).default([]),
});

export type CreateAuditInput = z.infer<typeof CreateAuditSchema>;

/** Parse a comma/newline-separated segment string into a clean array. */
export function parseSegments(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}
