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
      "id, title, status, public_token, created_at, segments, organisations(name, sector, size_band)",
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
    .select("segment, answers")
    .eq("audit_id", auditId);

  const responses: SurveyResponse[] = (rows ?? []).map((r) => ({
    segment: (r.segment as string | null) ?? null,
    answers: (r.answers as SurveyResponse["answers"]) ?? {},
  }));

  const responseCount = responses.length;

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

  const segments = segmentScores(responses);

  // The named, reportable segment carrying the most risk (lowest overall) —
  // used by the cost loop to name where risk concentrates.
  const concentratedSegment =
    segments.reported
      .filter(
        (s): s is typeof s & { overall: number } =>
          s.segment !== null && s.overall !== null,
      )
      .sort((a, b) => a.overall - b.overall)[0]?.segment ?? null;

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
  };
}
