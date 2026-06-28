import { z } from "zod";
import { CalculatorInputSchema } from "@/lib/calculator";

/**
 * Lead capture for the gated PDF report. This is consenting marketing data and
 * is deliberately kept separate from anonymous survey responses (different table,
 * different ethical category).
 */
export const LeadInputSchema = z.object({
  name: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().email("A valid email is required"),
  role: z.string().trim().min(1, "Your role is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  companySize: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  /** The calculator inputs that produced the estimate they want reported. */
  calculatorPayload: CalculatorInputSchema,
});

export type LeadInput = z.infer<typeof LeadInputSchema>;
