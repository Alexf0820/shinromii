import type { EikenCefr, QualificationRecord, QualificationStatus } from "@/data/mockData";
import {
  eikenScoresFromInputs,
  isEikenQualificationName,
  qualificationEikenScores,
} from "@/lib/eiken";
import { createShinromiiId } from "@/lib/shinromii-id";

export type QualificationFormState = {
  name: string;
  scoreOrLevel: string;
  examDate: string;
  status: QualificationStatus;
  memo: string;
  cseScore: string;
  readingScore: string;
  listeningScore: string;
  writingScore: string;
  speakingScore: string;
  cefr: "" | EikenCefr;
};

export const QUALIFICATION_STATUS_OPTIONS: QualificationStatus[] = ["取得済み", "受験予定", "結果待ち"];

export function createEmptyQualificationForm(): QualificationFormState {
  return {
    name: "",
    scoreOrLevel: "",
    examDate: "",
    status: "取得済み",
    memo: "",
    cseScore: "",
    readingScore: "",
    listeningScore: "",
    writingScore: "",
    speakingScore: "",
    cefr: "",
  };
}

function scoreToInput(value: number | undefined) {
  return value === undefined ? "" : String(value);
}

export function formFromQualification(record: QualificationRecord): QualificationFormState {
  const eikenScores = qualificationEikenScores(record);

  return {
    name: record.name,
    scoreOrLevel: record.scoreOrLevel,
    examDate: record.examDate,
    status: record.status,
    memo: record.memo,
    cseScore: scoreToInput(eikenScores?.cse),
    readingScore: scoreToInput(eikenScores?.reading),
    listeningScore: scoreToInput(eikenScores?.listening),
    writingScore: scoreToInput(eikenScores?.writing),
    speakingScore: scoreToInput(eikenScores?.speaking),
    cefr: eikenScores?.cefr ?? "",
  };
}

function createQualificationId() {
  return createShinromiiId("qualification");
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function buildQualificationRecord(options: {
  form: QualificationFormState;
  existing?: QualificationRecord | null;
}): QualificationRecord | null {
  if (!options.form.name.trim() || !options.form.scoreOrLevel.trim()) {
    return null;
  }

  const now = todayString();
  const name = options.form.name.trim();
  const eikenScores = isEikenQualificationName(name)
    ? eikenScoresFromInputs({
        cse: options.form.cseScore,
        reading: options.form.readingScore,
        listening: options.form.listeningScore,
        writing: options.form.writingScore,
        speaking: options.form.speakingScore,
        cefr: options.form.cefr,
      })
    : undefined;

  const nextRecord: QualificationRecord = {
    id: options.existing?.id ?? createQualificationId(),
    name,
    scoreOrLevel: options.form.scoreOrLevel.trim(),
    examDate: options.form.examDate,
    status: options.form.status,
    memo: options.form.memo.trim(),
    createdAt: options.existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (isEikenQualificationName(name)) {
    nextRecord.kind = "eiken";
  }

  if (eikenScores) {
    nextRecord.eikenScores = eikenScores;
  }

  return nextRecord;
}
