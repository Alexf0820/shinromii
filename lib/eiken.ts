import type { EikenCefr, EikenScores, QualificationRecord } from "@/data/mockData";

export const EIKEN_CEFR_LEVELS: readonly EikenCefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function normalizeEikenCefr(value: unknown): EikenCefr | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.normalize("NFKC").trim().toUpperCase();

  return EIKEN_CEFR_LEVELS.find((level) => level === normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 全角英数・空白のゆれを吸収してから英検判定する。 */
export function normalizeQualificationName(name: string) {
  return name.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

export function isEikenQualificationName(name: string) {
  const normalized = normalizeQualificationName(name);

  return (
    normalized.includes("英検") ||
    normalized.includes("実用英語技能検定") ||
    normalized.includes("eiken")
  );
}

export function isEikenQualification(record: Pick<QualificationRecord, "name" | "kind">) {
  if (record.kind === "eiken") {
    return true;
  }

  return isEikenQualificationName(record.name);
}

export function parseOptionalScore(value: unknown): number | undefined {
  if (value === "" || value == null) {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

export function normalizeEikenScores(value: unknown): EikenScores | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const next: EikenScores = {};
  const cse = parseOptionalScore(value.cse);
  const reading = parseOptionalScore(value.reading);
  const listening = parseOptionalScore(value.listening);
  const writing = parseOptionalScore(value.writing);
  const speaking = parseOptionalScore(value.speaking);

  if (cse !== undefined) {
    next.cse = cse;
  }

  if (reading !== undefined) {
    next.reading = reading;
  }

  if (listening !== undefined) {
    next.listening = listening;
  }

  if (writing !== undefined) {
    next.writing = writing;
  }

  if (speaking !== undefined) {
    next.speaking = speaking;
  }

  const cefr = normalizeEikenCefr(value.cefr);

  if (cefr) {
    next.cefr = cefr;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export function eikenScoresFromInputs(input: {
  cse?: unknown;
  reading?: unknown;
  listening?: unknown;
  writing?: unknown;
  speaking?: unknown;
  cefr?: unknown;
}) {
  return normalizeEikenScores(input);
}

export function qualificationEikenScores(record: QualificationRecord) {
  return normalizeEikenScores(record.eikenScores);
}

/** メモに「英検S-CBT / 2026年度 第1回」の形で残している試験情報を表示用に分ける。 */
export function parseEikenExamNote(memo: string) {
  const match = memo.trim().match(/^(.+?)\s*\/\s*(.+年度\s*第.+回)$/);

  if (!match) {
    return null;
  }

  return {
    examName: match[1].trim(),
    examSession: match[2].trim(),
  };
}

export function eikenLevelRank(scoreOrLevel: string) {
  const normalized = scoreOrLevel.normalize("NFKC").replace(/\s+/g, "");

  if (normalized.includes("準1級")) {
    return 4;
  }

  if (normalized.includes("1級")) {
    return 5;
  }

  if (normalized.includes("準2級")) {
    return 2;
  }

  if (normalized.includes("2級")) {
    return 3;
  }

  if (normalized.includes("3級")) {
    return 1;
  }

  if (normalized.includes("4級")) {
    return 0;
  }

  if (normalized.includes("5級")) {
    return -1;
  }

  return 0;
}

/** 級ごとのCSE満点。未定義の級は一覧に「/ 満点」を出さない。 */
export function eikenCseMaxScore(scoreOrLevel: string) {
  const normalized = scoreOrLevel.normalize("NFKC").replace(/\s+/g, "");

  if (normalized.includes("準2級")) {
    return 2400;
  }

  if (normalized.includes("2級")) {
    return 2600;
  }

  if (normalized.includes("3級")) {
    return 2200;
  }

  return undefined;
}

export function formatEikenCseCardScore(record: Pick<QualificationRecord, "name" | "kind" | "scoreOrLevel" | "eikenScores">) {
  if (!isEikenQualification(record)) {
    return undefined;
  }

  const cse = normalizeEikenScores(record.eikenScores)?.cse;

  if (cse === undefined) {
    return undefined;
  }

  const max = eikenCseMaxScore(record.scoreOrLevel);

  return max === undefined ? `${cse}` : `${cse} / ${max}`;
}
