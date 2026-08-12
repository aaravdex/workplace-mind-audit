/**
 * OPEN-TEXT PRIMITIVES (privacy-critical).
 *
 * The optional free-text questions and the deterministic redaction applied
 * SERVER-SIDE before anything is stored or shown. Redaction strips the obvious
 * identifying patterns (emails, phone numbers, URLs, @handles). Free-text name
 * detection is not reliably deterministic, so the design leans on: redaction of
 * clear PII, no small-N verbatims, and a no-verbatims mode (enforced in the
 * thematic-analysis engine, lib/thematicAnalysis.ts).
 */

export interface OpenTextQuestion {
  id: number;
  text: string;
}

/** Optional free-text questions (ids 201+ never collide with the Likert bank). */
export const OPEN_TEXT_QUESTIONS: OpenTextQuestion[] = [
  { id: 201, text: "What is the single greatest avoidable source of pressure in your work?" },
  { id: 202, text: "If we could stop one thing, what should it be?" },
  { id: 203, text: "What is one thing your manager could do differently?" },
  { id: 204, text: "What helps you perform at your best?" },
  { id: 205, text: "Anything else we haven't asked about?" },
];

const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const PHONE = /\b\+?\d[\d\s().-]{7,}\d\b/g;
const HANDLE = /(^|\s)@\w+/g;

/** Strip clear identifying patterns before storage or display. */
export function redactOpenText(text: string): string {
  return text
    .replace(EMAIL, "[redacted]")
    .replace(URL, "[redacted]")
    .replace(PHONE, "[redacted]")
    .replace(HANDLE, "$1[redacted]")
    .trim();
}
