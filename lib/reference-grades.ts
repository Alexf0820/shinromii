import { resolveGradePeriod, activePeriodIds, PERIOD_IDS, gradePeriodLabel, type GradePeriodSystem, type GradePeriodId } from "@/lib/grade-periods";
import type { GradeRecord, GradeSchoolYear, GradeTerm } from "@/data/mockData";

export const isValidGrade = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
export const formatReferenceAverage = (value: number | null) => value === null ? "—" : value.toFixed(1);
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const years = ["高1", "高2", "高3"];

export const sameGradeSubject = (a: Pick<GradeRecord, "schoolYear" | "term" | "periodId" | "subject">, b: Pick<GradeRecord, "schoolYear" | "term" | "periodId" | "subject">) =>
  a.schoolYear === b.schoolYear && resolveGradePeriod(a) === resolveGradePeriod(b) && a.subject.trim() === b.subject.trim();

/** Read-only aggregation. Stored records (including conflicts) are never rewritten. */
export function summarizeReferenceGrades(records: GradeRecord[], system: GradePeriodSystem = "three-term") {
  const groups = new Map<string, { key: string; schoolYear: GradeSchoolYear; term: GradeTerm; periodId: GradePeriodId | null; records: GradeRecord[] }>();
  for (const record of records) {
    const periodId = resolveGradePeriod(record);
    const key = JSON.stringify([record.schoolYear, periodId ?? record.term]);
    const group = groups.get(key) ?? { key, schoolYear: record.schoolYear, term: record.term, periodId, records: [] };
    group.records.push(record);
    groups.set(key, group);
  }
  const periods = [...groups.values()].map(group => {
    const buckets = new Map<string, GradeRecord[]>();
    for (const record of group.records) {
      const subject = typeof record.subject === "string" ? record.subject.trim() : "";
      buckets.set(subject, [...(buckets.get(subject) ?? []), record]);
    }
    const subjects = [...buckets].map(([subject, rows]) => {
      const values = [...new Set(rows.map(r => r.grade).filter(isValidGrade))];
      const validPeriod = years.includes(group.schoolYear) && group.periodId !== null && activePeriodIds(system).includes(group.periodId);
      return { subject, value: subject && validPeriod && values.length === 1 ? values[0] : null,
        conflict: values.length > 1, invalid: rows.some(r => !isValidGrade(r.grade)) };
    });
    const values = subjects.flatMap(s => s.value === null ? [] : [s.value]);
    return { ...group, label: gradePeriodLabel(group.periodId, system), inactive: group.periodId === "period3" && system === "two-term", subjects, average: mean(values), count: values.length,
      excluded: subjects.filter(s => s.value === null).length,
      conflicts: subjects.filter(s => s.conflict).length,
      invalidRecords: group.records.filter(r => !isValidGrade(r.grade)).length };
  }).sort((a, b) => years.indexOf(b.schoolYear) - years.indexOf(a.schoolYear) || PERIOD_IDS.indexOf(b.periodId!) - PERIOD_IDS.indexOf(a.periodId!));
  const annual = years.map(schoolYear => {
    const periodsInYear = periods.filter(p => p.schoolYear === schoolYear && !p.inactive);
    const names = [...new Set(periodsInYear.flatMap(p => p.subjects.map(s => s.subject)))];
    let supplemented = 0;
    const values = names.map(subject => {
      const end = periodsInYear.find(p => p.periodId === "annual")?.subjects.find(s => s.subject === subject);
      // Conflicting year-end grades require review. Invalid-only rows are excluded,
      // so a subject with no valid year-end grade can use valid term grades.
      if (end?.conflict) return null;
      if (end?.value != null) return end.value;
      const available = periodsInYear.filter(p => p.periodId !== "annual").flatMap(p => {
        const s = p.subjects.find(s => s.subject === subject);
        return s?.value != null ? [s.value] : [];
      });
      if (available.length) supplemented++;
      return mean(available);
    }).filter((v): v is number => v !== null);
    return { schoolYear, average: mean(values), count: values.length, excluded: names.length - values.length, supplemented };
  }).filter(y => periods.some(p => p.schoolYear === y.schoolYear));
  return { periods, annual, latest: periods.find(p => p.count > 0) ?? null,
    excluded: periods.reduce((n, p) => n + p.excluded, 0),
    invalidRecords: periods.reduce((n, p) => n + p.invalidRecords, 0) };
}
