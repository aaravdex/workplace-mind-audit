import { z } from "zod";

/**
 * The human-authored interpretation layer. A consultant writes one executive
 * summary paragraph and optional short notes per dimension; these render in the
 * dashboard and the PDF so each deliverable reads as authored, not generated.
 */
export const AnnotationInputSchema = z.object({
  executiveSummaryNote: z.string().trim().max(2000).default(""),
  /** { capacity: "...", clarity: "...", ... } — keys sanitised server-side. */
  dimensionNotes: z.record(z.string(), z.string().trim().max(1000)).default({}),
});

export type AnnotationInput = z.infer<typeof AnnotationInputSchema>;

export interface AuditAnnotation {
  executiveSummaryNote: string;
  dimensionNotes: Record<string, string>;
}
