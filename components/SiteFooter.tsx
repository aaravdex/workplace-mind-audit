import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";
import { TRUST_LINE } from "@/lib/constants";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] =
  [
    {
      heading: "Product",
      links: [
        { href: "/calculator", label: "Burnout Cost Calculator" },
        { href: "/audit", label: "Workplace Mind Audit" },
        { href: "/benchmarks", label: "Benchmarks" },
        { href: "/services", label: "Services" },
      ],
    },
    {
      heading: "Learn",
      links: [
        { href: "/methodology", label: "Methodology" },
        { href: "/case-studies", label: "Case Studies" },
        { href: "/resources", label: "Resources" },
        { href: "/about", label: "About" },
      ],
    },
    {
      heading: "Talk to us",
      links: [{ href: "/contact", label: "Contact & Booking" }],
    },
  ];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-brand-100 bg-brand-50">
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="font-serif text-lg font-semibold text-brand-900">
              Workplace Mind Audit
            </div>
            <p className="mt-3 text-sm text-brand-600">{TRUST_LINE}</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                {col.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-brand-600 transition-colors hover:text-brand-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-brand-100 pt-6">
          <Disclaimer />
          <p className="mt-4 text-xs text-brand-400">
            © {year} Workplace Mind Audit. Aggregate-only reporting. No
            individual responses are ever shown to employers.
          </p>
        </div>
      </Container>
    </footer>
  );
}
