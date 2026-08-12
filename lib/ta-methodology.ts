/**
 * Honest methodology copy for the open-text (thematic analysis) section — shared
 * by the dashboard and the PDF so the report describes its own method truthfully.
 *
 * The wording is our own; the *criteria* are standard scholarly practice for
 * reflexive thematic analysis, credited to Braun & Clarke. We do not reproduce
 * their checklist verbatim.
 */

export const TA_CITATION =
  "Braun, V. & Clarke, V. (2022). Thematic Analysis: A Practical Guide. SAGE.";

export const TA_METHOD_STATEMENT =
  "This open-text analysis follows reflexive thematic analysis (Braun & Clarke, 2022). " +
  "A deterministic first pass handles the mechanical phases — familiarisation, semantic " +
  "coding against a transparent codebook, and collating codes into candidate themes — with " +
  "no AI or language model involved. The interpretive phases — reviewing, defining and naming " +
  "themes — are done by the consultant, because reflexive TA holds that themes are generated " +
  "by a human analyst, not extracted by a tool. Themes not yet reviewed are shown as candidates. " +
  "Prevalence is a count of how many people raised something; it is not a causal claim.";

/** Quality criteria (our wording; criteria adapted from Braun & Clarke's guidance). */
export const TA_QUALITY_CHECKLIST: string[] = [
  "Each theme is built around a clear central organising concept.",
  "Themes are distinct from one another and internally coherent.",
  "Claims are supported by the coded data, and prevalence is reported honestly.",
  "Observation is separated from interpretation; nothing is stated as a cause.",
  "Coding is transparent (a published codebook) and applied consistently.",
  "Identifying detail is redacted; nothing is shown below the anonymity threshold.",
];

export const TA_QUALITY_ATTRIBUTION =
  "Quality criteria adapted from Braun & Clarke's guidance on good reflexive TA.";
