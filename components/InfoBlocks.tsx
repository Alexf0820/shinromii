import type { ComponentProps, ReactNode } from "react";
import { UiIcon } from "@/components/UiIcon";

type IconName = ComponentProps<typeof UiIcon>["name"];

export function InfoLead({ children }: { children: ReactNode }) {
  return <p className="info-lead">{children}</p>;
}

export function InfoCallout({
  icon = "lock",
  title,
  children,
}: {
  icon?: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="info-callout">
      <span className="info-callout-icon" aria-hidden="true">
        <UiIcon name={icon} className="info-callout-glyph" />
      </span>
      <div>
        <p className="info-callout-title">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function InfoCheckList({ items }: { items: string[] }) {
  return (
    <ul className="info-check-list">
      {items.map((item) => (
        <li key={item}>
          <span className="info-check-icon" aria-hidden="true">
            <UiIcon name="check" className="info-check-glyph" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InfoFeatureGrid({
  items,
}: {
  items: { icon: IconName; title: string; text: string }[];
}) {
  return (
    <div className="info-feature-grid">
      {items.map((item) => (
        <article key={item.title} className="info-feature-card">
          <span className="info-feature-icon" aria-hidden="true">
            <UiIcon name={item.icon} className="info-feature-glyph" />
          </span>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}

const STEP_TONES = ["profile", "grades", "university", "campus", "ai", "grades"] as const;

export function InfoStepList({
  items,
}: {
  items: { icon: IconName; title: string; text: string }[];
}) {
  return (
    <ol className="info-step-list">
      {items.map((item, index) => (
        <li key={item.title} className="info-step-card">
          <span className="info-step-num" aria-hidden="true">
            {index + 1}
          </span>
          <span className={`info-step-icon tone-${STEP_TONES[index] ?? "grades"}`} aria-hidden="true">
            <UiIcon name={item.icon} className="info-step-glyph" />
          </span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function InfoPointList({
  items,
}: {
  items: { icon: IconName; title: string; text: string }[];
}) {
  return (
    <div className="info-point-list">
      {items.map((item) => (
        <article key={item.title} className="info-point-card">
          <span className="info-point-icon" aria-hidden="true">
            <UiIcon name={item.icon} className="info-point-glyph" />
          </span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function InfoEmptyCard({
  icon,
  children,
}: {
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <div className="info-empty-card">
      <span className="info-empty-icon" aria-hidden="true">
        <UiIcon name={icon} className="info-empty-glyph" />
      </span>
      {children}
    </div>
  );
}
