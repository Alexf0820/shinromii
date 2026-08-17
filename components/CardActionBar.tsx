import type { ComponentProps } from "react";
import { UiIcon } from "@/components/UiIcon";

export type CardAction = {
  icon: ComponentProps<typeof UiIcon>["name"];
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

type CardActionBarProps = {
  actions: CardAction[];
};

export function CardActionBar({ actions }: CardActionBarProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={`card-action-bar count-${Math.min(actions.length, 4)}`}
      role="group"
      aria-label="カード操作"
    >
      {actions.map((action, index) => (
        <button
          key={`${action.icon}-${action.label}-${index}`}
          type="button"
          className={`card-action-bar-item${action.variant === "danger" ? " is-danger" : ""}`}
          onClick={action.onClick}
        >
          <UiIcon name={action.icon} className="card-action-bar-icon" />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
