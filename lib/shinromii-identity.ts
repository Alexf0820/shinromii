import type {
  AiNote,
  CampusEvaluation,
  DataSourceType,
  GradeRecord,
  OpenCampusEvent,
  QualificationRecord,
  UniversityCandidate,
} from "@/data/mockData";
import { createShinromiiId } from "@/lib/shinromii-id";
import type { UserProfile } from "@/lib/user-profile";

export type AccountPlan = "free" | "plus" | "family";
export type AuthMethod = "magic_link" | "password";
export type AuthStatus = "signed_out" | "signed_in";
export type FamilyMemberRole = "owner" | "parent" | "student";

export type ShinromiiUser = {
  id: string;
  authUserId: string | null;
  plan: AccountPlan;
  createdAt: string;
};

export type ShinromiiFamily = {
  id: string;
  createdAt: string;
};

export type ShinromiiFamilyMember = {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyMemberRole;
  createdAt: string;
};

export type ShinromiiStudentProfile = {
  id: string;
  familyId: string;
  displayName: string;
  createdAt: string;
};

export type ShinromiiEntitlement = {
  id: string;
  subjectType: "user" | "family" | "student_profile";
  subjectId: string;
  key: string;
  source: "billing" | "trial" | "grant" | "promo";
  status: "active" | "scheduled" | "expired" | "revoked";
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
};

export type ShinromiiAuthSession = {
  status: AuthStatus;
  method: AuthMethod | null;
  currentUserId: string;
  currentFamilyId: string;
  currentStudentProfileId: string;
  lastAuthenticatedAt: string | null;
};

export type ShinromiiIdentity = {
  users: ShinromiiUser[];
  families: ShinromiiFamily[];
  familyMembers: ShinromiiFamilyMember[];
  studentProfiles: ShinromiiStudentProfile[];
  entitlements: ShinromiiEntitlement[];
  session: ShinromiiAuthSession;
};

type RecordMeta = {
  studentProfileId?: string;
  sourceType?: DataSourceType;
  importStatus?: "draft" | "pending_confirmation" | "confirmed" | "rejected";
  confidence?: number;
  confirmedByUser?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createId(prefix: string) {
  return createShinromiiId(prefix);
}

function isSourceType(value: unknown): value is DataSourceType {
  return value === "manual" || value === "image" || value === "import" || value === "ai";
}

function isAuthMethod(value: unknown): value is AuthMethod {
  return value === "magic_link" || value === "password";
}

function isFamilyRole(value: unknown): value is FamilyMemberRole {
  return value === "owner" || value === "parent" || value === "student";
}

function pickString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function pickNullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function pickBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function pickConfidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pickEntitlementSubjectId(
  subjectType: ShinromiiEntitlement["subjectType"],
  identity: Pick<ShinromiiIdentity, "users" | "families" | "studentProfiles">,
) {
  if (subjectType === "family") {
    return identity.families[0]?.id ?? "";
  }

  if (subjectType === "student_profile") {
    return identity.studentProfiles[0]?.id ?? "";
  }

  return identity.users[0]?.id ?? "";
}

export function createDefaultIdentity(profile?: UserProfile, createdAt = new Date().toISOString()): ShinromiiIdentity {
  const userId = createId("user");
  const familyId = createId("family");
  const studentProfileId = createId("student-profile");
  const displayName = typeof profile?.displayName === "string" ? profile.displayName.trim() : "";

  return {
    users: [
      {
        id: userId,
        authUserId: null,
        plan: "free",
        createdAt,
      },
    ],
    families: [
      {
        id: familyId,
        createdAt,
      },
    ],
    familyMembers: [
      {
        id: createId("family-member"),
        familyId,
        userId,
        role: "owner",
        createdAt,
      },
    ],
    studentProfiles: [
      {
        id: studentProfileId,
        familyId,
        displayName,
        createdAt,
      },
    ],
    entitlements: [],
    session: {
      status: "signed_out",
      method: null,
      currentUserId: userId,
      currentFamilyId: familyId,
      currentStudentProfileId: studentProfileId,
      lastAuthenticatedAt: null,
    },
  };
}

export function normalizeIdentity(candidate: unknown, profile?: UserProfile): ShinromiiIdentity {
  const fallback = createDefaultIdentity(profile);

  if (!isRecord(candidate)) {
    return fallback;
  }

  const users: ShinromiiUser[] = Array.isArray(candidate.users)
    ? candidate.users
        .filter(isRecord)
        .map((user) => ({
          id: pickString(user.id),
          authUserId: pickNullableString(user.authUserId),
          plan: (user.plan === "plus" || user.plan === "family" ? user.plan : "free") as AccountPlan,
          createdAt: pickString(user.createdAt, fallback.users[0].createdAt),
        }))
        .filter((user) => user.id)
    : [];

  const families = Array.isArray(candidate.families)
    ? candidate.families
        .filter(isRecord)
        .map((family) => ({
          id: pickString(family.id),
          createdAt: pickString(family.createdAt, fallback.families[0].createdAt),
        }))
        .filter((family) => family.id)
    : [];

  const familyMembers = Array.isArray(candidate.familyMembers)
    ? candidate.familyMembers
        .filter(isRecord)
        .map((member) => ({
          id: pickString(member.id),
          familyId: pickString(member.familyId),
          userId: pickString(member.userId),
          role: isFamilyRole(member.role) ? member.role : "owner",
          createdAt: pickString(member.createdAt, fallback.familyMembers[0].createdAt),
        }))
        .filter((member) => member.id && member.familyId && member.userId)
    : [];

  const studentProfiles = Array.isArray(candidate.studentProfiles)
    ? candidate.studentProfiles
        .filter(isRecord)
        .map((student) => ({
          id: pickString(student.id),
          familyId: pickString(student.familyId),
          displayName: pickString(student.displayName).trim(),
          createdAt: pickString(student.createdAt, fallback.studentProfiles[0].createdAt),
        }))
        .filter((student) => student.id && student.familyId)
    : [];

  const safeUsers = users.length > 0 ? users : fallback.users;
  const safeFamilies = families.length > 0 ? families : fallback.families;
  const safeStudentProfiles = studentProfiles.length > 0 ? studentProfiles : fallback.studentProfiles;
  const validFamilyMembers = familyMembers.filter(
    (member) =>
      safeUsers.some((user) => user.id === member.userId) &&
      safeFamilies.some((family) => family.id === member.familyId),
  );
  const safeFamilyMembers =
    validFamilyMembers.length > 0
      ? validFamilyMembers
      : [
          {
            ...fallback.familyMembers[0],
            userId: safeUsers[0].id,
            familyId: safeFamilies[0].id,
          },
        ];

  const entitlements: ShinromiiEntitlement[] = Array.isArray(candidate.entitlements)
    ? candidate.entitlements
        .filter(isRecord)
        .map((entitlement): ShinromiiEntitlement => ({
          id: pickString(entitlement.id),
          subjectType:
            entitlement.subjectType === "family" ||
            entitlement.subjectType === "student_profile" ||
            entitlement.subjectType === "user"
              ? entitlement.subjectType
              : "user",
          subjectId: pickString(entitlement.subjectId),
          key: pickString(entitlement.key),
          source:
            entitlement.source === "billing" ||
            entitlement.source === "trial" ||
            entitlement.source === "grant" ||
            entitlement.source === "promo"
              ? entitlement.source
              : "grant",
          status:
            entitlement.status === "scheduled" ||
            entitlement.status === "expired" ||
            entitlement.status === "revoked" ||
            entitlement.status === "active"
              ? entitlement.status
              : "active",
          startsAt: pickString(entitlement.startsAt),
          expiresAt: pickNullableString(entitlement.expiresAt),
          createdAt: pickString(entitlement.createdAt, fallback.studentProfiles[0].createdAt),
        }))
        .map((entitlement): ShinromiiEntitlement => ({
          ...entitlement,
          subjectId:
            entitlement.subjectId ||
            pickEntitlementSubjectId(entitlement.subjectType, {
              users: safeUsers,
              families: safeFamilies,
              studentProfiles: safeStudentProfiles,
            }),
          startsAt: entitlement.startsAt || entitlement.createdAt,
        }))
        .filter((entitlement) => entitlement.id && entitlement.key && entitlement.subjectId)
    : [];

  const sessionRaw = isRecord(candidate.session) ? candidate.session : {};
  const currentUserId = safeUsers.some((user) => user.id === sessionRaw.currentUserId)
    ? (sessionRaw.currentUserId as string)
    : safeUsers[0].id;
  const currentFamilyId = safeFamilies.some((family) => family.id === sessionRaw.currentFamilyId)
    ? (sessionRaw.currentFamilyId as string)
    : safeFamilies[0].id;
  const currentStudentProfileId = safeStudentProfiles.some((student) => student.id === sessionRaw.currentStudentProfileId)
    ? (sessionRaw.currentStudentProfileId as string)
    : safeStudentProfiles[0].id;

  const next: ShinromiiIdentity = {
    users: safeUsers,
    families: safeFamilies,
    familyMembers: safeFamilyMembers,
    studentProfiles: safeStudentProfiles,
    entitlements,
    session: {
      status: sessionRaw.status === "signed_in" ? "signed_in" : "signed_out",
      method: isAuthMethod(sessionRaw.method) ? sessionRaw.method : null,
      currentUserId,
      currentFamilyId,
      currentStudentProfileId,
      lastAuthenticatedAt: pickNullableString(sessionRaw.lastAuthenticatedAt),
    },
  };

  return syncStudentProfileDisplayName(next, profile);
}

export function syncStudentProfileDisplayName(identity: ShinromiiIdentity, profile?: UserProfile): ShinromiiIdentity {
  const displayName = typeof profile?.displayName === "string" ? profile.displayName.trim() : "";

  if (!displayName) {
    return identity;
  }

  let changed = false;
  const nextProfiles = identity.studentProfiles.map((student) => {
    if (student.id !== identity.session.currentStudentProfileId || student.displayName === displayName) {
      return student;
    }

    changed = true;
    return {
      ...student,
      displayName,
    };
  });

  return changed
    ? {
        ...identity,
        studentProfiles: nextProfiles,
      }
    : identity;
}

function normalizeRecordMeta<T extends RecordMeta>(record: T, defaultStudentProfileId: string): T {
  const next = { ...record };

  next.studentProfileId =
    typeof record.studentProfileId === "string" && record.studentProfileId
      ? record.studentProfileId
      : defaultStudentProfileId;

  next.sourceType = isSourceType(record.sourceType) ? record.sourceType : "manual";

  if (
    record.importStatus === "draft" ||
    record.importStatus === "pending_confirmation" ||
    record.importStatus === "confirmed" ||
    record.importStatus === "rejected"
  ) {
    next.importStatus = record.importStatus;
  } else {
    delete next.importStatus;
  }

  const confidence = pickConfidence(record.confidence);
  if (confidence !== undefined) {
    next.confidence = confidence;
  } else {
    delete next.confidence;
  }

  if (typeof record.confirmedByUser === "boolean") {
    next.confirmedByUser = record.confirmedByUser;
  } else if (next.sourceType === "manual") {
    next.confirmedByUser = true;
  } else {
    delete next.confirmedByUser;
  }

  return next;
}

export function normalizeGradeRecordMeta(record: GradeRecord, defaultStudentProfileId: string): GradeRecord {
  return normalizeRecordMeta(record, defaultStudentProfileId);
}

export function normalizeQualificationMeta(
  record: QualificationRecord,
  defaultStudentProfileId: string,
): QualificationRecord {
  return normalizeRecordMeta(record, defaultStudentProfileId);
}

export function normalizeUniversityCandidateMeta(
  record: UniversityCandidate,
  defaultStudentProfileId: string,
): UniversityCandidate {
  return normalizeRecordMeta(record, defaultStudentProfileId);
}

export function normalizeOpenCampusEventMeta(
  record: OpenCampusEvent,
  defaultStudentProfileId: string,
): OpenCampusEvent {
  return normalizeRecordMeta(record, defaultStudentProfileId);
}

export function normalizeAiNoteMeta(record: AiNote, defaultStudentProfileId: string): AiNote {
  return normalizeRecordMeta(record, defaultStudentProfileId);
}

export function normalizeCampusEvaluationMeta(
  record: CampusEvaluation,
  defaultStudentProfileId: string,
): CampusEvaluation {
  return normalizeRecordMeta(record, defaultStudentProfileId);
}

export function signInIdentity(
  identity: ShinromiiIdentity,
  options: { method: AuthMethod; authUserId?: string | null; authenticatedAt?: string },
): ShinromiiIdentity {
  const authenticatedAt = options.authenticatedAt ?? new Date().toISOString();
  const nextUsers = identity.users.map((user) =>
    user.id === identity.session.currentUserId
      ? {
          ...user,
          authUserId: options.authUserId === undefined ? user.authUserId ?? `local-auth-${user.id}` : options.authUserId,
        }
      : user,
  );

  return {
    ...identity,
    users: nextUsers,
    session: {
      ...identity.session,
      status: "signed_in",
      method: options.method,
      lastAuthenticatedAt: authenticatedAt,
    },
  };
}

export function signOutIdentity(identity: ShinromiiIdentity): ShinromiiIdentity {
  return {
    ...identity,
    session: {
      ...identity.session,
      status: "signed_out",
      method: null,
    },
  };
}
