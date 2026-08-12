import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { AuditScores } from "@/lib/scores-service";
import { DIMENSION_META, DISCLAIMER } from "@/lib/constants";
import { COEFFICIENT_CATALOG } from "@/lib/coefficients";
import { formatCurrency } from "@/lib/utils";
import { leadershipInterpretation } from "@/lib/report-content";
import { describeItemDriver } from "@/lib/interpretation";
import {
  TA_CITATION,
  TA_METHOD_STATEMENT,
  TA_QUALITY_ATTRIBUTION,
  TA_QUALITY_CHECKLIST,
} from "@/lib/ta-methodology";
import { priorityClassLabel } from "@/lib/priority";
import type { BenchmarkResult } from "@/lib/benchmark";
import type { AdjustedCostBreakdown } from "@/lib/costModel";
import type { AuditAnnotation } from "@/lib/annotations";
import type { Dimension, FactorRiskLevel } from "@/types";

/** Everything the consulting-grade report renders — now driven by all engines. */
export interface ReportData {
  scores: AuditScores;
  benchmarks: Record<Dimension, BenchmarkResult | null> | null;
  cost: AdjustedCostBreakdown | null;
  annotation: AuditAnnotation | null;
  costIsRepresentative?: boolean;
}

const C = {
  navy: "#14223A",
  navy700: "#2C4361",
  slate: "#38547A",
  slate400: "#6E8FB5",
  line: "#E2EAF2",
  bg: "#F2F6FA",
  accent: "#C2643F",
  accentBg: "#FBF4EE",
  accentText: "#874023",
  white: "#FFFFFF",
};

const LEVEL_HEX: Record<FactorRiskLevel, string> = {
  healthy: "#059669",
  watch: "#0EA5E9",
  high: "#D97706",
  critical: "#DC2626",
};

const styles = StyleSheet.create({
  page: { paddingVertical: 46, paddingHorizontal: 46, fontSize: 10, fontFamily: "Helvetica", color: C.navy, lineHeight: 1.5 },
  eyebrow: { fontSize: 9, letterSpacing: 1, color: C.accent, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 8, lineHeight: 1.2 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 14, lineHeight: 1.2 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  p: { color: C.navy700, marginBottom: 4 },
  small: { fontSize: 8, color: C.slate400 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10, marginBottom: 8 },
  row: { flexDirection: "row" },
  badge: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 3 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 10 },
  footer: { position: "absolute", bottom: 22, left: 46, right: 46, fontSize: 7, color: C.slate400, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
});

const fmtDate = (iso?: string) =>
  new Date(iso ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Badge({ level }: { level: FactorRiskLevel }) {
  return <Text style={[styles.badge, { backgroundColor: LEVEL_HEX[level] }]}>{level}</Text>;
}
function Footer() {
  return <Text style={styles.footer} fixed>{DISCLAIMER}</Text>;
}
function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((it) => (
        <Text key={it} style={[styles.p, { marginBottom: 2 }]}>• {it}</Text>
      ))}
    </View>
  );
}

export function ReportDocument({ data }: { data: ReportData }) {
  const { scores, cost, annotation, costIsRepresentative } = data;
  const money = (n: number) => formatCurrency(n, cost?.currency ?? "GBP");
  const priorityItems = scores.prioritisation.items.filter((i) => i.clientVisible);

  return (
    <Document title={`Workplace Mind Audit — ${scores.audit.orgName ?? "Report"}`} author="Workplace Mind Audit">
      {/* ── Cover ── */}
      <Page style={[styles.page, { backgroundColor: C.navy, color: C.white }]}>
        <Text style={[styles.eyebrow, { color: "#E0986F" }]}>Workplace Mind Audit · 5C Workplace Risk Report</Text>
        <View style={{ marginTop: 170 }}>
          <Text style={{ fontSize: 13, color: "#9DB6D1" }}>Prepared for</Text>
          <Text style={{ fontSize: 32, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginTop: 4 }}>{scores.audit.orgName ?? "Your organisation"}</Text>
          <Text style={{ fontSize: 14, color: "#C5D5E6", marginTop: 10 }}>{scores.audit.title}</Text>
        </View>
        <View style={{ marginTop: 36 }}>
          <Text style={{ color: "#9DB6D1" }}>Report generated: {fmtDate()}</Text>
          <Text style={{ color: "#9DB6D1" }}>Based on {scores.responseCount} anonymous responses</Text>
        </View>
        <View style={{ position: "absolute", bottom: 46, left: 46, right: 46 }}>
          <Text style={{ fontSize: 8, color: "#6E8FB5", lineHeight: 1.5 }}>
            Confidential. Aggregated results only — no individual response is identifiable. These are preliminary findings to validate through consultation, not proven causes. {DISCLAIMER}
          </Text>
        </View>
      </Page>

      {/* ── Executive summary ── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Executive summary</Text>
        <Text style={styles.h1}>Workplace Mind Score</Text>
        <View style={[styles.row, { alignItems: "center", marginVertical: 12 }]}>
          <Text style={{ fontSize: 46, fontFamily: "Helvetica-Bold", lineHeight: 1.1 }}>{scores.overall}</Text>
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.small}>Overall confidence: {scores.dataQuality.confidence}</Text>
            <Text style={styles.small}>Response rate: {scores.dataQuality.responseRateLabel}</Text>
          </View>
        </View>

        <View style={[styles.row, { marginBottom: 8 }]}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.h3}>Top strengths</Text>
            {scores.ranked.slice(0, 3).map((r) => (
              <Text key={r.dimension} style={styles.p}>{DIMENSION_META[r.dimension].label} — {r.score} ({r.band})</Text>
            ))}
          </View>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={styles.h3}>Top risk areas</Text>
            {[...scores.ranked].slice(-3).reverse().map((r) => (
              <Text key={r.dimension} style={styles.p}>{DIMENSION_META[r.dimension].label} — {r.score} ({r.band})</Text>
            ))}
          </View>
        </View>

        {priorityItems.length > 0 && (
          <>
            <Text style={styles.h2}>Where to start (and why not everything at once)</Text>
            {priorityItems.slice(0, 3).map((i) => (
              <View key={i.refId} style={styles.card}>
                <Text style={styles.h3}>{i.title} — {priorityClassLabel(i.classification)}</Text>
                <Text style={styles.p}>{i.rationale}</Text>
              </View>
            ))}
          </>
        )}

        {annotation?.executiveSummaryNote ? (
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: C.navy, backgroundColor: C.bg }]}>
            <Text style={[styles.eyebrow, { color: C.slate }]}>Consultant&rsquo;s read</Text>
            <Text style={[styles.p, { fontStyle: "italic", marginTop: 4 }]}>{annotation.executiveSummaryNote}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: C.accentBg, borderColor: "#ECC8AC" }]}>
          <Text style={[styles.h3, { color: C.accentText }]}>Leadership interpretation</Text>
          <Text style={[styles.p, { color: C.accentText }]}>{leadershipInterpretation(scores)}</Text>
        </View>
        <Footer />
      </Page>

      {/* ── Data quality & confidence ── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>How much the evidence supports</Text>
        <Text style={styles.h1}>Data quality &amp; confidence</Text>
        <Text style={[styles.p, { marginTop: 8 }]}>Every finding carries a confidence rating so this report never sounds more certain than the evidence allows.</Text>
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={[styles.card, { flex: 1, marginRight: 6 }]}><Text style={styles.small}>Responses</Text><Text style={styles.h3}>{scores.dataQuality.completed}</Text></View>
          <View style={[styles.card, { flex: 1, marginRight: 6 }]}><Text style={styles.small}>Response rate</Text><Text style={styles.h3}>{scores.dataQuality.responseRateLabel}</Text></View>
          <View style={[styles.card, { flex: 1 }]}><Text style={styles.small}>Low-quality responses</Text><Text style={styles.h3}>{scores.dataQuality.integrity.flaggedResponses} of {scores.dataQuality.completed}</Text></View>
        </View>
        <Text style={styles.h3}>Confidence: {scores.dataQuality.confidence}</Text>
        <Bullets items={scores.dataQuality.confidenceReasons} />
        <Footer />
      </Page>

      {/* ── Findings (five layers) ── */}
      <Page style={styles.page} wrap>
        <Text style={styles.eyebrow}>Findings</Text>
        <Text style={styles.h1}>What we found, and what it means</Text>
        {scores.findings.map((f) => (
          <View key={f.findingId} style={styles.card} wrap={false}>
            <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
              <Text style={styles.h3}>{f.title}</Text>
              {f.riskLevel && <Badge level={f.riskLevel} />}
            </View>
            <Text style={styles.small}>Confidence: {f.confidence}</Text>
            <Text style={[styles.p, { marginTop: 4 }]}>{f.observation}</Text>
            {f.evidence.itemDrivers.length > 0 && (
              <Bullets items={f.evidence.itemDrivers.map(describeItemDriver)} />
            )}
            <Text style={[styles.p, { fontFamily: "Helvetica-Bold" }]}>{f.interpretation}</Text>
            {f.rootCauseHypotheses.length > 0 && (<><Text style={styles.small}>Possible causes to validate:</Text><Bullets items={f.rootCauseHypotheses} /></>)}
            {f.validationQuestions.length > 0 && (<><Text style={styles.small}>Validate through:</Text><Bullets items={f.validationQuestions} /></>)}
            {f.businessImplications.length > 0 && (<><Text style={styles.small}>Business implications:</Text><Bullets items={f.businessImplications} /></>)}
            {annotation?.dimensionNotes[f.dimension] ? (
              <Text style={[styles.p, { fontStyle: "italic", marginTop: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.navy }]}>{annotation.dimensionNotes[f.dimension]}</Text>
            ) : null}
          </View>
        ))}
        <Footer />
      </Page>

      {/* ── Cross-factor patterns ── */}
      {scores.patterns.length > 0 && (
        <Page style={styles.page} wrap>
          <Text style={styles.eyebrow}>The bigger picture</Text>
          <Text style={styles.h1}>Combined-risk patterns</Text>
          {scores.patterns.map((p) => (
            <View key={p.patternId} style={[styles.card, { backgroundColor: C.accentBg, borderColor: "#ECC8AC" }]} wrap={false}>
              <Text style={styles.h3}>{p.title}</Text>
              <Text style={styles.p}>{p.observation}</Text>
              <Text style={[styles.p, { fontFamily: "Helvetica-Bold" }]}>{p.interpretation}</Text>
              <Text style={[styles.p, { color: C.accentText }]}>Preferred response: {p.preferredInterventionClass}</Text>
            </View>
          ))}
          <Footer />
        </Page>
      )}

      {/* ── Prioritised risks ── */}
      {priorityItems.length > 0 && (
        <Page style={styles.page} wrap>
          <Text style={styles.eyebrow}>Priority</Text>
          <Text style={styles.h1}>Prioritised risks</Text>
          {priorityItems.map((i, idx) => (
            <View key={i.refId} style={styles.card} wrap={false}>
              <Text style={styles.h3}>{idx + 1}. {i.title} — {priorityClassLabel(i.classification)}</Text>
              <Text style={styles.p}>{i.rationale}</Text>
            </View>
          ))}
          <Text style={[styles.small, { marginTop: 6 }]}>{scores.prioritisation.summary}</Text>
          <Footer />
        </Page>
      )}

      {/* ── Intervention plan: playbooks + roadmap ── */}
      {scores.interventionPlan.playbooks.length > 0 && (
        <Page style={styles.page} wrap>
          <Text style={styles.eyebrow}>What to do</Text>
          <Text style={styles.h1}>Intervention playbooks</Text>
          {scores.interventionPlan.playbooks.map((pb) => (
            <View key={pb.interventionId} style={styles.card} wrap={false}>
              <Text style={styles.h3}>{pb.title}</Text>
              <Text style={styles.small}>Problem: {pb.problemAddressed}</Text>
              <Text style={[styles.small, { marginBottom: 2 }]}>Accountable: {pb.ownership.accountable} · Responsible: {pb.ownership.responsible}</Text>
              {pb.steps.map((s) => (
                <View key={s.stepNumber} style={{ marginTop: 2 }}>
                  <Text style={styles.p}>{s.stepNumber}. {s.title} — {s.owner}, {s.deadline}</Text>
                </View>
              ))}
              <Text style={styles.small}>Leading: {pb.leadingIndicators.join("; ")}</Text>
              <Text style={styles.small}>Lagging: {pb.laggingIndicators.join("; ")}</Text>
              {pb.dependencyExplanation ? <Text style={[styles.small, { fontStyle: "italic" }]}>{pb.dependencyExplanation}</Text> : null}
            </View>
          ))}
          <Text style={styles.h2}>30-60-90 roadmap</Text>
          {scores.interventionPlan.roadmap.map((w) => (
            <View key={w.window} style={{ marginBottom: 4 }}>
              <Text style={styles.h3}>{w.window}</Text>
              <Bullets items={w.items} />
            </View>
          ))}
          <Footer />
        </Page>
      )}

      {/* ── Validate & measure ── */}
      {scores.validationGuides.length > 0 && (
        <Page style={styles.page} wrap>
          <Text style={styles.eyebrow}>Confirm before you act</Text>
          <Text style={styles.h1}>Validation &amp; measurement</Text>
          <Text style={[styles.p, { marginTop: 6 }]}>These findings are preliminary. Confirm them through the focus groups below, then re-measure with the pulses.</Text>
          {scores.validationGuides.map((g) => (
            <View key={g.refId} style={styles.card} wrap={false}>
              <Text style={styles.h3}>{g.title}</Text>
              <Text style={styles.small}>Employee focus group:</Text>
              <Bullets items={g.employeeGuide} />
              {g.operationalDataRequests.length > 0 && (<Text style={styles.small}>Data to request: {g.operationalDataRequests.join("; ")}</Text>)}
            </View>
          ))}
          {scores.pulses.length > 0 && (
            <>
              <Text style={styles.h2}>Pulse &amp; reassessment</Text>
              {scores.pulses.map((p) => (
                <Text key={p.name} style={styles.p}>• {p.name} ({p.timing})</Text>
              ))}
            </>
          )}
          <Footer />
        </Page>
      )}

      {/* ── Open-text: reflexive thematic analysis ── */}
      {scores.thematicAnalysis && scores.thematicAnalysis.reviewedThemes.length > 0 && (
        <Page style={styles.page} wrap>
          <Text style={styles.eyebrow}>In their own words</Text>
          <Text style={styles.h1}>Open-text themes</Text>
          <Text style={[styles.p, { marginTop: 6 }]}>
            {scores.thematicAnalysis.familiarisation.totalComments} comment
            {scores.thematicAnalysis.familiarisation.totalComments === 1 ? "" : "s"}, averaging{" "}
            {scores.thematicAnalysis.familiarisation.meanWordCount} words.
            {scores.thematicAnalysis.familiarisation.uncodedCount > 0
              ? ` ${scores.thematicAnalysis.familiarisation.uncodedCount} did not match the codebook and were set aside for manual reading.`
              : ""}
          </Text>
          {scores.thematicAnalysis.reviewedThemes.map((t) => {
            const segs = t.bySegment.filter((s) => s.count >= scores.reportingThreshold);
            return (
              <View key={t.id} style={styles.card} wrap={false}>
                <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
                  <Text style={styles.h3}>{t.name}</Text>
                  <Text style={[styles.badge, { backgroundColor: t.status === "confirmed" ? LEVEL_HEX.healthy : LEVEL_HEX.high }]}>
                    {t.status === "confirmed" ? "Confirmed" : "Candidate"}
                  </Text>
                </View>
                <Text style={styles.small}>
                  {t.prevalence} mention{t.prevalence === 1 ? "" : "s"} · {t.tone}
                  {t.thin ? " · thin — treat with caution" : ""}
                </Text>
                <Text style={[styles.p, { marginTop: 3 }]}>{t.definition}</Text>
                {t.mergedFrom.length > 0 && (
                  <Text style={styles.small}>Merged in: {t.mergedFrom.join(", ")}</Text>
                )}
                {t.codes.length > 0 && (
                  <Text style={styles.small}>Codes: {t.codes.map((c) => `${c.label} (${c.count})`).join(", ")}</Text>
                )}
                {segs.length > 0 && (
                  <Text style={styles.small}>Where it concentrates: {segs.map((s) => `${s.segment} (${s.count})`).join(", ")}</Text>
                )}
                {t.illustrativeExtracts.map((q) => (
                  <Text key={q} style={[styles.p, { fontStyle: "italic", marginTop: 2 }]}>&ldquo;{q}&rdquo;</Text>
                ))}
                {t.note ? <Text style={[styles.small, { marginTop: 2 }]}>Consultant note: {t.note}</Text> : null}
              </View>
            );
          })}
          <View style={[styles.card, { backgroundColor: C.bg }]} wrap={false}>
            <Text style={styles.h3}>How these themes were produced</Text>
            <Text style={[styles.p, { marginTop: 4 }]}>{TA_METHOD_STATEMENT}</Text>
            <Bullets items={TA_QUALITY_CHECKLIST} />
            <Text style={styles.small}>{TA_QUALITY_ATTRIBUTION} {TA_CITATION}</Text>
          </View>
          <Footer />
        </Page>
      )}

      {/* ── Financial impact + methodology + limitations ── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Financial impact</Text>
        <Text style={styles.h1}>The modelled cost</Text>
        {costIsRepresentative && (
          <Text style={[styles.small, { color: C.accentText, marginTop: 6 }]}>These figures use sector-average assumptions for an organisation of this size. Enter your own headcount, salary and turnover for a bespoke estimate.</Text>
        )}
        {cost ? (
          <View style={{ marginTop: 8 }}>
            <View style={styles.row}>
              <View style={[styles.card, { flex: 1, marginRight: 6 }]}><Text style={styles.small}>Generic estimate</Text><Text style={styles.h3}>{money(cost.genericTotal)}</Text></View>
              <View style={[styles.card, { flex: 1, backgroundColor: C.accentBg, borderColor: "#ECC8AC" }]}><Text style={[styles.small, { color: C.accentText }]}>Audit-adjusted</Text><Text style={[styles.h3, { color: C.accentText }]}>{money(cost.adjustedTotal)}</Text></View>
            </View>
            {cost.explanation.map((line) => (<Text key={line} style={styles.p}>• {line}</Text>))}
            <Text style={styles.small}>Modelled estimate based on published research, not a guarantee. Every adjustment is bounded to ±40%.</Text>
          </View>
        ) : null}

        <View style={styles.divider} />
        <Text style={styles.h2}>Methodology &amp; limitations</Text>
        <Text style={styles.p}>Answers use a 1–5 scale normalised to 0–100 (100 = healthiest); negatively-worded items are reverse-scored. No department is reported unless enough people in it responded. The survey does not establish causation — hypotheses are to be validated through consultation.</Text>
        <Text style={styles.h3}>Coefficient sources (financial model)</Text>
        {COEFFICIENT_CATALOG.map((c) => (
          <Text key={c.key} style={styles.small}>{c.name}: {c.value} — {c.source.publication}. {c.source.note}</Text>
        ))}
        <Footer />
      </Page>
    </Document>
  );
}

/** Render the report to a PDF buffer. */
export function renderAuditReportPdf(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
