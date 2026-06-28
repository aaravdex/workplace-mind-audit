import type { Dimension, Question } from "@/types";
import { DIMENSIONS } from "@/lib/constants";

/**
 * The 25 MVP questions. Each maps to exactly one C. All answers are a 1–5 Likert
 * scale (1 = Strongly Disagree, 5 = Strongly Agree). `reverse: true` means
 * agreement indicates *worse* wellbeing and is reverse-scored in lib/scoring.ts.
 *
 * The bank is data, not logic: changing wording or order never touches scoring.
 */
export const QUESTIONS: Question[] = [
  // ── Capacity — workload, energy, recovery ───────────────────────────────────
  {
    id: 1,
    text: "I can usually complete my work within my working hours.",
    dimension: "capacity",
    reverse: false,
  },
  { id: 2, text: "My workload feels manageable.", dimension: "capacity", reverse: false },
  {
    id: 3,
    text: "I often feel mentally exhausted by work.",
    dimension: "capacity",
    reverse: true,
  },
  {
    id: 4,
    text: "I have enough recovery time after intense work.",
    dimension: "capacity",
    reverse: false,
  },
  {
    id: 5,
    text: "I often feel under pressure to work faster than is comfortable.",
    dimension: "capacity",
    reverse: true,
  },

  // ── Clarity — role, priorities, expectations ────────────────────────────────
  {
    id: 6,
    text: "I understand what is expected of me.",
    dimension: "clarity",
    reverse: false,
  },
  { id: 7, text: "My priorities are clear.", dimension: "clarity", reverse: false },
  {
    id: 8,
    text: "I know what success looks like in my role.",
    dimension: "clarity",
    reverse: false,
  },
  {
    id: 9,
    text: "I receive conflicting instructions.",
    dimension: "clarity",
    reverse: true,
  },
  {
    id: 10,
    text: "I often feel unsure about what to focus on first.",
    dimension: "clarity",
    reverse: true,
  },

  // ── Control — autonomy, flexibility ─────────────────────────────────────────
  {
    id: 11,
    text: "I have enough control over how I complete my work.",
    dimension: "control",
    reverse: false,
  },
  {
    id: 12,
    text: "I feel trusted to make decisions in my role.",
    dimension: "control",
    reverse: false,
  },
  {
    id: 13,
    text: "I have flexibility in how I manage my tasks.",
    dimension: "control",
    reverse: false,
  },
  { id: 14, text: "I feel micromanaged.", dimension: "control", reverse: true },
  {
    id: 15,
    text: "I can influence decisions that affect my work.",
    dimension: "control",
    reverse: false,
  },

  // ── Connection — manager support, team, recognition ─────────────────────────
  {
    id: 16,
    text: "My manager supports me when I face difficulties.",
    dimension: "connection",
    reverse: false,
  },
  {
    id: 17,
    text: "People in my team treat each other with respect.",
    dimension: "connection",
    reverse: false,
  },
  {
    id: 18,
    text: "I feel recognised for my contribution.",
    dimension: "connection",
    reverse: false,
  },
  {
    id: 19,
    text: "Conflict is handled constructively.",
    dimension: "connection",
    reverse: false,
  },
  { id: 20, text: "I feel I belong in my team.", dimension: "connection", reverse: false },

  // ── Confidence — psychological safety, trust, future ────────────────────────
  { id: 21, text: "I feel safe raising concerns.", dimension: "confidence", reverse: false },
  {
    id: 22,
    text: "I can admit mistakes without fear of blame.",
    dimension: "confidence",
    reverse: false,
  },
  {
    id: 23,
    text: "Different opinions are respected.",
    dimension: "confidence",
    reverse: false,
  },
  {
    id: 24,
    text: "I trust leadership to act on employee concerns.",
    dimension: "confidence",
    reverse: false,
  },
  {
    id: 25,
    text: "I feel confident about my future in this organisation.",
    dimension: "confidence",
    reverse: false,
  },
];

/** O(1) lookup of a question by id. */
export const QUESTIONS_BY_ID: Map<number, Question> = new Map(
  QUESTIONS.map((q) => [q.id, q]),
);

export function getQuestion(id: number): Question | undefined {
  return QUESTIONS_BY_ID.get(id);
}

/** Questions grouped by dimension, preserving bank order. */
export const QUESTIONS_BY_DIMENSION: Record<Dimension, Question[]> =
  DIMENSIONS.reduce(
    (acc, d) => {
      acc[d] = QUESTIONS.filter((q) => q.dimension === d);
      return acc;
    },
    {} as Record<Dimension, Question[]>,
  );
