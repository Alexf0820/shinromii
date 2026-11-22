import masterFile from "@/data/university-master/r7-2025.json";

import reviews from "@/data/university-master/reviewed.json";

export type CatalogSource = { academicYear: string; checkedAt: string; sourceUrl: string; sourceName: string };

export type UniversityMasterType = "国立" | "公立" | "私立";

export type FacultyMaster = {
  id: string;
  name: string;
};

export type UniversityMaster = {
  id: string;
  schoolCode: string;
  name: string;
  type: UniversityMasterType;
  prefecture: string;
  faculties: FacultyMaster[];
  source?: CatalogSource;
};

export type UniversityMasterFile = {
  academicYear: string;
  academicYearLabel: string;
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
  idNote: string;
  universities: UniversityMaster[];
};

const base = masterFile as UniversityMasterFile;
export const universityMaster: UniversityMasterFile = {
  ...base,
  universities: base.universities.map(school => {
    const review = reviews.find(row => row.schoolCode === school.schoolCode && row.academicYear > base.academicYear);
    if (!review) return school;
    const { faculties, schoolCode, ...source } = review;
    return { ...school, source, faculties: faculties.map(name => ({
      name, id: school.faculties.find(f => f.name === name)?.id ?? `shinromii-fac-${schoolCode}-${name.replace(/[ 　]/g, "")}`,
    })) };
  }),
};
export const universitySource = (school: UniversityMaster) => school.source ?? base;

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").replace(/[\s　]/g, "").toLowerCase();
}

/** 大学名の部分一致。巨大な外部APIは使わず、静的マスターをローカル検索する。 */
export function searchUniversityMaster(query: string, limit = 50): UniversityMaster[] {
  const needle = normalizeSearchText(query);

  if (!needle) {
    return [];
  }

  const hits: UniversityMaster[] = [];

  for (const university of universityMaster.universities) {
    if (normalizeSearchText(university.name).includes(needle)) {
      hits.push(university);

      if (hits.length >= limit) {
        break;
      }
    }
  }

  return hits;
}

export function findUniversityMasterById(id: string) {
  return universityMaster.universities.find((university) => university.id === id) ?? null;
}

export function findUniversityMasterByExactName(name: string) {
  const exact = universityMaster.universities.filter((university) => university.name === name);
  return exact.length === 1 ? exact[0] : null;
}

export function findFacultyMasterByExactName(university: UniversityMaster, facultyName: string) {
  const exact = university.faculties.filter((faculty) => faculty.name === facultyName);
  return exact.length === 1 ? exact[0] : null;
}

export function formatUniversityMasterCheckedAt(checkedAt = universityMaster.checkedAt) {
  const [year, month, day] = checkedAt.split("-");

  if (!year || !month || !day) {
    return checkedAt;
  }

  return `${year}年${Number(month)}月${Number(day)}日確認`;
}
