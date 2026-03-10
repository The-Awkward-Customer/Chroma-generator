import { h } from "preact";
import { Button, Text } from "@create-figma-plugin/ui";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Text style={{ fontWeight: "bold" }}>{title}</Text>
      {description && <Text>{description}</Text>}
      {actionLabel && onAction && (
        <Button secondary onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
