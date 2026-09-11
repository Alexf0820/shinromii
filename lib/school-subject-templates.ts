/** Public definitions only. Never derive this registry from a user's notebook. */
export type SchoolSubjectsTemplate = {
  templateVersion: 1;
  type: "schoolSubjects";
  key: string;
  school: { id: string; displayName: string };
  grade: 1 | 2 | 3;
  course: string;
  subjects: string[];
};

const templates: SchoolSubjectsTemplate[] = [{
  templateVersion: 1,
  type: "schoolSubjects",
  key: "sample-high1-v1",
  school: { id: "sample-school", displayName: "同じ高校（サンプル）" },
  grade: 1,
  course: "指定なし",
  subjects: ["現代の国語", "言語文化", "歴史総合", "公共", "数学I", "数学A", "化学基礎", "生物基礎", "体育", "保健", "英語コミュニケーションI", "論理・表現I", "家庭基礎", "情報I"],
}];

export function getSchoolSubjectsTemplate(key: string) {
  const template = templates.find((item) => item.key === key);
  return template ? { ...template, school: { ...template.school }, subjects: [...template.subjects] } : undefined;
}

/** Only registered, versioned public definitions survive import. Extra fields are discarded. */
export function normalizeSchoolSubjectsTemplate(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SchoolSubjectsTemplate>;
  if (candidate.templateVersion !== 1 || candidate.type !== "schoolSubjects" || typeof candidate.key !== "string") return undefined;
  return getSchoolSubjectsTemplate(candidate.key);
}
