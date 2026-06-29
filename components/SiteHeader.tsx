import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

const NAV = [
  { href: "/calculator", label: "Calculator" },
  { href: "/audit", label: "Audit" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/methodology", label: "Methodology" },
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold text-brand-900">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded bg-brand-900 text-xs font-bold text-white"
          >
            5C
          </span>
          Workplace Mind Audit
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-brand-600 transition-colors hover:text-brand-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden text-sm text-brand-600 hover:text-brand-900 sm:block"
          >
            Contact
          </Link>
          <ButtonLink href="/calculator" size="md">
            Calculate Burnout Cost
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
