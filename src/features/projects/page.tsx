import type { Language, Translations } from "../../locales";
import PmProjectsPage from "./pm/page";

interface ProjectsPageProps {
  translations: Translations;
  language: Language;
}

/**
 * Stable entry point for the projects feature.
 *
 * Project-type pages live in their own folders, while application routing only
 * needs to know about this module-level entry point.
 */
export default function ProjectsPage(props: ProjectsPageProps) {
  return <PmProjectsPage {...props} />;
}
