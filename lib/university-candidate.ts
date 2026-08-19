import type { UniversityCandidate } from "@/data/mockData";
import {
  findFacultyMasterByExactName,
  findUniversityMasterByExactName,
  universityMaster,
} from "@/lib/university-master";

export function normalizeUniversityCandidate(record: UniversityCandidate): UniversityCandidate {
  const next: UniversityCandidate = {
    ...record,
    university: typeof record.university === "string" ? record.university : "",
    faculty: typeof record.faculty === "string" ? record.faculty : "",
    department: typeof record.department === "string" ? record.department : "",
  };

  if (typeof record.universityMasterId === "string" && record.universityMasterId) {
    next.universityMasterId = record.universityMasterId;
  } else {
    delete next.universityMasterId;
  }

  if (typeof record.facultyMasterId === "string" && record.facultyMasterId) {
    next.facultyMasterId = record.facultyMasterId;
  } else {
    delete next.facultyMasterId;
  }

  if (typeof record.masterCheckedAt === "string" && record.masterCheckedAt) {
    next.masterCheckedAt = record.masterCheckedAt;
  } else {
    delete next.masterCheckedAt;
  }

  if (typeof record.masterAcademicYear === "string" && record.masterAcademicYear) {
    next.masterAcademicYear = record.masterAcademicYear;
  } else {
    delete next.masterAcademicYear;
  }

  return next;
}

export function isSameUniversityFaculty(left: UniversityCandidate, right: UniversityCandidate) {
  if (left.universityMasterId && right.universityMasterId && left.facultyMasterId && right.facultyMasterId) {
    return left.universityMasterId === right.universityMasterId && left.facultyMasterId === right.facultyMasterId;
  }

  return left.university === right.university && left.faculty === right.faculty;
}

/**
 * 大学名＋学部名がマスターと一意に一致する既存候補へだけ ID を補完する。
 * 名称は書き換えない。曖昧一致はしない。
 */
export function attachUniversityMasterIds(records: UniversityCandidate[]): {
  records: UniversityCandidate[];
  changed: boolean;
} {
  let changed = false;
  const next = records.map((record) => {
    const current = normalizeUniversityCandidate(record);

    if (current.universityMasterId && (current.facultyMasterId || !current.faculty.trim())) {
      return current;
    }

    const university = findUniversityMasterByExactName(current.university.trim());

    if (!university) {
      return current;
    }

    const patched: UniversityCandidate = { ...current };
    let localChanged = false;

    if (!patched.universityMasterId) {
      patched.universityMasterId = university.id;
      patched.masterCheckedAt = universityMaster.checkedAt;
      patched.masterAcademicYear = universityMaster.academicYear;
      localChanged = true;
    }

    if (current.faculty.trim() && !patched.facultyMasterId) {
      const faculty = findFacultyMasterByExactName(university, current.faculty.trim());

      if (faculty) {
        patched.facultyMasterId = faculty.id;
        localChanged = true;
      }
    }

    if (localChanged) {
      changed = true;
    }

    return patched;
  });

  return { records: next, changed };
}
