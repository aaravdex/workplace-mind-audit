import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { AuditScores } from "@/lib/scores-service";
import { recommendations } from "@/lib/recommendations";
import { riskBand } from "@/lib/scoring";
import { DIMENSIONS, DIMENSION_META, DISCLAIMER } from "@/lib/constants";
import { COEFFICIENT_CATALOG } from "@/lib/coefficients";
import { formatCurrency } from "@/lib/utils";
import {
  BUSINESS_IMPACT,
  interpretationFor,
  leadershipInterpretation,
  thirtyDayPlan,
} from "@/lib/report-content";
import { SERVICE_TIERS } from "@/content/services";
import type { BenchmarkResult } from "@/lib/benchmark";
import type { AdjustedCostBreakdown } from "@/lib/costModel";
import type { AuditAnnotation } from "@/lib/annotations";
import type { Dimension, RiskBand } from "@/types";

/** Everything the consulting-grade report renders. */
export interface ReportData {
  scores: AuditScores;
  benchmarks: Record<Dimension, BenchmarkResult | null> | null;
  cost: AdjustedCostBreakdown | null;
  annotation: AuditAnnotation | null;
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

const BAND_HEX: Record<RiskBand, string> = {
  Healthy: "#059669",
  Watch: "#0EA5E9",
  Risk: "#D97706",
  Critical: "#DC2626",
};
const BAND_SOFT: Record<RiskBand, string> = {
  Healthy: "#ECFDF5",
  Watch: "#F0F9FF",
  Risk: "#FFFBEB",
  Critical: "#FEF2F2",
};

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.navy,
    lineHeight: 1.5,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1,
    color: C.accent,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
  },
  h1: { fontSize: 26, fontFamily: "Helvetica-Bold", marginTop: 8, lineHeight: 1.2 },
  h2: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 6, lineHeight: 1.2 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  p: { color: C.navy700, marginBottom: 6 },
  small: { fontSize: 8, color: C.slate400 },
  section: { marginBottom: 18 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 12 },
  badge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  card: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: "row" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7,
    color: C.slate400,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
  },
});

function Badge({ band }: { band: RiskBand }) {
  return (
    <Text style={[styles.badge, { backgroundColor: BAND_HEX[band] }]}>
      {band}
    </Text>
  );
}

function ScoreBar({ score, band }: { score: number; band: RiskBand }) {
  return (
    <View
      style={{
        height: 6,
        backgroundColor: C.line,
        borderRadius: 3,
        marginTop: 4,
      }}
    >
      <View
        style={{
          height: 6,
          width: `${score}%`,
          backgroundColor: BAND_HEX[band],
          borderRadius: 3,
        }}
      />
    </View>
  );
}

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      {DISCLAIMER}
    </Text>
  );
}

const formatDate = (iso?: string) =>
  new Date(iso ?? Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function ReportDocument({ data }: { data: ReportData }) {
  const { scores, benchmarks, cost, annotation } = data;
  const recs = recommendations(scores.dimensions);
  const plan = thirtyDayPlan(recs);
  const recByDimension = new Map(recs.map((r) => [r.dimension, r]));
  const overallBand = scores.band;
  const money = (n: number) => formatCurrency(n, cost?.currency ?? "GBP");

  return (
    <Document
      title={`Workplace Mind Audit — ${scores.audit.orgName ?? "Report"}`}
      author="Workplace Mind Audit"
    >
      {/* ── Cover ─────────────────────────────────────────────── */}
      <Page style={[styles.page, { backgroundColor: C.navy, color: C.white }]}>
        <Text style={[styles.eyebrow, { color: "#E0986F" }]}>
          Workplace Mind Audit · 5C Workplace Risk Report
        </Text>
        <View style={{ marginTop: 180 }}>
          <Text style={{ fontSize: 13, color: "#9DB6D1" }}>Prepared for</Text>
          <Text
            style={{ fontSize: 32, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginTop: 4 }}
          >
            {scores.audit.orgName ?? "Your organisation"}
          </Text>
          <Text style={{ fontSize: 14, color: "#C5D5E6", marginTop: 10 }}>
            {scores.audit.title}
          </Text>
        </View>
        <View style={{ marginTop: 40 }}>
          <Text style={{ color: "#9DB6D1" }}>
            Report generated: {formatDate()}
          </Text>
          <Text style={{ color: "#9DB6D1" }}>
            Based on {scores.responseCount} anonymous responses
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 48,
            left: 48,
            right: 48,
          }}
        >
          <Text style={{ fontSize: 8, color: "#6E8FB5", lineHeight: 1.5 }}>
            Confidential. This report contains aggregated results only. No
            individual response is identifiable. {DISCLAIMER}
          </Text>
        </View>
      </Page>

      {/* ── Executive summary ─────────────────────────────────── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Executive summary</Text>
        <Text style={styles.h1}>Workplace Mind Score</Text>

        <View style={[styles.row, { alignItems: "center", marginVertical: 14 }]}>
          <Text style={{ fontSize: 48, fontFamily: "Helvetica-Bold", lineHeight: 1.1 }}>
            {scores.overall}
          </Text>
          <View style={{ marginLeft: 14 }}>
            {overallBand && <Badge band={overallBand} />}
            <Text style={[styles.small, { marginTop: 4 }]}>
              Equal-weighted mean of the five dimensions (0–100)
            </Text>
          </View>
        </View>

        <View style={[styles.row, { marginBottom: 12 }]}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.h3}>Top strengths</Text>
            {scores.ranked.slice(0, 3).map((r) => (
              <Text key={r.dimension} style={styles.p}>
                {DIMENSION_META[r.dimension].label} — {r.score} ({r.band})
              </Text>
            ))}
          </View>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={styles.h3}>Top risk areas</Text>
            {[...scores.ranked]
              .slice(-3)
              .reverse()
              .map((r) => (
                <Text key={r.dimension} style={styles.p}>
                  {DIMENSION_META[r.dimension].label} — {r.score} ({r.band})
                </Text>
              ))}
          </View>
        </View>

        {scores.insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h3}>Combined-risk flags</Text>
            {scores.insights.map((i) => (
              <View key={i.title} style={styles.card}>
                <Text style={styles.h3}>{i.title}</Text>
                <Text style={styles.p}>{i.explanation}</Text>
              </View>
            ))}
          </View>
        )}

        {annotation?.executiveSummaryNote ? (
          <View
            style={[
              styles.card,
              { borderLeftWidth: 3, borderLeftColor: C.navy, backgroundColor: C.bg },
            ]}
          >
            <Text style={[styles.eyebrow, { color: C.slate }]}>
              Consultant&rsquo;s read
            </Text>
            <Text style={[styles.p, { fontStyle: "italic", marginTop: 4 }]}>
              {annotation.executiveSummaryNote}
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: C.accentBg, borderColor: "#ECC8AC" }]}>
          <Text style={[styles.h3, { color: C.accentText }]}>
            Leadership interpretation
          </Text>
          <Text style={[styles.p, { color: C.accentText }]}>
            {leadershipInterpretation(scores)}
          </Text>
        </View>

        <Footer />
      </Page>

      {/* ── Methodology ───────────────────────────────────────── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Methodology</Text>
        <Text style={styles.h1}>The 5C Workplace Risk Model</Text>
        <Text style={[styles.p, { marginTop: 8 }]}>
          Every question maps to exactly one of five dimensions. Answers use a
          1–5 agreement scale, normalised to 0–100 where 100 is healthiest.
          Negatively-worded items are reverse-scored so that agreement with a
          problem correctly lowers the score. Skipped questions are ignored, not
          counted as zero.
        </Text>
        <View style={[styles.divider]} />
        {DIMENSIONS.map((d) => (
          <View key={d} style={{ marginBottom: 8 }}>
            <Text style={styles.h3}>{DIMENSION_META[d].label}</Text>
            <Text style={styles.p}>{DIMENSION_META[d].blurb}</Text>
          </View>
        ))}
        <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.line }]}>
          <Text style={styles.h3}>Anonymity by design</Text>
          <Text style={styles.p}>
            No names, emails, or IP addresses are collected. No department is
            reported unless at least five people in it responded — protecting
            individuals from being identified by inference.
          </Text>
        </View>
        <Footer />
      </Page>

      {/* ── Dimension-by-dimension ────────────────────────────── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Findings</Text>
        <Text style={styles.h1}>Dimension analysis</Text>
        <View style={{ marginTop: 10 }}>
          {DIMENSIONS.map((d) => {
            const score = scores.dimensions[d];
            const band = score === null ? null : riskBand(score);
            const rec = recByDimension.get(d);
            return (
              <View key={d} style={styles.card} wrap={false}>
                <View
                  style={[
                    styles.row,
                    { justifyContent: "space-between", alignItems: "center" },
                  ]}
                >
                  <Text style={styles.h2}>{DIMENSION_META[d].label}</Text>
                  <View style={[styles.row, { alignItems: "center" }]}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Helvetica-Bold",
                        lineHeight: 1.2,
                        marginRight: 6,
                      }}
                    >
                      {score ?? "—"}
                    </Text>
                    {band && <Badge band={band} />}
                  </View>
                </View>
                {score !== null && band && (
                  <ScoreBar score={score} band={band} />
                )}
                <Text style={[styles.p, { marginTop: 6 }]}>
                  {band
                    ? interpretationFor(d, band)
                    : "No responses included this dimension."}
                </Text>
                <Text style={[styles.small, { marginBottom: 4 }]}>
                  Business impact: {BUSINESS_IMPACT[d]}
                </Text>
                {rec ? (
                  rec.actions.map((a) => (
                    <Text key={a} style={[styles.p, { marginBottom: 2 }]}>
                      • {a}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.small}>
                    Currently healthy — maintain and monitor.
                  </Text>
                )}
                {annotation?.dimensionNotes[d] ? (
                  <Text
                    style={[
                      styles.p,
                      {
                        fontStyle: "italic",
                        marginTop: 6,
                        paddingLeft: 8,
                        borderLeftWidth: 2,
                        borderLeftColor: C.navy,
                      },
                    ]}
                  >
                    {annotation.dimensionNotes[d]}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
        <Footer />
      </Page>

      {/* ── Heatmap + financial ───────────────────────────────── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>At a glance</Text>
        <Text style={styles.h1}>5C heatmap</Text>
        <View style={[styles.row, { marginTop: 12, marginBottom: 18 }]}>
          {DIMENSIONS.map((d) => {
            const score = scores.dimensions[d];
            const band = score === null ? null : riskBand(score);
            return (
              <View
                key={d}
                style={{
                  flex: 1,
                  marginRight: 6,
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: band ? BAND_SOFT[band] : C.bg,
                }}
              >
                <Text style={{ fontSize: 8, color: C.slate }}>
                  {DIMENSION_META[d].label}
                </Text>
                <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.2 }}>
                  {score ?? "—"}
                </Text>
                <Text style={{ fontSize: 8, color: band ? BAND_HEX[band] : C.slate400 }}>
                  {band ?? "No data"}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.h2}>Benchmark vs sector peers</Text>
        {benchmarks && DIMENSIONS.some((d) => benchmarks[d]) ? (
          <View>
            {DIMENSIONS.map((d) => {
              const b = benchmarks[d];
              return (
                <View
                  key={d}
                  style={[
                    styles.row,
                    {
                      justifyContent: "space-between",
                      paddingVertical: 4,
                      borderBottomWidth: 1,
                      borderBottomColor: C.line,
                    },
                  ]}
                >
                  <Text style={styles.p}>{DIMENSION_META[d].label}</Text>
                  <Text style={styles.p}>
                    {b
                      ? `${b.band} · ${b.percentile}th percentile`
                      : "insufficient peer data"}
                  </Text>
                </View>
              );
            })}
            <Text style={[styles.small, { marginTop: 6 }]}>
              Percentiles are computed across distinct organisations, never
              individual responses.
            </Text>
          </View>
        ) : (
          <Text style={styles.p}>
            Insufficient peer data. A benchmark is shown only once at least eight
            comparable organisations have contributed — protecting those
            companies and keeping the comparison statistically meaningful.
          </Text>
        )}
        <Footer />
      </Page>

      {/* ── Financial impact — THE LOOP ───────────────────────── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Financial impact</Text>
        <Text style={styles.h1}>From generic estimate to your figure</Text>
        {cost ? (
          <View style={{ marginTop: 12 }}>
            <View style={styles.row}>
              <View style={[styles.card, { flex: 1, marginRight: 6 }]}>
                <Text style={styles.small}>Generic estimate</Text>
                <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold" }}>
                  {money(cost.genericTotal)}
                </Text>
                <Text style={styles.small}>industry averages</Text>
              </View>
              <View
                style={[
                  styles.card,
                  { flex: 1, backgroundColor: C.accentBg, borderColor: "#ECC8AC" },
                ]}
              >
                <Text style={[styles.small, { color: C.accentText }]}>
                  Audit-adjusted
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: "Helvetica-Bold",
                    color: C.accentText,
                  }}
                >
                  {money(cost.adjustedTotal)}
                </Text>
                <Text style={[styles.small, { color: C.accentText }]}>
                  {cost.delta === 0
                    ? "in line with generic"
                    : `${cost.delta > 0 ? "+" : ""}${money(cost.delta)} from your scores`}
                </Text>
              </View>
            </View>
            {cost.explanation.map((line) => (
              <Text key={line} style={[styles.p, { marginTop: 4 }]}>
                • {line}
              </Text>
            ))}
            <Text style={[styles.small, { marginTop: 6 }]}>
              Modelled estimate based on published research, not a guarantee.
              Every adjustment is bounded to ±40%.
            </Text>
          </View>
        ) : (
          <Text style={styles.p}>
            The audit-adjusted cost model is unavailable for this report.
          </Text>
        )}

        <View style={styles.divider} />
        <Text style={styles.h2}>How we model cost</Text>
        {COEFFICIENT_CATALOG.map((c) => (
          <View key={c.key} style={{ marginBottom: 6 }}>
            <Text style={styles.h3}>
              {c.name}: {c.value}
            </Text>
            <Text style={styles.small}>
              {c.source.publication}. {c.source.note}
            </Text>
          </View>
        ))}
        <Footer />
      </Page>

      {/* ── 30-day plan + services ────────────────────────────── */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>What to do next</Text>
        <Text style={styles.h1}>30-day action plan</Text>
        <View style={{ marginTop: 10, marginBottom: 16 }}>
          {plan.map((w) => (
            <View key={w.window} style={styles.card} wrap={false}>
              <Text style={styles.h3}>{w.window}</Text>
              {w.items.map((item) => (
                <Text key={item} style={[styles.p, { marginBottom: 2 }]}>
                  • {item}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Recommended consulting support</Text>
        {SERVICE_TIERS.map((tier) => (
          <View
            key={tier.slug}
            style={[
              styles.row,
              { justifyContent: "space-between", marginBottom: 6 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.h3}>{tier.name}</Text>
              <Text style={styles.small}>{tier.tagline}</Text>
            </View>
          </View>
        ))}
        <Footer />
      </Page>
    </Document>
  );
}

/** Render the report to a PDF buffer (keeps JSX out of the route handler). */
export function renderAuditReportPdf(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
