/** Validate untrusted backups before any migration or write. Never repair by dropping records. */
type Rule = (value: unknown) => boolean;
type Fields = Record<string, Rule>;
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text: Rule = v => typeof v === "string" && v.length <= 200_000;
const id: Rule = v => typeof v === "string" && v.length > 0 && v.length <= 256;
const number: Rule = v => typeof v === "number" && Number.isFinite(v);
const boolean: Rule = v => typeof v === "boolean";
const nullable = (rule: Rule): Rule => v => v === null || rule(v);
const oneOf = (...values: unknown[]): Rule => v => values.includes(v);
const list = (rule: Rule, max = 20_000): Rule => v => Array.isArray(v) && v.length <= max && v.every(rule);
const strings = (keys: string): Fields => Object.fromEntries(keys.split(" ").map(key => [key, text]));
const shape = (required: Fields, optional: Fields = {}): Rule => v => record(v)
  && Object.entries(required).every(([key, rule]) => Object.hasOwn(v, key) && rule(v[key]))
  && Object.entries(optional).every(([key, rule]) => v[key] === undefined || rule(v[key]));
const uniqueList = (rule: Rule): Rule => v => list(rule)(v)
  && new Set((v as Record<string, unknown>[]).map(item => item.id)).size === (v as unknown[]).length;
const meta: Fields = {
  studentProfileId: text, sourceType: oneOf("manual", "image", "import", "ai"),
  importStatus: oneOf("draft", "pending_confirmation", "confirmed", "rejected"),
  confidence: number, confirmedByUser: boolean,
};
const scores: Rule = v => list(nullable(number), 2)(v) || shape({}, { midterm: nullable(number), final: nullable(number) })(v);
const grade = shape({ id, ...strings("subject memo createdAt updatedAt"), schoolYear: oneOf("高1", "高2", "高3"), term: oneOf("1学期", "2学期", "3学期", "学年末"), grade: nullable(number) }, {
  ...meta, periodId: oneOf("period1", "period2", "period3", "annual"), scores,
});
// Null and numeric out-of-range grades remain preserved and excluded by reference-grades, as in older versions.
const qualification = shape({ id, ...strings("name scoreOrLevel status memo createdAt updatedAt") }, {
  ...meta, examDate: text, kind: oneOf("eiken"), eikenScores: shape({}, {
    cse: number, reading: number, listening: number, writing: number, speaking: number,
    cefr: oneOf("A1", "A2", "B1", "B2", "C1", "C2"),
  }),
});
const candidate = shape({ id, ...strings("university faculty department url studentScore familyScore studentView familyView reason futureNote"), interest: number }, {
  ...meta, ...strings("createdAt universityMasterId facultyMasterId masterCheckedAt masterAcademicYear"),
});
const note = shape({ id, ...strings("consultedAt title consultationBody answerBody summary relatedSchool freeNote"), helpful: number }, {
  ...meta, provider: text, sourceName: text, sourceKind: oneOf("family", "school", "cram", "ai", "other"),
});
const role = oneOf("self", "guardian", "family", "other", "legacy");
const evaluator = shape({ id, name: text, role }, strings("createdAt updatedAt"));
const evaluation = shape({ overall: nullable(number), ...strings("goodPoint badPoint studentComment familyComment freeNote") }, {
  ...meta, ...strings("id evaluatorId evaluatorName createdAt updatedAt legacyLabel goodOther concernOther wantToKnow"),
  evaluatorRole: role, categoryScores: shape({}, Object.fromEntries(["atmosphere", "curriculum", "students", "access", "career"].map(k => [k, nullable(number)]))),
  simpleRatings: shape({}, Object.fromEntries(["campus", "students", "learning", "access"].map(k => [k, oneOf("great", "good", "ok", "poor")]))),
  aspiration: oneOf("want", "keep", "unsure", "drop"), goodTags: list(text), concernTags: list(text),
  trialLesson: shape({}, { ...strings("courseName instructor date expected noticed"), match: oneOf("as_expected", "unexpected") }),
});
const link = shape({ id, ...strings("label url createdAt updatedAt") });
const attachment = shape({ id, ...strings("ocId name mimeType createdAt"), size: v => number(v) && Number.isSafeInteger(v) && (v as number) >= 0 });
const event = shape({ id, ...strings("university facultyDepartment eventName eventType eventDate startTime endTime status companionMemo meetingPlace accessMemo dayMemo createdAt updatedAt"), links: uniqueList(link), attachments: uniqueList(attachment) }, {
  ...meta, lookFor: list(text), lookForOther: text,
});
const profile = shape({}, { ...strings("displayName progressionStage schoolYear schoolName course academicTrack interestNote futureAspiration careerMemo"), strongSubjects: list(text), weakSubjects: list(text), interestFields: list(text), admissionMethods: list(text) });
const identity = shape({}, {
  users: uniqueList(shape({ id }, { ...strings("plan createdAt"), authUserId: nullable(text) })),
  families: uniqueList(shape({ id }, strings("createdAt"))),
  familyMembers: uniqueList(shape({ id }, strings("familyId userId role createdAt"))),
  studentProfiles: uniqueList(shape({ id }, strings("familyId displayName createdAt"))),
  entitlements: uniqueList(shape({ id }, { ...strings("subjectType subjectId key source status startsAt createdAt"), expiresAt: nullable(text) })),
  session: shape({}, { ...strings("status currentUserId currentFamilyId currentStudentProfileId"), method: nullable(text), lastAuthenticatedAt: nullable(text) }),
});

// Bound nesting/total work, including unknown extension fields; reject prototype keys at every level.
function boundedJson(value: unknown, depth = 0, budget = { remaining: 200_000 }): boolean {
  if (--budget.remaining < 0 || depth > 16) return false;
  if (typeof value === "string") return text(value);
  if (typeof value === "number") return number(value);
  if (value === null || typeof value === "boolean" || value === undefined) return true;
  if (Array.isArray(value)) return value.length <= 20_000 && value.every(v => boundedJson(v, depth + 1, budget));
  return record(value) && Object.entries(value).every(([key, v]) => !["__proto__", "prototype", "constructor"].includes(key) && key.length <= 256 && boundedJson(v, depth + 1, budget));
}

export function isSupportedStorageVersion(value: unknown, current: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= current;
}

export function validateBackupStorage(value: unknown, currentVersion: number): value is Record<string, unknown> {
  if (!record(value) || !boundedJson(value) || !isSupportedStorageVersion(value.version, currentVersion)) return false;
  if (!shape({ version: number, aiNotes: uniqueList(note), universityCandidates: uniqueList(candidate), gradeRecords: uniqueList(grade), qualifications: uniqueList(qualification), openCampusEvents: uniqueList(event),
    campusEvaluations: v => record(v) && Object.values(v).every(e => Array.isArray(e) ? uniqueList(shape({id, evaluatorId: id, evaluatorName: text}, {}))(e) && e.every(evaluation) : evaluation(e)),
  }, { campusEvaluators: uniqueList(evaluator), profile, identity, setupCompleted: boolean,
    gradePeriodSystem: oneOf("two-term", "three-term"), meta: shape({isSample: oneOf(true)}, {demoPeriodsVersion: oneOf(2)}),
    schoolSubjects: shape({templateVersion: oneOf(1), type: oneOf("schoolSubjects"), key: text, school: shape({id, displayName:text}), grade: oneOf(1,2,3), course:text, subjects:list(text)}),
  })(value)) return false;
  const attachmentIds = new Set<string>();
  for (const e of value.openCampusEvents as { id: string; attachments: {id: string; ocId: string}[] }[]) {
    for (const a of e.attachments) {
      if (a.ocId !== e.id || attachmentIds.has(a.id)) return false;
      attachmentIds.add(a.id);
    }
  }
  // Evaluation names are historical snapshots: removed evaluators/events may legitimately remain.
  return true;
}
