import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CalculatorResult } from "@/lib/calculator";
import { COEFFICIENT_CATALOG, getCoefficient } from "@/lib/coefficients";
import { DISCLAIMER } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { RiskLevel } from "@/types";

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

const RISK_HEX: Record<RiskLevel, string> = {
  Low: "#059669",
  Moderate: "#0EA5E9",
  High: "#D97706",
  Critical: "#DC2626",
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
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginTop: 8, lineHeight: 1.2 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6, lineHeight: 1.2 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  p: { color: C.navy700, marginBottom: 4 },
  small: { fontSize: 8, color: C.slate400 },
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
  divider: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 12 },
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

const formatDate = () =>
  new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function BurnoutCostReport({
  result,
  company,
}: {
  result: CalculatorResult;
  company?: string;
}) {
  const money = (n: number) => formatCurrency(n, result.currency);
  const lines: { label: string; amount: number; formula: string }[] = [
    { label: "Absenteeism", amount: result.breakdown.absenteeism, formula: "employees × sick days × (salary ÷ 260)" },
    { label: "Presenteeism", amount: result.breakdown.presenteeism, formula: "employees × salary × productivity-loss %" },
    { label: "Attrition", amount: result.breakdown.attrition, formula: "employees × turnover % × replacement cost" },
    { label: "Manager overload", amount: result.breakdown.managerOverload, formula: "monthly people-hours × hourly cost × 12" },
  ];

  return (
    <Document
      title={`Burnout Cost Report — ${company ?? "Your organisation"}`}
      author="Workplace Mind Audit"
    >
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Workplace Mind Audit · Burnout Cost Report</Text>
        <Text style={styles.h1}>{company ?? "Your organisation"}</Text>
        <Text style={styles.small}>Prepared {formatDate()}</Text>

        {/* Headline */}
        <View style={[styles.card, { backgroundColor: C.navy, borderColor: C.navy, marginTop: 16 }]}>
          <Text style={{ fontSize: 9, color: "#9DB6D1", textTransform: "uppercase", letterSpacing: 1 }}>
            Estimated annual burnout-related cost
          </Text>
          <View style={[styles.row, { alignItems: "center", marginTop: 4 }]}>
            <Text style={{ fontSize: 30, fontFamily: "Helvetica-Bold", color: C.white, lineHeight: 1.1 }}>
              {money(result.total)}
            </Text>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.badge, { backgroundColor: RISK_HEX[result.riskLevel] }]}>
                {result.riskLevel} risk
              </Text>
              <Text style={{ fontSize: 9, color: "#C5D5E6", marginTop: 4 }}>
                {result.totalAsPctOfPayroll}% of annual payroll
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown */}
        <Text style={[styles.h2, { marginTop: 8 }]}>Cost breakdown</Text>
        {lines.map((l) => (
          <View key={l.label} style={[styles.row, { justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h3}>{l.label}</Text>
              <Text style={styles.small}>{l.formula}</Text>
            </View>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(l.amount)}</Text>
          </View>
        ))}

        {/* Top drivers */}
        <Text style={[styles.h2, { marginTop: 14 }]}>Biggest cost drivers</Text>
        {result.topDrivers.map((d) => (
          <View key={d.key} style={[styles.row, { justifyContent: "space-between", marginBottom: 2 }]}>
            <Text style={styles.p}>{d.label}</Text>
            <Text style={styles.p}>
              {d.formatted} ({d.shareOfTotalPct}%)
            </Text>
          </View>
        ))}

        {/* Next step */}
        <View style={[styles.card, { backgroundColor: C.accentBg, borderColor: "#ECC8AC", marginTop: 14 }]}>
          <Text style={[styles.h3, { color: C.accentText }]}>Recommended next step</Text>
          <Text style={[styles.p, { color: C.accentText }]}>
            Run a Workplace Mind Audit to replace these industry averages with your
            team&rsquo;s actual 5C risk profile — almost always making this figure
            more specific, and usually higher, attributed to named teams.
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          {DISCLAIMER}
        </Text>
      </Page>

      {/* How we model cost */}
      <Page style={styles.page}>
        <Text style={styles.eyebrow}>Transparency</Text>
        <Text style={styles.h1}>How we model this figure</Text>
        <Text style={[styles.p, { marginTop: 8 }]}>
          Every number above is a modelled estimate built from your inputs and the
          published coefficients below — never an invented figure.
        </Text>

        {result.researchDefaults.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.line, marginTop: 8 }]}>
            <Text style={styles.h3}>Research defaults applied</Text>
            {result.researchDefaults.map((rd) => {
              const coef = getCoefficient(rd.coefficientKey);
              return (
                <Text key={rd.coefficientKey} style={styles.p}>
                  • {coef?.name ?? rd.label}: {coef?.value} — {coef?.source.publication}.
                </Text>
              );
            })}
          </View>
        )}

        <View style={styles.divider} />
        <Text style={styles.h2}>Coefficient sources</Text>
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

        <Text style={styles.footer} fixed>
          {DISCLAIMER}
        </Text>
      </Page>
    </Document>
  );
}

/** Render the calculator report to a PDF buffer. */
export function renderBurnoutCostReportPdf(
  result: CalculatorResult,
  company?: string,
): Promise<Buffer> {
  return renderToBuffer(<BurnoutCostReport result={result} company={company} />);
}
