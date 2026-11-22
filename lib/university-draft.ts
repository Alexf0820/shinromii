import type { UniversityCandidate } from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";
import { normalizeUniversityCandidate } from "@/lib/university-candidate";
import {
  universitySource,
  type UniversityMaster,
} from "@/lib/university-master";

function createCandidateId() {
  return createShinromiiId("candidate");
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

  const source = master ? universitySource(master) : null;

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
    masterCheckedAt: source?.checkedAt,
    masterAcademicYear: source?.academicYear,
    masterSourceUrl: source?.sourceUrl,
  });
}
