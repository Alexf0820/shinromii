import { universities as canonicalUniversities } from "@/data/mockData";
import type { UniversityCandidate } from "@/data/mockData";

/** アプリが配布していた旧ダミー大学候補の ID。ユーザー新規作成の ID とは一致しない。 */
const LEGACY_DUMMY_UNIVERSITY_IDS = new Set([
  "candidate-aoba-media",
  "candidate-hoshigaoka-management",
  "candidate-konan-global",
]);

function isOriginalAobaDummy(record: UniversityCandidate) {
  return record.university === "青葉大学" && record.faculty === "情報デザイン学部";
}

function isOriginalHoshigaokaDummy(record: UniversityCandidate) {
  return record.university === "星ヶ丘大学" && record.faculty === "経営学部";
}

function isOriginalKonanDummy(record: UniversityCandidate) {
  return record.university === "港南学院大学" && record.faculty === "国際教養学部";
}

export function isLegacyDummyUniversity(record: UniversityCandidate) {
  if (LEGACY_DUMMY_UNIVERSITY_IDS.has(record.id)) {
    return true;
  }

  return isOriginalAobaDummy(record) || isOriginalHoshigaokaDummy(record) || isOriginalKonanDummy(record);
}

function isSameCanonicalUniversity(record: UniversityCandidate, canonical: UniversityCandidate) {
  if (record.id === canonical.id) {
    return true;
  }

  return record.university === canonical.university && record.faculty === canonical.faculty;
}

function universitySignature(records: UniversityCandidate[]) {
  return records
    .map((record) => `${record.id}|${record.university}|${record.faculty}|${record.department}`)
    .sort()
    .join("\n");
}

/** 既知のアプリ配布ダミーだけを、現在の大学候補3件へ置き換える。ユーザー追加分は残す。 */
export function migrateLegacyDummyUniversities(records: UniversityCandidate[]): {
  records: UniversityCandidate[];
  changed: boolean;
} {
  const userRecords = records.filter((record) => !isLegacyDummyUniversity(record));

  if (userRecords.length === records.length) {
    return { records, changed: false };
  }

  const next = [...userRecords];

  canonicalUniversities.forEach((canonical) => {
    const alreadyPresent = next.some((record) => isSameCanonicalUniversity(record, canonical));

    if (!alreadyPresent) {
      next.push(canonical);
    }
  });

  if (universitySignature(records) === universitySignature(next)) {
    return { records, changed: false };
  }

  return { records: next, changed: true };
}
