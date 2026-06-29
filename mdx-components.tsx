import type { MDXComponents } from "mdx/types";

/**
 * Global styling for MDX content (case studies). Applied automatically by
 * @next/mdx — gives a clean prose look without a typography plugin.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => (
      <h2
        className="mt-10 font-serif text-xl font-semibold text-brand-900"
        {...props}
      />
    ),
    h3: (props) => (
      <h3 className="mt-6 text-base font-semibold text-brand-900" {...props} />
    ),
    p: (props) => (
      <p className="mt-3 leading-relaxed text-brand-600" {...props} />
    ),
    ul: (props) => (
      <ul
        className="mt-3 list-disc space-y-1 pl-5 text-brand-600"
        {...props}
      />
    ),
    ol: (props) => (
      <ol
        className="mt-3 list-decimal space-y-1 pl-5 text-brand-600"
        {...props}
      />
    ),
    strong: (props) => (
      <strong className="font-semibold text-brand-800" {...props} />
    ),
    a: (props) => (
      <a className="text-accent-600 underline hover:text-accent-700" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="mt-4 border-l-2 border-accent-300 pl-4 italic text-brand-500"
        {...props}
      />
    ),
    ...components,
  };
}
