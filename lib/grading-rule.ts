/**
 * 評定の出し方は学校によって違うため、アプリ共通の固定ルールにはしない。
 * 計算方式をプロファイルとして分け、使う方式を1か所で選ぶ。
 * 将来「自分で評定を入力する」「テストの点数から自動計算する」を
 * 初期設定で選べるようにする場合も、ここに方式を足すだけで済む。
 */
export type GradingMethod = "manual" | "school-rule-a";

export type GradingThreshold = {
  /** この点数以上なら grade になる（表は高い順に並べる） */
  min: number;
  grade: number;
};

export type GradingProfile = {
  id: GradingMethod;
  label: string;
  /** 中間・期末の両方を受けた科目：合計点で判定。null なら自動計算しない */
  twoExams: GradingThreshold[] | null;
  /** 片方しか受けていない科目：その得点で判定。null なら自動計算しない */
  oneExam: GradingThreshold[] | null;
};

export const gradingProfiles: Record<GradingMethod, GradingProfile> = {
  manual: {
    id: "manual",
    label: "評定を自分で入力する",
    twoExams: null,
    oneExam: null,
  },
  "school-rule-a": {
    id: "school-rule-a",
    label: "テストの点数から自動計算する",
    twoExams: [
      { min: 160, grade: 5 },
      { min: 140, grade: 4 },
      { min: 80, grade: 3 },
      { min: 60, grade: 2 },
      { min: 0, grade: 1 },
    ],
    oneExam: [
      { min: 80, grade: 5 },
      { min: 70, grade: 4 },
      { min: 40, grade: 3 },
      { min: 30, grade: 2 },
      { min: 0, grade: 1 },
    ],
  },
};

/** 現在使う計算方式。設定画面を作るときはこの値をユーザー設定から渡す。 */
export const ACTIVE_GRADING_METHOD: GradingMethod = "school-rule-a";

export function getGradingProfile(method: GradingMethod = ACTIVE_GRADING_METHOD): GradingProfile {
  return gradingProfiles[method] ?? gradingProfiles[ACTIVE_GRADING_METHOD];
}

/** 中間は実施されない科目があるため、未実施は null で保持する（0点ではない）。 */
export type ExamScores = {
  midterm: number | null;
  final: number | null;
};

export function createEmptyExamScores(): ExamScores {
  return { midterm: null, final: null };
}

function toScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * 保存済みデータの得点を現在の形へそろえる。
 * 旧形式の配列（[中間, 期末] / [期末のみ]）も受け取れるようにしている。
 */
export function normalizeExamScores(raw: unknown): ExamScores | null {
  if (Array.isArray(raw)) {
    const values = raw.map(toScore).filter((score): score is number => score !== null);

    if (values.length === 0) {
      return null;
    }

    return values.length >= 2
      ? { midterm: values[0], final: values[1] }
      : { midterm: null, final: values[0] };
  }

  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const source = raw as { midterm?: unknown; final?: unknown };
  const scores: ExamScores = {
    midterm: toScore(source.midterm),
    final: toScore(source.final),
  };

  return hasAnyExamScore(scores) ? scores : null;
}

export function listExamScores(scores: ExamScores | null | undefined): number[] {
  if (!scores) {
    return [];
  }

  return [scores.midterm, scores.final].filter((score): score is number => score !== null);
}

export function hasAnyExamScore(scores: ExamScores | null | undefined) {
  return listExamScores(scores).length > 0;
}

/** 中間と期末の両方がある科目は2回、どちらか一方だけなら1回。空欄は回数に数えない。 */
export function examCount(scores: ExamScores | null | undefined) {
  if (!scores) {
    return 0;
  }

  return Number(scores.midterm !== null) + Number(scores.final !== null);
}

export function examTotal(scores: ExamScores | null | undefined): number | null {
  if (!scores) {
    return null;
  }

  if (scores.midterm !== null && scores.final !== null) {
    return scores.midterm + scores.final;
  }

  if (scores.final !== null) {
    return scores.final;
  }

  if (scores.midterm !== null) {
    return scores.midterm;
  }

  return null;
}

function gradeFromTotal(total: number, table: GradingThreshold[] | null): number | null {
  return table?.find((threshold) => total >= threshold.min)?.grade ?? null;
}

/**
 * 入力状況から1回試験 / 2回試験を自動判定する。
 * 中間の空欄は未実施であり、0点としては扱わない。
 * 得点が未入力、または手入力方式のときは null を返し、手入力の評定を残せるようにする。
 */
export function gradeFromExamScores(
  scores: ExamScores | null | undefined,
  profile: GradingProfile = getGradingProfile(),
): number | null {
  if (!scores) {
    return null;
  }

  if (scores.midterm !== null && scores.final !== null) {
    return gradeFromTotal(scores.midterm + scores.final, profile.twoExams);
  }

  if (scores.final !== null) {
    return gradeFromTotal(scores.final, profile.oneExam);
  }

  if (scores.midterm !== null) {
    return gradeFromTotal(scores.midterm, profile.oneExam);
  }

  return null;
}
