import type { UniversityCandidate } from "@/data/mockData";
import { normalizeUniversityCandidate } from "@/lib/university-candidate";
import {
  universityMaster,
  type UniversityMaster,
} from "@/lib/university-master";

function createCandidateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `candidate-${Date.now()}`;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function createUniversityCandidateDraft(input: {
  university: string;
  faculty?: string;
  master?: UniversityMaster | null;
  facultyMasterId?: string;
}): UniversityCandidate {
  const universityName = input.university.trim();
  const facultyName = (input.faculty ?? "").trim();
  const master = input.master ?? null;

  return normalizeUniversityCandidate({
    id: createCandidateId(),
    createdAt: todayString(),
    university: universityName,
    faculty: facultyName,
    department: "",
    url: "",
    interest: 3,
    studentScore: "検討中",
    familyScore: "検討中",
    studentView: "",
    familyView: "",
    reason: "",
    futureNote: "",
    universityMasterId: master?.id,
    facultyMasterId: facultyName && input.facultyMasterId ? input.facultyMasterId : undefined,
    masterCheckedAt: master ? universityMaster.checkedAt : undefined,
    masterAcademicYear: master ? universityMaster.academicYear : undefined,
  });
}
