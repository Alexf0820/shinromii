import { emojiForProgressionStage, labelForProgressionStage, type ProgressionStageId } from "@/lib/user-profile";

type ProgressionStageBadgeProps = {
  stage: ProgressionStageId | "";
  className?: string;
  showLabelPrefix?: boolean;
};

export function ProgressionStageBadge({
  stage,
  className = "",
  showLabelPrefix = false,
}: ProgressionStageBadgeProps) {
  if (!stage) {
    return null;
  }

  const label = labelForProgressionStage(stage);
  const emoji = emojiForProgressionStage(stage);

  return (
    <span className={`progression-stage-badge ${className}`.trim()} data-stage={stage}>
      <span aria-hidden="true">{emoji}</span>
      <span>{showLabelPrefix ? `進路ステージ: ${label}` : label}</span>
    </span>
  );
}
