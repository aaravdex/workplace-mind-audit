import type { ComponentType } from "react";
import Startups, {
  meta as startups,
} from "./why-startups-burn-out-their-best-employees.mdx";
import Silence, {
  meta as silence,
} from "./why-employees-stay-silent-until-they-resign.mdx";
import ManagerSupport, {
  meta as managerSupport,
} from "./how-manager-support-reduces-burnout-risk.mdx";

export interface CaseStudyMeta {
  slug: string;
  title: string;
  summary: string;
  focus: string[];
  readingTime: string;
}

export interface CaseStudyEntry {
  meta: CaseStudyMeta;
  Content: ComponentType;
}

/** Ordered list of case studies, sourced from the MDX files. */
export const CASE_STUDIES: CaseStudyEntry[] = [
  { meta: startups, Content: Startups },
  { meta: silence, Content: Silence },
  { meta: managerSupport, Content: ManagerSupport },
];

export function getCaseStudy(slug: string): CaseStudyEntry | undefined {
  return CASE_STUDIES.find((c) => c.meta.slug === slug);
}
