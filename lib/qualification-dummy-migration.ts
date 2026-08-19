import { qualifications as canonicalQualifications } from "@/data/mockData";
import type { QualificationRecord } from "@/data/mockData";

/** アプリが配布していた旧ダミー／初期資格の ID。ユーザー新規作成の ID とは一致しない。 */
const APP_MANAGED_QUALIFICATION_IDS = new Set([
  "qualification-eiken-pre2",
  "qualification-eiken-3",
  "qualification-kanken-2",
  "qualification-eiken-pre2-pass-2024",
  "qualification-eiken-3-pass-2022",
  "qualification-eiken-2-pass-2026",
]);

function isOriginalEikenPre2Dummy(record: QualificationRecord) {
  return (
    record.name === "英検" &&
    record.scoreOrLevel === "準2級" &&
    record.examDate === "2026-06-15" &&
    record.memo === "次は2級を目標にしたい。"
  );
}

function isOriginalKankenDummy(record: QualificationRecord) {
  return (
    record.name === "漢検" &&
    record.scoreOrLevel === "2級" &&
    record.examDate === "2025-11-20" &&
    record.memo === ""
  );
}

function isV794SeedQualification(record: QualificationRecord) {
  return (
    (record.name === "英検" &&
      record.scoreOrLevel === "準2級" &&
      record.examDate === "2024-05-15" &&
      record.memo === "英検S-CBT / 2024年度 第1回 / CEFR A2") ||
    (record.name === "英検" &&
      record.scoreOrLevel === "3級" &&
      record.examDate === "2023-01-15" &&
      record.memo === "英検S-CBT / 2022年度 第3回 / CEFR A1")
  );
}

function isV795SeedQualification(record: QualificationRecord) {
  return (
    (record.name === "英検" &&
      record.scoreOrLevel === "準2級" &&
      record.examDate === "" &&
      record.memo === "英検S-CBT / 2024年度 第1回" &&
      record.eikenScores?.cse === 1740) ||
    (record.name === "英検" &&
      record.scoreOrLevel === "3級" &&
      record.examDate === "" &&
      record.memo === "英検S-CBT / 2022年度 第3回" &&
      record.eikenScores?.cse === 1687)
  );
}

export function isLegacyDummyQualification(record: QualificationRecord) {
  if (APP_MANAGED_QUALIFICATION_IDS.has(record.id)) {
    return true;
  }

  return (
    isOriginalEikenPre2Dummy(record) ||
    isOriginalKankenDummy(record) ||
    isV794SeedQualification(record) ||
    isV795SeedQualification(record)
  );
}

function isSameCanonicalQualification(record: QualificationRecord, canonical: QualificationRecord) {
  if (record.id === canonical.id) {
    return true;
  }

  return record.name === canonical.name && record.scoreOrLevel === canonical.scoreOrLevel;
}

function qualificationSignature(records: QualificationRecord[]) {
  return records
    .map(
      (record) =>
        `${record.id}|${record.name}|${record.scoreOrLevel}|${record.examDate}|${record.memo}|${record.eikenScores?.cse ?? ""}|${record.eikenScores?.cefr ?? ""}|${record.eikenScores?.reading ?? ""}|${record.eikenScores?.listening ?? ""}|${record.eikenScores?.writing ?? ""}|${record.eikenScores?.speaking ?? ""}`,
    )
    .sort()
    .join("\n");
}

/** 既知のアプリ配布資格だけを、現在の合格3件へ置き換える。ユーザー追加分は残す。 */
export function migrateLegacyDummyQualifications(records: QualificationRecord[]): {
  records: QualificationRecord[];
  changed: boolean;
} {
  const userRecords = records.filter((record) => !isLegacyDummyQualification(record));

  if (userRecords.length === records.length) {
    return { records, changed: false };
  }

  const next = [...userRecords];

  canonicalQualifications.forEach((canonical) => {
    const alreadyPresent = next.some((record) => isSameCanonicalQualification(record, canonical));

    if (!alreadyPresent) {
      next.push(canonical);
    }
  });

  if (qualificationSignature(records) === qualificationSignature(next)) {
    return { records, changed: false };
  }

  return { records: next, changed: true };
}
