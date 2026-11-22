import index from "@/data/high-school-master/tokyo.json";
import programs from "@/data/high-school-master/programs.json";
import { createUniversityCandidateDraft } from "@/lib/university-draft";

export const highSchoolMaster = index;
export type HighSchool = (typeof index.schools)[number];
export type SchoolProgram = {
  source: keyof typeof programs.sources;
  schedule?: string;
  department?: string;
  course?: string;
  selectionTime?: string;
};

const bySchool = programs.bySchool as Record<string, SchoolProgram[]>;
export const programSources = programs.sources;
export const programsForSchool = (code: string) => bySchool[code] ?? [];
export const programLabel = (p: SchoolProgram) => [p.schedule, p.department, p.course].filter(Boolean).join(" / ");

export function searchHighSchools(query: string) {
  const normalize = (name: string) => name.normalize("NFKC").replace(/\s/g, "").replace(/高等学校/g, "高校").replace(/^東京都立/, "都立");
  const needle = normalize(query);
  return needle ? index.schools.filter(school => normalize(school.name).includes(needle)).slice(0, 50) : [];
}

export function highSchoolDraft(name: string, school?: HighSchool, program?: SchoolProgram) {
  const draft = createUniversityCandidateDraft({ university: name, faculty: program?.department });
  const source = program && programSources[program.source];
  return {
    ...draft,
    schoolKind: "high-school" as const,
    highSchoolCode: school?.code,
    department: program?.course ?? "",
    studySchedule: program?.schedule,
    selectionTime: program?.selectionTime,
    masterAcademicYear: school ? source?.year ?? index.asOf.slice(0, 4) : undefined,
    masterCheckedAt: school ? source?.checkedAt ?? index.checkedAt : undefined,
    masterSourceUrl: school ? source?.url ?? index.sourceUrl : undefined,
  };
}
