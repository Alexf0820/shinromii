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
  university: string;
  program: string;
  status: string;
  date: string;
  note: string;
};

export type GradeSummary = {
  label: string;
  value: string;
  note: string;
};

export type SubjectGrade = {
  name: string;
  score: string;
};

export type TermGrade = {
  term: string;
  average: string;
  focus: string;
  subjects: SubjectGrade[];
};

export type Qualification = {
  name: string;
  level: string;
  date: string;
};

export type UniversityCandidate = {
  university: string;
  faculty: string;
  department: string;
  interest: string;
  url: string;
  studentScore: string;
  familyScore: string;
  studentView: string;
  familyView: string;
};

export type CampusVisit = {
  university: string;
  program: string;
  date: string;
  rating: string;
  good: string;
  bad: string;
  comment: string;
};

export type AiNote = {
  ai: string;
  theme: string;
  recommendedSchools: string;
  recommendedJobs: string;
  summary: string;
  link: string;
  helpful: string;
};

export const dashboardStats: DashboardStat[] = [
  { label: "現在の評定平均", value: "4.1", note: "高校2年 1学期時点", tone: "sky" },
  { label: "気になる大学", value: "6校", note: "うち比較中 3校", tone: "mint" },
  { label: "次の予定", value: "2件", note: "オープンキャンパス予約あり", tone: "peach" },
  { label: "AI相談メモ", value: "4件", note: "最近1週間で追加", tone: "gold" },
];

export const recentItems: RecentItem[] = [
  {
    date: "2026.08.12",
    title: "青葉大学 情報デザイン学部を追加",
    description: "本人評価と家族メモを仮登録",
  },
  {
    date: "2026.08.11",
    title: "ChatGPT相談メモを保存",
    description: "文系と情報系の両立について要点を記録",
  },
  {
    date: "2026.08.09",
    title: "星ヶ丘大学 OCを予約済みに更新",
    description: "集合時間と持ち物をメモ",
  },
];

export const upcomingCampus: CampusSummary = {
  university: "星ヶ丘大学",
  program: "経営学部 オープンキャンパス",
  status: "予約済み",
  date: "2026年8月24日 13:00-16:00",
  note: "模擬授業と在学生トークが中心。家族1名同伴予定。",
};

export const gradeSummary: GradeSummary[] = [
  { label: "最新評定平均", value: "4.1", note: "主要教科は安定" },
  { label: "得意科目", value: "英語", note: "英検対策と相性良し" },
  { label: "注力したい科目", value: "数学", note: "情報系も視野に補強" },
  { label: "記録済み資格", value: "2件", note: "英検・漢検を登録" },
];

export const termGrades: TermGrade[] = [
  {
    term: "高校2年 1学期",
    average: "評定平均 4.1",
    focus: "最新",
    subjects: [
      { name: "現代文", score: "4" },
      { name: "英語", score: "5" },
      { name: "数学", score: "3" },
      { name: "情報", score: "5" },
    ],
  },
  {
    term: "高校1年 3学期",
    average: "評定平均 3.9",
    focus: "推移確認",
    subjects: [
      { name: "国語", score: "4" },
      { name: "英語", score: "4" },
      { name: "数学", score: "3" },
      { name: "生物", score: "4" },
    ],
  },
];

export const qualifications: Qualification[] = [
  { name: "英検", level: "準2級", date: "2026年6月取得" },
  { name: "漢検", level: "2級", date: "2025年11月取得" },
];

export const universities: UniversityCandidate[] = [
  {
    university: "青葉大学",
    faculty: "情報デザイン学部",
    department: "メディア表現学科",
    interest: "5",
    url: "https://example.com/aoba",
    studentScore: "かなり高い",
    familyScore: "高い",
    studentView: "デザインと情報の両方を学べそう。雰囲気も好み。",
    familyView: "通学時間が現実的で、学びの幅も広そう。",
  },
  {
    university: "星ヶ丘大学",
    faculty: "経営学部",
    department: "経営情報学科",
    interest: "4",
    url: "https://example.com/hoshigaoka",
    studentScore: "高い",
    familyScore: "かなり高い",
    studentView: "オープンキャンパス次第で第一候補になるかも。",
    familyView: "サポート体制が手厚そうで安心感がある。",
  },
  {
    university: "港南学院大学",
    faculty: "国際教養学部",
    department: "国際コミュニケーション学科",
    interest: "3",
    url: "https://example.com/konan",
    studentScore: "検討中",
    familyScore: "高い",
    studentView: "英語は魅力だけど、学科選びはもう少し比較したい。",
    familyView: "将来の進路の広さは魅力。費用感も確認したい。",
  },
];

export const campusUpcoming: CampusSummary[] = [
  {
    university: "星ヶ丘大学",
    program: "経営学部 オープンキャンパス",
    status: "予約済み",
    date: "2026年8月24日 13:00-16:00",
    note: "模擬授業あり。駅からのルート確認が必要。",
  },
  {
    university: "青葉大学",
    program: "情報デザイン学部 体験会",
    status: "検討中",
    date: "2026年9月7日 10:00-12:30",
    note: "制作系の展示が多そう。家族同伴可。",
  },
];

export const campusDone: CampusVisit[] = [
  {
    university: "港南学院大学",
    program: "国際教養学部 キャンパス説明会",
    date: "2026年7月20日 14:00-16:00",
    rating: "4.0",
    good: "学生の雰囲気が明るく、留学制度の説明がわかりやすかった。",
    bad: "教室移動が少し分かりづらかった。",
    comment: "英語を使う機会が多そうで気になった。",
  },
];

export const aiNotes: AiNote[] = [
  {
    ai: "ChatGPT",
    theme: "英語が得意な場合の進路候補",
    recommendedSchools: "国際教養、経営情報、情報デザイン系",
    recommendedJobs: "広報、UXリサーチ、企画職",
    summary: "英語力を活かしつつ、情報分野を掛け合わせる進路が相性良さそう。",
    link: "https://chat.openai.com/",
    helpful: "4/5",
  },
  {
    ai: "Claude",
    theme: "文系寄りでも学びやすい情報系学部",
    recommendedSchools: "情報マネジメント、メディア表現、経営情報系",
    recommendedJobs: "Webディレクター、マーケ支援、教育コンテンツ企画",
    summary: "プログラミング一辺倒ではなく、企画や表現と結びつく学部が候補に挙がった。",
    link: "https://claude.ai/",
    helpful: "5/5",
  },
];
