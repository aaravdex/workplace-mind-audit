import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Calculator } from "@/components/Calculator";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "Burnout Cost Calculator",
  description:
    "Estimate the annual cost of burnout across absenteeism, presenteeism, attrition, and manager overload. Free, instant, no account required.",
};

export default function CalculatorPage() {
  return (
    <Container className="py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          Attract · Free tool
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-brand-900">
          Burnout Cost Calculator
        </h1>
        <p className="mt-4 text-lg text-brand-600">
          Put a defensible annual figure on burnout — across absenteeism,
          presenteeism, attrition, and manager overload. Results update live as
          you type. The on-screen estimate is always free.
        </p>
      </div>

      <div className="mt-10">
        <Calculator />
      </div>

      <div className="mt-12 max-w-prose border-t border-brand-100 pt-6">
        <Disclaimer />
      </div>
    </Container>
  );
}
