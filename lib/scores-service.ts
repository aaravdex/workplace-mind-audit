import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditStatus,
  Dimension,
  DimensionScores,
  Insight,
  RiskBand,
  Sector,
  SegmentScoresResult,
  SizeBand,
  SurveyResponse,
} from "@/types";
import { DIMENSIONS, MIN_RESPONSES_PER_SEGMENT } from "@/lib/constants";
import {
  combinedInsights,
  dimensionScores,
  overallScore,
  riskBand,
  segmentScores,
} from "@/lib/scoring";
import { computeDataQuality, type DataQuality } from "@/lib/dataQuality";
import { buildFindings, type Finding } from "@/lib/interpretation";
import { evaluatePatterns, type PatternFinding } from "@/lib/patterns";
import { factorScores } from "@/lib/factors";
import { prioritise, type Prioritisation } from "@/lib/priority";
import { buildInterventionPlan, type InterventionPlan } from "@/lib/interventions/plan";
import { buildValidationGuides, type ValidationGuide } from "@/lib/validation";
import { buildPulses, type PulseSurvey } from "@/lib/evaluation";
import { analyseOpenText, type ThematicAnalysis } from "@/lib/thematicAnalysis";
import { getThemeReview } from "@/lib/theme-review-service";
import { contextSignals, ContextSchema } from "@/lib/context";

export interface RankedDimension {
  dimension: Dimension;
  score: number;
  band: RiskBand;
}

export interface AuditScores {
  audit: {
    id: string;
    title: string;
    orgName: string | null;
    sector: Sector | null;
    sizeBand: SizeBand | null;
    status: AuditStatus;
    public_token: string;
    created_at: string;
    segments: string[];
  };
  /** False when the whole audit has fewer than MIN_RESPONSES_PER_SEGMENT. */
  sufficient: boolean;
  responseCount: number;
  overall: number | null;
  band: RiskBand | null;
  dimensions: DimensionScores;
  /** Dimensions sorted best → worst (only those with data). */
  ranked: RankedDimension[];
  insights: Insight[];
  segments: SegmentScoresResult;
  /** The named reported segment with the lowest overall score, if any. */
  concentratedSegment: string | null;
  /** Data-quality & confidence picture for this audit (Phase 2). */
  dataQuality: DataQuality;
  /** Effective segment reporting threshold (never below the platform floor). */
  reportingThreshold: number;
  /** Per-dimension five-layer interpretation (Phase 3). */
  findings: Finding[];
  /** Cross-factor combined-risk patterns that fired (Phase 3). */
  patterns: PatternFinding[];
  /** Deterministic risk prioritisation + safeguarding routing (Phase 4). */
  prioritisation: Prioritisation;
  /** Selected interventions, playbooks, and the 30-60-90 roadmap (Phase 5). */
  interventionPlan: InterventionPlan;
  /** Participatory-validation guides + targeted pulse surveys (Phase 6). */
  validationGuides: ValidationGuide[];
  pulses: PulseSurvey[];
  /** Reflexive thematic analysis of open-text: deterministic first pass +
   *  consultant review (Method A). Null until open-text answers exist. */
  thematicAnalysis: ThematicAnalysis | null;
}

const emptyDimensions = (): DimensionScores =>
  DIMENSIONS.reduce((acc, d) => {
    acc[d] = null;
    return acc;
  }, {} as DimensionScores);

/**
 * Builds the full scored payload for an audit. Reads through the caller's
 * (RLS-scoped) Supabase client, so only the audit's org owner sees data.
 *
 * THE ANONYMITY GUARDRAIL is applied twice here: segment-level via
 * segmentScores(), and audit-level — if the whole audit has fewer than
 * MIN_RESPONSES_PER_SEGMENT responses, NO scores are returned at all.
 *
 * Returns null when the audit does not exist or is not visible to the caller.
 */
export async function buildAuditScores(
  supabase: SupabaseClient,
  auditId: string,
): Promise<AuditScores | null> {
  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, title, status, public_token, created_at, segments, invited_count, reporting_threshold, context, cost_inputs, open_text_verbatims, organisations(name, sector, size_band)",
    )
    .eq("id", auditId)
    .maybeSingle();

  if (!audit) return null;

  // Supabase returns the joined org as an object (or array, depending on the
  // inferred cardinality) — normalise the fields we need.
  type OrgRow = { name?: string; sector?: string; size_band?: string };
  const orgRaw = (audit as { organisations?: OrgRow | OrgRow[] }).organisations;
  const org: OrgRow = Array.isArray(orgRaw) ? (orgRaw[0] ?? {}) : (orgRaw ?? {});

  const auditMeta = {
    id: audit.id as string,
    title: audit.title as string,
    orgName: org.name ?? null,
    sector: (org.sector as Sector | undefined) ?? null,
    sizeBand: (org.size_band as SizeBand | undefined) ?? null,
    status: audit.status as AuditStatus,
    public_token: audit.public_token as string,
    created_at: audit.created_at as string,
    segments: (audit.segments as string[]) ?? [],
  };

  const { data: rows } = await supabase
    .from("responses")
    .select("segment, answers, open_text")
    .eq("audit_id", auditId);

  const responses: SurveyResponse[] = (rows ?? []).map((r) => ({
    segment: (r.segment as string | null) ?? null,
    answers: (r.answers as SurveyResponse["answers"]) ?? {},
  }));

  const openTextEntries: { text: string; segment: string | null; questionId?: number }[] = [];
  for (const r of rows ?? []) {
    const ot = (r as { open_text?: Record<string, string> | null }).open_text;
    if (ot && typeof ot === "object") {
      for (const [key, v] of Object.entries(ot)) {
        if (typeof v === "string" && v.trim()) {
          const qid = Number(key);
          openTextEntries.push({
            text: v,
            segment: (r.segment as string | null) ?? null,
            ...(Number.isFinite(qid) ? { questionId: qid } : {}),
          });
        }
      }
    }
  }

  const responseCount = responses.length;

  const invitedCount = (audit.invited_count as number | null) ?? null;
  const reportingThreshold =
    (audit.reporting_threshold as number | null) ?? MIN_RESPONSES_PER_SEGMENT;
  const dataQuality = computeDataQuality(responses, {
    invitedCount,
    reportingThreshold,
  });

  if (responseCount < MIN_RESPONSES_PER_SEGMENT) {
    return {
      audit: auditMeta,
      sufficient: false,
      responseCount,
      overall: null,
      band: null,
      dimensions: emptyDimensions(),
      ranked: [],
      insights: [],
      segments: { reported: [], suppressed: [] },
      concentratedSegment: null,
      dataQuality,
      reportingThreshold: dataQuality.reportingThreshold,
      findings: [],
      patterns: [],
      prioritisation: { items: [], safeguardingCount: 0, summary: "" },
      interventionPlan: { items: [], playbooks: [], roadmap: [], notes: [] },
      validationGuides: [],
      pulses: [],
      thematicAnalysis: null,
    };
  }

  const dimensions = dimensionScores(responses);
  const overall = overallScore(responses);

  const ranked: RankedDimension[] = DIMENSIONS.map((dimension) => ({
    dimension,
    score: dimensions[dimension],
  }))
    .filter((x): x is RankedDimension & { score: number } => x.score !== null)
    .map((x) => ({ ...x, band: riskBand(x.score) }))
    .sort((a, b) => b.score - a.score);

  const segments = segmentScores(responses, reportingThreshold);

  // The named, reportable segment carrying the most risk (lowest overall) —
  // used by the cost loop to name where risk concentrates.
  const concentratedSegment =
    segments.reported
      .filter(
        (s): s is typeof s & { overall: number } =>
          s.segment !== null && s.overall !== null,
      )
      .sort((a, b) => a.overall - b.overall)[0]?.segment ?? null;

  const parsedContext = audit.context
    ? ContextSchema.safeParse(audit.context)
    : null;
  const signals = contextSignals(
    parsedContext?.success ? parsedContext.data : null,
  );
  const fScores = factorScores(responses);
  const findings = buildFindings({
    responses,
    dataQuality,
    contextSignals: signals,
    reportingThreshold,
    hasCostFigures: (audit.cost_inputs ?? null) !== null,
  });
  const patterns = evaluatePatterns({
    factorScores: fScores,
    dimensionScores: dimensions,
    contextSignals: signals,
    dataQuality,
    segments,
  });
  const prioritisation = prioritise({
    findings,
    factorScores: fScores,
    contextSignals: signals,
  });
  const priorityById = new Map(
    prioritisation.items.map((i) => [i.refId, i.priorityScore]),
  );
  for (const f of findings) f.priorityScore = priorityById.get(f.findingId) ?? 0;
  const interventionPlan = buildInterventionPlan({
    findings,
    patterns,
    contextSignals: signals,
  });
  const validationGuides = buildValidationGuides({ findings, patterns });
  const pulses = buildPulses([
    ...new Set(interventionPlan.items.flatMap((i) => i.intervention.factorIds)),
  ]);
  const thematicAnalysis =
    openTextEntries.length > 0
      ? analyseOpenText(openTextEntries, {
          reportingThreshold,
          allowVerbatims: (audit.open_text_verbatims as boolean | null) === true,
          review: await getThemeReview(supabase, auditId),
        })
      : null;

  return {
    audit: auditMeta,
    sufficient: true,
    responseCount,
    overall,
    band: overall === null ? null : riskBand(overall),
    dimensions,
    ranked,
    insights: combinedInsights(dimensions),
    segments,
    concentratedSegment,
    dataQuality,
    reportingThreshold: dataQuality.reportingThreshold,
    findings,
    patterns,
    prioritisation,
    interventionPlan,
    validationGuides,
    pulses,
    thematicAnalysis,
  };
}
