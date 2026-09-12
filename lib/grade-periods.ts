import type { GradeRecord, GradeTerm } from "@/data/mockData";

export type GradePeriodId = "period1" | "period2" | "period3" | "annual";
export type GradePeriodSystem = "three-term" | "two-term";
export const PERIOD_IDS: GradePeriodId[] = ["period1", "period2", "period3", "annual"];
const legacyTerms: Record<GradePeriodId, GradeTerm> = { period1: "1学期", period2: "2学期", period3: "3学期", annual: "学年末" };
export const normalizePeriodSystem = (value: unknown): GradePeriodSystem => value === "two-term" ? "two-term" : "three-term";
export function resolveGradePeriod(record: Pick<GradeRecord, "term" | "periodId">): GradePeriodId | null {
  if (record.periodId !== undefined) return PERIOD_IDS.includes(record.periodId) ? record.periodId : null;
  return PERIOD_IDS.find(id => legacyTerms[id] === record.term) ?? null;
}
export function activePeriodIds(system: GradePeriodSystem) {
  return PERIOD_IDS.filter(id => system !== "two-term" || id !== "period3");
}
export const legacyGradeTerm = (id: GradePeriodId) => legacyTerms[id];
export function gradePeriodLabel(id: GradePeriodId | null, system: GradePeriodSystem = "three-term") {
  if (!id) return "不明な期間";
  if (id === "annual") return "年間評定";
  if (system === "two-term") return { period1: "前期", period2: "後期", period3: "3学期（未使用・集計対象外）" }[id];
  return legacyTerms[id];
}
