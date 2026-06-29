declare module "*.mdx" {
  import type { ComponentType } from "react";

  /** Frontmatter-style metadata each case study MDX exports. */
  export const meta: {
    slug: string;
    title: string;
    summary: string;
    focus: string[];
    readingTime: string;
  };

  const MDXComponent: ComponentType;
  export default MDXComponent;
}
