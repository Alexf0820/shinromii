import { gradeFromExamScores } from "@/lib/grading-rule";
import type { ExamScores } from "@/lib/grading-rule";

export type DashboardStat = {
  label: string;
  value: string;
  note: string;
  tone: string;
};

export type RecentItem = {
  date: string;
  title: string;
  description: string;
};

export type CampusSummary = {
  id: string;
  university: string;
  program: string;
  status: string;
  date: string;
  note: string;
};

export type OpenCampusStatus = "検討中" | "予約済み" | "参加済み" | "不参加";

export type OpenCampusLink = {
  id: string;
  label: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenCampusAttachmentMeta = {
  id: string;
  ocId: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type DataSourceType = "manual" | "image" | "import" | "ai";

export type ImportStatus = "draft" | "pending_confirmation" | "confirmed" | "rejected";

export type DataRecordMeta = {
  studentProfileId?: string;
  sourceType?: DataSourceType;
  importStatus?: ImportStatus;
  confidence?: number;
  confirmedByUser?: boolean;
};

export type GradeSchoolYear = "高1" | "高2" | "高3";

export type GradeTerm = "1学期" | "2学期" | "3学期" | "学年末";

export type GradeRecord = {
  id: string;
  schoolYear: GradeSchoolYear;
  term: GradeTerm;
  subject: string;
  grade: number;
  memo: string;
  createdAt: string;
  updatedAt: string;
  /** 中間・期末の素点。中間が未実施の科目は midterm が null になる。 */
  scores?: ExamScores;
} & DataRecordMeta;

export type QualificationStatus = "取得済み" | "受験予定" | "結果待ち";

export type EikenCefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type EikenScores = {
  cse?: number;
  reading?: number;
  listening?: number;
  writing?: number;
  speaking?: number;
  cefr?: EikenCefr;
};

export type QualificationRecord = {
  id: string;
  name: string;
  scoreOrLevel: string;
  examDate: string;
  status: QualificationStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
  /** 将来の資格タイプ用。未設定でも英検名から判定する。 */
  kind?: "eiken";
  eikenScores?: EikenScores;
} & DataRecordMeta;

export type UniversityCandidate = {
  id: string;
  createdAt: string;
  university: string;
  faculty: string;
  department: string;
  url: string;
  interest: number;
  studentScore: "かなり高い" | "高い" | "検討中" | "低い";
  familyScore: "かなり高い" | "高い" | "検討中" | "低い";
  studentView: string;
  familyView: string;
  reason: string;
  futureNote: string;
  /** マスターから登録した場合の大学ID。手入力では付けない。 */
  universityMasterId?: string;
  /** マスターから学部を選んだ場合の学部ID。手入力では付けない。 */
  facultyMasterId?: string;
  masterCheckedAt?: string;
  masterAcademicYear?: string;
} & DataRecordMeta;

export type LegacyUniversityCandidate = {
  url: string;
  studentScore: string;
  familyScore: string;
  studentView: string;
  familyView: string;
};

export type AiProvider =
  | "ChatGPT"
  | "Claude"
  | "Gemini"
  | "NotebookLM"
  | "その他";

export type AiNote = {
  id: string;
  consultedAt: string;
  provider: AiProvider;
  title: string;
  consultationBody: string;
  answerBody: string;
  summary: string;
  relatedSchool: string;
  helpful: number;
  freeNote: string;
} & DataRecordMeta;

export type CampusEvaluationCategory =
  | "atmosphere"
  | "curriculum"
  | "students"
  | "access"
  | "career";

export type CampusCategoryScores = Record<CampusEvaluationCategory, number | null>;

export type OcLookForId =
  | "class"
  | "faculty"
  | "students"
  | "campus"
  | "facility"
  | "access"
  | "career"
  | "english"
  | "exam"
  | "other";

export type OcPointTagId =
  | "class"
  | "faculty"
  | "students"
  | "campus"
  | "facility"
  | "teacher"
  | "career"
  | "english"
  | "access"
  | "other";

export type OcSimpleMark = "great" | "good" | "ok" | "poor";

export type OcAspiration = "want" | "keep" | "unsure" | "drop";

export type OcTrialMatch = "as_expected" | "unexpected";

export type OcSimpleRatings = {
  campus?: OcSimpleMark;
  students?: OcSimpleMark;
  learning?: OcSimpleMark;
  access?: OcSimpleMark;
};

export type OcTrialLesson = {
  courseName?: string;
  instructor?: string;
  date?: string;
  expected?: string;
  match?: OcTrialMatch;
  noticed?: string;
};

export type CampusEvaluation = {
  overall: number | null;
  goodPoint: string;
  badPoint: string;
  studentComment: string;
  familyComment: string;
  freeNote: string;
  categoryScores: CampusCategoryScores;
  simpleRatings?: OcSimpleRatings;
  aspiration?: OcAspiration;
  goodTags?: OcPointTagId[];
  goodOther?: string;
  concernTags?: OcPointTagId[];
  concernOther?: string;
  wantToKnow?: string;
  trialLesson?: OcTrialLesson;
} & DataRecordMeta;

export type CampusVisit = {
  id: string;
  university: string;
  program: string;
  date: string;
  evaluation?: CampusEvaluation;
};

export type OpenCampusEvent = {
  id: string;
  university: string;
  facultyDepartment: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: OpenCampusStatus;
  companionMemo: string;
  meetingPlace: string;
  accessMemo: string;
  dayMemo: string;
  links: OpenCampusLink[];
  attachments: OpenCampusAttachmentMeta[];
  createdAt: string;
  updatedAt: string;
  lookFor?: OcLookForId[];
  lookForOther?: string;
} & DataRecordMeta;

export const dashboardStats: DashboardStat[] = [
  { label: "現在の評定平均", value: "4.1", note: "高校2年 1学期時点", tone: "sky" },
  { label: "気になる大学", value: "6校", note: "うち比較中 3校", tone: "mint" },
  { label: "次の予定", value: "2件", note: "オープンキャンパス予約あり", tone: "peach" },
  { label: "AI相談メモ", value: "4件", note: "最近1週間で追加", tone: "gold" },
];

export const recentItems: RecentItem[] = [
  {
    date: "2026.08.20",
    title: "データ保存の仕組みを改善",
    description: "今後のクラウド保存・家族共有に向けて、データ保存の基盤を改善",
  },
  {
    date: "2026.08.20",
    title: "バックアップ機能を整理",
    description: "自動復旧用バックアップを最新1世代に整理し、手動バックアップはこれまで通り利用可能",
  },
  {
    date: "2026.08.14",
    title: "成績・評定の登録に対応",
    description: "学年・学期ごとの評定保存、編集、削除と平均表示が使えるように更新",
  },
  {
    date: "2026.08.14",
    title: "資格・検定の登録に対応",
    description: "資格の保存、編集、削除と、取得状況の管理ができるように更新",
  },
  {
    date: "2026.08.14",
    title: "大学・学部候補の追加・編集UIを公開",
    description: "候補の保存、並び替え、詳細確認、編集、削除が使えるように更新",
  },
];

export const upcomingCampus: CampusSummary = {
  id: "campus-next-hoshigaoka",
  university: "星ヶ丘大学",
  program: "経営学部 オープンキャンパス",
  status: "予約済み",
  date: "2026年8月24日 13:00-16:00",
  note: "模擬授業と在学生トークが中心。家族1名同伴予定。",
};

/**
 * 高1 1学期の実データ。midterm が null の科目は中間テストが実施されていない。
 * 評定は保存値を持たず、学校の計算ルール（lib/grading-rule）から算出する。
 */
const firstYearFirstTerm: { id: string; subject: string; scores: ExamScores }[] = [
  { id: "grade-h1-1-modern-japanese", subject: "現代の国語", scores: { midterm: 68, final: 66 } },
  { id: "grade-h1-1-language-culture", subject: "言語文化", scores: { midterm: 74, final: 52 } },
  { id: "grade-h1-1-history", subject: "歴史総合", scores: { midterm: 44, final: 61 } },
  { id: "grade-h1-1-public", subject: "公共", scores: { midterm: 62, final: 73 } },
  { id: "grade-h1-1-math-1", subject: "数学I", scores: { midterm: 83, final: 77 } },
  { id: "grade-h1-1-math-a", subject: "数学A", scores: { midterm: 52, final: 56 } },
  { id: "grade-h1-1-chemistry", subject: "化学基礎", scores: { midterm: 65, final: 57 } },
  { id: "grade-h1-1-biology", subject: "生物基礎", scores: { midterm: 72, final: 47 } },
  { id: "grade-h1-1-pe", subject: "体育", scores: { midterm: null, final: 63 } },
  { id: "grade-h1-1-health", subject: "保健", scores: { midterm: null, final: 86 } },
  {
    id: "grade-h1-1-english-communication",
    subject: "英語コミュニケーションI",
    scores: { midterm: 92, final: 84 },
  },
  { id: "grade-h1-1-logic-expression", subject: "論理・表現I", scores: { midterm: null, final: 74 } },
  { id: "grade-h1-1-home-economics", subject: "家庭基礎", scores: { midterm: null, final: 46 } },
  { id: "grade-h1-1-information", subject: "情報I", scores: { midterm: null, final: 72 } },
];

export const gradeRecords: GradeRecord[] = firstYearFirstTerm.map(({ id, subject, scores }) => ({
  id,
  schoolYear: "高1",
  term: "1学期",
  subject,
  grade: gradeFromExamScores(scores) ?? 3,
  memo: "",
  createdAt: "2026-08-16",
  updatedAt: "2026-08-16",
  scores,
}));

export const qualifications: QualificationRecord[] = [
  {
    id: "qualification-eiken-2-pass-2026",
    name: "英検",
    scoreOrLevel: "2級",
    examDate: "",
    status: "取得済み",
    memo: "英検S-CBT / 2026年度 第1回",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    kind: "eiken",
    eikenScores: {
      cse: 2021,
      reading: 477,
      listening: 529,
      writing: 543,
      speaking: 472,
      cefr: "B1",
    },
  },
  {
    id: "qualification-eiken-pre2-pass-2024",
    name: "英検",
    scoreOrLevel: "準2級",
    examDate: "",
    status: "取得済み",
    memo: "英検S-CBT / 2024年度 第1回",
    createdAt: "2024-04-01",
    updatedAt: "2024-04-01",
    kind: "eiken",
    eikenScores: {
      cse: 1740,
      reading: 414,
      listening: 466,
      writing: 449,
      speaking: 411,
      cefr: "A2",
    },
  },
  {
    id: "qualification-eiken-3-pass-2022",
    name: "英検",
    scoreOrLevel: "3級",
    examDate: "",
    status: "取得済み",
    memo: "英検S-CBT / 2022年度 第3回",
    createdAt: "2022-12-01",
    updatedAt: "2022-12-01",
    kind: "eiken",
    eikenScores: {
      cse: 1687,
      reading: 364,
      listening: 462,
      writing: 473,
      speaking: 388,
      cefr: "A1",
    },
  },
];

export const universities: UniversityCandidate[] = [
  {
    id: "candidate-kyoritsu-womens",
    createdAt: "2026-08-19",
    university: "共立女子大学",
    faculty: "",
    department: "",
    url: "",
    studentScore: "検討中",
    familyScore: "検討中",
    studentView: "",
    familyView: "",
    interest: 3,
    reason: "",
    futureNote: "",
  },
  {
    id: "candidate-showa-womens-international",
    createdAt: "2026-08-18",
    university: "昭和女子大学",
    faculty: "国際学部",
    department: "",
    url: "",
    studentScore: "検討中",
    familyScore: "検討中",
    studentView: "",
    familyView: "",
    interest: 3,
    reason: "",
    futureNote: "",
  },
  {
    id: "candidate-showa-womens-integrated-info",
    createdAt: "2026-08-17",
    university: "昭和女子大学",
    faculty: "総合情報学部",
    department: "",
    url: "",
    studentScore: "検討中",
    familyScore: "検討中",
    studentView: "",
    familyView: "",
    interest: 3,
    reason: "",
    futureNote: "",
  },
];

export const campusUpcoming: CampusSummary[] = [
  {
    id: "campus-upcoming-hoshigaoka",
    university: "星ヶ丘大学",
    program: "経営学部 オープンキャンパス",
    status: "予約済み",
    date: "2026年8月24日 13:00-16:00",
    note: "模擬授業あり。駅からのルート確認が必要。",
  },
  {
    id: "campus-upcoming-aoba",
    university: "青葉大学",
    program: "情報デザイン学部 体験会",
    status: "検討中",
    date: "2026年9月7日 10:00-12:30",
    note: "制作系の展示が多そう。家族同伴可。",
  },
];

export const campusDone: CampusVisit[] = [
  {
    id: "campus-done-otsuma-ds",
    university: "大妻女子大学",
    program: "データサイエンス学部 オープンキャンパス",
    date: "",
    evaluation: {
      overall: null,
      goodPoint: "先輩たちのトークが面白かった。校舎がきれいだった。",
      badPoint: "英語にあまり力を入れていなかった。",
      studentComment: "",
      familyComment: "",
      freeNote: "",
      categoryScores: {
        atmosphere: null,
        curriculum: null,
        students: null,
        access: null,
        career: null,
      },
      simpleRatings: {
        campus: "great",
      },
      goodTags: ["students", "campus"],
      concernTags: ["english"],
      wantToKnow: "体育館を見てみたい",
      trialLesson: {
        expected: "データを沢山使う",
        match: "as_expected",
        noticed: "講師がフレンドリーな感じで良いと思った。",
      },
    },
  },
];

export const openCampusEvents: OpenCampusEvent[] = [
  {
    id: "campus-plan-20260822-kyoritsu",
    university: "共立女子大学",
    facultyDepartment: "",
    eventName: "オープンキャンパス",
    eventType: "オープンキャンパス",
    eventDate: "2026-08-22",
    startTime: "10:00",
    endTime: "10:20",
    status: "予約済み",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "",
    dayMemo:
      "10:00〜10:20\n共通説明会\n\n10:20〜10:30頃\n校内・学生・大学の雰囲気を見る\n\n共立女子は今回は短時間だけ参加し、その後、昭和女子大学へ移動する予定です。",
    links: [],
    attachments: [],
    createdAt: "2026-08-19",
    updatedAt: "2026-08-19",
  },
  {
    id: "campus-plan-20260822-showa-integrated-info",
    university: "昭和女子大学",
    facultyDepartment: "総合情報学部",
    eventName: "オープンキャンパス",
    eventType: "オープンキャンパス",
    eventDate: "2026-08-22",
    startTime: "",
    endTime: "",
    status: "予約済み",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "",
    dayMemo:
      "11:20〜12:00\n総合情報・デジタルイノベーション体験授業\n\n13:10〜13:50\n総合情報 学部・学科説明会\n\n13:50〜14:05\n8号館などを軽く見る\n\n14:05〜14:45\nグローバルビジネス 体験授業②\n\n14:45〜\nキャンパスツアー／学部ブース／個別相談",
    links: [],
    attachments: [],
    createdAt: "2026-08-19",
    updatedAt: "2026-08-19",
  },
  {
    id: "campus-plan-20260822-showa-international",
    university: "昭和女子大学",
    facultyDepartment: "国際学部",
    eventName: "オープンキャンパス",
    eventType: "オープンキャンパス",
    eventDate: "2026-08-22",
    startTime: "12:15",
    endTime: "12:55",
    status: "予約済み",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "",
    dayMemo:
      "12:15〜12:55\n国際学部 学部説明会\n\n14:05〜14:45\nグローバルビジネス 体験授業②\n\n14:45〜\nキャンパスツアー／学部ブース／個別相談",
    links: [],
    attachments: [],
    createdAt: "2026-08-19",
    updatedAt: "2026-08-19",
  },
  {
    id: "campus-done-otsuma-ds",
    university: "大妻女子大学",
    facultyDepartment: "データサイエンス学部",
    eventName: "オープンキャンパス",
    eventType: "オープンキャンパス",
    eventDate: "",
    startTime: "",
    endTime: "",
    status: "参加済み",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "最寄り：市ケ谷駅",
    dayMemo:
      "参加したい理由：母がこの大学に通っていたから。\n施設・設備：校舎がきれい。\n卒業後の進路：学習したことが活かせる進路。",
    links: [],
    attachments: [],
    createdAt: "2026-08-19",
    updatedAt: "2026-08-19",
    lookFor: ["faculty", "other"],
    lookForOther: "社会情報学部とデータサイエンス学部の違いについて知りたい",
  },
];

export const aiNotes: AiNote[] = [
  {
    id: "ai-note-chatgpt-english",
    consultedAt: "2026-08-11",
    provider: "ChatGPT",
    title: "英語が得意な場合の進路候補",
    consultationBody:
      "英語が得意で、将来は企画や広報にも興味があります。情報系にも少し関心があるのですが、文系寄りでも学びやすい大学・学部はありますか？",
    answerBody:
      "英語力を活かしながら将来の選択肢を広げたい場合、国際教養系だけでなく、経営情報系や情報デザイン系も候補になります。\n\nたとえば、英語で情報発信を学べる学部、ユーザー視点で企画を考える学科、マーケティングや広報に接続しやすいカリキュラムのある大学が相性の良い候補です。\n\n進路を絞る際は、語学の比重、プログラミング必修の強さ、就職先の傾向、オープンキャンパスでの雰囲気を比較すると判断しやすくなります。",
    summary: "英語に加えて情報や企画を掛け合わせられる学部が有力候補になりそう。",
    relatedSchool: "国際教養 / 経営情報 / 情報デザイン系",
    helpful: 4,
    freeNote: "オープンキャンパスで『英語をどう活かせるか』を確認したい。",
  },
  {
    id: "ai-note-claude-humanities",
    consultedAt: "2026-08-10",
    provider: "Claude",
    title: "文系寄りでも学びやすい情報系学部",
    consultationBody:
      "数学がそこまで得意ではないのですが、情報分野には興味があります。文系寄りでも学びやすい情報系の学部や学科があれば知りたいです。",
    answerBody:
      "文系寄りの学生でも入りやすい情報系としては、情報マネジメント、経営情報、メディア表現、情報デザインなどが候補になります。\n\nこれらはプログラミングそのものだけでなく、企画、デザイン、マーケティング、コミュニケーションを扱うことが多く、学びの入口として相性が良い場合があります。\n\n確認ポイントとしては、初年次教育の丁寧さ、必修数学の重さ、卒業制作や実習の内容、就職先の傾向を見ると良いでしょう。",
    summary: "情報マネジメントやメディア表現など、企画や表現と結びつく学部が候補。",
    relatedSchool: "情報マネジメント / メディア表現 / 経営情報系",
    helpful: 5,
    freeNote: "必修数学の重さは大学ごとに差があるので要確認。",
  },
];
