export const SCHOOL_YEARS = [
  { id: "junior-1", label: "中学1年" },
  { id: "junior-2", label: "中学2年" },
  { id: "junior-3", label: "中学3年" },
  { id: "high-1", label: "高校1年" },
  { id: "high-2", label: "高校2年" },
  { id: "high-3", label: "高校3年" },
  { id: "other", label: "その他" },
] as const;

export const PROGRESSION_STAGES = [
  { id: "high-school", label: "高校進学", shortLabel: "高校進学", emoji: "🏫" },
  { id: "university", label: "大学進学", shortLabel: "大学進学", emoji: "🎓" },
] as const;

export const ACADEMIC_TRACKS = [
  { id: "humanities", label: "文系" },
  { id: "science", label: "理系" },
  { id: "undecided", label: "未定" },
] as const;

export const ADMISSION_METHODS = [
  { id: "sogo", label: "総合型選抜" },
  { id: "school-recommend", label: "学校推薦型選抜" },
  { id: "designated", label: "指定校推薦" },
  { id: "general", label: "一般選抜" },
  { id: "common-test", label: "共通テスト利用" },
  { id: "undecided", label: "まだ決めていない" },
] as const;

export const INTEREST_FIELDS = [
  { id: "english-intl", label: "英語 / 国際" },
  { id: "it", label: "情報 / IT" },
  { id: "data-ai", label: "データ / AI" },
  { id: "business", label: "ビジネス / 経営" },
  { id: "economics", label: "経済" },
  { id: "education", label: "教育" },
  { id: "psychology", label: "心理" },
  { id: "society", label: "社会" },
  { id: "media", label: "メディア" },
  { id: "design", label: "デザイン" },
  { id: "law", label: "法律" },
  { id: "medical", label: "医療 / 健康" },
  { id: "other", label: "その他" },
] as const;

/** 成績画面の高1科目名を、得意 / 苦手の候補として再利用する。 */
export const SUBJECT_SUGGESTIONS = [
  "現代の国語",
  "言語文化",
  "歴史総合",
  "公共",
  "数学I",
  "数学A",
  "化学基礎",
  "生物基礎",
  "体育",
  "保健",
  "英語コミュニケーションI",
  "論理・表現I",
  "家庭基礎",
  "情報I",
] as const;

export type SchoolYearId = (typeof SCHOOL_YEARS)[number]["id"];
export type ProgressionStageId = (typeof PROGRESSION_STAGES)[number]["id"];
export type AcademicTrackId = (typeof ACADEMIC_TRACKS)[number]["id"];
export type AdmissionMethodId = (typeof ADMISSION_METHODS)[number]["id"];
export type InterestFieldId = (typeof INTEREST_FIELDS)[number]["id"];

export type UserProfile = {
  displayName: string;
  progressionStage: ProgressionStageId | "";
  schoolYear: SchoolYearId | "";
  schoolName: string;
  course: string;
  academicTrack: AcademicTrackId | "";
  strongSubjects: string[];
  weakSubjects: string[];
  interestFields: InterestFieldId[];
  interestNote: string;
  futureAspiration: string;
  admissionMethods: AdmissionMethodId[];
  careerMemo: string;
};

export function createEmptyProfile(): UserProfile {
  return {
    displayName: "",
    progressionStage: "",
    schoolYear: "",
    schoolName: "",
    course: "",
    academicTrack: "",
    strongSubjects: [],
    weakSubjects: [],
    interestFields: [],
    interestNote: "",
    futureAspiration: "",
    admissionMethods: [],
    careerMemo: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickId<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : "";
}

function pickIds<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  return asStringList(value).filter((item): item is T => allowed.includes(item as T));
}

export function inferProgressionStageFromSchoolYear(schoolYear: SchoolYearId | ""): ProgressionStageId | "" {
  if (schoolYear === "junior-1" || schoolYear === "junior-2" || schoolYear === "junior-3") {
    return "high-school";
  }

  if (schoolYear === "high-1" || schoolYear === "high-2" || schoolYear === "high-3") {
    return "university";
  }

  return "";
}

export function normalizeUserProfile(
  value: unknown,
  options?: { defaultSchoolYear?: SchoolYearId | "" },
): UserProfile {
  const raw = isRecord(value) ? value : {};
  const defaultSchoolYear = options?.defaultSchoolYear ?? "";

  const schoolYear =
    pickId(
      raw.schoolYear,
      SCHOOL_YEARS.map((item) => item.id),
    ) || defaultSchoolYear;
  const progressionStage =
    pickId(
      raw.progressionStage,
      PROGRESSION_STAGES.map((item) => item.id),
    ) || inferProgressionStageFromSchoolYear(schoolYear);

  return {
    displayName: asTrimmedString(raw.displayName),
    progressionStage,
    schoolYear,
    schoolName: asTrimmedString(raw.schoolName),
    course: asTrimmedString(raw.course),
    academicTrack: pickId(
      raw.academicTrack,
      ACADEMIC_TRACKS.map((item) => item.id),
    ),
    strongSubjects: asStringList(raw.strongSubjects),
    weakSubjects: asStringList(raw.weakSubjects),
    interestFields: pickIds(
      raw.interestFields,
      INTEREST_FIELDS.map((item) => item.id),
    ),
    interestNote: asTrimmedString(raw.interestNote),
    futureAspiration: asTrimmedString(raw.futureAspiration),
    admissionMethods: pickIds(
      raw.admissionMethods,
      ADMISSION_METHODS.map((item) => item.id),
    ),
    careerMemo: asTrimmedString(raw.careerMemo),
  };
}

export function isProfileRegistered(profile: UserProfile) {
  return Boolean(
    profile.displayName ||
      profile.progressionStage ||
      profile.schoolYear ||
      profile.schoolName ||
      profile.course ||
      profile.academicTrack ||
      profile.strongSubjects.length ||
      profile.weakSubjects.length ||
      profile.interestFields.length ||
      profile.interestNote ||
      profile.futureAspiration ||
      profile.admissionMethods.length ||
      profile.careerMemo,
  );
}

export function labelForProgressionStage(id: ProgressionStageId | "") {
  return PROGRESSION_STAGES.find((item) => item.id === id)?.label ?? "";
}

export function emojiForProgressionStage(id: ProgressionStageId | "") {
  return PROGRESSION_STAGES.find((item) => item.id === id)?.emoji ?? "";
}

export function labelForSchoolYear(id: SchoolYearId | "") {
  return SCHOOL_YEARS.find((item) => item.id === id)?.label ?? "";
}

export function labelForAcademicTrack(id: AcademicTrackId | "") {
  return ACADEMIC_TRACKS.find((item) => item.id === id)?.label ?? "";
}

export function labelsForAdmissionMethods(ids: AdmissionMethodId[]) {
  return ids.flatMap((id) => {
    const label = ADMISSION_METHODS.find((item) => item.id === id)?.label;
    return label ? [label] : [];
  });
}

export function labelsForInterestFields(ids: InterestFieldId[]) {
  return ids.flatMap((id) => {
    const label = INTEREST_FIELDS.find((item) => item.id === id)?.label;
    return label ? [label] : [];
  });
}
