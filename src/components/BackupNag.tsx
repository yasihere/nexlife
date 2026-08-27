import { replace } from '../lib/nav';

interface BackupNagProps {
  /** null means "never exported". */
  daysSinceExport: number | null;
  onDismiss: () => void;
}

/** "One quiet dismissible line. Not a modal." — PROMPTS.md Phase 7, #3. */
export default function BackupNag({ daysSinceExport, onDismiss }: BackupNagProps) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 text-sm text-muted">
      <button type="button" onClick={() => replace('settings')} className="text-left">
        {daysSinceExport === null ? 'Never backed up.' : `Last backup ${daysSinceExport} days ago.`}{' '}
        <span className="text-paper underline">Export</span>
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="pl-3 text-muted">
        ×
      </button>
    </div>
  );
}
