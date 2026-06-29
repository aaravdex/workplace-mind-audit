import { z } from "zod";
import { SECTORS, SIZE_BANDS } from "@/lib/constants";

/** Input for creating an audit (owner-authenticated). */
export const CreateAuditSchema = z.object({
  title: z.string().trim().min(1, "Give the audit a title"),
  organisationName: z.string().trim().min(1, "Organisation name is required"),
  industry: z.string().trim().optional(),
  /** Benchmark segmentation — controlled lists from lib/constants. */
  sector: z.enum(SECTORS).optional(),
  sizeBand: z.enum(SIZE_BANDS).optional(),
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
