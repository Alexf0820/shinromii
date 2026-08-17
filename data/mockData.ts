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

export type OpenCampusStatus = "検討中" | "予約済み" | "参加済み";

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
};

export type QualificationStatus = "取得済み" | "受験予定" | "結果待ち";

export type QualificationRecord = {
  id: string;
  name: string;
  scoreOrLevel: string;
  examDate: string;
  status: QualificationStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

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
};

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
};

export type CampusEvaluationCategory =
  | "atmosphere"
  | "curriculum"
  | "students"
  | "access"
  | "career";

export type CampusCategoryScores = Record<CampusEvaluationCategory, number | null>;

export type CampusEvaluation = {
  overall: number | null;
  goodPoint: string;
  badPoint: string;
  studentComment: string;
  familyComment: string;
  freeNote: string;
  categoryScores: CampusCategoryScores;
};

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
};

export const dashboardStats: DashboardStat[] = [
  { label: "現在の評定平均", value: "4.1", note: "高校2年 1学期時点", tone: "sky" },
  { label: "気になる大学", value: "6校", note: "うち比較中 3校", tone: "mint" },
  { label: "次の予定", value: "2件", note: "オープンキャンパス予約あり", tone: "peach" },
  { label: "AI相談メモ", value: "4件", note: "最近1週間で追加", tone: "gold" },
];

export const recentItems: RecentItem[] = [
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
    id: "qualification-eiken-pre2",
    name: "英検",
    scoreOrLevel: "準2級",
    examDate: "2026-06-15",
    status: "取得済み",
    memo: "次は2級を目標にしたい。",
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
  },
  {
    id: "qualification-kanken-2",
    name: "漢検",
    scoreOrLevel: "2級",
    examDate: "2025-11-20",
    status: "取得済み",
    memo: "",
    createdAt: "2025-11-20",
    updatedAt: "2025-11-20",
  },
];

export const universities: UniversityCandidate[] = [
  {
    id: "candidate-aoba-media",
    createdAt: "2026-08-12",
    university: "青葉大学",
    faculty: "情報デザイン学部",
    department: "メディア表現学科",
    url: "https://example.com/aoba",
    studentScore: "かなり高い",
    familyScore: "高い",
    studentView: "デザインと情報の両方を学べそう。雰囲気も好み。",
    familyView: "通学時間が現実的で、学びの幅も広そう。",
    interest: 5,
    reason: "情報と表現を両方学べそうで、今の興味にかなり近い。",
    futureNote: "Web企画、広報、UX系の進路にどうつながるか確認したい。",
  },
  {
    id: "candidate-hoshigaoka-management",
    createdAt: "2026-08-10",
    university: "星ヶ丘大学",
    faculty: "経営学部",
    department: "経営情報学科",
    url: "https://example.com/hoshigaoka",
    studentScore: "高い",
    familyScore: "かなり高い",
    studentView: "オープンキャンパス次第で第一候補になるかも。",
    familyView: "サポート体制が手厚そうで安心感がある。",
    interest: 4,
    reason: "経営と情報の両方に触れられて進路の幅が広そう。",
    futureNote: "就職実績とサポート内容を詳しく見たい。",
  },
  {
    id: "candidate-konan-global",
    createdAt: "2026-08-08",
    university: "港南学院大学",
    faculty: "国際教養学部",
    department: "国際コミュニケーション学科",
    url: "https://example.com/konan",
    studentScore: "検討中",
    familyScore: "高い",
    studentView: "英語は魅力だけど、学科選びはもう少し比較したい。",
    familyView: "将来の進路の広さは魅力。費用感も確認したい。",
    interest: 3,
    reason: "英語を活かしやすいが、学科との相性はもう少し見たい。",
    futureNote: "留学制度と卒業後の仕事の幅を確認したい。",
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
    id: "campus-done-konan",
    university: "港南学院大学",
    program: "国際教養学部 キャンパス説明会",
    date: "2026年7月20日 14:00-16:00",
    evaluation: {
      overall: 4,
      goodPoint: "学生の雰囲気が明るく、留学制度の説明がわかりやすかった。",
      badPoint: "教室移動が少し分かりづらかった。",
      studentComment: "英語を使う機会が多そうで気になった。",
      familyComment: "案内の丁寧さとキャンパスの安心感が印象に残った。",
      freeNote: "最寄り駅からの歩きやすさは現地でも確認したい。",
      categoryScores: {
        atmosphere: 4,
        curriculum: 4,
        students: 4,
        access: 3,
        career: 4,
      },
    },
  },
];

export const openCampusEvents: OpenCampusEvent[] = [
  {
    id: "campus-upcoming-hoshigaoka",
    university: "星ヶ丘大学",
    facultyDepartment: "経営学部",
    eventName: "オープンキャンパス",
    eventType: "オープンキャンパス",
    eventDate: "2026-08-24",
    startTime: "13:00",
    endTime: "16:00",
    status: "予約済み",
    companionMemo: "家族1名同伴予定",
    meetingPlace: "正門前受付",
    accessMemo: "駅から徒歩8分。模擬授業会場の位置も確認したい。",
    dayMemo: "模擬授業と在学生トークが中心。",
    links: [],
    attachments: [],
    createdAt: "2026-08-12",
    updatedAt: "2026-08-12",
  },
  {
    id: "campus-upcoming-aoba",
    university: "青葉大学",
    facultyDepartment: "情報デザイン学部",
    eventName: "体験会",
    eventType: "体験授業",
    eventDate: "2026-09-07",
    startTime: "10:00",
    endTime: "12:30",
    status: "検討中",
    companionMemo: "家族同伴可",
    meetingPlace: "",
    accessMemo: "制作系の展示が多そう。駅からのバス有無を要確認。",
    dayMemo: "",
    links: [],
    attachments: [],
    createdAt: "2026-08-11",
    updatedAt: "2026-08-11",
  },
  {
    id: "campus-done-konan",
    university: "港南学院大学",
    facultyDepartment: "国際教養学部",
    eventName: "キャンパス説明会",
    eventType: "学部説明会",
    eventDate: "2026-07-20",
    startTime: "14:00",
    endTime: "16:00",
    status: "参加済み",
    companionMemo: "",
    meetingPlace: "",
    accessMemo: "最寄り駅からの動線は当日確認済み。",
    dayMemo: "留学制度と学生の雰囲気が印象に残った。",
    links: [],
    attachments: [],
    createdAt: "2026-07-20",
    updatedAt: "2026-07-20",
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
