import type { ShinromiiStorage } from "@/lib/shinromii-storage";
import { createEmptyProfile, SUBJECT_SUGGESTIONS } from "@/lib/user-profile";
import { createDefaultCampusEvaluators, normalizeCampusEvaluations } from "@/lib/oc-record";
import { resolveGradePeriod } from "@/lib/grade-periods";

/** 実データや既存シードを参照しない、デモ専用の架空ノート。 */
export function createDemoSample(): ShinromiiStorage {
  const date = "2026-09-11";
  const timestamp = `${date}T00:00:00.000Z`;
  const meta = { studentProfileId: "sample-student", sourceType: "manual" as const, confirmedByUser: true };
  const profile = {
    ...createEmptyProfile(),
    displayName: "サンプル はる（架空）",
    schoolYear: "high-1" as const,
    schoolName: "サンプル高校（架空）",
    academicTrack: "undecided" as const,
    strongSubjects: ["英語コミュニケーションI", "情報I"],
    weakSubjects: ["数学I"],
    interestFields: ["society", "it", "business"] as const,
    admissionMethods: ["sogo", "school-recommend", "general"] as const,
    careerMemo: "【架空デモ】進路は検討中。推薦と一般の両方を確認する。",
  };
  const schools = [
    { id: "toyo", name: "東洋大学", faculty: "社会学部", date: "2026-08-08", status: "参加済み" as const },
    { id: "senshu", name: "専修大学", faculty: "ネットワーク情報学部", date: "2026-09-26", status: "予約済み" as const },
    { id: "komazawa", name: "駒澤大学", faculty: "経営学部", date: "2026-08-23", status: "参加済み" as const },
  ];
  const scores = [66, 61, 69, 73, 54, 60, 57, 66, 75, 67, 76, 72, 74, 77];
  return {
    version: 9,
    campusEvaluators: createDefaultCampusEvaluators(),
    meta: { isSample: true, demoPeriodsVersion: 2 },
    gradePeriodSystem: "three-term",
    setupCompleted: true,
    profile: { ...profile, interestFields: [...profile.interestFields], admissionMethods: [...profile.admissionMethods] },
    identity: {
      users: [{ id: "sample-user", authUserId: null, plan: "free", createdAt: timestamp }],
      families: [{ id: "sample-family", createdAt: timestamp }],
      familyMembers: [{ id: "sample-member", familyId: "sample-family", userId: "sample-user", role: "owner", createdAt: timestamp }],
      studentProfiles: [{ id: "sample-student", familyId: "sample-family", displayName: profile.displayName, createdAt: timestamp }],
      entitlements: [],
      session: { status: "signed_out", method: null, currentUserId: "sample-user", currentFamilyId: "sample-family", currentStudentProfileId: "sample-student", lastAuthenticatedAt: null },
    },
    gradeRecords: (["period1", "period2"] as const).flatMap((periodId, periodIndex) => SUBJECT_SUGGESTIONS.map((subject, index) => {
      const ratings = periodIndex === 0 ? [3,3,3,4,3,3,3,3,4,3,4,4,4,4] : [3,3,3,4,4,3,3,4,4,3,4,4,4,4];
      const examScores = { midterm: index >= 8 && index <= 9 ? null : scores[index] - 3 + periodIndex, final: scores[index] + 2 + periodIndex };
      return { id: periodIndex === 0 ? `sample-grade-${index}` : `sample-grade-period2-${index}`, schoolYear: "高1" as const, term: periodIndex === 0 ? "1学期" as const : "2学期" as const, periodId, subject, scores: examScores, grade: ratings[index], memo: "【架空デモ】実在校の成績ではありません。2期間を比較するための架空の日付・評定です。", createdAt: periodIndex === 0 ? "2026-07-24" : "2026-12-20", updatedAt: periodIndex === 0 ? date : "2026-12-20", ...meta };
    })),
    qualifications: [{ id: "sample-eiken", name: "英検", kind: "eiken", scoreOrLevel: "準2級", status: "取得済み", examDate: "2026-06-20", memo: "【架空デモ】日付は公式試験日を表しません。", createdAt: date, updatedAt: date, ...meta }],
    universityCandidates: schools.map((school) => ({ id: `sample-university-${school.id}`, university: school.name, faculty: school.faculty, department: "", url: "", interest: 3, studentScore: "検討中", familyScore: "検討中", studentView: "【架空デモ】学部選びをもう少し調べたい。", familyView: "本人の興味と通い方を一緒に考えたい。", reason: "学ぶ内容を比べたい。", futureNote: "入試条件は公式情報で確認する。", createdAt: date, ...meta })),
    openCampusEvents: schools.map((school) => ({ id: `sample-oc-${school.id}`, university: school.name, facultyDepartment: school.faculty, eventName: "オープンキャンパス（架空デモ）", eventType: "オープンキャンパス", eventDate: school.date, startTime: "10:00", endTime: "12:00", status: school.status, companionMemo: "保護者と参加する架空設定", meetingPlace: "", accessMemo: "", dayMemo: "【架空デモ】日時・予約・参加は架空の設定で、公式開催情報ではありません。", links: [], attachments: [], createdAt: date, updatedAt: date, ...meta })),
    campusEvaluations: normalizeCampusEvaluations({
      "sample-oc-komazawa": { overall: 4, goodPoint: "【架空の感想】駅から行きやすかった。学生の雰囲気が明るかった。", badPoint: "学部の違いをもう少し調べたい。", studentComment: "次回は入試説明も聞きたい。", familyComment: "推薦と一般の両方を確認する。", freeNote: "実際の訪問記録・大学の事実評価ではありません。", categoryScores: { atmosphere: 4, curriculum: 3, students: 4, access: 4, career: null }, aspiration: "keep", ...meta },
    }),
    aiNotes: [
      { id: "sample-note-1", consultedAt: "2026-09-05", provider: "その他", title: "【架空デモ】入試方法の比較", consultationBody: "推薦・総合型・一般をどう比べる？", answerBody: "【架空の回答例】興味と日々の学習を整理し、出願条件は公式情報で確認する。", summary: "学部選びと学習を続けながら比較する。", relatedSchool: "", helpful: 4, freeNote: "実際のAI回答ではありません。", ...meta },
      { id: "sample-note-2", consultedAt: "2026-09-08", provider: "その他", title: "【架空デモ】次のOCで見ること", consultationBody: "学部の学びと雰囲気を知りたい。", answerBody: "【架空の回答例】質問を準備し、家族と感想を比べる。", summary: "次回は入試説明も聞きたい。", relatedSchool: "専修大学", helpful: 3, freeNote: "実際の相談記録ではありません。", ...meta },
    ],
  };
}

/** Built-in old demo only: append missing second-period subjects once; keep all edits. */
export function upgradeDemoPeriods(storage: ShinromiiStorage): ShinromiiStorage {
  if (storage.meta?.isSample !== true || storage.meta.demoPeriodsVersion === 2 ||
      !SUBJECT_SUGGESTIONS.every((_, index) => storage.gradeRecords.some(r => r.id === `sample-grade-${index}`))) return storage;
  const additions = createDemoSample().gradeRecords.filter(r => r.periodId === "period2" && !storage.gradeRecords.some(old =>
    old.id === r.id || (old.schoolYear === r.schoolYear && resolveGradePeriod(old) === "period2" && old.subject.trim() === r.subject.trim())
  ));
  return { ...storage, meta: { ...storage.meta, demoPeriodsVersion: 2 }, gradeRecords: [...storage.gradeRecords, ...additions] };
}
