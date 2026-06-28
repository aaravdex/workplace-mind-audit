import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Scaffold marker for routes whose full implementation lands in a later phase.
 * Keeps the site navigable and build-clean while making the roadmap explicit.
 */
export function PagePlaceholder({
  eyebrow,
  title,
  description,
  phase,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <Container className="py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
        {eyebrow}
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold text-brand-900">
        {title}
      </h1>
      <p className="mt-4 max-w-prose text-lg text-brand-600">{description}</p>

      <div className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-500 ring-1 ring-inset ring-brand-100">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
        Scaffolded — full build arrives in {phase}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/calculator">Calculate Burnout Cost</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </Container>
  );
}
