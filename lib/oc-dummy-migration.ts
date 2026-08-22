import { campusDone, openCampusEvents } from "@/data/mockData";
import type { CampusEvaluationEntry, OpenCampusEvent } from "@/data/mockData";
import { normalizeCampusEvaluationEntries } from "@/lib/oc-record";

const LEGACY_DUMMY_OC_IDS = new Set([
  "campus-upcoming-hoshigaoka",
  "campus-upcoming-aoba",
  "campus-done-konan",
]);

function isOriginalHoshigaokaOc(event: OpenCampusEvent) {
  return event.university === "星ヶ丘大学" && event.facultyDepartment === "経営学部";
}

function isOriginalAobaOc(event: OpenCampusEvent) {
  return event.university === "青葉大学" && event.facultyDepartment === "情報デザイン学部";
}

function isOriginalKonanOc(event: OpenCampusEvent) {
  return event.university === "港南学院大学" && event.facultyDepartment === "国際教養学部";
}

export function isLegacyDummyOpenCampus(event: OpenCampusEvent) {
  if (LEGACY_DUMMY_OC_IDS.has(event.id)) {
    return true;
  }

  return isOriginalHoshigaokaOc(event) || isOriginalAobaOc(event) || isOriginalKonanOc(event);
}

function isSameCanonicalOpenCampus(event: OpenCampusEvent, canonical: OpenCampusEvent) {
  if (event.id === canonical.id) {
    return true;
  }

  return event.university === canonical.university && event.facultyDepartment === canonical.facultyDepartment;
}

function ocSignature(events: OpenCampusEvent[], evaluations: Record<string, CampusEvaluationEntry[]>) {
  const eventPart = events
    .map((event) => `${event.id}|${event.university}|${event.facultyDepartment}|${event.status}`)
    .sort()
    .join("\n");
  const evalPart = Object.keys(evaluations).sort().join(",");
  return `${eventPart}||${evalPart}`;
}

/** 既知のアプリ配布OCダミーだけを、大妻女子大学の実データへ置き換える。ユーザー追加分は残す。 */
export function migrateLegacyDummyOpenCampus(
  events: OpenCampusEvent[],
  evaluations: Record<string, CampusEvaluationEntry[]>,
): {
  events: OpenCampusEvent[];
  evaluations: Record<string, CampusEvaluationEntry[]>;
  changed: boolean;
} {
  const userEvents = events.filter((event) => !isLegacyDummyOpenCampus(event));
  const dummyIds = new Set(events.filter((event) => isLegacyDummyOpenCampus(event)).map((event) => event.id));
  const leftoverDummyEvalIds = Object.keys(evaluations).filter((id) => LEGACY_DUMMY_OC_IDS.has(id));

  if (userEvents.length === events.length && dummyIds.size === 0 && leftoverDummyEvalIds.length === 0) {
    return { events, evaluations, changed: false };
  }

  const nextEvents = [...userEvents];

  openCampusEvents.forEach((canonical) => {
    const alreadyPresent = nextEvents.some((event) => isSameCanonicalOpenCampus(event, canonical));

    if (!alreadyPresent) {
      nextEvents.push(canonical);
    }
  });

  const nextEvaluations = Object.fromEntries(
    Object.entries(evaluations).filter(([id]) => !dummyIds.has(id) && !LEGACY_DUMMY_OC_IDS.has(id)),
  );

  const canonicalEvaluations = campusDone.reduce<Record<string, CampusEvaluationEntry[]>>((acc, item) => {
    if (item.evaluation && nextEvents.some((event) => event.id === item.id) && !nextEvaluations[item.id]) {
      acc[item.id] = normalizeCampusEvaluationEntries(item.id, item.evaluation);
    }

    return acc;
  }, {});

  const mergedEvaluations = {
    ...nextEvaluations,
    ...canonicalEvaluations,
  };

  if (ocSignature(events, evaluations) === ocSignature(nextEvents, mergedEvaluations)) {
    return { events, evaluations, changed: false };
  }

  return { events: nextEvents, evaluations: mergedEvaluations, changed: true };
}

const AUGUST_22_PLAN_DATE = "2026-08-22";

function isSameAugust22Plan(event: OpenCampusEvent, planned: OpenCampusEvent) {
  return (
    event.id === planned.id ||
    (event.university === planned.university &&
      event.facultyDepartment === planned.facultyDepartment &&
      event.eventDate === planned.eventDate)
  );
}

/** 8/22の参加予定を、未登録の端末へだけ追加する。同一大学・学部・日付があれば重複させない。 */
export function ensureAugust22OpenCampusPlans(events: OpenCampusEvent[]): {
  events: OpenCampusEvent[];
  changed: boolean;
} {
  const plannedEvents = openCampusEvents.filter((event) => event.eventDate === AUGUST_22_PLAN_DATE);
  const nextEvents = [...events];
  let changed = false;

  plannedEvents.forEach((planned) => {
    const alreadyPresent = nextEvents.some((event) => isSameAugust22Plan(event, planned));

    if (!alreadyPresent) {
      nextEvents.push(planned);
      changed = true;
    }
  });

  return { events: nextEvents, changed };
}
