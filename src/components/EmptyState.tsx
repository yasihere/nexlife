interface EmptyStateProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * "Every list has an empty state naming one action" (CLAUDE.md §5). Neutral
 * styling — `--signal` is reserved for the Now Line, overdue items, and a sheet's
 * primary action, not for an ordinary call-to-action.
 */
export default function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
      <p className="text-title text-muted">{message}</p>
      <button
        type="button"
        onClick={onAction}
        className="min-h-[44px] rounded border border-rule px-6 text-title text-paper"
      >
        {actionLabel}
      </button>
    </div>
  );
}
